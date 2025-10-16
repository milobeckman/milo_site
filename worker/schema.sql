-- D1 Database Schema for Email Signups
-- This schema creates the necessary tables for storing email signups and admin credentials

-- Signups table: stores all email subscription data
CREATE TABLE IF NOT EXISTS signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups and duplicate prevention
CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at DESC);

-- Admin credentials table: stores hashed admin password (set only once)
CREATE TABLE IF NOT EXISTS admin_credentials (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row allowed
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
