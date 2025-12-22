-- Attendance Absence Count Sync Trigger
-- Run this in your Supabase SQL Editor
--
-- This trigger automatically keeps student_course_attendance.absence_count in sync
-- whenever attendance_records are inserted, updated, or deleted.

-- ============================================================================
-- FUNCTION: sync_absence_count
-- ============================================================================
-- Recalculates absence_count for a student/section combination.

CREATE OR REPLACE FUNCTION public.sync_absence_count()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id VARCHAR;
    v_section_id VARCHAR;
    v_absence_count INTEGER;
BEGIN
    -- Determine which student/session to update based on operation
    IF TG_OP = 'DELETE' THEN
        v_student_id := OLD.student_id;
        
        -- Get section_id from class_sessions
        SELECT section_id INTO v_section_id
        FROM public.class_sessions
        WHERE id = OLD.class_session_id;
    ELSE
        v_student_id := NEW.student_id;
        
        -- Get section_id from class_sessions
        SELECT section_id INTO v_section_id
        FROM public.class_sessions
        WHERE id = NEW.class_session_id;
    END IF;

    -- Skip if we couldn't find the section
    IF v_section_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Count actual absences for this student in this section
    SELECT COUNT(*) INTO v_absence_count
    FROM public.attendance_records ar
    JOIN public.class_sessions cs ON cs.id = ar.class_session_id
    WHERE ar.student_id = v_student_id
      AND cs.section_id = v_section_id
      AND ar.status = 'absent';

    -- Upsert the student_course_attendance record
    INSERT INTO public.student_course_attendance (student_id, section_id, absence_count)
    VALUES (v_student_id, v_section_id, v_absence_count)
    ON CONFLICT (student_id, section_id) 
    DO UPDATE SET absence_count = EXCLUDED.absence_count;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS on_attendance_insert ON public.attendance_records;
DROP TRIGGER IF EXISTS on_attendance_update ON public.attendance_records;
DROP TRIGGER IF EXISTS on_attendance_delete ON public.attendance_records;

-- Trigger on INSERT
CREATE TRIGGER on_attendance_insert
    AFTER INSERT ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_absence_count();

-- Trigger on UPDATE (when status changes)
CREATE TRIGGER on_attendance_update
    AFTER UPDATE OF status ON public.attendance_records
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.sync_absence_count();

-- Trigger on DELETE
CREATE TRIGGER on_attendance_delete
    AFTER DELETE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_absence_count();

-- ============================================================================
-- ADD UNIQUE CONSTRAINT (Required for ON CONFLICT)
-- ============================================================================
-- First check if it exists, add if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'student_course_attendance_student_section_unique'
    ) THEN
        ALTER TABLE public.student_course_attendance 
        ADD CONSTRAINT student_course_attendance_student_section_unique 
        UNIQUE (student_id, section_id);
    END IF;
END $$;

-- ============================================================================
-- BACKFILL: Recalculate all absence counts
-- ============================================================================
-- Run this once to fix any existing records that are out of sync.

INSERT INTO public.student_course_attendance (student_id, section_id, absence_count)
SELECT 
    ar.student_id,
    cs.section_id,
    COUNT(*) FILTER (WHERE ar.status = 'absent') as absence_count
FROM public.attendance_records ar
JOIN public.class_sessions cs ON cs.id = ar.class_session_id
GROUP BY ar.student_id, cs.section_id
ON CONFLICT (student_id, section_id) 
DO UPDATE SET absence_count = EXCLUDED.absence_count;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check triggers were created:
-- SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'on_attendance%';
