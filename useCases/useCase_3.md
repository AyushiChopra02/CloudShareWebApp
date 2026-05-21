# Use Case 3 — AWS Services & Serverless

## What it is

Amazon Web Services provides managed infrastructure so you don't have to operate servers yourself. **Amazon S3** stores files with 99.999999999% (11 nines) durability. **AWS Lambda** runs code in response to events without provisioning servers — you pay only for the compute time you consume. **Amazon RDS** gives you a managed MySQL database with automated backups.

> **Student AWS Strategy:** Create a free AWS account. All services below are covered under the **AWS Free Tier** for 12 months (or always-free). Experiment, learn, then delete the resources — you will not be charged if you stay within the limits listed. Set a **billing alert** at $1 in the AWS console the moment you sign up so you get an email if you accidentally go over.

## Why it matters

CloudShare currently stores files in a local `./uploads` directory (`FileStorageService.java`). That directory doesn't survive server crashes, can't scale horizontally, and has no redundancy. If the server dies, **all user files are gone forever**. This is the most critical infrastructure limitation in the current codebase.

---

## Current architecture (what exists today)

```
Upload flow:
  Browser → FileController.upload()
         → FileService.uploadFile()
         → FileStorageService.store()       ← writes to ./uploads/{userId}/{uuid}.ext
         → FileRepository.save(entity)      ← saves metadata to MySQL
         → Subscription counter updated

Download flow:
  Browser → FileController.downloadFile()
         → FileService.downloadFile()
         → FileStorageService.loadAsResource()  ← reads from ./uploads/...
         → Spring serves file bytes through the backend server
```

**Problems with this approach:**

| Problem                       | Impact                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| Local disk storage            | Files lost if server crashes or container is deleted                    |
| Backend serves every download | Every download consumes backend CPU, memory, and bandwidth              |
| No horizontal scaling         | Can't run 2+ backend instances — each has its own `./uploads` directory |
| No redundancy                 | Single point of failure — one disk failure = data loss                  |
| 50 MB file limit              | Spring Boot loads the entire file into memory before writing to disk    |

---

## Target architecture (after S3 migration)

```
Upload flow (after):
  Browser → FileController.upload()
         → FileService.uploadFile()
         → FileStorageService.store()       ← s3Client.putObject() to S3 bucket
         → FileRepository.save(entity)      ← storagePath = S3 key
         → Subscription counter updated

Download flow (after):
  Browser → FileController.downloadFile()
         → FileService generates pre-signed S3 URL (valid 15 min)
         → HTTP 302 redirect to S3
         → Browser downloads directly from S3/CloudFront edge server
```

**What changes:**

| Component                | Before                                  | After                                      |
| ------------------------ | --------------------------------------- | ------------------------------------------ |
| `FileStorageService`     | Writes to local disk                    | Calls `s3Client.putObject()`               |
| `FileController`         | Serves file bytes through backend       | Returns 302 redirect to pre-signed S3 URL  |
| `FileEntity.storagePath` | Relative disk path (`userId/uuid.ext`)  | S3 object key (`uploads/userId/uuid.ext`)  |
| `FileResponse`           | `downloadUrl: /api/files/{id}/download` | Same endpoint, but backend redirects to S3 |
| `pom.xml`                | No AWS dependencies                     | AWS SDK v2 for S3                          |
| `application.properties` | `file.storage.location=./uploads`       | `aws.s3.bucket-name`, `aws.region`         |

---

## AWS Free Tier limits (what you get for free)

| Service                | Free Tier Limit                                  | CloudShare Use Case                                                                             |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Amazon S3**          | 5 GB storage, 20K GET / 2K PUT per month (12 mo) | Replace `FileStorageService.store()` with `s3Client.putObject()`. Store S3 key in `FileEntity`. |
| **Amazon CloudFront**  | 1 TB transfer + 10M requests/month (always free) | Put CloudFront in front of S3. Pre-signed URLs go through CloudFront edge servers.              |
| **Amazon RDS (MySQL)** | 750 hrs/month db.t3.micro, 20 GB (12 mo)         | Change `spring.datasource.url` to point to the RDS endpoint instead of `localhost:3306`.        |
| **AWS Lambda**         | 1M requests/month (always free)                  | Trigger on S3 `s3:ObjectCreated` events for post-processing (thumbnail, metadata extraction).   |
| **Amazon SQS**         | 1M requests/month (always free)                  | After `fileRepository.save()`, publish a message for async processing.                          |
| **Amazon SES**         | 3,000 messages/month (always free from Lambda)   | Email notifications when a shared file is accessed.                                             |

