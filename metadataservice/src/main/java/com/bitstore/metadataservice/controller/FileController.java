package com.bitstore.metadataservice.controller;

import com.bitstore.metadataservice.dto.FileMetadataResponse;
import com.bitstore.metadataservice.model.FileMetadata;
import com.bitstore.metadataservice.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/files")
// @CrossOrigin removed to avoid conflict with Global AppConfig
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            fileService.uploadFile(file);
            return ResponseEntity.ok("File uploaded successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<FileMetadataResponse>> getAllFiles() {
        List<FileMetadataResponse> files = fileService.getAllFiles().stream()
                .map(fileService::map)
                .toList();
        return ResponseEntity.ok(files);
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<ByteArrayResource> downloadFile(@PathVariable Long id) {
        FileMetadata metadata = fileService.getFileMetadata(id);
        byte[] data = fileService.downloadFile(id);
        ByteArrayResource resource = new ByteArrayResource(data);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getFileName() + "\"")
                .contentLength(data.length)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long id) {
        fileService.deleteFile(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/rename")
    public ResponseEntity<Void> renameFile(@PathVariable Long id, @RequestParam String newName) {
        fileService.renameFile(id, newName);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/trash")
    public ResponseEntity<Void> moveToTrash(@PathVariable Long id) {
        fileService.moveToTrash(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreFile(@PathVariable Long id) {
        fileService.restoreFile(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/trash/empty")
    public ResponseEntity<Void> emptyTrash() {
        // Find all trashed files and delete them permanently
        fileService.getAllFiles().stream()
                .filter(FileMetadata::isTrashed)
                .forEach(f -> fileService.deleteFile(f.getId()));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<Void> moveFile(@PathVariable Long id, @RequestParam String folderPath) {
        fileService.moveToFolder(id, folderPath);
        return ResponseEntity.ok().build();
    }
}
