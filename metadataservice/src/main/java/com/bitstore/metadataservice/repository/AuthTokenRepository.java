package com.bitstore.metadataservice.repository;

import com.bitstore.metadataservice.model.AuthToken;
import com.bitstore.metadataservice.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface AuthTokenRepository extends JpaRepository<AuthToken, Long> {
    Optional<AuthToken> findByToken(String token);
    void deleteByUser(UserAccount user);
    void deleteByExpiresAtBefore(Instant now);
}
