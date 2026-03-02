package com.cloudshare.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "files")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(nullable = false)
  private String userId;

  @Column(nullable = false)
  private String fileName;

  @Column(nullable = false)
  private Long fileSize;

  @Column(nullable = false)
  private String fileType;

  @Builder.Default
  @Column(nullable = false)
  private Boolean isPublic = false;

  /** Path on disk (relative to storage root) */
  @Column(nullable = false)
  private String storagePath;

  @CreationTimestamp
  @Column(updatable = false)
  private LocalDateTime uploadedAt;
}
