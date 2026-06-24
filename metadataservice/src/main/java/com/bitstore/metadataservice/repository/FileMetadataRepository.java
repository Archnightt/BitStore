package com.bitstore.metadataservice.repository;

import com.bitstore.metadataservice.model.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    Optional<FileMetadata> findByFileName(String fileName);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(f) FROM FileMetadata f WHERE f.folder.id = :folderId AND f.isTrashed = false")
    long countByFolderIdAndIsTrashedFalse(@org.springframework.data.repository.query.Param("folderId") Long folderId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(f.size), 0) FROM FileMetadata f WHERE f.folder.id = :folderId AND f.isTrashed = false")
    Long sumSizeByFolderIdAndIsTrashedFalse(@org.springframework.data.repository.query.Param("folderId") Long folderId);
}
