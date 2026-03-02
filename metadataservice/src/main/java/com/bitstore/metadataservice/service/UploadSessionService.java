package com.bitstore.metadataservice.service;

import com.bitstore.metadataservice.dto.CreateUploadSessionRequest;
import com.bitstore.metadataservice.dto.FileMetadataResponse;
import com.bitstore.metadataservice.dto.UploadSessionResponse;
import com.bitstore.metadataservice.model.FileMetadata;
import com.bitstore.metadataservice.model.UploadSession;
import com.bitstore.metadataservice.model.UserAccount;
import com.bitstore.metadataservice.repository.FileMetadataRepository;
import com.bitstore.metadataservice.repository.UploadSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class UploadSessionService {

    private final UploadSessionRepository uploadSessionRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final FileService fileService;

    public UploadSessionService(UploadSessionRepository uploadSessionRepository,
                                FileMetadataRepository fileMetadataRepository,
                                FileService fileService) {
        this.uploadSessionRepository = uploadSessionRepository;
        this.fileMetadataRepository = fileMetadataRepository;
        this.fileService = fileService;
    }

    @Transactional
    public UploadSessionResponse createSession(CreateUploadSessionRequest request, UserAccount owner) {
        int totalChunks = (int) Math.ceil((double) request.fileSize() / FileService.CHUNK_SIZE);
        if (totalChunks == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fileSize must be > 0");
        }

        UploadSession session = new UploadSession();
        session.setUploadId(UUID.randomUUID().toString().replace("-", ""));
        session.setOwner(owner);
        session.setFileName(request.fileName().trim());
        session.setFileSize(request.fileSize());
        session.setChunkSize(FileService.CHUNK_SIZE);
        session.setTotalChunks(totalChunks);
        session.setCompleted(false);
        session.setCreatedAt(Instant.now());

        return map(uploadSessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public UploadSessionResponse getSession(String uploadId, UserAccount owner) {
        return map(requireOwnedSession(uploadId, owner));
    }

    @Transactional
    public UploadSessionResponse uploadChunk(String uploadId, int chunkIndex, byte[] chunkData, UserAccount owner) {
        UploadSession session = requireOwnedSession(uploadId, owner);
        if (session.isCompleted()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Upload session already completed");
        }
        if (chunkIndex < 0 || chunkIndex >= session.getTotalChunks()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "chunkIndex out of range");
        }
        if (chunkData == null || chunkData.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chunk data is empty");
        }
        if (chunkData.length > session.getChunkSize()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chunk size exceeds maximum");
        }

        String hash = fileService.uploadAndVerifyChunk(chunkData);
        session.getUploadedChunkHashes().put(chunkIndex, hash);

        return map(uploadSessionRepository.save(session));
    }

    @Transactional
    public FileMetadataResponse completeUpload(String uploadId, UserAccount owner) {
        UploadSession session = requireOwnedSession(uploadId, owner);
        if (session.isCompleted()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Upload session already completed");
        }

        if (session.getUploadedChunkHashes().size() != session.getTotalChunks()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not all chunks uploaded");
        }

        List<String> orderedHashes = session.getUploadedChunkHashes()
                .entrySet()
                .stream()
                .sorted(Comparator.comparingInt(e -> e.getKey()))
                .map(e -> e.getValue())
                .toList();

        FileMetadata metadata = new FileMetadata();
        metadata.setFileName(session.getFileName());
        metadata.setSize(session.getFileSize());
        metadata.setBlockHashes(orderedHashes);
        metadata.setOwner(owner);
        metadata.setCreatedAt(Instant.now());

        session.setCompleted(true);
        uploadSessionRepository.save(session);

        return fileService.map(fileMetadataRepository.save(metadata));
    }

    private UploadSession requireOwnedSession(String uploadId, UserAccount owner) {
        return uploadSessionRepository.findByUploadIdAndOwner(uploadId, owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Upload session not found"));
    }

    private UploadSessionResponse map(UploadSession session) {
        List<Integer> uploadedChunks = new ArrayList<>(session.getUploadedChunkHashes().keySet());
        uploadedChunks.sort(Integer::compareTo);

        return new UploadSessionResponse(
                session.getUploadId(),
                session.getFileName(),
                session.getFileSize(),
                session.getChunkSize(),
                session.getTotalChunks(),
                uploadedChunks,
                session.isCompleted()
        );
    }
}
