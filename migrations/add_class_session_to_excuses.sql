-- Add class_session_id to excuses table
-- Run this in your Supabase SQL Editor
--
-- This allows excuses to be linked to specific class sessions for accurate approval

-- Add the column
ALTER TABLE public.excuses 
ADD COLUMN IF NOT EXISTS class_session_id character varying;

-- Add foreign key constraint
ALTER TABLE public.excuses
ADD CONSTRAINT excuses_class_session_id_fkey 
FOREIGN KEY (class_session_id) 
REFERENCES public.class_sessions(id)
ON DELETE SET NULL;

-- Verification
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'excuses';
