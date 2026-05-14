# CloudShare — Production Scaling Feature Roadmap

> A comprehensive guide to evolving CloudShare from a working side-project into a production-grade, enterprise-ready platform.
> Current stack: **Spring Boot 3.2 / Java 17 · React 19 / Vite · MySQL · Clerk Auth · Local File Storage**

> **Student Note:** Everything in this roadmap is achievable for free or very low cost. AWS has a generous **12-month Free Tier** — create an account, experiment, and delete the resources when you're done (no charges if you stay within limits). Most tools listed (Docker, GitHub Actions, Prometheus, Grafana, Sentry, Terraform, Flyway, Bucket4j, Unleash) are **100% free and open-source**. The **GitHub Student Developer Pack** (education.github.com) also gives free access to many paid tools including GitHub Pro, Namecheap domains, and more. Where a tool costs money, a free alternative is noted.

> **How to read this file:** Every suggestion below is tied to a specific file in the project. Look for the `📁 File:` labels to know exactly where to make each change. Suggestions are ordered by priority — do Phase 1 first.

---

## Table of Contents

1. [CI/CD & GitHub Actions](#1-cicd--github-actions)
2. [Containerization — Docker & Kubernetes](#2-containerization--docker--kubernetes)
3. [AWS Services & Serverless](#3-aws-services--serverless)
4. [Redis Caching](#4-redis-caching)
5. [Observability — Logging, Metrics & Tracing](#5-observability--logging-metrics--tracing)
6. [Security Hardening](#6-security-hardening)
7. [Database — Migrations, Replicas & Scaling](#7-database--migrations-replicas--scaling)
8. [API Design & Versioning](#8-api-design--versioning)
9. [Testing Strategy](#9-testing-strategy)
10. [CDN & Static Asset Delivery](#10-cdn--static-asset-delivery)
11. [Rate Limiting & Throttling](#11-rate-limiting--throttling)
12. [Asynchronous Processing & Message Queues](#12-asynchronous-processing--message-queues)
13. [Feature Flags & Progressive Rollouts](#13-feature-flags--progressive-rollouts)
14. [Secrets Management](#14-secrets-management)
15. [Infrastructure as Code (IaC)](#15-infrastructure-as-code-iac)
16. [Error Tracking & Incident Management](#16-error-tracking--incident-management)
17. [Performance Optimization](#17-performance-optimization)
18. [Multi-Tenancy & Data Isolation](#18-multi-tenancy--data-isolation)
19. [Backup, Disaster Recovery & High Availability](#19-backup-disaster-recovery--high-availability)
20. [Documentation & Developer Experience](#20-documentation--developer-experience)

---

## 1. CI/CD & GitHub Actions

### What it is

Continuous Integration / Continuous Deployment automates building, testing, and deploying your code every time you push to a branch. GitHub Actions is GitHub's built-in workflow engine that runs these pipelines.

> **Cost:** GitHub Actions is **completely free** for public repositories. For private repos it gives 2,000 free minutes/month — more than enough for a student project. GitHub Student Developer Pack bumps this further.

### Why it matters

Without CI/CD, every release is manual, error-prone, and scary. At production scale, teams ship dozens of changes per day — automated pipelines are the only way to do that safely.

### What to do for CloudShare (specific to your code)

📁 **File: `.github/workflows/ci.yml`** (create this file)

Your project has two modules — `cloudShareBackend/` (Maven) and `cloudShareWebapp/` (Vite/Node). The pipeline needs to build and test both. Right now there are **zero tests** — add JUnit tests first so the CI gate is meaningful.

| Area               | Specific Action                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend CI**     | Run `cd cloudShareBackend && mvn verify` — this compiles + runs tests. Currently will pass trivially because there are no tests yet.                                             |
| **Frontend CI**    | Run `cd cloudShareWebapp && npm ci && npm run lint && npm run build` — the `lint` script already exists in `package.json`.                                                       |
| **Secrets in CI**  | Your `application.properties` has `spring.datasource.password=020705` hardcoded. In CI, inject it as a GitHub Actions secret instead: `DB_PASSWORD: ${{ secrets.DB_PASSWORD }}`. |
| **Docker publish** | On merge to `main`, build and push to **GitHub Container Registry (ghcr.io)** — it's free for public repos.                                                                      |

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: "17", distribution: "temurin" }
      - run: cd cloudShareBackend && mvn verify --no-transfer-progress
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          CLERK_ISSUER: ${{ secrets.CLERK_ISSUER }}

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd cloudShareWebapp && npm ci && npm run lint && npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
```

---

## 2. Containerization — Docker & Kubernetes

### What it is

**Docker** packages your app + all its dependencies into a portable image that runs identically everywhere. **Kubernetes (K8s)** orchestrates many containers: auto-scaling, self-healing, rolling deployments, and service discovery.

> **Cost:** Docker Desktop is **free** for students and personal use. All Docker/Kubernetes tools below are free. For local Kubernetes, use **minikube** (free) instead of a paid cloud cluster. `docker-compose` is the most important thing to set up first — it lets you run the entire stack locally with one command.

### Why it matters

"Works on my machine" disappears. You can spin up an identical copy of your entire stack in seconds — locally, in CI, or in production. Kubernetes lets you handle traffic spikes by automatically adding more instances.

### What to do for CloudShare (specific to your code)

📁 **Files to create:** `cloudShareBackend/Dockerfile`, `cloudShareWebapp/Dockerfile`, `docker-compose.yml` (root)

Your backend uses `file.storage.location=./uploads` in `application.properties` — this path breaks inside Docker because the container's filesystem is ephemeral. The `docker-compose.yml` must mount a volume for `./uploads` until you migrate to S3.

```dockerfile
# cloudShareBackend/Dockerfile
FROM maven:3-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
# docker-compose.yml (root of workspace)
version: "3.9"
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: cloudshare_db
    ports: ["3306:3306"]
    volumes: [mysql_data:/var/lib/mysql]

  backend:
    build: ./cloudShareBackend
    ports: ["8080:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/cloudshare_db
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      CLERK_ISSUER: ${CLERK_ISSUER}
      CLERK_JWKS_URL: ${CLERK_JWKS_URL}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
    volumes:
      - uploads_data:/app/uploads # persist uploads between restarts
    depends_on: [mysql]

  frontend:
    build: ./cloudShareWebapp
    ports: ["5173:80"]
    environment:
      VITE_API_BASE_URL: http://localhost:8080/api

volumes:
  mysql_data:
  uploads_data:
```

| Area                      | Specific Action                                                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Environment variables** | Your `ClerkAuthFilter` reads `clerk.jwks-url` and `clerk.issuer` via `@Value`. In Docker, override these with env vars: `CLERK_JWKS_URL` and `CLERK_ISSUER` — Spring Boot maps `CLERK_JWKS_URL` → `clerk.jwks-url` automatically. |
| **Upload volume**         | `FileStorageService` stores at `./uploads/{userId}/` — mount this as a Docker volume until S3 is ready.                                                                                                                           |
| **Health probe**          | You already have `/api/health` in `HealthController` — use it in `docker-compose` with `healthcheck: test: curl -f http://localhost:8080/api/health`.                                                                             |

---

## 3. AWS Services & Serverless

### What it is

Amazon Web Services provides managed infrastructure so you don't have to operate servers yourself. **AWS Lambda** runs code in response to events without provisioning servers — you pay only for the compute time you consume.

### Why it matters

CloudShare currently stores files in a local `./uploads` directory (`FileStorageService.java`). That directory doesn't survive container restarts, can't scale horizontally, and has no redundancy. This is the most critical infrastructure limitation in the current codebase.

> **Student AWS Strategy:** Create a free AWS account. All services below are covered under the **AWS Free Tier** for 12 months (or always-free). Experiment, learn, then delete the resources — you will not be charged if you stay within the limits listed. Set a **billing alert** at $1 in the AWS console the moment you sign up so you get an email if you accidentally go over.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileStorageService.java`** — this entire service needs to be replaced with an S3 implementation.

The current `store()` method writes to `rootLocation.resolve(userId).resolve(storedName)` on disk. Replace this with an `AmazonS3.putObject()` call. The `loadAsResource()` method that serves downloads should be replaced with a **pre-signed URL** (a temporary download link) so files are served directly from S3, not through your Spring Boot server.

| Service                 | Free Tier Limit                                                                      | What to Change in Your Code                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Amazon S3**           | 5 GB storage, 20K GET / 2K PUT/month (12 months)                                     | Replace `FileStorageService.store()` to call `s3Client.putObject()`. Return the S3 key as `storagePath` in `FileEntity`. |
| **Amazon CloudFront**   | 1 TB transfer + 10M requests/month (always free)                                     | Put CloudFront in front of S3. Use CloudFront URL in `FileResponse` instead of your API download URL.                    |
| **Amazon RDS (MySQL)**  | 750 hrs/month db.t3.micro, 20 GB (12 months)                                         | Change `spring.datasource.url` in `application.properties` to point to the RDS endpoint.                                 |
| **AWS Lambda**          | 1M requests/month (always free)                                                      | Create a Lambda triggered by S3 `s3:ObjectCreated` events to do post-processing (thumbnail, metadata extraction).        |
| **Amazon SQS**          | 1M requests/month (always free)                                                      | After `fileRepository.save(entity)` in `FileService.uploadFile()`, publish an SQS message for async processing.          |
| **Amazon SES**          | 3,000 messages/month (always free from Lambda)                                       | Add email notifications when a shared file is accessed.                                                                  |
| **AWS Secrets Manager** | **Not free** — $0.40/secret/month. Use `.env` locally; GitHub Actions secrets in CI. | —                                                                                                                        |
| **Amazon ElastiCache**  | **Not in free tier.** Use local Redis via Docker or **Upstash** (free).              | —                                                                                                                        |

```java
// What FileStorageService.store() should look like after S3 migration
public String store(MultipartFile file, String userId) {
    String key = "uploads/" + userId + "/" + UUID.randomUUID() + getExtension(file);
    s3Client.putObject(PutObjectRequest.builder()
        .bucket(bucketName)
        .key(key)
        .contentType(file.getContentType())
        .build(),
        RequestBody.fromBytes(file.getBytes()));
    return key; // stored as storagePath in FileEntity
}

// Pre-signed URL for download (replaces loadAsResource())
public String generatePresignedUrl(String s3Key) {
    GetObjectPresignRequest req = GetObjectPresignRequest.builder()
        .signatureDuration(Duration.ofMinutes(15))
        .getObjectRequest(r -> r.bucket(bucketName).key(s3Key))
        .build();
    return s3Presigner.presignGetObject(req).url().toString();
}
```

```
# Architecture after S3 migration
Upload → FileController → FileService → FileStorageService (S3)
                                      → FileRepository (MySQL/RDS)
                                      → SQS message → Lambda (thumbnail/scan)
Download → FileController → generate pre-signed S3 URL → redirect to S3
```

---

## 4. Redis Caching

### What it is

Redis is an in-memory data store that serves data in **sub-millisecond** response times. It's commonly used as a cache layer, session store, rate-limiter backend, and pub/sub message broker.

> **Cost:** Redis itself is **free and open-source**. Run it locally with Docker (`docker run -p 6379:6379 redis:alpine`) at zero cost. For a hosted option, **Upstash** offers a free tier (10K commands/day, 256 MB) — perfect for a student project. AWS ElastiCache is **not** in the free tier, so skip it for now.

### Why it matters

Database queries are expensive. If 1,000 users hit the dashboard simultaneously, that's 1,000 identical SQL queries for stats. A Redis cache can serve that data from memory and reduce DB load by 90%+.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileService.java`**

Two methods are expensive today and are perfect caching candidates:

1. **`getStats()`** — calls `fileRepository.countByUserId()`, `sumFileSizeByUserId()`, `countByUserIdAndIsPublicTrue()`, `countByUserIdAndIsPublicFalse()`, AND fetches all files just to count `recentUploads`. That's **5 queries on every dashboard load**.
2. **`getUserFiles()`** — fetches all files for the user on every page visit. Cache with a short TTL.

📁 **File: `cloudShareBackend/pom.xml`** — add the Redis dependency:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

📁 **File: `cloudShareBackend/src/main/resources/application.properties`** — add:

```properties
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.cache.type=redis
```

```java
// In FileService.java — add these annotations:

@Cacheable(value = "userStats", key = "#userId", unless = "#result == null")
public StatsResponse getStats(String userId) {
    // current implementation — only runs on cache miss
}

@CacheEvict(value = "userStats", key = "#userId")
@Transactional
public FileResponse uploadFile(MultipartFile file, boolean isPublic, String userId) {
    // invalidate stats cache after every upload
}

@CacheEvict(value = "userStats", key = "#userId")
@Transactional
public void deleteFile(String fileId, String userId) {
    // invalidate stats cache after delete
}
```

Also fix the inefficient `recentUploads` count in `getStats()` — add a proper query to `FileRepository` instead of fetching all files:

```java
// In FileRepository.java — add this method:
@Query("SELECT COUNT(f) FROM FileEntity f WHERE f.userId = :userId AND f.uploadedAt >= :since")
long countRecentUploads(String userId, LocalDateTime since);
```

---

## 5. Observability — Logging, Metrics & Tracing

### What it is

Observability is the ability to understand what's happening inside your system by examining its outputs. The three pillars are:

- **Logs** — Discrete events (e.g., "user uploaded a file")
- **Metrics** — Numeric measurements over time (e.g., request latency p99)
- **Traces** — The journey of a single request across services

> **Cost:** Prometheus, Grafana, Jaeger, OpenTelemetry, and Logback are all **100% free and open-source**. Run the whole stack locally via Docker Compose. **Sentry** has a free tier (5,000 errors/month) — enough for a student project. AWS CloudWatch has a free tier (5 GB logs/month) but ELK Stack on Docker is simpler and free.

### Why it matters

When something breaks at 3 AM, observability is how you find out _what_ broke, _why_, and _how to fix it_ — without guessing. Production systems without observability are flying blind.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/config/ClerkAuthFilter.java`**

You already use SLF4J (`Logger log = LoggerFactory.getLogger(...)`). The logging is good, but there's a security concern: `log.info("Token decoded - kid: {}, iss: {}, sub: {}, exp: {}", ...)` — this logs the JWT `kid` and subject at INFO level in production. Reduce this to DEBUG level.

📁 **File: `cloudShareBackend/pom.xml`** — add Actuator + Micrometer for metrics:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

📁 **File: `cloudShareBackend/src/main/resources/application.properties`** — expose Prometheus endpoint:

```properties
management.endpoints.web.exposure.include=health,info,prometheus,metrics
management.endpoint.health.show-details=always
# Disable SQL logging in production (it's currently always on)
spring.jpa.show-sql=false
```

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileService.java`** — add custom metrics:

```java
// Inject MeterRegistry and track upload count by plan type
private final MeterRegistry meterRegistry;

public FileResponse uploadFile(...) {
    // existing code ...
    meterRegistry.counter("cloudshare.uploads.total",
        "plan", sub.getPlan(),
        "visibility", isPublic ? "public" : "private").increment();
    meterRegistry.gauge("cloudshare.storage.bytes", sub.getStorageUsedBytes());
}
```

| Area                   | Tool (Free)                          | What to Add                                                                                                 |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Structured logging** | SLF4J + Logback — already in project | Add `logback-spring.xml` with JSON encoder (Logstash encoder). Change `System.out.println` → proper logger. |
| **Metrics endpoint**   | Micrometer + Prometheus — free       | Add actuator dependency; expose `/actuator/prometheus`.                                                     |
| **Dashboards**         | Grafana — free                       | Add to `docker-compose.yml`. Pre-built Spring Boot dashboard available at grafana.com (ID 4701).            |
| **Token logging fix**  | Already using SLF4J                  | Move `ClerkAuthFilter` token details from INFO → DEBUG to avoid leaking JWT metadata in prod logs.          |

---

## 6. Security Hardening

### What it is

Production security goes far beyond authentication. It includes protecting data at rest and in transit, defending against common attacks (OWASP Top 10), and following the principle of least privilege everywhere.

### Why it matters

A single vulnerability can leak every user's files. Security isn't a feature — it's a baseline requirement. Real engineering teams have security reviews, automated scanning, and defense-in-depth strategies.

### What to do for CloudShare (specific to your code)

**⚠️ Critical issues found in the current codebase:**

📁 **File: `cloudShareBackend/src/main/resources/application.properties`**

```properties
# CURRENT — DANGEROUS, never commit this:
spring.datasource.password=020705
clerk.issuer=https://knowing-pika-78.clerk.accounts.dev
clerk.jwks-url=https://knowing-pika-78.clerk.accounts.dev/.well-known/jwks.json
```

Replace with environment variable references immediately:

```properties
# FIXED — values injected at runtime from .env or CI secrets:
spring.datasource.password=${DB_PASSWORD}
clerk.issuer=${CLERK_ISSUER}
clerk.jwks-url=${CLERK_JWKS_URL}
cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

Create a `.env` file (add it to `.gitignore`) with the real values for local development.

---

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/config/GlobalExceptionHandler.java`**

The current handler catches `RuntimeException` and returns the raw `ex.getMessage()` directly to the client. This can leak internal details (e.g., JPA column names, SQL fragments). Add a safe error DTO:

```java
// Replace Map.of("error", ex.getMessage()) with a structured DTO
record ErrorResponse(String code, String message, String timestamp, String path) {}

// In the handler:
return ResponseEntity.status(status).body(new ErrorResponse(
    deriveErrorCode(ex),         // "NOT_FOUND", "LIMIT_REACHED", etc.
    sanitizeMessage(ex),         // never expose stack trace or SQL details
    Instant.now().toString(),
    request.getRequestURI()      // inject HttpServletRequest
));
```

---

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/controller/TransactionController.java`**

`getTransactions()` returns `List<Transaction>` (the JPA entity) directly. This exposes all database columns to the client. Create a `TransactionResponse` DTO and map to it — same pattern as `FileResponse` already does for `FileEntity`.

---

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileStorageService.java`**

The path traversal guard `destinationFile.startsWith(userDir)` is correct and good. Keep it. But also add a file type allowlist in `FileService.uploadFile()`:

```java
private static final Set<String> ALLOWED_TYPES = Set.of(
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/plain",
    "application/zip", "video/mp4", "audio/mpeg"
    // add types your app should support
);

if (!ALLOWED_TYPES.contains(file.getContentType())) {
    throw new IllegalArgumentException("File type not allowed: " + file.getContentType());
}
```

---

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/config/CorsConfig.java`**

CORS is currently reading `cors.allowed-origins` from properties, which is good. But in production, make sure that value is `https://yourdomain.com` — not `localhost`. Also add the `cors.allowed-origins` key to your `.env` file.

📁 **File: `cloudShareWebapp/src/App.jsx`**

Add an `<ErrorBoundary>` around the app to catch React render errors gracefully — this prevents a blank white screen when a component crashes:

```jsx
// Install: npm install react-error-boundary
import { ErrorBoundary } from "react-error-boundary";

const App = () => (
  <ErrorBoundary fallback={<div>Something went wrong. Please refresh.</div>}>
    <BrowserRouter>{/* existing routes */}</BrowserRouter>
  </ErrorBoundary>
);
```

| Area                               | Specific File                 | Action                                                             |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| **Secrets in plaintext**           | `application.properties`      | Move `020705`, Clerk URLs to `.env` + env vars. **Do this first.** |
| **Entity exposed as API response** | `TransactionController.java`  | Return `TransactionResponse` DTO, not raw `Transaction` entity.    |
| **Unsafe error messages**          | `GlobalExceptionHandler.java` | Sanitize messages before returning to client.                      |
| **File type validation**           | `FileService.java`            | Add allowlist for accepted MIME types.                             |
| **React error boundary**           | `App.jsx`                     | Wrap routes in `ErrorBoundary` to prevent blank screen crashes.    |
| **Helmet.js**                      | `cloudShareWebapp`            | `npm install helmet` (or use meta tags) for security headers.      |

---

## 7. Database — Migrations, Replicas & Scaling

### What it is

Production databases need version-controlled schema changes (migrations), read replicas for scaling reads, connection pooling, and proper indexing. `ddl-auto=update` is dangerous in production because Hibernate can silently alter your schema.

### Why it matters

One bad migration can corrupt data or cause downtime. Read-heavy workloads (like a file-sharing dashboard) need read replicas so the primary isn't overwhelmed. Connection pooling prevents running out of DB connections under load.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/src/main/resources/application.properties`**

```properties
# CURRENT — dangerous in production:
spring.jpa.hibernate.ddl-auto=update

# CHANGE TO:
spring.jpa.hibernate.ddl-auto=validate  # or 'none' — Flyway will own schema
```

📁 **File: `cloudShareBackend/pom.xml`** — add Flyway:

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>
</dependency>
```

📁 **Directory to create:** `cloudShareBackend/src/main/resources/db/migration/`

You already have `schema.sql` — convert it to a Flyway migration file:

```sql
-- src/main/resources/db/migration/V1__baseline_schema.sql
-- Move contents of your existing schema.sql here.
-- Flyway will run this exactly once and track it.
CREATE TABLE IF NOT EXISTS files (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(255) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  storage_path VARCHAR(1000) NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_public (is_public)
);
-- ... rest of tables from schema.sql
```

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/entity/FileEntity.java`**

`FileEntity` is missing an `updatedAt` field and a `deletedAt` field (for soft deletes). Add:

```java
@UpdateTimestamp
@Column
private LocalDateTime updatedAt;

// For soft deletes (optional, add later):
@Column
private LocalDateTime deletedAt;
```

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/entity/Subscription.java`**

Missing `createdAt` and `updatedAt`. Add a shared `@MappedSuperclass` base entity for all entities:

```java
// New file: BaseEntity.java
@MappedSuperclass
public abstract class BaseEntity {
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
// Then: public class FileEntity extends BaseEntity { ... }
// And:  public class Subscription extends BaseEntity { ... }
```

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/repository/FileRepository.java`**

Add the missing `countRecentUploads` query to fix the N+1 problem in `FileService.getStats()`:

```java
@Query("SELECT COUNT(f) FROM FileEntity f WHERE f.userId = :userId AND f.uploadedAt >= :since")
long countRecentUploads(@Param("userId") String userId, @Param("since") LocalDateTime since);
```

| Area                          | Specific File                             | Action                                                        |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| **Replace `ddl-auto=update`** | `application.properties`                  | Switch to `validate` + add Flyway.                            |
| **Add Flyway migrations**     | New `db/migration/V1__baseline.sql`       | Convert existing `schema.sql` to Flyway format.               |
| **Add audit fields**          | `FileEntity.java`, `Subscription.java`    | Add `updatedAt` via `@UpdateTimestamp`.                       |
| **Fix N+1 in getStats()**     | `FileRepository.java`, `FileService.java` | Add `countRecentUploads` query instead of fetching all files. |
| **HikariCP tuning**           | `application.properties`                  | Add `spring.datasource.hikari.maximum-pool-size=10`.          |

---

## 8. API Design & Versioning

### What it is

API versioning allows you to evolve your backend without breaking existing clients. Good API design follows REST conventions, uses proper HTTP status codes, and provides consistent error responses.

### Why it matters

Once your API has external consumers (mobile apps, third-party integrations), you can't just change endpoints. Versioning lets you ship `/api/v2/files` while keeping `/api/v1/files` working for older clients.

### What to do for CloudShare (specific to your code)

📁 **Files: all controllers** — `FileController.java`, `SubscriptionController.java`, `TransactionController.java`

Currently all mapped to `/api/files`, `/api/subscription`, `/api/transactions`. Add `/v1/` prefix:

```java
// FileController.java
@RequestMapping("/api/v1/files")   // was: /api/files

// SubscriptionController.java
@RequestMapping("/api/v1/subscription")

// TransactionController.java
@RequestMapping("/api/v1/transactions")
```

📁 **File: `cloudShareWebapp/src/context/AppContext.jsx`** and **`src/api/fileApi.js`**

Both use `import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"`. After adding versioning, update the default: `"http://localhost:8080/api/v1"` — or better, keep the base URL and add `/v1` per-call.

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/config/GlobalExceptionHandler.java`**

Return a proper error DTO (not just `Map<String, String>`) — this is also a security improvement from Section 6:

```java
@ExceptionHandler(RuntimeException.class)
public ResponseEntity<ErrorResponse> handleRuntimeException(
        RuntimeException ex, HttpServletRequest request) {
    // return: { "code": "NOT_FOUND", "message": "...", "timestamp": "...", "path": "/api/v1/files/123" }
}
```

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/controller/TransactionController.java`**

`fileApi.js` calls `PATCH /api/files/{fileId}/toggle-visibility` but `FileController` maps it to `PUT`. Pick one HTTP verb and be consistent — `PUT` is correct for a full replace, `PATCH` for partial update. Update `fileApi.js` to match `FileController`.

📁 **File: `cloudShareBackend/pom.xml`** — add Swagger/OpenAPI:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.5.0</version>
</dependency>
```

After adding this, visit `http://localhost:8080/swagger-ui.html` — you get interactive API docs automatically from your existing code.

| Area                   | Specific File                         | Action                                                                        |
| ---------------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| **URL versioning**     | All 3 controllers                     | Add `/v1/` to `@RequestMapping`.                                              |
| **Update frontend**    | `AppContext.jsx`, `fileApi.js`        | Update base URL to `/api/v1`.                                                 |
| **HTTP verb mismatch** | `fileApi.js` vs `FileController.java` | `fileApi.js` uses `PATCH` but controller expects `PUT` — fix to match.        |
| **Swagger UI**         | `pom.xml`                             | Add `springdoc-openapi-starter-webmvc-ui`.                                    |
| **Pagination**         | `FileController.java` `GET /files`    | Add `page` and `size` query params to `getUserFiles()` when file count grows. |

---

## 9. Testing Strategy

### What it is

A layered testing approach that catches bugs at different levels — from fast unit tests to full end-to-end tests that simulate real user behavior.

### Why it matters

Without tests, every code change is a gamble. Tests are your safety net — they let you refactor confidently, catch regressions before users do, and serve as living documentation of expected behavior.

### What to do for CloudShare (specific to your code)

**Currently: zero tests exist in the project.** `spring-boot-starter-test` is already in `pom.xml` — JUnit 5 and Mockito are ready to use. Start here:

📁 **File to create: `cloudShareBackend/src/test/java/com/cloudshare/service/FileServiceTest.java`**

The most valuable tests to write first — the core business logic in `FileService`:

```java
@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock FileRepository fileRepository;
    @Mock FileStorageService fileStorageService;
    @Mock SubscriptionRepository subscriptionRepository;
    @InjectMocks FileService fileService;

    @Test
    void uploadFile_shouldThrow_whenUploadLimitReached() {
        Subscription sub = Subscription.builder()
            .plan("Free").uploadsUsed(10).uploadsLimit(10)
            .storageUsedBytes(0L).storageLimitBytes(104857600L).build();
        when(subscriptionRepository.findByUserId("user1")).thenReturn(Optional.of(sub));

        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getSize()).thenReturn(1024L);

        assertThrows(RuntimeException.class,
            () -> fileService.uploadFile(mockFile, false, "user1"));
    }

    @Test
    void uploadFile_shouldThrow_whenStorageLimitReached() { /* similar */ }

    @Test
    void uploadFile_shouldThrow_whenDuplicateFileName() { /* check existsByUserIdAndFileName */ }

    @Test
    void deleteFile_shouldUpdateSubscriptionUsage() { /* verify storageUsedBytes decremented */ }

    @Test
    void toggleVisibility_shouldFlipIsPublic() { /* verify Boolean.not() */ }
}
```

📁 **File to create: `cloudShareBackend/src/test/java/com/cloudshare/controller/FileControllerTest.java`**

```java
@WebMvcTest(FileController.class)
class FileControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean FileService fileService;

    @Test
    void upload_shouldReturn200_withValidFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file", "test.pdf", "application/pdf", "content".getBytes());
        when(fileService.uploadFile(any(), eq(false), eq("user1")))
            .thenReturn(FileResponse.builder().id("f1").fileName("test.pdf").build());

        mockMvc.perform(multipart("/api/v1/files/upload")
                .file(file)
                .requestAttr("userId", "user1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("f1"));
    }
}
```

📁 **Frontend — File to create: `cloudShareWebapp/src/context/AppContext.test.jsx`**

```js
// Install: npm install -D vitest @testing-library/react @testing-library/jest-dom
// Already has vitest in vite ecosystem — add to package.json scripts:
// "test": "vitest"
```

| Layer                   | Tool                                                 | Start with                                                            |
| ----------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| **Unit tests**          | JUnit 5 + Mockito (already in pom.xml)               | `FileServiceTest` — test upload limits, duplicate name, delete logic. |
| **API / slice tests**   | `@WebMvcTest` (already in pom.xml)                   | `FileControllerTest` — test HTTP status codes and JSON shape.         |
| **Integration tests**   | Testcontainers (add to pom.xml)                      | Spin up real MySQL to test `FileRepository` queries.                  |
| **Frontend unit tests** | Vitest + React Testing Library (add to package.json) | Test `AppContext` upload logic and error handling.                    |
| **E2E tests**           | Playwright (free)                                    | Full flow: sign up → upload → share link → download.                  |

---

## 10. CDN & Static Asset Delivery

### What it is

A **Content Delivery Network** caches your static assets (JS bundles, CSS, images, shared files) at edge locations worldwide so users get data from a server physically close to them.

> **Cost:** **Vercel** and **Netlify** both offer generous free tiers — deploy your entire React frontend for free with zero configuration. This is the recommended starting point. AWS CloudFront also has a free tier (1 TB/month transfer).

### Why it matters

A user in Tokyo shouldn't wait for a round-trip to a US East server to load your React app. CDNs reduce latency from ~200ms to ~20ms for static content and offload traffic from your origin servers.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareWebapp/vite.config.js`**

Before deploying to Vercel/Netlify, make sure `VITE_API_BASE_URL` is configured as an environment variable pointing to your production backend URL. Vercel and Netlify both support environment variables in their dashboards.

📁 **File: `cloudShareWebapp/package.json`** — the `build` script already exists (`vite build`). Run it and deploy the `dist/` folder.

```bash
# Deploy to Vercel (free, zero config):
npm install -g vercel
cd cloudShareWebapp
vercel deploy --prod
# Set VITE_API_BASE_URL=https://your-backend.com/api in Vercel dashboard

# Or Netlify:
npm install -g netlify-cli
netlify deploy --dir=dist --prod
```

📁 **File: `cloudShareWebapp/index.html`**

After S3 migration (Section 3), files will be served from S3/CloudFront directly via pre-signed URLs — no longer through your Spring Boot `/api/files/{id}/download` endpoint. This means downloads are handled by AWS edge servers, not your app server.

| Area                 | Free Option                                | Action                                                                                                       |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Frontend hosting** | **Vercel or Netlify (free — recommended)** | `vercel deploy` or `netlify deploy`. Done in 5 minutes.                                                      |
| **File downloads**   | S3 + CloudFront (free tier)                | After S3 migration, generate CloudFront pre-signed URLs in `FileService`.                                    |
| **Cache headers**    | Config only (free)                         | Vite generates hashed filenames — set `Cache-Control: max-age=31536000, immutable` for assets in production. |

---

## 11. Rate Limiting & Throttling

### What it is

Rate limiting restricts how many API requests a user/IP can make in a given time window. Throttling slows down excessive requests instead of hard-rejecting them.

> **Cost:** **Bucket4j** is a free, open-source Java rate-limiting library. Add it directly to your Spring Boot app — no extra infrastructure needed. Pair it with the in-memory or Redis backend depending on whether you've set up Redis yet.

### Why it matters

Without rate limits, a single malicious user (or a bug in your frontend) can overwhelm your backend, degrade service for everyone, or rack up massive cloud bills. Rate limiting is a critical defense against abuse and DDoS.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/pom.xml`** — add Bucket4j:

```xml
<dependency>
    <groupId>com.giffing.bucket4j.spring.boot.starter</groupId>
    <artifactId>bucket4j-spring-boot-starter</artifactId>
    <version>0.12.7</version>
</dependency>
```

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/controller/FileController.java`**

The `/upload` endpoint is the most important to rate-limit. Apply a per-user limit that respects the subscription plan:

```java
// Add to FileController.upload():
@PostMapping("/upload")
public ResponseEntity<FileResponse> upload(...) {
    String userId = getUserId(request);
    // Free plan: 10 uploads/hour, Premium: 100 uploads/hour
    // Bucket4j or a simple in-memory ConcurrentHashMap<userId, Bucket> works
    if (!rateLimiter.tryConsume(userId)) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header("Retry-After", "3600")
            .body(null);
    }
    // ... existing upload logic
}
```

Your app already tracks `uploadsLimit` per user in `Subscription` — use that value to set the rate limit bucket size per plan.

| Area                    | Specific File                 | Action                                                                                         |
| ----------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| **Upload rate limit**   | `FileController.java`         | Limit uploads per userId per hour (match Subscription plan limits).                            |
| **Download rate limit** | `FileController.java`         | Limit public file downloads per IP to prevent leeching.                                        |
| **429 response**        | `GlobalExceptionHandler.java` | Add handler for `RateLimitException` returning 429 with `Retry-After`.                         |
| **Redis backend**       | `application.properties`      | Once Redis is added (Section 4), switch Bucket4j to Redis backend for distributed rate limits. |

---

## 12. Asynchronous Processing & Message Queues

### What it is

Message queues (SQS, RabbitMQ, Kafka) let you decouple time-consuming work from the request-response cycle. The API responds immediately while background workers handle heavy processing.

> **Cost:** **Amazon SQS** has an always-free tier (1M requests/month) — great to experiment with. **RabbitMQ** is free open-source and runs locally via Docker. Start with **Spring `@Async` + `ApplicationEventPublisher`** (built into Spring, completely free) before adopting a full message broker.

### Why it matters

Users shouldn't wait 10 seconds for a virus scan or thumbnail generation before seeing "Upload successful". Async processing keeps the API fast and lets you retry failed jobs without losing data.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileService.java`**

The `uploadFile()` method currently does everything synchronously: validates, stores to disk, saves to DB, updates subscription counters — all in one transaction. Future post-processing (thumbnail generation, virus scan, email notification) should be async.

**Step 1 (free, no new infra):** Use Spring's built-in `@Async`:

```java
// CloudShareApplication.java — enable async:
@EnableAsync
@SpringBootApplication
public class CloudShareApplication { ... }

// New file: FileEventService.java
@Service
public class FileEventService {
    @Async
    public void onFileUploaded(FileEntity file) {
        // runs in a background thread — won't block the upload response
        log.info("Post-processing file: {}", file.getId());
        // future: generate thumbnail, extract metadata, send email notification
    }
}

// In FileService.uploadFile() — after fileRepository.save():
fileEventService.onFileUploaded(entity);  // returns immediately
return toResponse(entity);                // responds to user right away
```

**Step 2 (SQS free tier):** Once on AWS, replace `@Async` with SQS:

```java
// After fileRepository.save(entity):
sqsTemplate.send("cloudshare-uploads", Map.of(
    "fileId", entity.getId(),
    "userId", entity.getUserId(),
    "s3Key", entity.getStoragePath()
));
```

| Area                    | Specific File                  | Action                                                             |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------ |
| **Async post-upload**   | `FileService.java`             | Extract post-processing to `@Async` method — free, no extra infra. |
| **Email notifications** | New `NotificationService.java` | After share link generated, send email async via SES (free tier).  |
| **Enable `@Async`**     | `CloudShareApplication.java`   | Add `@EnableAsync` annotation.                                     |
| **SQS (future)**        | `FileService.java`             | Replace `@Async` with SQS publish once on AWS.                     |

---

## 13. Feature Flags & Progressive Rollouts

### What it is

Feature flags let you enable/disable features at runtime without deploying new code. Progressive rollouts release features to a small percentage of users first, then gradually increase.

> **Cost:** **Unleash** is free and open-source — self-host it via Docker. LaunchDarkly is paid (skip it for now). **AWS AppConfig** has a small cost after the free tier. For a student project, a simple database-backed or `.properties`-backed flag implementation costs nothing and teaches the same concept.

### Why it matters

Deploying code and _releasing a feature_ should be separate decisions. Feature flags let you merge incomplete features behind a flag, run A/B tests, and instantly kill a broken feature without a rollback.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/src/main/resources/application.properties`**

The simplest free implementation: add flags directly to properties, read with `@Value`:

```properties
# Feature flags — change without redeploying (or use Actuator /refresh endpoint)
feature.s3-storage.enabled=false       # flip to true when S3 is ready
feature.email-notifications.enabled=false
feature.rate-limiting.enabled=true
```

```java
// In FileStorageService.java:
@Value("${feature.s3-storage.enabled:false}")
private boolean s3StorageEnabled;

public String store(MultipartFile file, String userId) {
    if (s3StorageEnabled) {
        return storeToS3(file, userId);
    }
    return storeToDisk(file, userId);   // existing logic
}
```

This pattern lets you migrate from local disk → S3 **without changing frontend code**, just by flipping a flag.

📁 **Frontend: `cloudShareWebapp/src/context/AppContext.jsx`**

Add a flags endpoint call at startup:

```jsx
const [features, setFeatures] = useState({});
// fetch /api/v1/features on app load
// use: features.newUploadUI ? <NewUpload /> : <Upload />
```

| Area               | Tool                                       | Action                                                                                                 |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Simple flags**   | `application.properties` + `@Value` — free | Add flags for S3 migration, email notifications, rate limiting. Flip without redeploy (with Actuator). |
| **Self-hosted**    | Unleash (free, Docker) — advanced          | Self-host Unleash for per-user flag targeting and percentage rollouts.                                 |
| **Frontend flags** | React context — free                       | Fetch `/api/v1/features` on load; conditionally render new UI.                                         |

---

## 14. Secrets Management

### What it is

A secure, centralized system for storing and rotating sensitive credentials (DB passwords, API keys, signing keys) — never in source code or config files.

> **Cost:** Environment variables and `.env` files are **completely free**. **HashiCorp Vault** is free open-source. AWS Secrets Manager costs $0.40/secret/month — skip it for now and use `.env` files locally + GitHub Actions secrets in CI (both free).

### Why it matters

The current `application.properties` contains the MySQL password in plaintext and Clerk URLs. If this repo were public (or if a developer's laptop were compromised), all credentials would be exposed. Secrets management provides encryption, access control, and audit logging.

### What to do for CloudShare (specific to your code)

**⚠️ These secrets are currently hardcoded and must be moved immediately:**

| Secret                                              | Current Location                 | Fix                                 |
| --------------------------------------------------- | -------------------------------- | ----------------------------------- |
| `020705` (DB password)                              | `application.properties` line 10 | Move to `${DB_PASSWORD}` env var    |
| `knowing-pika-78.clerk.accounts.dev` (Clerk issuer) | `application.properties` line 32 | Move to `${CLERK_ISSUER}` env var   |
| JWKS URL                                            | `application.properties` line 33 | Move to `${CLERK_JWKS_URL}` env var |

📁 **Step 1 — Create `.env` file** (root of workspace, add to `.gitignore`):

```bash
# .env — NEVER commit this file
DB_PASSWORD=020705
CLERK_ISSUER=https://knowing-pika-78.clerk.accounts.dev
CLERK_JWKS_URL=https://knowing-pika-78.clerk.accounts.dev/.well-known/jwks.json
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

📁 **Step 2 — Create `.gitignore`** (if not already present):

```gitignore
.env
*.env.local
cloudShareBackend/target/
cloudShareWebapp/node_modules/
cloudShareWebapp/dist/
uploads/
```

📁 **Step 3 — Update `application.properties`:**

```properties
spring.datasource.password=${DB_PASSWORD}
clerk.issuer=${CLERK_ISSUER}
clerk.jwks-url=${CLERK_JWKS_URL}
cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

📁 **Step 4 — GitHub Actions secrets:**

Go to GitHub repo → Settings → Secrets and variables → Actions. Add `DB_PASSWORD`, `CLERK_ISSUER`, `CLERK_JWKS_URL`. Reference in CI:

```yaml
env:
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  CLERK_ISSUER: ${{ secrets.CLERK_ISSUER }}
```

| Area                                | Cost | Action                                                      |
| ----------------------------------- | ---- | ----------------------------------------------------------- |
| **`.env` file (do this first!)**    | Free | Create immediately. Add to `.gitignore`.                    |
| **Update `application.properties`** | Free | Replace all hardcoded values with `${ENV_VAR}` references.  |
| **GitHub Actions secrets**          | Free | Store secrets in GitHub for CI.                             |
| **HashiCorp Vault**                 | Free | Self-hosted — learn it once you have Docker Compose set up. |
| **AWS Secrets Manager**             | Paid | Skip for now.                                               |

---

## 15. Infrastructure as Code (IaC)

### What it is

Defining your entire infrastructure (servers, databases, networks, DNS, load balancers) in version-controlled code instead of clicking through cloud consoles.

> **Cost:** Terraform, AWS CDK, and CloudFormation are all **free tools**. You only pay for the AWS resources they create (which are free within Free Tier limits). Terraform is the most popular and has excellent learning resources — start here.

### Why it matters

If your production server dies, can you recreate it in 10 minutes? IaC makes infrastructure reproducible, reviewable (via PRs), and auditable. It eliminates "snowflake servers" that nobody knows how to rebuild.

### What to do for CloudShare (specific to your code)

📁 **Directory to create: `infrastructure/terraform/`**

Start with the AWS resources you'll use first (S3 for file storage):

```hcl
# infrastructure/terraform/main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "cloudshare_uploads" {
  bucket = "cloudshare-uploads-${var.environment}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads_encryption" {
  bucket = aws_s3_bucket.cloudshare_uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access — files served via pre-signed URLs only
resource "aws_s3_bucket_public_access_block" "uploads_block" {
  bucket                  = aws_s3_bucket.cloudshare_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

```bash
# To use:
terraform init
terraform plan
terraform apply   # creates the S3 bucket
# When done learning:
terraform destroy # deletes everything — no surprise charges
```

| Tool               | Cost | Use Case for CloudShare                                                 |
| ------------------ | ---- | ----------------------------------------------------------------------- |
| **Terraform**      | Free | Define S3 bucket, RDS instance, ECS service — all as code.              |
| **AWS CDK**        | Free | Same as Terraform but written in Java — fits naturally with your stack. |
| **CloudFormation** | Free | AWS-native. Good if you prefer JSON/YAML to HCL.                        |

---

## 16. Error Tracking & Incident Management

### What it is

Automated error capture, aggregation, and alerting — so you know about bugs before your users tell you (or before they silently leave).

> **Cost:** **Sentry** has a **free tier** (5,000 errors/month, 1 project) — more than enough for a student project. Sign up with your GitHub account. PagerDuty and Opsgenie are paid on-call tools for teams; skip them for now and use Grafana's free alerting (email/Slack) instead.

### Why it matters

`console.error()` and server logs are invisible to you unless you're actively watching. Error tracking tools group identical errors, show stack traces, and tell you which users are affected.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/pom.xml`** — add Sentry:

```xml
<dependency>
    <groupId>io.sentry</groupId>
    <artifactId>sentry-spring-boot-starter-jakarta</artifactId>
    <version>7.14.0</version>
</dependency>
```

📁 **File: `cloudShareBackend/src/main/resources/application.properties`**:

```properties
sentry.dsn=${SENTRY_DSN}       # get from sentry.io — free account
sentry.environment=production
sentry.traces-sample-rate=0.2  # trace 20% of requests
```

📁 **File: `cloudShareWebapp/` — install Sentry React SDK:**

```bash
npm install @sentry/react
```

📁 **File: `cloudShareWebapp/src/main.jsx`**:

```jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
});
```

📁 **File: `cloudShareWebapp/src/App.jsx`**:

```jsx
// Wrap existing routes in Sentry error boundary:
import { ErrorBoundary } from "@sentry/react";

const App = () => (
  <ErrorBoundary fallback={<p>An error occurred. Please refresh the page.</p>}>
    <BrowserRouter>{/* existing routes unchanged */}</BrowserRouter>
  </ErrorBoundary>
);
```

This catches any React render crash and sends it to Sentry with full context.

| Area                            | Specific File                        | Action                                                                        |
| ------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| **Backend errors**              | `pom.xml` + `application.properties` | Add Sentry Spring Boot starter. Sends all unhandled exceptions automatically. |
| **Frontend errors**             | `main.jsx` + `App.jsx`               | Init Sentry; wrap app in `ErrorBoundary`.                                     |
| **Add `SENTRY_DSN` to secrets** | `.env`                               | Add `SENTRY_DSN` from your free Sentry project.                               |

---

## 17. Performance Optimization

### What it is

Making your application faster and more efficient — reducing response times, minimizing resource consumption, and ensuring smooth user experience under load.

### Why it matters

Users abandon pages that take more than 3 seconds to load. At scale, small inefficiencies multiply — a 100ms unnecessary delay × 1M requests/day = wasted compute and frustrated users.

### What to do for CloudShare (specific to your code)

**Backend — specific issues found:**

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileService.java`**

`getStats()` loads **all files into memory** (`findByUserIdOrderByUploadedAtDesc`) just to count recent uploads. Fix with the JPQL query from Section 7, and add the Redis cache from Section 4.

`getUserFiles()` fetches all files on every call — once users have hundreds of files, add pagination:

```java
// In FileRepository:
Page<FileEntity> findByUserIdOrderByUploadedAtDesc(String userId, Pageable pageable);

// In FileService:
public Page<FileResponse> getUserFiles(String userId, int page, int size) {
    return fileRepository.findByUserIdOrderByUploadedAtDesc(
        userId, PageRequest.of(page, size))
        .map(this::toResponse);
}
```

📁 **File: `cloudShareBackend/src/main/resources/application.properties`**

Enable response compression (zero code change, just config):

```properties
server.compression.enabled=true
server.compression.mime-types=application/json,application/javascript,text/css,text/html
server.compression.min-response-size=1024
spring.jpa.show-sql=false  # disable in production — currently always on
```

**Frontend — specific issues found:**

📁 **File: `cloudShareWebapp/src/App.jsx`**

`Dashboard`, `MyFiles`, `Upload`, `Transaction`, `Subscription` are all imported at the top level — no lazy loading. Bundle is downloaded all at once on first visit:

```jsx
// Change to lazy imports:
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const MyFiles = lazy(() => import("./pages/MyFiles.jsx"));
const Upload = lazy(() => import("./pages/Upload.jsx"));
const Transaction = lazy(() => import("./pages/Transaction.jsx"));
const Subscription = lazy(() => import("./pages/Subscription.jsx"));

// Wrap routes in Suspense:
<Suspense fallback={<div>Loading...</div>}>{/* existing routes */}</Suspense>;
```

📁 **File: `cloudShareWebapp/src/pages/Dashboard.jsx`**

`Dashboard` fires 4 API calls simultaneously on mount (`fetchFiles`, `fetchStats`, `fetchSubscription`, `fetchTransactions`). After adding Redis caching (Section 4) and pagination (above), this will be much faster. For now, use `Promise.all` to run them in parallel (they already run in parallel via separate `useEffect` calls, which is fine).

| Area                     | Specific File                                | Action                                                                       |
| ------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------- |
| **N+1 in getStats()**    | `FileService.java`                           | Replace `findAll` + stream filter with a single `@Query countRecentUploads`. |
| **Pagination**           | `FileController.java`, `FileRepository.java` | Add `page`/`size` params to `GET /api/v1/files`.                             |
| **Response compression** | `application.properties`                     | Add 3 lines — zero code change.                                              |
| **Disable SQL logging**  | `application.properties`                     | Set `spring.jpa.show-sql=false` for production.                              |
| **Route lazy loading**   | `App.jsx`                                    | Wrap pages in `React.lazy()` + `Suspense`.                                   |

---

## 18. Multi-Tenancy & Data Isolation

### What it is

Ensuring that one user can never access another user's files or data — even through bugs, race conditions, or malicious URL manipulation.

### Why it matters

CloudShare stores files for multiple users. A broken access-control check could leak private files. Multi-tenancy patterns ensure data isolation by design, not just by hope.

### What to do for CloudShare (specific to your code)

The current codebase has **mostly correct** data isolation. Here's an audit:

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/repository/FileRepository.java`**

✅ `findByIdAndUserId(id, userId)` — correct, always scopes by userId  
✅ `findByUserIdOrderByUploadedAtDesc(userId)` — correct  
✅ `existsByUserIdAndFileName(userId, fileName)` — correct  
⚠️ `findByIdAndIsPublicTrue(id)` — returns any public file, which is intentional for the share link feature, but make sure the share link does **not** expose the `storagePath` column in the response

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/controller/FileController.java`**

✅ `getUserId()` helper throws `RuntimeException("Unauthorized")` if `userId` attribute is missing — correct.

⚠️ The public file endpoint `GET /public/{fileId}` returns a `FileResponse` — make sure `FileResponse` does **not** include `storagePath` (the disk path). Looking at the code, `FileResponse` should be verified to exclude internal fields.

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileStorageService.java`**

✅ Path traversal check: `destinationFile.startsWith(userDir)` — correct.  
✅ Files stored under `uploads/{userId}/` — correct isolation on disk.

After S3 migration (Section 3), use key prefix isolation: `s3://bucket/users/{userId}/{uuid}.ext` — users can only access their own prefix via pre-signed URLs scoped to their `userId`.

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/dto/FileResponse.java`** (verify this)

Make sure this DTO does **not** contain `storagePath`. If it does, remove it — clients should never see the internal storage path.

| Area                                  | Specific File                                                                      | Status     | Action                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| **File queries scoped by userId**     | `FileRepository.java`                                                              | ✅ Correct | Keep as-is.                                               |
| **Auth check in all controllers**     | `FileController.java`, `SubscriptionController.java`, `TransactionController.java` | ✅ Correct | Keep the `getUserId()` helper pattern.                    |
| **`storagePath` not in API response** | `FileResponse.java`                                                                | ⚠️ Verify  | Ensure `storagePath` field is absent from `FileResponse`. |
| **S3 key isolation**                  | `FileStorageService.java` (after S3 migration)                                     | Future     | Use `users/{userId}/` as S3 key prefix.                   |

---

## 19. Backup, Disaster Recovery & High Availability

### What it is

Planning for the worst: server crashes, data center outages, accidental data deletion, or ransomware. HA (High Availability) means your system stays up even when individual components fail.

### Why it matters

Downtime costs money and trust. Users will leave if their files disappear. Production systems need redundancy, automated failover, and tested recovery procedures.

### What to do for CloudShare (specific to your code)

**Current state:** Files are stored in `./uploads/` on the local disk. If the server crashes, **all files are lost** unless you have a backup. This is the most urgent disaster recovery issue.

📁 **Immediate fix — `docker-compose.yml`** (from Section 2): Mount `./uploads` as a Docker named volume. This survives container restarts but not server crashes.

**After S3 migration (Section 3):** S3 automatically replicates your data across 3 Availability Zones. S3 has 99.999999999% (11 nines) durability. Enable versioning so accidentally deleted files can be restored:

```hcl
# In Terraform (infrastructure/terraform/main.tf):
resource "aws_s3_bucket_versioning" "uploads_versioning" {
  bucket = aws_s3_bucket.cloudshare_uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

📁 **File: `cloudShareBackend/src/main/java/com/cloudshare/service/FileService.java`**

Currently `deleteFile()` hard-deletes from both disk and DB. After migrating to S3 with versioning, a "deleted" file is just S3 object deletion — the version is still recoverable. Implement soft deletes in the DB (add `deletedAt` from Section 7) so database records are always recoverable.

| Area                    | Current State                             | Action                                                                                |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| **File storage backup** | Local disk — no backup                    | Migrate to S3 (Section 3). S3 handles durability automatically.                       |
| **Database backup**     | `ddl-auto=update` — risky                 | Use RDS (AWS free tier) with automated backups, OR take manual `mysqldump` regularly. |
| **S3 versioning**       | N/A (not on S3 yet)                       | Enable when creating S3 bucket via Terraform.                                         |
| **Soft deletes**        | Hard delete in `FileService.deleteFile()` | Add `deletedAt` to `FileEntity`; mark as deleted instead of removing.                 |

---

## 20. Documentation & Developer Experience

### What it is

Everything that makes it easy for a new developer to clone the repo, understand the architecture, and ship their first feature in a day — not a week.

### Why it matters

Code without documentation is a liability. At production scale, you'll have multiple developers, and nobody can hold the entire system in their head. Good docs reduce onboarding time, prevent repeated mistakes, and improve system reliability.

### What to do for CloudShare (specific to your code)

📁 **File: `cloudShareBackend/README.md`** — update with:

```markdown
## Local Setup

1. Copy `.env.example` to `.env` and fill in values
2. `docker-compose up -d` — starts MySQL, Redis
3. `cd cloudShareBackend && mvn spring-boot:run`
4. `cd cloudShareWebapp && npm install && npm run dev`
5. Open http://localhost:5173

## Environment Variables

| Variable       | Description            | Example                                              |
| -------------- | ---------------------- | ---------------------------------------------------- |
| DB_PASSWORD    | MySQL root password    | changeme                                             |
| CLERK_ISSUER   | Clerk frontend API URL | https://xxx.clerk.accounts.dev                       |
| CLERK_JWKS_URL | Clerk JWKS endpoint    | https://xxx.clerk.accounts.dev/.well-known/jwks.json |

## API Endpoints

- POST /api/v1/files/upload — Upload a file
- GET /api/v1/files — List user's files
- GET /api/v1/files/stats — Get storage stats
- GET /api/v1/files/{id}/download — Download file
- DELETE /api/v1/files/{id} — Delete file
- GET /api/v1/files/public/{id} — Public file view (no auth)
- GET /api/v1/subscription — Get subscription info
- PUT /api/v1/subscription/upgrade — Upgrade plan
- GET /api/v1/transactions — List transactions
- GET /api/health — Health check
```

📁 **Add Swagger** (from Section 8) — after adding `springdoc-openapi`, all API docs are auto-generated from your existing `@RestController` annotations. No extra work needed.

📁 **File to create: `.env.example`** — a safe template without real values, committed to git:

```bash
DB_PASSWORD=your_db_password_here
CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
CORS_ALLOWED_ORIGINS=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8080/api/v1
SENTRY_DSN=
```

```mermaid
graph LR
    A[React Frontend - Vite] -->|REST API / Clerk JWT| B[Spring Boot Backend]
    B -->|JPA / HikariCP| C[(MySQL Database)]
    B -->|FileStorageService| D[Local uploads/ dir]
    D -.->|Phase 3: replace with| E[(S3 Bucket)]
    B -->|@Async / SQS| F[Background Jobs]
    G[ClerkAuthFilter] -->|JWKS verification| B
    H[Prometheus + Grafana] -->|scrape /actuator/prometheus| B
    I[Sentry] -->|error capture| B
    I -->|error capture| A
```

| Area                     | Specific File                         | Action                                              |
| ------------------------ | ------------------------------------- | --------------------------------------------------- |
| **README**               | `cloudShareBackend/README.md`         | Add local setup, env vars table, API endpoint list. |
| **`.env.example`**       | Root of workspace                     | Create template with empty values for each secret.  |
| **Swagger UI**           | After adding `springdoc` to `pom.xml` | Available at `/swagger-ui.html` automatically.      |
| **Architecture diagram** | This file (Mermaid above)             | Update as you add S3, Redis, SQS.                   |

---

## Priority Roadmap

Ordered by impact and cost, based on what's actually in your codebase right now:

| Phase                       | Focus                      | Cost          | Exact Files to Change                                                                                                          |
| --------------------------- | -------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Phase 1 — Secrets**       | Move hardcoded credentials | **Free**      | `application.properties` → env vars; create `.env` + `.gitignore`; create `.env.example`                                       |
| **Phase 2 — Tests**         | Add first unit tests       | **Free**      | Create `FileServiceTest.java`; test upload limits, delete, toggle visibility. JUnit already in `pom.xml`.                      |
| **Phase 3 — CI/CD**         | Automate build             | **Free**      | Create `.github/workflows/ci.yml`; add GitHub Actions secrets for `DB_PASSWORD`, `CLERK_ISSUER`.                               |
| **Phase 4 — Docker**        | Containerize               | **Free**      | Create `cloudShareBackend/Dockerfile`, `cloudShareWebapp/Dockerfile`, root `docker-compose.yml`. Mount `uploads/` as volume.   |
| **Phase 5 — Flyway**        | Safe schema management     | **Free**      | Add Flyway to `pom.xml`; create `db/migration/V1__baseline.sql` from `schema.sql`; set `ddl-auto=validate`.                    |
| **Phase 6 — Performance**   | Fix known bottlenecks      | **Free**      | Fix N+1 in `getStats()`; disable `show-sql`; enable response compression; add lazy imports to `App.jsx`.                       |
| **Phase 7 — Security**      | Harden the API             | **Free**      | Add file type allowlist in `FileService`; add structured error DTO in `GlobalExceptionHandler`; add `TransactionResponse` DTO. |
| **Phase 8 — S3**            | Cloud file storage         | **Free tier** | Replace `FileStorageService` with S3 `putObject` + pre-signed URLs. Use AWS free tier. Delete bucket when done learning.       |
| **Phase 9 — Observability** | Metrics + error tracking   | **Free**      | Add Actuator + Prometheus to `pom.xml`; add Sentry free tier to backend + frontend; add Grafana to `docker-compose.yml`.       |
| **Phase 10 — CDN**          | Deploy frontend            | **Free**      | Deploy `cloudShareWebapp` to Vercel or Netlify. Set `VITE_API_BASE_URL` env var.                                               |
| **Phase 11 — Redis**        | Caching + rate limiting    | **Free**      | Add Redis to `docker-compose.yml`; annotate `getStats()` with `@Cacheable`; add `@CacheEvict` on upload/delete.                |
| **Phase 12 — API v1**       | Versioning + Swagger       | **Free**      | Add `/v1/` prefix to all controllers; update frontend base URL; add `springdoc-openapi` to `pom.xml`.                          |
| **Phase 13 — Async**        | Non-blocking processing    | **Free**      | Add `@EnableAsync` to `CloudShareApplication`; extract post-upload work to `@Async` method.                                    |

---

> **Remember:** As a student, completing Phases 1–7 alone makes this a professional-grade project. Every phase after that is a bonus skill for your resume. Do them one at a time, commit after each, and let CI verify your changes. The AWS phases (8+) are safe to try — just set a $1 billing alert and delete resources when done learning.

> **Quick wins you can do right now (< 30 minutes each):**
>
> 1. Create `.env` + `.gitignore` + `.env.example` — 10 minutes
> 2. Enable response compression in `application.properties` — 3 lines
> 3. Set `show-sql=false` in `application.properties` — 1 line
> 4. Add lazy imports to `App.jsx` — 10 minutes
> 5. Create your first `FileServiceTest.java` — 30 minutes
