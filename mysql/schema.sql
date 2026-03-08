-- ═══════════════════════════════════════════════════════════
-- CloudShare Database Setup
-- Run this script in MySQL to create the database.
-- Hibernate will auto-create tables via ddl-auto=update,
-- but you can use this for manual setup if preferred.
-- ═══════════════════════════════════════════════════════════
CREATE DATABASE IF NOT EXISTS cloudshare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cloudshare_db;

-- Files table
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

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  amount DOUBLE NOT NULL,
  status VARCHAR(50) NOT NULL,
  payment_id VARCHAR(255),
  txn_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  plan VARCHAR(50) NOT NULL DEFAULT 'Free',
  uploads_used INT DEFAULT 0,
  uploads_limit INT DEFAULT 10,
  storage_used_bytes BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 104857600,
  -- 100 MB
  expires_at DATETIME NULL,
  INDEX idx_user_id (user_id)
);