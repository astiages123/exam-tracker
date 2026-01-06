-- =====================================================
-- USER_PROGRESS NORMALIZATION MIGRATION
-- Converts JSONB columns to proper relational tables
-- =====================================================
-- ⚠️ BACKUP YOUR DATA BEFORE RUNNING THIS MIGRATION!

-- =====================================================
-- 1. CREATE NEW NORMALIZED TABLES
-- =====================================================

-- 1.1 Study Sessions (replaces sessions JSONB)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT, -- Made nullable as breaks/long_breaks might not have a course
    session_type TEXT NOT NULL CHECK (session_type IN ('work', 'break', 'long_break')),
    duration_ms INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    pauses JSONB DEFAULT '[]', -- Keep pauses as JSONB (nested, rarely queried)
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_sessions_user_idx ON study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS study_sessions_course_idx ON study_sessions(course_id);

-- 1.2 Video History (replaces video_history JSONB)
CREATE TABLE IF NOT EXISTS video_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    video_id INTEGER NOT NULL,
    watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Prevent duplicate entries
    UNIQUE(user_id, course_id, video_id)
);

CREATE INDEX IF NOT EXISTS video_history_user_idx ON video_history(user_id, watched_at DESC);

-- 1.3 User Schedule (replaces schedule JSONB)
CREATE TABLE IF NOT EXISTS user_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    time_slot TEXT NOT NULL, -- e.g., "09:00"
    subject TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate time slots per day
    UNIQUE(user_id, day_of_week, time_slot)
);

CREATE INDEX IF NOT EXISTS user_schedule_user_day_idx ON user_schedule(user_id, day_of_week);

-- 1.4 Course Progress (replaces progress_data JSONB)
CREATE TABLE IF NOT EXISTS course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    completed_video_ids INTEGER[] DEFAULT '{}',
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS course_progress_user_idx ON course_progress(user_id);

-- 1.5 Activity Log (structured version)
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'video_watched', 'quiz_completed', 'session_ended', etc.
    activity_data JSONB DEFAULT '{}', -- Flexible for different activity types
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_user_created_idx ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_type_idx ON activity_log(activity_type);

-- =====================================================
-- 2. ENABLE RLS ON ALL NEW TABLES
-- =====================================================

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

-- Study Sessions
CREATE POLICY "Users can view own study sessions"
ON study_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions"
ON study_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions"
ON study_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Video History
CREATE POLICY "Users can view own video history"
ON video_history FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video history"
ON video_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User Schedule
CREATE POLICY "Users can manage own schedule"
ON user_schedule FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Course Progress
CREATE POLICY "Users can manage own course progress"
ON course_progress FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Activity Log
CREATE POLICY "Users can view own activity log"
ON activity_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
ON activity_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. DATA MIGRATION FROM user_progress
-- =====================================================

-- 4.1 Migrate sessions
INSERT INTO study_sessions (user_id, course_id, session_type, duration_ms, started_at, pauses)
SELECT 
    up.user_id,
    s->>'courseId' as course_id, -- Can be NULL now
    COALESCE(s->>'type', 'work') as session_type,
    (s->>'duration')::INTEGER as duration_ms, -- Note: Actually stores seconds (legacy naming)
    to_timestamp((s->>'timestamp')::BIGINT / 1000) as started_at,
    COALESCE(s->'pauses', '[]'::JSONB) as pauses
FROM user_progress up,
LATERAL jsonb_array_elements(COALESCE(up.sessions, '[]'::JSONB)) as s
WHERE jsonb_typeof(up.sessions) = 'array'
ON CONFLICT DO NOTHING;

-- 4.2 Migrate video_history
INSERT INTO video_history (user_id, course_id, video_id, watched_at)
SELECT 
    up.user_id,
    vh->>'courseId' as course_id,
    (vh->>'videoId')::INTEGER as video_id,
    (vh->>'timestamp')::TIMESTAMPTZ as watched_at
FROM user_progress up,
LATERAL jsonb_array_elements(COALESCE(up.video_history, '[]'::JSONB)) as vh
WHERE jsonb_typeof(up.video_history) = 'array'
ON CONFLICT (user_id, course_id, video_id) DO NOTHING;

-- 4.3 Migrate schedule
INSERT INTO user_schedule (user_id, day_of_week, time_slot, subject)
SELECT 
    up.user_id,
    LOWER(day_key) as day_of_week,
    item->>'time' as time_slot,
    item->>'subject' as subject
