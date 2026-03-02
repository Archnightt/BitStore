package com.bitstore.metadataservice.dto;

import jakarta.validation.constraints.NotBlank;

public record RenameFileRequest(@NotBlank String fileName) {
}
