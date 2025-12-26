package com.bitstore.blockservice.controller;

import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@RestController @RequestMapping("/api/v1/blocks")
public class BlockController {

    private final Path storageDir = Paths.get("data");

    public BlockController() throws IOException {
        Files.createDirectories(storageDir);
    }

    @PostMapping
    public String uploadBlock( @RequestBody byte[] data) throws NoSuchAlgorithmException, IOException {
        // 1. Calculate Hash (Content Addressable)
        String hash = calculateHash(data);

        // 2. Save Block to Disk
        Path filePath = storageDir.resolve(hash);
        if (!Files.exists(filePath)) {
            Files.write(filePath, data);
        }

        // 3. Return Hash
        return hash;
    }

    @GetMapping("/{hash}")
    public byte[] getBlock( @PathVariable String hash) throws IOException {
        Path filePath = storageDir.resolve(hash);
        if (!Files.exists(filePath)) {
            throw new IOException("Block not found: " + hash);
        }
        return Files.readAllBytes(filePath);
    }

    private String calculateHash(byte[] bytes) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(bytes);
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}