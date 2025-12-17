-- Excuse/MC Submission System Migration
-- Run this in your Supabase SQL Editor

-- Create excuses table for storing student excuse submissions
CREATE TABLE IF NOT EXISTS excuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR REFERENCES students(id) NOT NULL,
  section_id VARCHAR REFERENCES sections(id) NOT NULL,
  class_session_id VARCHAR REFERENCES class_sessions(id),
  excuse_type VARCHAR NOT NULL CHECK (excuse_type IN ('medical', 'emergency', 'official', 'other')),
  reason TEXT NOT NULL,
  document_url TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_excuses_student_id ON excuses(student_id);
CREATE INDEX IF NOT EXISTS idx_excuses_status ON excuses(status);
CREATE INDEX IF NOT EXISTS idx_excuses_section_id ON excuses(section_id);

-- Enable RLS
ALTER TABLE excuses ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own excuses
CREATE POLICY "Students can view own excuses"
  ON excuses FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Students can insert their own excuses
CREATE POLICY "Students can create own excuses"
  ON excuses FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT student_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Admins and lecturers can view all excuses
CREATE POLICY "Staff can view all excuses"
  ON excuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'lecturer')
    )
  );

-- Policy: Admins and lecturers can update excuses (approve/reject)
CREATE POLICY "Staff can update excuses"
  ON excuses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'lecturer')
    )
  );

-- Create storage bucket for excuse documents (run separately in Storage settings)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('excuses', 'excuses', false);
