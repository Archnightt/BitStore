package com.bitstore.metadataservice.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "upload_sessions", indexes = @Index(name = "idx_upload_id", columnList = "uploadId", unique = true))
@Getter
@Setter
@NoArgsConstructor
public class UploadSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String uploadId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private UserAccount owner;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private long fileSize;

    @Column(nullable = false)
    private int chunkSize;

    @Column(nullable = false)
    private int totalChunks;

    @ElementCollection
    @CollectionTable(name = "upload_session_chunks", joinColumns = @JoinColumn(name = "session_id"))
    @MapKeyColumn(name = "chunk_index")
    @Column(name = "chunk_hash", nullable = false, length = 64)
    private Map<Integer, String> uploadedChunkHashes = new HashMap<>();

    @Column(nullable = false)
    private boolean completed;

    @Column(nullable = false)
    private Instant createdAt;
}
