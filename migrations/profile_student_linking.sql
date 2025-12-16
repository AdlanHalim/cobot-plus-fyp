-- Profile-Student Linking Migration
-- Run this in your Supabase SQL Editor

-- Add student_id column to profiles table to link auth users to students
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS student_id VARCHAR REFERENCES students(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);

-- Optional: Add is_manual column to attendance_records for tracking manual overrides
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

-- Optional: Add marked_by column to track who made manual entries
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES profiles(id);
