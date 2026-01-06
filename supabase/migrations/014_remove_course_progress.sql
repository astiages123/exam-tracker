-- Migration: Remove course_progress table
-- Since progress is now derived from video_history, course_progress is redundant

-- Drop the RPC function first (depends on table type)
DROP FUNCTION IF EXISTS update_course_progress(TEXT, INTEGER[]);

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can manage own course_progress" ON course_progress;

-- Drop the table
DROP TABLE IF EXISTS course_progress;

-- Note: This is a destructive migration. Run only after confirming
-- that your application no longer uses course_progress table.
