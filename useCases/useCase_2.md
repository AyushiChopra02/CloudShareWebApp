# Use Case 2 — Containerization — Docker & Kubernetes

## What it is

**Docker** packages your app + all its dependencies into a portable image that runs identically everywhere — your laptop, CI server, or production cloud. **Kubernetes (K8s)** orchestrates many containers: auto-scaling, self-healing, rolling deployments, and service discovery.

> **Cost:** Docker Desktop is **free** for students and personal use. All Docker/Kubernetes tools below are free. For local Kubernetes, use **minikube** (free) instead of a paid cloud cluster. `docker-compose` is the most important thing to set up first — it lets you run the entire stack locally with one command.

## Why it matters

"Works on my machine" disappears. You can spin up an identical copy of your entire stack in seconds — locally, in CI, or in production. Kubernetes lets you handle traffic spikes by automatically adding more instances.

---

## What was implemented (specific to CloudShare)

| File                                           | What changed                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `cloudShareBackend/Dockerfile`                 | Multi-stage build — Maven builds the JAR, then a slim JDK Alpine image runs it. Includes MySQL wait script.  |
| `cloudShareWebapp/Dockerfile`                  | Multi-stage build — Node builds the Vite app, then Nginx serves the static files.                            |
| `docker-compose.yml` (workspace root)          | Full stack definition: MySQL 8 + backend + frontend, with volumes, health checks, depends_on, and env vars.  |
| `cloudShareBackend/wait-for-mysql.sh`          | Shell script that polls MySQL before starting the Spring Boot JAR — prevents crash loops on cold start.      |
| `cloudShareWebapp/nginx.conf`                  | Custom Nginx config to serve the React SPA (handles client-side routing with `try_files`).                   |
| `.env.example`                                 | Template of all required environment variables — copy to `.env` and fill in real values.                     |

---

## Architecture overview

```
docker-compose up
│
├── mysql  (mysql:8)
│   ├── Port 3306
│   ├── Volume: mysql_data → /var/lib/mysql  (persists DB across restarts)
│   └── Healthcheck: mysqladmin ping
│
├── backend  (cloudShareBackend/Dockerfile)
│   ├── Port 8080
│   ├── Volume: uploads_data → /app/uploads  (persists uploaded files)
│   ├── Depends on: mysql (healthy)
│   ├── wait-for-mysql.sh → waits for MySQL, then runs java -jar app.jar
│   └── Healthcheck: curl http://localhost:8080/api/health
│
└── frontend  (cloudShareWebapp/Dockerfile)
    ├── Port 5173 → Nginx :80
    ├── Depends on: backend
    └── Serves Vite build output via Nginx with SPA routing
```

---

## Files to create

### 1. Backend Dockerfile — `cloudShareBackend/Dockerfile`

Already exists in the project. It uses a multi-stage build:

```dockerfile
# Stage 1 — Build
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q -e -DskipTests dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2 — Run
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
COPY wait-for-mysql.sh /app/wait-for-mysql.sh
RUN chmod +x /app/wait-for-mysql.sh
EXPOSE 8080
ENTRYPOINT ["/app/wait-for-mysql.sh"]
```

**Why multi-stage?** The `maven` image is ~800 MB. The final `eclipse-temurin:21-jdk-alpine` image is ~300 MB. Maven, source code, and build artifacts stay in the throwaway first stage — only the final `.jar` gets copied to the runtime image. This halves your image size and reduces the attack surface.

**Why `dependency:go-offline` first?** Docker caches layers. By copying only `pom.xml` first and downloading dependencies, Docker can reuse this cached layer on subsequent builds unless `pom.xml` changes. Code changes only rebuild from the `COPY src` step — saving minutes on rebuilds.

---

### 2. MySQL wait script — `cloudShareBackend/wait-for-mysql.sh`

```bash
#!/bin/sh
# Wait for MySQL to be ready before starting the Spring Boot app.
# docker-compose depends_on only waits for container start, not service readiness.

set -e

host="${MYSQL_HOST:-mysql}"
port="${MYSQL_PORT:-3306}"

echo "Waiting for MySQL at $host:$port..."

# Loop until MySQL accepts TCP connections
while ! nc -z "$host" "$port" 2>/dev/null; do
  echo "MySQL not ready — sleeping 2s..."
  sleep 2
done

echo "MySQL is up — starting Spring Boot..."
exec java -jar /app/app.jar
```

**Why not just `depends_on`?** Docker Compose `depends_on` only waits for the container to _start_, not for MySQL to be _ready to accept connections_. On cold start, MySQL takes 10–30 seconds to initialize. Without this script, Spring Boot starts immediately, fails to connect, and crashes.

---

### 3. Frontend Dockerfile — `cloudShareWebapp/Dockerfile`

