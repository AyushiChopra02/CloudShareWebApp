# Use Case 1 — CI/CD & GitHub Actions

## What it is

Continuous Integration / Continuous Deployment automates building, testing, and deploying your code every time you push to a branch. GitHub Actions is GitHub's built-in workflow engine that runs these pipelines.

> **Cost:** GitHub Actions is **completely free** for public repositories. For private repos it gives 2,000 free minutes/month — more than enough for a student project. GitHub Student Developer Pack bumps this further.

## Why it matters

Without CI/CD, every release is manual, error-prone, and scary. At production scale, teams ship dozens of changes per day — automated pipelines are the only way to do that safely.

---

## What was implemented (specific to CloudShare)

| File                                                                       | What changed                                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                 | Full CI pipeline — backend build/test + frontend lint/build + Docker publish to ghcr.io |
| `cloudShareBackend/src/test/java/com/cloudshare/HealthControllerTest.java` | First JUnit smoke test hitting `/api/health`                                            |
| `cloudShareBackend/src/test/resources/application-test.properties`         | H2 in-memory DB config so tests run without MySQL                                       |
| `cloudShareBackend/pom.xml`                                                | Added H2 test-scoped dependency                                                         |
| `cloudShareBackend/src/main/resources/application.properties`              | Hardcoded password removed — now reads from env var `${SPRING_DATASOURCE_PASSWORD:}`    |

---

## Pipeline overview (`.github/workflows/ci.yml`)

```
On push/PR to main or develop:
│
├── Backend job  (ubuntu-latest)
│   ├── Spin up MySQL 8 service container
│   ├── Set up JDK 17 (Temurin)
│   └── mvn verify  ← compiles + runs all JUnit tests
│
├── Frontend job  (ubuntu-latest, runs in parallel)
│   ├── Set up Node 20
│   ├── npm ci
│   ├── npm run lint
│   └── npm run build
│
└── Docker job  (only on push to main, after both above pass)
    ├── docker/login-action  → ghcr.io
    └── docker/build-push-action  → ghcr.io/<owner>/cloudshare-backend:latest
```

---

## Manual steps (do these once)

### Step 1 — Push code to GitHub

```bash
git init
git add .
git commit -m "feat: add CI/CD pipeline"
git remote add origin https://github.com/YOUR_USERNAME/cloudShareWebApp.git
git push -u origin main
```

### Step 2 — Add GitHub Secrets

Go to: **Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name                  | Value                                                              |
| ---------------------------- | ------------------------------------------------------------------ |
| `DB_PASSWORD`                | Your MySQL password                                                |
| `CLERK_ISSUER`               | `https://knowing-pika-78.clerk.accounts.dev`                       |
| `CLERK_JWKS_URL`             | `https://knowing-pika-78.clerk.accounts.dev/.well-known/jwks.json` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key (`pk_test_...`)                         |

> `GITHUB_TOKEN` is injected automatically by GitHub — no action needed.

### Step 3 — Create a Dockerfile for the backend

Create `cloudShareBackend/Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/cloudshare-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Commit and push — the Docker publish job will then work on every merge to `main`.

### Step 4 — Verify the pipeline

Go to your repo → **Actions tab**. You will see:

- `Backend (Java / Maven)` and `Frontend (Vite / Node)` running in parallel
- `Publish Docker image` running only after both pass on `main`

### Step 5 — Update `.gitignore`

```
cloudShareBackend/src/main/resources/application-local.properties
uploads/
```

---

## Secrets — before vs after

```properties
# BEFORE (hardcoded — dangerous)
spring.datasource.password=020705

# AFTER (reads from environment variable, falls back to empty)
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:}
```

In GitHub Actions the env var is injected like this (already in `ci.yml`):

```yaml
SPRING_DATASOURCE_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

---

## Should you implement S3/Redis before or after CI/CD?

**CI/CD first. Always.**

| Order                        | Reason                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| 1. CI/CD (now — almost done) | Acts as a safety net for all future changes                                     |
| 2. S3 file storage           | Replaces local `./uploads` — high-risk change, needs tests to catch regressions |
| 3. Redis caching             | Download counts, session data — additive, lower risk                            |
| 4. Proper Dockerisation      | Deploy with confidence once pipeline is green                                   |

S3 and Redis are infrastructure changes that touch `FileService`, `FileStorageService`, config, and dependencies. Doing them **without** a CI gate means you are doing risky work with zero automated safety. With CI/CD in place every future change is verified automatically before it reaches `main`.
