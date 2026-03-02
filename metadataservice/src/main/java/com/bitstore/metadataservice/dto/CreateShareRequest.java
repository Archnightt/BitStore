package com.bitstore.metadataservice.dto;

public record CreateShareRequest(Integer expiresInHours, String password) {
}
