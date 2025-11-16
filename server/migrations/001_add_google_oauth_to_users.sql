-- Migration: Add Google OAuth2 columns to users table
-- Date: 2025-11-16
-- Description: Add google_id, email, display_name, and profile_picture_url columns to support Google OAuth2 authentication

-- Note: SQLite doesn't support adding UNIQUE columns with ALTER TABLE
-- This migration must be run using the Python script below

-- Python migration script (run inside Docker container):
-- docker exec server-api-1 python /app/migrations/001_add_google_oauth_to_users.py

-- Manual SQL migration (for reference only):
-- Step 1: Create new table with Google OAuth2 columns
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    google_id VARCHAR UNIQUE,
    email VARCHAR UNIQUE,
    display_name VARCHAR,
    profile_picture_url VARCHAR
);

-- Step 2: Copy existing data
INSERT INTO users_new (id, user_id, created_at)
SELECT id, user_id, created_at
FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table
ALTER TABLE users_new RENAME TO users;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
