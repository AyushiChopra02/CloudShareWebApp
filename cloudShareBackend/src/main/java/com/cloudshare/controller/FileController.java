package com.cloudshare.controller;

import com.cloudshare.dto.FileResponse;
import com.cloudshare.dto.StatsResponse;
import com.cloudshare.entity.FileEntity;
import com.cloudshare.service.FileService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);

    private final FileService fileService;

    // ─── Upload File ────────────────────────────────────────
    @PostMapping("/upload")
    public ResponseEntity<FileResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "isPublic", defaultValue = "false") boolean isPublic,
            HttpServletRequest request) {
        String userId = getUserId(request);
        log.info("Upload request: user={}, file={}, size={}, isPublic={}",
                userId, file.getOriginalFilename(), file.getSize(), isPublic);
        FileResponse response = fileService.uploadFile(file, isPublic, userId);
        log.info("Upload success: fileId={}", response.getId());
        return ResponseEntity.ok(response);
    }

    // ─── Get All User Files ─────────────────────────────────
    @GetMapping
    public ResponseEntity<List<FileResponse>> getFiles(HttpServletRequest request) {
        String userId = getUserId(request);
        return ResponseEntity.ok(fileService.getUserFiles(userId));
    }

    // ─── Get Stats ──────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<StatsResponse> getStats(HttpServletRequest request) {
        String userId = getUserId(request);
        return ResponseEntity.ok(fileService.getStats(userId));
    }

    // ─── Download File (authenticated) ──────────────────────
    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String fileId,
            HttpServletRequest request) {
        String userId = getUserId(request);
        FileEntity file = fileService.getFile(fileId, userId);
        Resource resource = fileService.downloadFile(file.getStoragePath());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.getFileName() + "\"")
                .body(resource);
    }

    // ─── Delete File ────────────────────────────────────────
    @DeleteMapping("/{fileId}")
    public ResponseEntity<Map<String, String>> deleteFile(
            @PathVariable String fileId,
            HttpServletRequest request) {
        String userId = getUserId(request);
        fileService.deleteFile(fileId, userId);
        return ResponseEntity.ok(Map.of("message", "File deleted successfully"));
    }

    // ─── Toggle Visibility ──────────────────────────────────
    @PutMapping("/{fileId}/toggle-visibility")
    public ResponseEntity<FileResponse> toggleVisibility(
            @PathVariable String fileId,
            HttpServletRequest request) {
        String userId = getUserId(request);
        FileResponse response = fileService.toggleVisibility(fileId, userId);
        return ResponseEntity.ok(response);
    }

    // ─── Public File Info (no auth required) ────────────────
    @GetMapping("/public/{fileId}")
    public ResponseEntity<FileResponse> getPublicFile(@PathVariable String fileId) {
        FileEntity file = fileService.getPublicFile(fileId);
        FileResponse response = FileResponse.builder()
                .id(file.getId())
                .fileName(file.getFileName())
                .fileSize(file.getFileSize())
                .fileType(file.getFileType())
                .isPublic(true)
                .uploadedAt(file.getUploadedAt() != null ? file.getUploadedAt().toString() : null)
                .build();
        return ResponseEntity.ok(response);
    }

    // ─── Public File Download (no auth required) ────────────
    @GetMapping("/public/{fileId}/download")
    public ResponseEntity<Resource> downloadPublicFile(@PathVariable String fileId) {
        FileEntity file = fileService.getPublicFile(fileId);
        Resource resource = fileService.downloadFile(file.getStoragePath());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.getFileName() + "\"")
                .body(resource);
    }

    // ─── Helper ─────────────────────────────────────────────
    private String getUserId(HttpServletRequest request) {
        String userId = (String) request.getAttribute("userId");
        if (userId == null || userId.isBlank()) {
            throw new RuntimeException("Unauthorized: No user ID found");
        }
        return userId;
    }
}
