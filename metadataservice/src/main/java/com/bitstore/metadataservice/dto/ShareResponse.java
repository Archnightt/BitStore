package com.bitstore.metadataservice.dto;

import java.time.Instant;

public record ShareResponse(String shareToken, String shareUrl, Instant expiresAt) {
}