FROM user_progress up,
LATERAL jsonb_each(COALESCE(up.schedule, '{}'::JSONB)) as days(day_key, day_items),
LATERAL jsonb_array_elements(day_items) as item
WHERE jsonb_typeof(up.schedule) = 'object'
ON CONFLICT (user_id, day_of_week, time_slot) DO UPDATE SET subject = EXCLUDED.subject;

-- 4.4 Migrate course_progress
INSERT INTO course_progress (user_id, course_id, completed_video_ids)
SELECT 
    up.user_id,
    course_key as course_id,
    ARRAY(SELECT jsonb_array_elements_text(video_ids)::INTEGER) as completed_video_ids
FROM user_progress up,
LATERAL jsonb_each(COALESCE(up.progress_data, '{}'::JSONB)) as progress(course_key, video_ids)
WHERE jsonb_typeof(up.progress_data) = 'object'
ON CONFLICT (user_id, course_id) DO UPDATE SET 
    completed_video_ids = EXCLUDED.completed_video_ids,
    last_updated_at = now();

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- 5.1 Add study session
CREATE OR REPLACE FUNCTION add_study_session(
    p_course_id TEXT DEFAULT NULL,
    p_session_type TEXT DEFAULT 'work',
    p_duration_ms INTEGER DEFAULT 0,
    p_pauses JSONB DEFAULT '[]'
)
RETURNS study_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result study_sessions;
BEGIN
    INSERT INTO study_sessions (user_id, course_id, session_type, duration_ms, pauses)
    VALUES (auth.uid(), p_course_id, p_session_type, p_duration_ms, p_pauses)
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;

-- 5.2 Update course progress
CREATE OR REPLACE FUNCTION update_course_progress(
    p_course_id TEXT,
    p_completed_video_ids INTEGER[]
)
RETURNS course_progress
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result course_progress;
BEGIN
    INSERT INTO course_progress (user_id, course_id, completed_video_ids)
    VALUES (auth.uid(), p_course_id, p_completed_video_ids)
    ON CONFLICT (user_id, course_id) DO UPDATE SET
        completed_video_ids = EXCLUDED.completed_video_ids,
        last_updated_at = now()
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;

-- 5.3 Log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_activity_type TEXT,
    p_activity_data JSONB DEFAULT '{}'
)
RETURNS activity_log
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result activity_log;
BEGIN
    INSERT INTO activity_log (user_id, activity_type, activity_data)
    VALUES (auth.uid(), p_activity_type, p_activity_data)
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;

-- 5.4 Get user dashboard data (combined query for performance)
CREATE OR REPLACE FUNCTION get_user_dashboard_data()
RETURNS TABLE (
    total_study_time_ms BIGINT,
    total_sessions INT,
    total_videos_watched INT,
    courses_in_progress INT,
    recent_sessions JSONB,
    recent_videos JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(ss.duration_ms), 0)::BIGINT as total_study_time_ms,
        COUNT(DISTINCT ss.id)::INT as total_sessions,
        COUNT(DISTINCT vh.id)::INT as total_videos_watched,
        COUNT(DISTINCT cp.course_id)::INT as courses_in_progress,
        COALESCE(
            (SELECT jsonb_agg(row_to_json(t))
             FROM (SELECT course_id, session_type, duration_ms, started_at 
                   FROM study_sessions 
                   WHERE user_id = auth.uid() 
                   ORDER BY started_at DESC 
                   LIMIT 5) t),
            '[]'::JSONB
        ) as recent_sessions,
        COALESCE(
            (SELECT jsonb_agg(row_to_json(t))
             FROM (SELECT course_id, video_id, watched_at 
                   FROM video_history 
                   WHERE user_id = auth.uid() 
                   ORDER BY watched_at DESC 
                   LIMIT 10) t),
            '[]'::JSONB
        ) as recent_videos
    FROM (SELECT 1) dummy
    LEFT JOIN study_sessions ss ON ss.user_id = auth.uid()
    LEFT JOIN video_history vh ON vh.user_id = auth.uid()
    LEFT JOIN course_progress cp ON cp.user_id = auth.uid();
END;
$$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION add_study_session(TEXT, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_course_progress(TEXT, INTEGER[]) TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_dashboard_data() TO authenticated;

-- =====================================================
-- 7. OPTIONAL: Drop old user_progress table
-- =====================================================
-- Uncomment after verifying data migration is successful
DROP TABLE IF EXISTS user_progress CASCADE;

-- =====================================================
-- Done! user_progress is now normalized.
-- Update your frontend code to use new tables/functions.
-- =====================================================