---

## What to implement (specific to CloudShare)

### Step 1 — Add AWS SDK dependency

📁 **File: `cloudShareBackend/pom.xml`**

Add the AWS SDK BOM (Bill of Materials) and S3 client after the existing dependencies:

```xml
<!-- AWS SDK v2 — BOM manages all AWS dependency versions -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>software.amazon.awssdk</groupId>
            <artifactId>bom</artifactId>
            <version>2.25.60</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- In <dependencies> section: -->
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
</dependency>
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3-transfer-manager</artifactId>
</dependency>
```

**Why BOM?** The AWS SDK has dozens of modules. The BOM ensures all modules use compatible versions — you declare the version once and never worry about mismatches.

**Why v2?** AWS SDK v1 is in maintenance mode. V2 is the current actively developed SDK with better performance, async support, and smaller dependency footprint.

---

### Step 2 — Add S3 configuration

📁 **File: `cloudShareBackend/src/main/resources/application.properties`**

```properties
# ─── AWS S3 Storage ───────────────────────────────────────
aws.s3.bucket-name=${AWS_S3_BUCKET_NAME:cloudshare-uploads-dev}
aws.s3.region=${AWS_REGION:us-east-1}
# For local development, use LocalStack (free) or keep disk storage via feature flag
feature.s3-storage.enabled=${S3_STORAGE_ENABLED:false}
```

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/config/S3Config.java`** (new file)

```java
package com.cloudshare.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {

    @Value("${aws.s3.region}")
    private String region;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
}
```

**Why `DefaultCredentialsProvider`?** It checks credentials in this order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. `~/.aws/credentials` file (set up with `aws configure`)
3. IAM role (when running on EC2/ECS/Lambda)

This means the same code works locally, in Docker, and in production — no code changes needed.

---

### Step 3 — Refactor FileStorageService for S3

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileStorageService.java`**

The current service has three methods that need to change:

| Method             | Current behavior                | After S3                                  |
| ------------------ | ------------------------------- | ----------------------------------------- |
| `store()`          | Writes to `./uploads/{userId}/` | Calls `s3Client.putObject()`              |
| `loadAsResource()` | Returns `UrlResource` from disk | Generates a pre-signed URL (valid 15 min) |
| `delete()`         | Deletes file from disk          | Calls `s3Client.deleteObject()`           |

**Recommended approach:** Use a feature flag to support both disk and S3 storage side by side. This lets you migrate gradually without breaking existing functionality.

