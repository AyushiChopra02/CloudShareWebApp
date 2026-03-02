# CloudShare Backend

Spring Boot backend for the CloudShare file sharing application.

## Tech Stack

- **Java 17** + **Spring Boot 3.2**
- **Spring Data JPA** with **MySQL**
- **Clerk JWT** authentication (RS256 via JWKS)
- **Local disk** file storage (configurable)

## Prerequisites

1. **Java 17+** installed
2. **Maven 3.8+** installed
3. **MySQL 8.0+** running on `localhost:3306`

## Quick Start

### 1. Create the MySQL database

```sql
CREATE DATABASE IF NOT EXISTS cloudshare_db;
```

Or run the full schema:
```bash
mysql -u root -p < src/main/resources/schema.sql
```

### 2. Configure database credentials

Edit `src/main/resources/application.properties`:
```properties
spring.datasource.username=root
spring.datasource.password=your_password
```

### 3. Configure Clerk

Update the Clerk issuer URL in `application.properties` to match your Clerk app:
```properties
clerk.issuer=https://your-clerk-domain.clerk.accounts.dev
clerk.jwks-url=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
```

### 4. Run the application

```bash
mvn spring-boot:run
```

The server starts on `http://localhost:8080`.

## API Endpoints

### Files (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/files/upload` | Upload a file (multipart/form-data) |
| `GET` | `/api/files` | List all user files |
| `GET` | `/api/files/stats` | Get storage stats |
| `GET` | `/api/files/{id}/download` | Download a file |
| `DELETE` | `/api/files/{id}` | Delete a file |
| `PUT` | `/api/files/{id}/toggle-visibility` | Toggle public/private |

### Public Files (no auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/files/public/{id}` | Get public file info |
| `GET` | `/api/files/public/{id}/download` | Download public file |

### Subscription (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/subscription` | Get current subscription |
| `PUT` | `/api/subscription/upgrade` | Upgrade plan |

### Transactions (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions` | List transactions |
| `POST` | `/api/transactions` | Add a transaction |

## File Storage

Uploaded files are stored on the local filesystem under `./uploads/{userId}/`.
Each file gets a UUID filename to avoid collisions. The original filename is preserved in the database.

## Project Structure

```
src/main/java/com/cloudshare/
├── CloudShareApplication.java       # Main entry point
├── config/
│   ├── CorsConfig.java              # CORS settings
│   ├── ClerkAuthFilter.java         # JWT authentication filter
│   └── GlobalExceptionHandler.java  # Error handling
├── controller/
│   ├── FileController.java          # File CRUD + download
│   ├── SubscriptionController.java  # Subscription management
│   └── TransactionController.java   # Payment history
├── dto/
│   ├── FileResponse.java
│   ├── StatsResponse.java
│   ├── SubscriptionResponse.java
│   ├── TransactionRequest.java
│   └── UpgradeRequest.java
├── entity/
│   ├── FileEntity.java              # JPA entity → files table
│   ├── Subscription.java            # JPA entity → subscriptions table
│   └── Transaction.java             # JPA entity → transactions table
├── repository/
│   ├── FileRepository.java
│   ├── SubscriptionRepository.java
│   └── TransactionRepository.java
└── service/
    ├── FileService.java             # File business logic
    ├── FileStorageService.java      # Disk I/O
    ├── SubscriptionService.java     # Plan management
    └── TransactionService.java      # Transaction logging
```
