package com.bitstore.metadataservice.repository;

import com.bitstore.metadataservice.model.UploadSession;
import com.bitstore.metadataservice.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UploadSessionRepository extends JpaRepository<UploadSession, Long> {
    Optional<UploadSession> findByUploadId(String uploadId);
    Optional<UploadSession> findByUploadIdAndOwner(String uploadId, UserAccount owner);
}
