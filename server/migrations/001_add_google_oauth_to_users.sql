-- Migration: Add Google OAuth2 columns to users table
-- Date: 2025-11-16
-- Description: Add google_id, email, display_name, and profile_picture_url columns to support Google OAuth2 authentication

-- Add Google OAuth2 columns
ALTER TABLE users ADD COLUMN google_id VARCHAR UNIQUE;
ALTER TABLE users ADD COLUMN email VARCHAR UNIQUE;
ALTER TABLE users ADD COLUMN display_name VARCHAR;
ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
