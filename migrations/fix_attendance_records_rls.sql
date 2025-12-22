-- RLS Policy for Attendance Records Updates
-- Run this in your Supabase SQL Editor
--
-- This allows admins and lecturers to update attendance records when approving excuses

-- Enable RLS if not already enabled
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop existing update policies
DROP POLICY IF EXISTS "Admins can update attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Lecturers can update attendance for their sections" ON public.attendance_records;

-- Admin can update any attendance record
CREATE POLICY "Admins can update attendance records"
ON public.attendance_records FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Lecturers can update attendance for their sections
CREATE POLICY "Lecturers can update attendance for their sections"
ON public.attendance_records FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.sections s ON s.lecturer_id = p.lecturer_uuid
        JOIN public.class_sessions cs ON cs.section_id = s.id
        WHERE p.id = auth.uid()
        AND p.role = 'lecturer'
        AND attendance_records.class_session_id = cs.id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.sections s ON s.lecturer_id = p.lecturer_uuid
        JOIN public.class_sessions cs ON cs.section_id = s.id
        WHERE p.id = auth.uid()
        AND p.role = 'lecturer'
        AND attendance_records.class_session_id = cs.id
    )
);

-- Also ensure SELECT policies exist
DROP POLICY IF EXISTS "Anyone can view attendance records" ON public.attendance_records;
CREATE POLICY "Anyone can view attendance records"
ON public.attendance_records FOR SELECT
USING (true);

-- Verify
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'attendance_records';
