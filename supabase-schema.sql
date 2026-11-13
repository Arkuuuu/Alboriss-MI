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
    last_login_at TIMESTAMPTZ,
    enrolled_face_url TEXT,
    enrolled_biometric_hash TEXT
);

-- Index on username for fast authentication lookup
CREATE INDEX IF NOT EXISTS idx_employees_username ON public.employees(username);

-- 3. Login Audit Logs Table (Captures live photo, IP, location, device details, WiFi & Face Verification)
CREATE TABLE IF NOT EXISTS public.login_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT NOT NULL,
    location JSONB DEFAULT '{}'::jsonb,
    device JSONB DEFAULT '{}'::jsonb,
    network JSONB DEFAULT '{}'::jsonb,
    face_verification JSONB DEFAULT '{}'::jsonb,
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

-- 4b. Medical Insurance Form Data Records Table
CREATE TABLE IF NOT EXISTS public.medical_records (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL,
    operator_name TEXT NOT NULL,
    record_no TEXT,
    image_name TEXT,
    customer_name TEXT,
    total_amount TEXT,
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_operator ON public.medical_records(operator_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_created_at ON public.medical_records(created_at DESC);

-- 4c. Practice Images Pool (Dumped via Manager Portal)
CREATE TABLE IF NOT EXISTS public.practice_images (
    id TEXT PRIMARY KEY,
    file_name TEXT UNIQUE NOT NULL,
    image_url TEXT NOT NULL,
    file_size TEXT,
    ground_truth JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_images_filename ON public.practice_images(file_name);

-- 4d. Candidate Completed Images (Tracks completed folder & QA metrics per user)
CREATE TABLE IF NOT EXISTS public.candidate_completed_images (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL,
    image_name TEXT NOT NULL,
    record_no TEXT,
    accuracy_percent NUMERIC(5,2) NOT NULL,
    mistakes_count INTEGER NOT NULL DEFAULT 0,
    total_fields INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_image UNIQUE (operator_id, image_name)
);

CREATE INDEX IF NOT EXISTS idx_candidate_completed_op ON public.candidate_completed_images(operator_id);

-- 5. Create Storage Buckets for Audit Photos and Practice Images
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('audit-photos', 'audit-photos', true),
  ('practice-images', 'practice-images', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Bucket Policy: Allow authenticated / service uploads
CREATE POLICY "Allow public read of audit photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'audit-photos');

CREATE POLICY "Allow upload of audit photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audit-photos');

CREATE POLICY "Allow public read of practice images"
ON storage.objects FOR SELECT
USING (bucket_id = 'practice-images');

CREATE POLICY "Allow upload of practice images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'practice-images');

-- 7. Insert Initial Seed Employees (Demo accounts with hashed passwords)
INSERT INTO public.employees (id, username, name, password_hash, status)
VALUES 
  ('usr-01', 'operator1', 'Sarah Jenkins', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'active'), -- pass123
  ('usr-02', 'operator2', 'Alex Rivera', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'active')    -- pass123
ON CONFLICT (username) DO NOTHING;