```dockerfile
# Stage 1 — Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8080/api
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
RUN npm run build

# Stage 2 — Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Why Nginx?** Vite's dev server (`npm run dev`) is for development only — it's not designed for production traffic. Nginx is a battle-tested web server that serves static files efficiently, handles thousands of concurrent connections, and uses minimal memory.

**Why `ARG` + `ENV` for Vite variables?** Vite embeds environment variables at _build time_ (they get baked into the JavaScript bundle). `ARG` lets you pass them during `docker build`, and `ENV` makes them available to the `npm run build` step.

---

### 4. Nginx config — `cloudShareWebapp/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Serve static assets with aggressive caching
    # Vite generates hashed filenames (e.g., index-abc123.js), so max-age is safe
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing — all non-file requests go to index.html
    # Without this, refreshing /dashboard returns 404 because Nginx
    # looks for a physical /dashboard file that doesn't exist
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Why `try_files`?** React Router handles routing on the client side. When a user navigates to `/dashboard`, React Router loads the correct page component. But if the user _refreshes_ at `/dashboard`, the browser sends a request to Nginx for `/dashboard` — a file that doesn't exist. `try_files` tells Nginx: "If the file doesn't exist, serve `index.html` and let React Router handle it."

---

### 5. Docker Compose — `docker-compose.yml` (workspace root)

```yaml
version: "3.9"

services:
  # ─── MySQL Database ─────────────────────────────────────
  mysql:
    image: mysql:8
    container_name: cloudshare-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: cloudshare_db
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Spring Boot Backend ────────────────────────────────
  backend:
    build: ./cloudShareBackend
    container_name: cloudshare-backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/cloudshare_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      CLERK_ISSUER: ${CLERK_ISSUER}
      CLERK_JWKS_URL: ${CLERK_JWKS_URL}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost:5173}
      MYSQL_HOST: mysql
      MYSQL_PORT: 3306
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      mysql:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  # ─── React Frontend ─────────────────────────────────────
  frontend:
    build:
      context: ./cloudShareWebapp
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:8080/api}
        VITE_CLERK_PUBLISHABLE_KEY: ${VITE_CLERK_PUBLISHABLE_KEY}
    container_name: cloudshare-frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  mysql_data:
  uploads_data:
```

---

### 6. Environment template — `.env.example`

```bash
# ─── Database ──────────────────────────────────────────────
DB_PASSWORD=your_mysql_root_password

# ─── Clerk Auth ────────────────────────────────────────────
CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# ─── CORS ──────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:5173

# ─── Frontend API URL ─────────────────────────────────────
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## Manual steps (do these once)

### Step 1 — Install Docker Desktop

Download from https://www.docker.com/products/docker-desktop/ — free for students and personal use. Comes with `docker` and `docker compose` (V2).

Verify installation:

```bash
docker --version
docker compose version
```

### Step 2 — Create your `.env` file

```bash
# From the workspace root:
cp .env.example .env
# Edit .env and fill in your real values
```

Make sure `.env` is in `.gitignore` (it should already be there from Use Case 1).

### Step 3 — Build and start everything

```bash
# From the workspace root (where docker-compose.yml lives):
docker compose up --build
```

This will:
1. Pull the `mysql:8` image (~500 MB, first time only)
2. Build the backend image (Maven downloads deps, compiles, packages)
3. Build the frontend image (npm install, Vite build, copy to Nginx)
4. Start MySQL → wait for healthy → start backend → start frontend

First build takes 3–5 minutes (dependency downloads). Subsequent builds reuse cached layers and take ~30 seconds.

### Step 4 — Verify everything is running

```bash
# Check container status
docker compose ps

# Expected output:
# NAME                  STATUS                   PORTS
# cloudshare-mysql      Up (healthy)             0.0.0.0:3306->3306/tcp
# cloudshare-backend    Up (healthy)             0.0.0.0:8080->8080/tcp
# cloudshare-frontend   Up                       0.0.0.0:5173->80/tcp
```

Open in browser:
- Frontend: http://localhost:5173
- Backend health: http://localhost:8080/api/health
- You should see `{"status":"OK","message":"CloudShare API is running"}`

### Step 5 — Useful Docker commands

```bash
# Stop all containers (preserves data volumes)
docker compose down

# Stop and DELETE all data (fresh start)
docker compose down -v

# View logs (all services)
docker compose logs -f

# View logs (backend only)
docker compose logs -f backend

# Rebuild only the backend after code changes
docker compose up --build backend

# Open a shell inside the backend container
docker exec -it cloudshare-backend sh

# Check uploaded files inside the container
docker exec -it cloudshare-backend ls /app/uploads/

# Check MySQL from inside
docker exec -it cloudshare-mysql mysql -uroot -p cloudshare_db
```

---

## Key concepts explained

### Docker volumes — why your data survives restarts

```yaml
volumes:
  mysql_data:      # named volume — Docker manages the storage location
  uploads_data:    # persists uploaded files between container restarts
```

Without volumes, all data inside a container is **ephemeral** — it disappears when the container stops. Named volumes persist on the host machine and are re-attached when the container starts again.

| Volume         | Mounted at (in container) | Purpose                                   |
| -------------- | ------------------------- | ----------------------------------------- |
| `mysql_data`   | `/var/lib/mysql`          | MySQL database files survive restarts     |
| `uploads_data` | `/app/uploads`            | User-uploaded files survive restarts      |

To see where Docker stores volumes on your machine:

```bash
docker volume inspect cloudsharewebapp_mysql_data
```

### Health checks — why order matters

```yaml
depends_on:
  mysql:
    condition: service_healthy   # waits for healthcheck to pass
