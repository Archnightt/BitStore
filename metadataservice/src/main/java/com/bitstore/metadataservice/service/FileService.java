package com.bitstore.metadataservice.service;

import com.bitstore.metadataservice.dto.FileMetadataResponse;
import com.bitstore.metadataservice.model.FileMetadata;
import com.bitstore.metadataservice.repository.FileMetadataRepository;
import com.bitstore.metadataservice.repository.FolderRepository;
import com.bitstore.metadataservice.model.Folder;
import com.bitstore.metadataservice.dto.FolderResponse;
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
    private FolderRepository folderRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${block.service.url}")
    private String blockServiceUrl;

    public static final int CHUNK_SIZE = 1024 * 1024; // 1MB

    public void uploadFile(MultipartFile file, Long folderId) throws IOException, NoSuchAlgorithmException {
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
        if (folderId != null) {
            Folder folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new RuntimeException("Folder not found"));
            metadata.setFolder(folder);
        }
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
                metadata.getCreatedAt(),
                metadata.isTrashed(),
                metadata.getFolder() != null ? metadata.getFolder().getId() : null);
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

    public void moveToTrash(Long id) {
        FileMetadata metadata = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));
        metadata.setTrashed(true);
        repository.save(metadata);
    }

    public void restoreFile(Long id) {
        FileMetadata metadata = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));
        metadata.setTrashed(false);
        repository.save(metadata);
    }

    public void moveToFolder(Long id, Long folderId) {
        FileMetadata metadata = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));
        if (folderId != null) {
            Folder folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new RuntimeException("Folder not found"));
            metadata.setFolder(folder);
        } else {
            metadata.setFolder(null);
        }
        repository.save(metadata);
    }

    public FolderResponse createFolder(String name, Long parentId) {
        Folder folder = new Folder();
        folder.setName(name);
        if (parentId != null) {
            Folder parent = folderRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("Parent folder not found"));
            folder.setParentFolder(parent);
        }
        folder = folderRepository.save(folder);
        return mapFolder(folder);
    }

    public List<FolderResponse> getFolders(Long parentId) {
        List<Folder> folders;
        if (parentId == null) {
            folders = folderRepository.findByParentFolderIsNull();
        } else {
            folders = folderRepository.findByParentFolderId(parentId);
        }
        return folders.stream().map(this::mapFolder).toList();
    }

    public void deleteFolder(Long id) {
        folderRepository.deleteById(id);
    }

    public FolderResponse mapFolder(Folder folder) {
        return new FolderResponse(
                folder.getId(),
                folder.getName(),
                folder.getParentFolder() != null ? folder.getParentFolder().getId() : null,
                folder.getCreatedAt()
        );
    }

    public void renameFolder(Long id, String newName) {
        Folder folder = folderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
        folder.setName(newName);
        folderRepository.save(folder);
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