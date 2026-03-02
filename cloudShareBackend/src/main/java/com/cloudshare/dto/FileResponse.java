package com.cloudshare.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileResponse {
  private String id;
  private String fileName;
  private Long fileSize;
  private String fileType;
  private Boolean isPublic;
  private String uploadedAt;
  private String downloadUrl;
  private String shareUrl;
}
