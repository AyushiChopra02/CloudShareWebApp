package com.cloudshare.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subscription {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(nullable = false, unique = true)
  private String userId;

  /** Free | Premium */
  @Column(nullable = false)
  private String plan;

  @Column(nullable = false)
  private Integer uploadsUsed;

  @Column(nullable = false)
  private Integer uploadsLimit;


  @Column(nullable = false)
  private Long storageUsedBytes;


  @Column(nullable = false)
  private Long storageLimitBytes;

  private LocalDateTime expiresAt;
}
