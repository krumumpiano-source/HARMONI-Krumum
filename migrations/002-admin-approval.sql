-- HARMONI Migration 002: Admin role + teacher approval system

-- Add is_admin flag (1 = admin, 0 = normal)
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

-- Add status for approval workflow (active/pending/rejected)
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Mark existing teacher (first user = admin) as admin
UPDATE users SET is_admin = 1 WHERE role = 'teacher';
