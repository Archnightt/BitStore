package com.bitstore.metadataservice.dto;

import java.time.Instant;

public record FolderResponse(
        Long id,
        String name,
        Long parentFolderId,
        Instant createdAt) {
}
