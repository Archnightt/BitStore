package com.bitstore.metadataservice.dto;

import java.util.List;

public record UploadSessionResponse(
        String uploadId,
        String fileName,
        long fileSize,
        int chunkSize,
        int totalChunks,
        List<Integer> uploadedChunks,
        boolean completed
) {
}