```java
package com.cloudshare.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.time.Duration;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    @Value("${file.storage.location}")
    private String storageLocation;

    @Value("${feature.s3-storage.enabled:false}")
    private boolean s3Enabled;

    @Value("${aws.s3.bucket-name:}")
    private String bucketName;

    // Injected only when S3 beans are available
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    private Path rootLocation;

    public FileStorageService(
            S3Client s3Client,
            S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    @PostConstruct
    public void init() {
        rootLocation = Paths.get(storageLocation).toAbsolutePath().normalize();
        if (!s3Enabled) {
            try {
                Files.createDirectories(rootLocation);
                log.info("Disk storage ready: {}", rootLocation);
            } catch (IOException e) {
                throw new RuntimeException("Could not create upload dir", e);
            }
        } else {
            log.info("S3 storage enabled — bucket: {}", bucketName);
        }
    }

    // ─── STORE ────────────────────────────────────────────
    public String store(MultipartFile file, String userId) {
        if (file.isEmpty()) {
            throw new RuntimeException("Cannot store empty file.");
        }

        String extension = extractExtension(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + extension;

        if (s3Enabled) {
            return storeToS3(file, userId, storedName);
        }
        return storeToDisk(file, userId, storedName);
    }

    private String storeToS3(MultipartFile file, String userId, String storedName) {
        // S3 key format: uploads/{userId}/{uuid}.ext
        String key = "uploads/" + userId + "/" + storedName;
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            log.info("Stored to S3: s3://{}/{}", bucketName, key);
            return key;
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload to S3: " + e.getMessage(), e);
        }
    }

    private String storeToDisk(MultipartFile file, String userId, String storedName) {
        try {
            Path userDir = rootLocation.resolve(userId);
            Files.createDirectories(userDir);

            Path destinationFile = userDir.resolve(storedName).normalize();
            if (!destinationFile.startsWith(userDir)) {
                throw new RuntimeException("Cannot store file outside user directory.");
            }

            file.transferTo(destinationFile.toFile());
            log.info("Stored to disk: {}", destinationFile);
            return userId + "/" + storedName;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
        }
    }

    // ─── LOAD / DOWNLOAD ─────────────────────────────────
    public Resource loadAsResource(String storagePath) {
        if (s3Enabled) {
            throw new UnsupportedOperationException(
                    "Use generatePresignedUrl() for S3 downloads");
        }
        try {
            Path filePath = rootLocation.resolve(storagePath).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new RuntimeException("File not found: " + storagePath);
        } catch (MalformedURLException e) {
            throw new RuntimeException("File not found: " + storagePath, e);
        }
    }

    /**
     * Generate a pre-signed S3 URL valid for 15 minutes.
     * The browser downloads directly from S3 — no backend bandwidth used.
     */
    public String generatePresignedUrl(String s3Key) {
        GetObjectPresignRequest presignReq = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(r -> r.bucket(bucketName).key(s3Key))
                .build();
        String url = s3Presigner.presignGetObject(presignReq).url().toString();
        log.debug("Pre-signed URL generated for key: {}", s3Key);
        return url;
    }

    // ─── DELETE ───────────────────────────────────────────
    public void delete(String storagePath) {
        if (s3Enabled) {
            deleteFromS3(storagePath);
        } else {
            deleteFromDisk(storagePath);
        }
    }

    private void deleteFromS3(String s3Key) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build());
        log.info("Deleted from S3: {}", s3Key);
    }

    private void deleteFromDisk(String storagePath) {
        try {
            Path file = rootLocation.resolve(storagePath).normalize();
            Files.deleteIfExists(file);
            log.info("Deleted from disk: {}", file);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + storagePath, e);
        }
    }

    // ─── HELPERS ──────────────────────────────────────────
    public boolean isS3Enabled() {
        return s3Enabled;
    }

    private String extractExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf("."));
        }
        return "";
    }
}
```

---

### Step 4 — Update FileController for S3 downloads

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/controller/FileController.java`**

The download endpoints currently load the file as a `Resource` and stream it through Spring Boot. With S3, generate a pre-signed URL and redirect the browser:

```java
// ─── Download File (authenticated) ──────────────────────
@GetMapping("/{fileId}/download")
public ResponseEntity<?> downloadFile(
        @PathVariable String fileId,
        HttpServletRequest request) {
    String userId = getUserId(request);
    FileEntity file = fileService.getFile(fileId, userId);

    if (fileStorageService.isS3Enabled()) {
        // Redirect to S3 — browser downloads directly from AWS
        String presignedUrl = fileStorageService.generatePresignedUrl(file.getStoragePath());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, presignedUrl)
                .build();
    }

    // Disk storage — serve through backend (existing behavior)
    Resource resource = fileService.downloadFile(file.getStoragePath());
    return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(file.getFileType()))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + file.getFileName() + "\"")
            .body(resource);
}

// ─── Public File Download (no auth required) ────────────
@GetMapping("/public/{fileId}/download")
public ResponseEntity<?> downloadPublicFile(@PathVariable String fileId) {
    FileEntity file = fileService.getPublicFile(fileId);

    if (fileStorageService.isS3Enabled()) {
        String presignedUrl = fileStorageService.generatePresignedUrl(file.getStoragePath());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, presignedUrl)
                .build();
    }

    Resource resource = fileService.downloadFile(file.getStoragePath());
    return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(file.getFileType()))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + file.getFileName() + "\"")
            .body(resource);
}
```

**Why HTTP 302 redirect instead of piping bytes?**

- With disk storage: `Browser → Spring Boot (reads file) → Browser` — backend uses CPU, memory, and bandwidth for every download.
- With S3 redirect: `Browser → Spring Boot (returns URL) → Browser → S3 edge server` — backend does almost no work. S3 and CloudFront serve the file from a location close to the user.

---

### Step 5 — Create the S3 bucket with Terraform

📁 **File: `infrastructure/terraform/s3.tf`** (new file)

```hcl
provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "dev"
}

