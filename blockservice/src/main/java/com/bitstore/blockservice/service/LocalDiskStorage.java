package com.bitstore.blockservice.service;

import org.springframework.stereotype.Service;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class LocalDiskStorage implements BlobStorageService {

    private final Path rootLocation;

    public LocalDiskStorage() {
        this.rootLocation = Paths.get("storage");
        try {
            if (!Files.exists(rootLocation)) {
                Files.createDirectories(rootLocation);
            }
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    @Override
    public void saveBlock(String hash, byte[] data) {
        try {
            Path destinationFile = this.rootLocation.resolve(hash);
            Files.write(destinationFile, data);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + hash, e);
        }
    }

    @Override
    public boolean exists(String hash) {
        Path file = this.rootLocation.resolve(hash);
        return Files.exists(file);
    }

    @Override
    public byte[] getBlock(String hash) {
        try {
            Path file = this.rootLocation.resolve(hash);
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file " + hash, e);
        }
    }
}