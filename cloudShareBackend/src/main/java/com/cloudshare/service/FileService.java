package com.cloudshare.service;

import com.cloudshare.dto.FileResponse;
import com.cloudshare.dto.StatsResponse;
import com.cloudshare.entity.FileEntity;
import com.cloudshare.entity.Subscription;
import com.cloudshare.repository.FileRepository;
import com.cloudshare.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FileService {

  private static final Logger log = LoggerFactory.getLogger(FileService.class);

  private final FileRepository fileRepository;
  private final FileStorageService fileStorageService;
  private final SubscriptionRepository subscriptionRepository;

  @Transactional
  public FileResponse uploadFile(MultipartFile file, boolean isPublic, String userId) {
    log.info("Processing upload for user: {}, file: {}, size: {}", userId, file.getOriginalFilename(), file.getSize());

    // Check subscription limits
    Subscription sub = getOrCreateSubscription(userId);
    log.debug("Subscription: plan={}, uploadsUsed={}/{}, storageUsed={}/{}",
        sub.getPlan(), sub.getUploadsUsed(), sub.getUploadsLimit(),
        sub.getStorageUsedBytes(), sub.getStorageLimitBytes());

    if (sub.getUploadsUsed() >= sub.getUploadsLimit()) {
      throw new RuntimeException("Upload limit reached. Please upgrade your plan.");
    }
    long newStorageUsed = sub.getStorageUsedBytes() + file.getSize();
    if (newStorageUsed > sub.getStorageLimitBytes()) {
      throw new RuntimeException("Storage limit reached. Please upgrade your plan.");
    }

    // Store file on disk
    String storagePath = fileStorageService.store(file, userId);
    log.info("File stored at: {}", storagePath);

    // Save metadata to DB
    FileEntity entity = FileEntity.builder()
        .userId(userId)
        .fileName(file.getOriginalFilename())
        .fileSize(file.getSize())
        .fileType(file.getContentType())
        .isPublic(isPublic)
        .storagePath(storagePath)
        .build();
    entity = fileRepository.save(entity);
    log.info("File entity saved with id: {}", entity.getId());

    // Update subscription usage
    sub.setUploadsUsed(sub.getUploadsUsed() + 1);
    sub.setStorageUsedBytes(newStorageUsed);
    subscriptionRepository.save(sub);

    return toResponse(entity);
  }

  // ─── Get All Files ──────────────────────────────────────
  public List<FileResponse> getUserFiles(String userId) {
    return fileRepository.findByUserIdOrderByUploadedAtDesc(userId)
        .stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  // ─── Get Single File ────────────────────────────────────
  public FileEntity getFile(String fileId, String userId) {
    return fileRepository.findByIdAndUserId(fileId, userId)
        .orElseThrow(() -> new RuntimeException("File not found"));
  }

  // ─── Get Public File ────────────────────────────────────
  public FileEntity getPublicFile(String fileId) {
    return fileRepository.findByIdAndIsPublicTrue(fileId)
        .orElseThrow(() -> new RuntimeException("File not found or not public"));
  }

  // ─── Download ───────────────────────────────────────────
  public Resource downloadFile(String storagePath) {
    return fileStorageService.loadAsResource(storagePath);
  }

  // ─── Delete ─────────────────────────────────────────────
  @Transactional
  public void deleteFile(String fileId, String userId) {
    FileEntity file = getFile(fileId, userId);

    // Delete from disk
    fileStorageService.delete(file.getStoragePath());

    // Delete from DB
    fileRepository.delete(file);

    // Update subscription usage
    Subscription sub = getOrCreateSubscription(userId);
    sub.setUploadsUsed(Math.max(0, sub.getUploadsUsed() - 1));
    sub.setStorageUsedBytes(Math.max(0, sub.getStorageUsedBytes() - file.getFileSize()));
    subscriptionRepository.save(sub);
  }

  // ─── Toggle Visibility ──────────────────────────────────
  @Transactional
  public FileResponse toggleVisibility(String fileId, String userId) {
    FileEntity file = getFile(fileId, userId);
    file.setIsPublic(!file.getIsPublic());
    file = fileRepository.save(file);
    return toResponse(file);
  }

  // ─── Stats ──────────────────────────────────────────────
  public StatsResponse getStats(String userId) {
    long totalFiles = fileRepository.countByUserId(userId);
    long totalBytes = fileRepository.sumFileSizeByUserId(userId);
    long publicFiles = fileRepository.countByUserIdAndIsPublicTrue(userId);
    long privateFiles = fileRepository.countByUserIdAndIsPublicFalse(userId);

    // Recent uploads (last 7 days) — count from DB
    List<FileEntity> allFiles = fileRepository.findByUserIdOrderByUploadedAtDesc(userId);
    long recentUploads = allFiles.stream()
        .filter(f -> f.getUploadedAt() != null &&
            f.getUploadedAt().isAfter(LocalDateTime.now().minusDays(7)))
        .count();

    return StatsResponse.builder()
        .totalFiles(totalFiles)
        .totalStorage(formatBytes(totalBytes))
        .publicFiles(publicFiles)
        .privateFiles(privateFiles)
        .recentUploads(recentUploads)
        .build();
  }

  // ─── Helpers ────────────────────────────────────────────

  private Subscription getOrCreateSubscription(String userId) {
    return subscriptionRepository.findByUserId(userId)
        .orElseGet(() -> {
          Subscription sub = Subscription.builder()
              .userId(userId)
              .plan("Free")
              .uploadsUsed(0)
              .uploadsLimit(10)
              .storageUsedBytes(0L)
              .storageLimitBytes(100L * 1024 * 1024) // 100 MB
              .build();
          return subscriptionRepository.save(sub);
        });
  }

  private FileResponse toResponse(FileEntity entity) {
    return FileResponse.builder()
        .id(entity.getId())
        .fileName(entity.getFileName())
        .fileSize(entity.getFileSize())
        .fileType(entity.getFileType())
        .isPublic(entity.getIsPublic())
        .uploadedAt(entity.getUploadedAt() != null ? entity.getUploadedAt().toString() : null)
        .downloadUrl("/api/files/" + entity.getId() + "/download")
        .shareUrl("/public/" + entity.getId())
        .build();
  }

  private String formatBytes(long bytes) {
    if (bytes < 1024)
      return bytes + " B";
    if (bytes < 1024 * 1024)
      return String.format("%.2f KB", bytes / 1024.0);
    if (bytes < 1024 * 1024 * 1024)
      return String.format("%.2f MB", bytes / (1024.0 * 1024));
    return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
  }
}
