-- Automatic Profile Linking Migration
-- Run this in your Supabase SQL Editor
-- 
-- This trigger automatically links new user signups to existing lecturer/student records
-- by matching their email address. It also sets their role accordingly.

-- ============================================================================
-- FUNCTION: handle_new_user_profile_linking
-- ============================================================================
-- This function runs after a new profile is created (via Supabase Auth trigger).
-- It checks if the user's email matches any existing lecturer or student records
-- and automatically links them + sets the appropriate role.

CREATE OR REPLACE FUNCTION public.handle_new_user_profile_linking()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    matched_lecturer_id UUID;
    matched_student_id VARCHAR;
BEGIN
    -- Get the user's email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.id;

    -- Skip if no email found
    IF user_email IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if email matches a lecturer record
    SELECT id INTO matched_lecturer_id
    FROM public.lecturers
    WHERE LOWER(email) = LOWER(user_email)
    LIMIT 1;

    IF matched_lecturer_id IS NOT NULL THEN
        -- Link to lecturer and set role
        UPDATE public.profiles
        SET 
            lecturer_uuid = matched_lecturer_id,
            role = 'lecturer'
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Linked user % to lecturer %', user_email, matched_lecturer_id;
        RETURN NEW;
    END IF;

    -- Check if email matches a student record
    SELECT id INTO matched_student_id
    FROM public.students
    WHERE LOWER(email) = LOWER(user_email)
    LIMIT 1;

    IF matched_student_id IS NOT NULL THEN
        -- Link to student and set role
        UPDATE public.profiles
        SET 
            student_id = matched_student_id,
            role = 'student'
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Linked user % to student %', user_email, matched_student_id;
        RETURN NEW;
    END IF;

    -- No match found - user remains with default role
    RAISE NOTICE 'No lecturer/student match for email %', user_email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: on_profile_created_link_accounts
-- ============================================================================
-- This trigger fires AFTER a new profile row is inserted.
-- Supabase typically creates the profile via a trigger on auth.users.

-- First, drop the trigger if it already exists (for idempotency)
DROP TRIGGER IF EXISTS on_profile_created_link_accounts ON public.profiles;

-- Create the trigger
CREATE TRIGGER on_profile_created_link_accounts
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile_linking();

-- ============================================================================
-- OPTIONAL: Backfill existing unlinked profiles
-- ============================================================================
-- Run this once to link any existing profiles that were created before this trigger.
-- Uncomment and run manually if needed.

/*
-- Backfill lecturer links
UPDATE public.profiles p
SET 
    lecturer_uuid = l.id,
    role = 'lecturer'
FROM public.lecturers l
JOIN auth.users u ON u.id = p.id
WHERE LOWER(u.email) = LOWER(l.email)
  AND p.lecturer_uuid IS NULL;

-- Backfill student links  
UPDATE public.profiles p
SET 
    student_id = s.id,
    role = 'student'
FROM public.students s
JOIN auth.users u ON u.id = p.id
WHERE LOWER(u.email) = LOWER(s.email)
  AND p.student_id IS NULL
  AND p.lecturer_uuid IS NULL;  -- Don't overwrite lecturer links
*/

-- ============================================================================
-- VERIFICATION: Check the trigger was created
-- ============================================================================
-- Run this to verify the trigger exists:
-- SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_profile_created_link_accounts';
