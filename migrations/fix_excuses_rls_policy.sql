-- Comprehensive RLS Fix for Excuses Table
-- Run this in your Supabase SQL Editor
--
-- This ensures lecturers and admins can properly update excuses

-- First, check if RLS is enabled on excuses table
-- If not, enable it:
ALTER TABLE public.excuses ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on excuses to start fresh
DROP POLICY IF EXISTS "Lecturers can update excuses for their sections" ON public.excuses;
DROP POLICY IF EXISTS "Admins can update all excuses" ON public.excuses;
DROP POLICY IF EXISTS "Students can view their own excuses" ON public.excuses;
DROP POLICY IF EXISTS "Students can insert excuses" ON public.excuses;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.excuses;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.excuses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.excuses;
DROP POLICY IF EXISTS "Enable update for admins and lecturers" ON public.excuses;

-- ============================================================================
-- SELECT POLICIES
-- ============================================================================

-- Students can view their own excuses
CREATE POLICY "Students can view own excuses"
ON public.excuses FOR SELECT
USING (
    student_id = (
        SELECT student_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Admins can view all excuses
CREATE POLICY "Admins can view all excuses"
ON public.excuses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Lecturers can view excuses for their sections
CREATE POLICY "Lecturers can view section excuses"
ON public.excuses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.sections s ON s.lecturer_id = p.lecturer_uuid
        WHERE p.id = auth.uid()
        AND p.role = 'lecturer'
        AND excuses.section_id = s.id
    )
);

-- ============================================================================
-- INSERT POLICIES
-- ============================================================================

-- Students can insert excuses for themselves
CREATE POLICY "Students can insert own excuses"
ON public.excuses FOR INSERT
WITH CHECK (
    student_id = (
        SELECT student_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- ============================================================================
-- UPDATE POLICIES
-- ============================================================================

-- Admins can update all excuses
CREATE POLICY "Admins can update all excuses"
ON public.excuses FOR UPDATE
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

-- Lecturers can update excuses for their sections
CREATE POLICY "Lecturers can update section excuses"
ON public.excuses FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.sections s ON s.lecturer_id = p.lecturer_uuid
        WHERE p.id = auth.uid()
        AND p.role = 'lecturer'
        AND excuses.section_id = s.id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.sections s ON s.lecturer_id = p.lecturer_uuid
        WHERE p.id = auth.uid()
        AND p.role = 'lecturer'
        AND excuses.section_id = s.id
    )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check policies were created:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'excuses';
