package com.bitstore.metadataservice.dto;

import java.time.Instant;
import java.util.List;

public record FileMetadataResponse(
        Long id,
        String fileName,
        long size,
        List<String> blockHashes,
        Instant createdAt
) {
}
