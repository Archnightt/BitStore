package com.bitstore.metadataservice.service;

import com.bitstore.metadataservice.model.FileMetadata;
import com.bitstore.metadataservice.repository.FileMetadataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class FileOrchestratorService {

    private static final int BLOCK_SIZE = 1024 * 10; // 10KB
    private final FileMetadataRepository metadataRepository;
    private final RestTemplate restTemplate;

    @Autowired
    public FileOrchestratorService(FileMetadataRepository metadataRepository, RestTemplate restTemplate) {
        this.metadataRepository = metadataRepository;
        this.restTemplate = restTemplate;
    }

    public void uploadFile(String fileName, byte[] fileData) {
        List<String> blockHashes = new ArrayList<>();
        int totalLength = fileData.length;
        int offset = 0;

        try {
            while (offset < totalLength) {
                int length = Math.min(BLOCK_SIZE, totalLength - offset);
                byte[] chunk = Arrays.copyOfRange(fileData, offset, offset + length);

                String hash = uploadBlock(chunk);
                blockHashes.add(hash);

                offset += length;
            }

            FileMetadata metadata = new FileMetadata();
            metadata.setFileName(fileName);
            metadata.setSize(totalLength);
            metadata.setBlockHashes(blockHashes);
            metadataRepository.save(metadata);

        } catch (RestClientException e) {
            throw new RuntimeException("Error communicating with Block Service", e);
        }
    }

    public byte[] downloadFile(String fileName) {
        FileMetadata metadata = metadataRepository.findByFileName(fileName)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileName));

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            for (String hash : metadata.getBlockHashes()) {
                byte[] blockData = restTemplate.getForObject(
                        "http://localhost:8080/api/v1/blocks/" + hash,
                        byte[].class
                );
                
                if (blockData != null) {
                    outputStream.write(blockData);
                } else {
                    throw new RuntimeException("Failed to download block: " + hash);
                }
            }
            return outputStream.toByteArray();
        } catch (IOException | RestClientException e) {
            throw new RuntimeException("Error reassembling file: " + fileName, e);
        }
    }

    private String uploadBlock(byte[] chunk) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(chunk) {
            @Override
            public String getFilename() {
                return "chunk"; // filename is required for MultipartFile
            }
        });

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(
                "http://localhost:8080/api/v1/blocks",
                requestEntity,
                String.class
        );

        String responseBody = response.getBody();
        if (responseBody != null && responseBody.startsWith("Block already exists: ")) {
             return responseBody.substring("Block already exists: ".length());
        } else if (responseBody != null && responseBody.startsWith("Uploaded new block: ")) {
             return responseBody.substring("Uploaded new block: ".length());
        }
        
        throw new RuntimeException("Unexpected response from Block Service: " + responseBody);
    }
}