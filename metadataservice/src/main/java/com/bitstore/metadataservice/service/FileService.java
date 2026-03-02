package com.bitstore.metadataservice.service;

import com.bitstore.metadataservice.dto.FileMetadataResponse;
import com.bitstore.metadataservice.model.FileMetadata;
import com.bitstore.metadataservice.repository.FileMetadataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;

@Service
public class FileService {

    @Autowired
    private FileMetadataRepository repository;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${block.service.url}")
    private String blockServiceUrl;

    public static final int CHUNK_SIZE = 1024 * 1024; // 1MB

    public void uploadFile(MultipartFile file) throws IOException, NoSuchAlgorithmException {
        String fileName = file.getOriginalFilename();
        long fileSize = file.getSize();
        byte[] bytes = file.getBytes();

        List<String> blockHashes = new ArrayList<>();
        int totalChunks = (int) Math.ceil((double) fileSize / CHUNK_SIZE);

        for (int i = 0; i < totalChunks; i++) {
            int start = i * CHUNK_SIZE;
            int end = Math.min(bytes.length, start + CHUNK_SIZE);
            byte[] chunk = new byte[end - start];
            System.arraycopy(bytes, start, chunk, 0, chunk.length);

            String hash = uploadAndVerifyChunk(chunk);
            blockHashes.add(hash);
        }

        FileMetadata metadata = new FileMetadata();
        metadata.setFileName(fileName);
        metadata.setSize(fileSize);
        metadata.setBlockHashes(blockHashes);
        metadata.setCreatedAt(java.time.Instant.now()); // Set the creation timestamp
        repository.save(metadata);
    }

    public String uploadAndVerifyChunk(byte[] chunk) {
        try {
            String hash = calculateHash(chunk);
            // Send chunk to Block Service
            restTemplate.postForObject(blockServiceUrl, chunk, String.class);
            return hash;
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error calculating hash", e);
        }
    }

    public FileMetadataResponse map(FileMetadata metadata) {
        return new FileMetadataResponse(
                metadata.getId(),
                metadata.getFileName(),
                metadata.getSize(),
                metadata.getBlockHashes(),
                metadata.getCreatedAt());
    }

    public byte[] downloadFile(Long id) {
        FileMetadata metadata = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            for (String hash : metadata.getBlockHashes()) {
                // Retrieve chunk from Block Service (using dynamic URL)
                byte[] block = restTemplate.getForObject(blockServiceUrl + "/" + hash, byte[].class);
                if (block != null) {
                    outputStream.write(block);
                }
            }
            return outputStream.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error stitching file", e);
        }
    }

    public List<FileMetadata> getAllFiles() {
        return repository.findAll();
    }

    public FileMetadata getFileMetadata(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("File not found"));
    }

    public void deleteFile(Long id) {
        repository.deleteById(id);
    }

    public void renameFile(Long id, String newName) {
        FileMetadata metadata = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));
        metadata.setFileName(newName);
        repository.save(metadata);
    }

    private String calculateHash(byte[] bytes) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(bytes);
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1)
                hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}