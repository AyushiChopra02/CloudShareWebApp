package com.cloudshare.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionRequest {
  private String type;
  private Double amount;
  private String status;
  private String paymentId;
}
