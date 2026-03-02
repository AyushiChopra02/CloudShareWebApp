package com.cloudshare.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionResponse {
  private String plan;
  private int uploadsUsed;
  private int uploadsLimit;
  private String storageUsed;
  private String storageLimit;
  private String expiresAt;
}
