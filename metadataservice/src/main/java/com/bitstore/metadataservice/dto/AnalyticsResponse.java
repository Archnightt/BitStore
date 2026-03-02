package com.bitstore.metadataservice.dto;

public record AnalyticsResponse(
        long totalFiles,
        long logicalBytes,
        long uniqueBytes,
        long savedBytes,
        long uniqueBlocks,
        double dedupeRatio
) {
}
