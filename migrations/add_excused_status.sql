-- Add 'excused' to attendance_records status constraint
-- Run this in your Supabase SQL Editor
--
-- The current constraint only allows: present, absent, late
-- After this: present, absent, late, excused

-- Drop the existing constraint
ALTER TABLE public.attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_status_check;

-- Add new constraint with 'excused' included
ALTER TABLE public.attendance_records 
ADD CONSTRAINT attendance_records_status_check 
CHECK (status::text = ANY (ARRAY['present', 'absent', 'late', 'excused']::text[]));

-- Verify
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'attendance_records'::regclass AND contype = 'c';
