package com.bitstore.metadataservice.repository;

import com.bitstore.metadataservice.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByParentFolderId(Long parentFolderId);
    List<Folder> findByParentFolderIsNull();
}
