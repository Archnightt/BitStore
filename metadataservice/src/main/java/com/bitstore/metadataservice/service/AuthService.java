package com.bitstore.metadataservice.service;

import com.bitstore.metadataservice.dto.AuthResponse;
import com.bitstore.metadataservice.model.AuthToken;
import com.bitstore.metadataservice.model.UserAccount;
import com.bitstore.metadataservice.repository.AuthTokenRepository;
import com.bitstore.metadataservice.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private static final long TOKEN_TTL_DAYS = 14;

    private final UserAccountRepository userRepository;
    private final AuthTokenRepository authTokenRepository;
    private final HashingService hashingService;

    public AuthService(UserAccountRepository userRepository,
                       AuthTokenRepository authTokenRepository,
                       HashingService hashingService) {
        this.userRepository = userRepository;
        this.authTokenRepository = authTokenRepository;
        this.hashingService = hashingService;
    }

    @Transactional
    public AuthResponse register(String username, String password) {
        String cleanUsername = normalizeUsername(username);
        validatePassword(password);

        if (userRepository.existsByUsername(cleanUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        UserAccount user = new UserAccount();
        user.setUsername(cleanUsername);
        user.setPasswordHash(hashingService.sha256String(password));
        userRepository.save(user);

        return createSession(user);
    }

    @Transactional
    public AuthResponse login(String username, String password) {
        String cleanUsername = normalizeUsername(username);
        UserAccount user = userRepository.findByUsername(cleanUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        String candidateHash = hashingService.sha256String(password);
        if (!candidateHash.equals(user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return createSession(user);
    }

    @Transactional(readOnly = true)
    public UserAccount requireUser(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Authorization header");
        }
        String token = parseBearerToken(authorizationHeader);

        AuthToken authToken = authTokenRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token"));

        if (authToken.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token expired");
        }

        return authToken.getUser();
    }

    @Transactional
    public void cleanupExpiredTokens() {
        authTokenRepository.deleteByExpiresAtBefore(Instant.now());
    }

    private AuthResponse createSession(UserAccount user) {
        authTokenRepository.deleteByUser(user);

        AuthToken token = new AuthToken();
        token.setToken(UUID.randomUUID().toString().replace("-", ""));
        token.setUser(user);
        token.setExpiresAt(Instant.now().plus(TOKEN_TTL_DAYS, ChronoUnit.DAYS));
        authTokenRepository.save(token);

        return new AuthResponse(token.getToken(), user.getUsername());
    }

    private String parseBearerToken(String headerValue) {
        String prefix = "bearer ";
        String normalized = headerValue.trim();
        if (normalized.length() <= prefix.length() ||
                !normalized.toLowerCase(Locale.ROOT).startsWith(prefix)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization must be Bearer token");
        }
        return normalized.substring(prefix.length()).trim();
    }

    private String normalizeUsername(String username) {
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        String value = username.trim().toLowerCase(Locale.ROOT);
        if (value.length() < 3 || value.length() > 32 || !value.matches("^[a-z0-9_]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Username must be 3-32 chars with letters, digits or underscore");
        }
        return value;
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }
    }
}
