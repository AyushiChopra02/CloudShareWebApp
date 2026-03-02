package com.cloudshare.service;

import com.cloudshare.dto.SubscriptionResponse;
import com.cloudshare.dto.UpgradeRequest;
import com.cloudshare.entity.Subscription;
import com.cloudshare.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

  private final SubscriptionRepository subscriptionRepository;

  public SubscriptionResponse getSubscription(String userId) {
    Subscription sub = getOrCreate(userId);
    return toResponse(sub);
  }

  @Transactional
  public SubscriptionResponse upgrade(String userId, UpgradeRequest request) {
    Subscription sub = getOrCreate(userId);

    if ("premium".equalsIgnoreCase(request.getPlanId())) {
      sub.setPlan("Premium");
      sub.setUploadsLimit(500);
      sub.setStorageLimitBytes(10L * 1024 * 1024 * 1024); // 10 GB
      sub.setExpiresAt(LocalDateTime.now().plusDays(30));
    } else {
      sub.setPlan("Free");
      sub.setUploadsLimit(10);
      sub.setStorageLimitBytes(100L * 1024 * 1024); // 100 MB
      sub.setExpiresAt(null);
    }

    sub = subscriptionRepository.save(sub);
    return toResponse(sub);
  }

  // ─── Helpers ────────────────────────────────────────────

  private Subscription getOrCreate(String userId) {
    return subscriptionRepository.findByUserId(userId)
        .orElseGet(() -> {
          Subscription sub = Subscription.builder()
              .userId(userId)
              .plan("Free")
              .uploadsUsed(0)
              .uploadsLimit(10)
              .storageUsedBytes(0L)
              .storageLimitBytes(100L * 1024 * 1024)
              .build();
          return subscriptionRepository.save(sub);
        });
  }

  private SubscriptionResponse toResponse(Subscription sub) {
    return SubscriptionResponse.builder()
        .plan(sub.getPlan())
        .uploadsUsed(sub.getUploadsUsed())
        .uploadsLimit(sub.getUploadsLimit())
        .storageUsed(formatBytes(sub.getStorageUsedBytes()))
        .storageLimit(formatBytes(sub.getStorageLimitBytes()))
        .expiresAt(sub.getExpiresAt() != null ? sub.getExpiresAt().toString() : null)
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
