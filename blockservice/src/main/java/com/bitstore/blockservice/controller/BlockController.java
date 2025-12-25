package com.bitstore.blockservice.controller;

import com.bitstore.blockservice.service.BlobStorageService;
import com.bitstore.blockservice.service.HashService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1/blocks")
public class BlockController {

    private final HashService hashService;
    private final BlobStorageService storageService;

    @Autowired
    public BlockController(HashService hashService, BlobStorageService storageService) {
        this.hashService = hashService;
        this.storageService = storageService;
    }

    @PostMapping
    public String uploadBlock(@RequestParam("file") MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String hash = hashService.calculateSHA256(bytes);

            if (storageService.exists(hash)) {
                return "Block already exists: " + hash;
            } else {
                storageService.saveBlock(hash, bytes);
                return "Uploaded new block: " + hash;
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }
    }

    @GetMapping("/{hash}")
    public byte[] getBlock(@PathVariable String hash) {
        return storageService.getBlock(hash);
    }
}
