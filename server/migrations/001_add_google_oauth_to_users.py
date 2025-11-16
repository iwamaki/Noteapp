#!/usr/bin/env python3
"""
Migration: Add Google OAuth2 columns to users table
Date: 2025-11-16
Description: Add google_id, email, display_name, and profile_picture_url columns to support Google OAuth2 authentication

Usage:
    docker exec server-api-1 python /app/migrations/001_add_google_oauth_to_users.py
"""

import sqlite3
import sys
from pathlib import Path


def run_migration():
    """Run the migration to add Google OAuth2 columns to users table."""
    db_path = "/app/billing.db"

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Starting migration: Add Google OAuth2 columns to users table")

        # Step 1: Create new table with Google OAuth2 columns
        print("Step 1: Creating users_new table...")
        cursor.execute('''
        CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            google_id VARCHAR UNIQUE,
            email VARCHAR UNIQUE,
            display_name VARCHAR,
            profile_picture_url VARCHAR
        )
        ''')

        # Step 2: Copy existing data
        print("Step 2: Copying existing data...")
        cursor.execute('''
        INSERT INTO users_new (id, user_id, created_at)
        SELECT id, user_id, created_at
        FROM users
        ''')

        # Step 3: Drop old table
        print("Step 3: Dropping old users table...")
        cursor.execute('DROP TABLE users')

        # Step 4: Rename new table
        print("Step 4: Renaming users_new to users...")
        cursor.execute('ALTER TABLE users_new RENAME TO users')

        # Step 5: Create indexes
        print("Step 5: Creating indexes...")
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)')

        # Commit changes
        conn.commit()
        print("Migration completed successfully!")

        # Verify migration
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("\nVerification - users table columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")

        conn.close()
        return 0

    except sqlite3.OperationalError as e:
        print(f"Error: {e}", file=sys.stderr)
        print("Note: This error might occur if the migration has already been applied.", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run_migration())