# ─── S3 Bucket ────────────────────────────────────────────
resource "aws_s3_bucket" "cloudshare_uploads" {
  bucket = "cloudshare-uploads-${var.environment}"
}

# ─── Encryption at rest ──────────────────────────────────
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads_sse" {
  bucket = aws_s3_bucket.cloudshare_uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─── Block ALL public access ─────────────────────────────
# Files are served via pre-signed URLs only — never publicly
resource "aws_s3_bucket_public_access_block" "uploads_block" {
  bucket                  = aws_s3_bucket.cloudshare_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── Versioning (disaster recovery) ──────────────────────
# Deleted files can be restored from a previous version
resource "aws_s3_bucket_versioning" "uploads_versioning" {
  bucket = aws_s3_bucket.cloudshare_uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# ─── Lifecycle rule ──────────────────────────────────────
# Move old versions to cheaper storage after 30 days, delete after 90
resource "aws_s3_bucket_lifecycle_configuration" "uploads_lifecycle" {
  bucket = aws_s3_bucket.cloudshare_uploads.id
  rule {
    id     = "archive-old-versions"
    status = "Enabled"
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# ─── CORS (so browser can redirect to S3 download) ──────
resource "aws_s3_bucket_cors_configuration" "uploads_cors" {
  bucket = aws_s3_bucket.cloudshare_uploads.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT"]
    allowed_origins = ["http://localhost:5173", "https://yourdomain.com"]
    max_age_seconds = 3600
  }
}
```

```bash
# Usage:
cd infrastructure/terraform
terraform init
terraform plan        # preview what will be created
terraform apply       # create the S3 bucket
# When done learning:
terraform destroy     # delete everything — no surprise charges
```

---

### Step 6 — Configure AWS credentials locally

```bash
# Install AWS CLI (free):
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# Configure credentials (creates ~/.aws/credentials):
aws configure
# AWS Access Key ID: (from IAM console)
# AWS Secret Access Key: (from IAM console)
# Default region: us-east-1
# Output format: json
```

📁 **Add to `.env` and `.env.example`:**

```bash
# ─── AWS ───────────────────────────────────────────────────
AWS_S3_BUCKET_NAME=cloudshare-uploads-dev
AWS_REGION=us-east-1
S3_STORAGE_ENABLED=false
# AWS credentials are read from ~/.aws/credentials or these env vars:
# AWS_ACCESS_KEY_ID=your_key_here
# AWS_SECRET_ACCESS_KEY=your_secret_here
```

📁 **Add to `docker-compose.yml` backend environment:**

```yaml
backend:
  environment:
    # ... existing vars ...
    AWS_S3_BUCKET_NAME: ${AWS_S3_BUCKET_NAME:-cloudshare-uploads-dev}
    AWS_REGION: ${AWS_REGION:-us-east-1}
    S3_STORAGE_ENABLED: ${S3_STORAGE_ENABLED:-false}
    AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:-}
    AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:-}
```

> **Security note:** Never commit `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` to git. They go in `.env` (which is in `.gitignore`) and in GitHub Actions secrets for CI/CD.

---

### Step 7 — Local development with LocalStack (optional, free)

**LocalStack** is a free, open-source tool that emulates AWS services locally. You can test S3 uploads without an actual AWS account.

📁 **Add to `docker-compose.yml`:**

```yaml
services:
  # ... existing services ...

  localstack:
    image: localstack/localstack:latest
    container_name: cloudshare-localstack
    ports:
      - "4566:4566" # LocalStack gateway
    environment:
      SERVICES: s3
      DEFAULT_REGION: us-east-1
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  # ... existing volumes ...
  localstack_data:
```

📁 **Add to `application.properties` (for local dev only):**

```properties
# Override S3 endpoint to hit LocalStack instead of real AWS
# Remove or comment this out for production
aws.s3.endpoint-override=${AWS_S3_ENDPOINT:}
```

📁 **Update `S3Config.java` to support LocalStack:**

```java
@Value("${aws.s3.endpoint-override:}")
private String endpointOverride;

@Bean
public S3Client s3Client() {
    var builder = S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(DefaultCredentialsProvider.create());

    // LocalStack or custom endpoint
    if (endpointOverride != null && !endpointOverride.isBlank()) {
        builder.endpointOverride(URI.create(endpointOverride))
               .forcePathStyle(true);  // required for LocalStack
    }

    return builder.build();
}
```

```bash
# Create the bucket in LocalStack:
aws --endpoint-url=http://localhost:4566 s3 mb s3://cloudshare-uploads-dev

# List buckets:
aws --endpoint-url=http://localhost:4566 s3 ls

# Upload a test file:
aws --endpoint-url=http://localhost:4566 s3 cp test.txt s3://cloudshare-uploads-dev/test.txt

# List files:
aws --endpoint-url=http://localhost:4566 s3 ls s3://cloudshare-uploads-dev/
```

---

## Future AWS services (after S3 is working)

### Amazon RDS — Managed MySQL

Replace your local/Docker MySQL with a managed instance. Automated backups, patching, and failover.

📁 **File: `cloudShareBackend/src/main/resources/application.properties`**

```properties
# Change from:
spring.datasource.url=jdbc:mysql://localhost:3306/cloudshare_db?...

# To (RDS endpoint from AWS console):
spring.datasource.url=jdbc:mysql://cloudshare-db.abc123.us-east-1.rds.amazonaws.com:3306/cloudshare_db?...
```

Free tier: 750 hrs/month `db.t3.micro`, 20 GB SSD (12 months).

---

### Amazon CloudFront — CDN for downloads

Put CloudFront in front of S3 so files are served from edge locations worldwide. Users in Tokyo get files from a Tokyo edge server, not your US-East S3 bucket.

```
Before:  Browser → S3 pre-signed URL → S3 us-east-1 (200ms+ latency from Asia)
After:   Browser → CloudFront URL → Edge server near user (20ms latency)
```

Free tier: 1 TB transfer + 10M requests/month (always free).

---

### AWS Lambda — Post-upload processing

Trigger a Lambda function when a file is uploaded to S3. Use it for:

- Generating thumbnails for images
- Extracting metadata (dimensions, duration, page count)
- Virus scanning with ClamAV
- Sending email notifications

```
S3 ObjectCreated event → Lambda function → writes metadata to DynamoDB or back to RDS
```

Free tier: 1M requests/month (always free).

---

### Amazon SQS — Async processing

Instead of directly triggering Lambda from S3, publish a message to SQS. This gives you retry logic, dead-letter queues, and decouples the upload from processing.

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileService.java`**

```java
// After fileRepository.save(entity):
sqsTemplate.send("cloudshare-uploads", Map.of(
    "fileId", entity.getId(),
    "userId", entity.getUserId(),
    "s3Key", entity.getStoragePath(),
    "fileType", entity.getFileType()
));
```

Free tier: 1M requests/month (always free).

---

## Migration checklist

| Step | Task                                              | Difficulty | Reversible?                                    |
| ---- | ------------------------------------------------- | ---------- | ---------------------------------------------- |
| 1    | Add AWS SDK to `pom.xml`                          | Easy       | Yes — just remove the dependency               |
| 2    | Create `S3Config.java`                            | Easy       | Yes — delete the file                          |
| 3    | Add `feature.s3-storage.enabled=false` to props   | Easy       | Yes — it defaults to `false`                   |
| 4    | Refactor `FileStorageService` with feature flag   | Medium     | Yes — flag keeps disk storage working          |
| 5    | Update `FileController` download endpoints        | Medium     | Yes — flag guards the redirect                 |
| 6    | Create S3 bucket (Terraform or AWS console)       | Easy       | Yes — `terraform destroy` or delete in console |
| 7    | Set `S3_STORAGE_ENABLED=true` in `.env`           | Easy       | Yes — set back to `false`                      |
| 8    | Test upload/download/delete with S3               | Medium     | N/A                                            |
| 9    | Migrate existing files from disk to S3            | Hard       | Write a migration script — copy, don't move    |
| 10   | Remove disk storage code (optional, after stable) | Easy       | Keep it behind the flag forever if you want    |

---

## Key concepts explained

### Pre-signed URLs — why they matter

A pre-signed URL is a time-limited URL that grants temporary access to a private S3 object. It contains your credentials encoded in the URL itself (safe because it expires).

```
https://cloudshare-uploads-dev.s3.amazonaws.com/uploads/user123/abc.pdf
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=AKIA.../20260520/us-east-1/s3/aws4_request
  &X-Amz-Date=20260520T120000Z
  &X-Amz-Expires=900           ← expires in 15 minutes
  &X-Amz-Signature=abc123...   ← HMAC signature
```

**Benefits:**

- S3 bucket stays private — no public access
- Backend generates the URL in <1ms — no file I/O
- Browser downloads directly from S3/CloudFront — backend uses zero bandwidth
- URL expires — even if leaked, it stops working after 15 minutes

### S3 object key design

```
s3://cloudshare-uploads-dev/
  └── uploads/
      ├── user_abc123/
      │   ├── 550e8400-e29b-41d4-a716-446655440000.pdf
      │   ├── 6ba7b810-9dad-11d1-80b4-00c04fd430c8.jpg
      │   └── ...
      └── user_def456/
          └── ...
```

The key prefix `uploads/{userId}/` provides logical isolation. IAM policies can restrict access per prefix, so even if credentials leak, users can only access their own files.

### Feature flags — safe migration

The `feature.s3-storage.enabled` flag means:

- `false` (default): Everything works exactly as before — disk storage
- `true`: All new uploads go to S3, downloads redirect to pre-signed URLs

You can flip this flag without redeploying code. This is the safest way to migrate — if S3 has issues, set the flag back to `false` instantly.

---

## Common issues and fixes

| Problem                                          | Cause                                                       | Fix                                                                     |
| ------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| `NoSuchBucketException`                          | S3 bucket doesn't exist                                     | Create it: `aws s3 mb s3://cloudshare-uploads-dev`                      |
| `AccessDeniedException` on putObject             | IAM user lacks S3 permissions                               | Attach `AmazonS3FullAccess` policy (dev only — restrict in production)  |
| `SignatureDoesNotMatch`                          | Wrong region or clock skew                                  | Verify `AWS_REGION` matches the bucket's region; sync system clock      |
| Pre-signed URL returns `AccessDenied`            | URL expired or bucket has block-public-access misconfigured | Check expiration; pre-signed URLs work even with block-public-access    |
| Large file upload timeout                        | Spring Boot default timeout too low for big files           | Already set `max-file-size=50MB` — consider multipart upload for >100MB |
| `SdkClientException: Unable to load credentials` | No AWS credentials configured                               | Run `aws configure` or set `AWS_ACCESS_KEY_ID` in `.env`                |
| Existing files on disk not accessible after S3   | Old files still have disk paths in DB                       | Write a migration script to copy disk files to S3 and update DB paths   |
| S3 charges after free tier                       | Forgot to delete resources                                  | `terraform destroy` or delete bucket in AWS console; set billing alert  |

---

## Estimated AWS Free Tier usage for CloudShare

Assuming a student project with ~50 users, ~500 files, ~2 GB total storage:

| Resource            | Free Tier Limit | Expected Usage | Over Limit? |
| ------------------- | --------------- | -------------- | ----------- |
| S3 storage          | 5 GB            | ~2 GB          | No          |
| S3 PUT requests     | 2,000/month     | ~100/month     | No          |
| S3 GET requests     | 20,000/month    | ~1,000/month   | No          |
| RDS hours           | 750 hrs/month   | 720 hrs (24/7) | No          |
| RDS storage         | 20 GB           | ~1 GB          | No          |
| CloudFront transfer | 1 TB/month      | ~5 GB/month    | No          |
| Lambda invocations  | 1M/month        | ~100/month     | No          |
| Data transfer out   | 100 GB/month    | ~5 GB/month    | No          |

**Total cost: $0.00** within Free Tier limits. Set a $1 billing alert as a safety net.

---

## Summary — what changes where

| File                                   | Change                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `pom.xml`                              | Add AWS SDK v2 BOM + S3 dependency                             |
| `application.properties`               | Add `aws.s3.*` and `feature.s3-storage.enabled` properties     |
| `S3Config.java` (new)                  | Bean definitions for `S3Client` and `S3Presigner`              |
| `FileStorageService.java`              | Refactor with feature flag — disk or S3 based on config        |
| `FileController.java`                  | Download endpoints return 302 redirect when S3 is enabled      |
| `docker-compose.yml`                   | Add AWS env vars to backend; optionally add LocalStack service |
| `.env` / `.env.example`                | Add `AWS_S3_BUCKET_NAME`, `AWS_REGION`, `S3_STORAGE_ENABLED`   |
| `infrastructure/terraform/s3.tf` (new) | S3 bucket with encryption, versioning, lifecycle, CORS         |
