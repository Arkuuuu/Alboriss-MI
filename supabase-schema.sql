-- ==============================================================================
-- Medical Insurance Application - Supabase Production Database Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Employees Table (Managed exclusively by Managers)
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Index on username for fast authentication lookup
CREATE INDEX IF NOT EXISTS idx_employees_username ON public.employees(username);

-- 3. Login Audit Logs Table (Captures live photo, IP, location, device details)
CREATE TABLE IF NOT EXISTS public.login_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT NOT NULL,
    location JSONB DEFAULT '{}'::jsonb,
    device JSONB DEFAULT '{}'::jsonb,
    photo_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.login_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON public.login_audit_logs(username);

-- 4. Chart Completions Table (Real-time speed & throughput tracking)
CREATE TABLE IF NOT EXISTS public.chart_completions (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL,
    operator_name TEXT NOT NULL,
    record_no TEXT NOT NULL,
    image_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0)
);

CREATE INDEX IF NOT EXISTS idx_chart_completions_operator ON public.chart_completions(operator_id);
CREATE INDEX IF NOT EXISTS idx_chart_completions_completed_at ON public.chart_completions(completed_at DESC);

-- 5. Create Storage Bucket for Audit Photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-photos', 'audit-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Bucket Policy: Allow authenticated / service uploads
CREATE POLICY "Allow public read of audit photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'audit-photos');

CREATE POLICY "Allow upload of audit photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audit-photos');

-- 7. Insert Initial Seed Employees (Demo accounts with hashed passwords)
INSERT INTO public.employees (id, username, name, password_hash, status)
VALUES 
  ('usr-01', 'operator1', 'Sarah Jenkins', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'active'), -- pass123
  ('usr-02', 'operator2', 'Alex Rivera', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'active')    -- pass123
ON CONFLICT (username) DO NOTHING;

