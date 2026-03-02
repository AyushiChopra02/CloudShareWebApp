package com.cloudshare.repository;

import com.cloudshare.entity.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, String> {

  List<FileEntity> findByUserIdOrderByUploadedAtDesc(String userId);

  Optional<FileEntity> findByIdAndUserId(String id, String userId);

  Optional<FileEntity> findByIdAndIsPublicTrue(String id);

  long countByUserId(String userId);

  @Query("SELECT COALESCE(SUM(f.fileSize), 0) FROM FileEntity f WHERE f.userId = :userId")
  Long sumFileSizeByUserId(String userId);

  long countByUserIdAndIsPublicTrue(String userId);

  long countByUserIdAndIsPublicFalse(String userId);
}
