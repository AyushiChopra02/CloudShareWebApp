package com.cloudshare.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpgradeRequest {
  private String planId; 
  private String planName; 
  private String paymentId;
}
