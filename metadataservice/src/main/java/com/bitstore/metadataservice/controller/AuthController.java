package com.bitstore.metadataservice.controller;

import com.bitstore.metadataservice.dto.AuthRequest;
import com.bitstore.metadataservice.dto.AuthResponse;
import com.bitstore.metadataservice.model.UserAccount;
import com.bitstore.metadataservice.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody AuthRequest request) {
        return authService.register(request.getUsername(), request.getPassword());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request.getUsername(), request.getPassword());
    }

    @GetMapping("/me")
    public AuthResponse me(@RequestHeader("Authorization") String authorization) {
        UserAccount user = authService.requireUser(authorization);
        return new AuthResponse(null, user.getUsername());
    }
}
