package com.cloudshare.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.UUID;

/**
 * Handles physical file storage on disk.
 * Files are stored under {storage.location}/{userId}/{uuid_filename}.
 */
@Service
public class FileStorageService {

  private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

  @Value("${file.storage.location}")
  private String storageLocation;

  private Path rootLocation;

  @PostConstruct
  public void init() {
    rootLocation = Paths.get(storageLocation).toAbsolutePath().normalize();
    log.info("File storage root: {}", rootLocation);
    try {
      Files.createDirectories(rootLocation);
      log.info("Upload directory ready: {}", rootLocation);
    } catch (IOException e) {
      throw new RuntimeException("Could not create upload directory: " + rootLocation, e);
    }
  }

  /**
   * Store a file and return the relative storage path.
   */
  public String store(MultipartFile file, String userId) {
    try {
      if (file.isEmpty()) {
        throw new RuntimeException("Cannot store empty file.");
      }

      // Create user-specific directory
      Path userDir = rootLocation.resolve(userId);
      Files.createDirectories(userDir);

      // Generate unique filename to avoid collisions
      String originalName = file.getOriginalFilename();
      String extension = "";
      if (originalName != null && originalName.contains(".")) {
        extension = originalName.substring(originalName.lastIndexOf("."));
      }
      String storedName = UUID.randomUUID() + extension;

      Path destinationFile = userDir.resolve(storedName).normalize();

      // Security check: ensure we're writing inside the user dir
      if (!destinationFile.startsWith(userDir)) {
        throw new RuntimeException("Cannot store file outside user directory.");
      }

      log.info("Storing file: {} -> {}", originalName, destinationFile);
      file.transferTo(destinationFile.toFile());

      // Return relative path: userId/storedName
      return userId + "/" + storedName;
    } catch (IOException e) {
      throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
    }
  }

  /**
   * Load a file as a Resource for download.
   */
  public Resource loadAsResource(String storagePath) {
    try {
      Path file = rootLocation.resolve(storagePath).normalize();
      Resource resource = new UrlResource(file.toUri());
      if (resource.exists() && resource.isReadable()) {
        return resource;
      } else {
        throw new RuntimeException("File not found: " + storagePath);
      }
    } catch (MalformedURLException e) {
      throw new RuntimeException("File not found: " + storagePath, e);
    }
  }

  /**
   * Delete a file from disk.
   */
  public void delete(String storagePath) {
    try {
      Path file = rootLocation.resolve(storagePath).normalize();
      Files.deleteIfExists(file);
    } catch (IOException e) {
      throw new RuntimeException("Failed to delete file: " + storagePath, e);
    }
  }
}
