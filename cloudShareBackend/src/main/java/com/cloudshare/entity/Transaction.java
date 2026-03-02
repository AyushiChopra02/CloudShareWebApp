package com.cloudshare.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(nullable = false)
  private String userId;


  @Column(nullable = false)
  private String type;

  @Column(nullable = false)
  private Double amount;

  @Column(nullable = false)
  private String status;

 
  private String paymentId;

  @CreationTimestamp
  @Column(name = "txn_date", updatable = false)
  private LocalDateTime date;
}
