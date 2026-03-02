package com.cloudshare.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatsResponse {
  private long totalFiles;
  private String totalStorage;
  private long publicFiles;
  private long privateFiles;
  private long recentUploads;
}
