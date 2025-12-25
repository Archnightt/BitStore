package com.bitstore.metadataservice.controller;

import com.bitstore.metadataservice.service.FileOrchestratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileOrchestratorService orchestrator;

    @Autowired
    public FileController(FileOrchestratorService orchestrator) {
        this.orchestrator = orchestrator;
    }

    @PostMapping("/upload")
    public String uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            orchestrator.uploadFile(file.getOriginalFilename(), file.getBytes());
            return "File uploaded successfully";
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }
    }

    @GetMapping("/{fileName}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String fileName) {
        byte[] data = orchestrator.downloadFile(fileName);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(data);
    }
}