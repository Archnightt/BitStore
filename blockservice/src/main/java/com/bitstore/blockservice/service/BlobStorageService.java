package com.bitstore.blockservice.service;

public interface BlobStorageService {
    void saveBlock(String hash, byte[] data);
    boolean exists(String hash);
    byte[] getBlock(String hash);
}