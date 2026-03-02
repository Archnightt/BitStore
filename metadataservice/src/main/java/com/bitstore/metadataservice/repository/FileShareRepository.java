package com.bitstore.metadataservice.repository;

import com.bitstore.metadataservice.model.FileShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface FileShareRepository extends JpaRepository<FileShare, Long> {
    Optional<FileShare> findByShareToken(String shareToken);
    void deleteByExpiresAtBefore(Instant now);
}