```

Without `condition: service_healthy`, Docker starts all containers simultaneously. The backend tries to connect to MySQL before MySQL is ready → crash → restart loop. Health checks + `service_healthy` ensure the correct startup order:

```
MySQL starts → healthcheck passes → backend starts → healthcheck passes → frontend starts
```

### Environment variable mapping in Spring Boot

Spring Boot automatically maps environment variables to `application.properties` keys:

| Environment Variable         | Maps to property              |
| ---------------------------- | ----------------------------- |
| `SPRING_DATASOURCE_URL`      | `spring.datasource.url`      |
| `SPRING_DATASOURCE_PASSWORD` | `spring.datasource.password` |
| `CLERK_ISSUER`               | `clerk.issuer`               |
| `CLERK_JWKS_URL`             | `clerk.jwks-url`             |
| `CORS_ALLOWED_ORIGINS`       | `cors.allowed-origins`       |

The `docker-compose.yml` environment section overrides whatever is in `application.properties`. This means you never need to change `application.properties` for Docker — the env vars take precedence.

### Why `SPRING_DATASOURCE_URL` uses `mysql` as the hostname

```
jdbc:mysql://mysql:3306/cloudshare_db
```

Inside Docker Compose, each service name becomes a DNS hostname. The `mysql` service is reachable at hostname `mysql` from the `backend` container. Outside Docker (running on your host machine), you'd use `localhost`.

---

## Common issues and fixes

| Problem                                               | Cause                                                      | Fix                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| Backend crashes with "Connection refused"              | MySQL not ready yet                                        | `wait-for-mysql.sh` handles this. Check logs: `docker compose logs backend` |
| Frontend shows blank page                              | Missing `try_files` in Nginx                               | Verify `nginx.conf` has `try_files $uri $uri/ /index.html;`                 |
| "CORS error" in browser                               | `CORS_ALLOWED_ORIGINS` doesn't include frontend URL        | Add `http://localhost:5173` to `CORS_ALLOWED_ORIGINS` in `.env`             |
| "Port 3306 already in use"                             | Local MySQL is already running                             | Stop local MySQL: `net stop MySQL80` (Windows) or change port in compose    |
| "Port 8080 already in use"                             | Local Spring Boot is already running                       | Stop it, or change compose port to `"8081:8080"`                            |
| Build fails at `mvn dependency:go-offline`             | Network issue or corrupted Maven cache                     | `docker compose build --no-cache backend`                                   |
| Changes not reflected after rebuild                    | Docker layer caching served old code                       | `docker compose up --build --force-recreate`                                |
| Uploaded files gone after `docker compose down`        | Volumes preserved with `down`, deleted with `down -v`      | Don't use `-v` unless you want a clean slate                                |

---

## Next steps — Kubernetes (after Docker Compose is stable)

Docker Compose is perfect for local development and small deployments. Kubernetes is for when you need:

- **Auto-scaling** — spin up more backend instances when CPU > 70%
- **Self-healing** — Kubernetes restarts crashed containers automatically
- **Rolling deployments** — zero-downtime updates
- **Service discovery** — containers find each other by name

### Local Kubernetes with Minikube (free)

```bash
# Install minikube
# https://minikube.sigs.k8s.io/docs/start/

minikube start
kubectl get nodes   # should show one node: "minikube"
```

### Kubernetes manifests to create later

```
k8s/
├── namespace.yaml          # cloudshare namespace
├── mysql-deployment.yaml   # MySQL pod + PersistentVolumeClaim
├── mysql-service.yaml      # ClusterIP service for MySQL
├── backend-deployment.yaml # Spring Boot pod (replicas: 2)
├── backend-service.yaml    # ClusterIP service for backend
├── frontend-deployment.yaml
├── frontend-service.yaml
├── ingress.yaml            # Route external traffic to frontend/backend
└── secrets.yaml            # Kubernetes secrets for DB_PASSWORD, CLERK_*
```

> **Recommendation:** Get Docker Compose fully working first. Kubernetes is an advanced topic — tackle it after Phases 1–7 from the roadmap are complete.

---

## Docker vs Kubernetes — when to use what

| Scenario                          | Use                    | Why                                                   |
| --------------------------------- | ---------------------- | ----------------------------------------------------- |
| Local development                 | `docker compose up`    | Simple, one command, good enough                      |
| CI/CD testing                     | `docker compose up -d` | Spin up full stack in GitHub Actions for integration tests |
| Small deployment (1 server)       | Docker Compose         | No need for orchestration complexity                  |
| Multiple servers / auto-scaling   | Kubernetes             | Handles replica management, load balancing, failover  |
| Learning / student project        | Docker Compose first   | Learn containers before orchestration                 |
