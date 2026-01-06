-- =====================================================
-- NORMALIZED SCHEMA MIGRATION V2
-- Separate tables for user data with proper pause support
-- =====================================================
-- ⚠️ BACKUP YOUR DATA BEFORE RUNNING THIS MIGRATION!

-- Drop old rollback migration objects if they exist
DROP TABLE IF EXISTS user_progress CASCADE;
DROP FUNCTION IF EXISTS upsert_user_progress(JSONB, JSONB, JSONB, JSONB, JSONB);

-- =====================================================
-- 1. STUDY SESSIONS TABLE
-- Stores work, break, long_break, and pause sessions
-- Each pause is now a separate session (not nested)
-- =====================================================

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT, -- Can be NULL for breaks/pauses
    session_type TEXT NOT NULL CHECK (session_type IN ('work', 'break', 'long_break', 'pause')),
    duration_seconds INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS study_sessions_user_idx ON study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS study_sessions_course_idx ON study_sessions(course_id);
CREATE INDEX IF NOT EXISTS study_sessions_type_idx ON study_sessions(session_type);
-- Note: For date-based queries, use WHERE started_at >= date AND started_at < date + 1

-- =====================================================
-- 2. VIDEO HISTORY TABLE
-- Tracks which videos user has watched
-- =====================================================

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
CREATE INDEX IF NOT EXISTS video_history_course_idx ON video_history(course_id);

-- =====================================================
-- 3. USER SCHEDULE TABLE
-- Weekly schedule with time slots
-- =====================================================

CREATE TABLE IF NOT EXISTS user_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    time_slot TEXT NOT NULL, -- e.g., "09:00-12:00" or "12:00-17:00"
    subject TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate time slots per day
    UNIQUE(user_id, day_of_week, time_slot)
);

CREATE INDEX IF NOT EXISTS user_schedule_user_day_idx ON user_schedule(user_id, day_of_week);

-- =====================================================
-- 4. ACTIVITY LOG TABLE
-- Daily activity counts for heatmap
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    activity_count INTEGER NOT NULL DEFAULT 0,
    
    UNIQUE(user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS activity_log_user_date_idx ON activity_log(user_id, activity_date DESC);

-- =====================================================
-- 5. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Study Sessions
CREATE POLICY "Users can view own study sessions"
ON study_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions"
ON study_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
ON study_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

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

CREATE POLICY "Users can delete own video history"
ON video_history FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- User Schedule
CREATE POLICY "Users can manage own schedule"
ON user_schedule FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Activity Log
CREATE POLICY "Users can manage own activity log"
ON activity_log FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- 7.1 Add study session (work, break, pause, long_break)
CREATE OR REPLACE FUNCTION add_study_session(
    p_course_id TEXT DEFAULT NULL,
    p_session_type TEXT DEFAULT 'work',
    p_duration_seconds INTEGER DEFAULT 0,
    p_started_at TIMESTAMPTZ DEFAULT now()
)
RETURNS study_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result study_sessions;
BEGIN
    INSERT INTO study_sessions (user_id, course_id, session_type, duration_seconds, started_at)
    VALUES (auth.uid(), p_course_id, p_session_type, p_duration_seconds, p_started_at)
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;

-- 7.2 Add video to history
CREATE OR REPLACE FUNCTION add_video_history(
    p_course_id TEXT,
    p_video_id INTEGER,
    p_watched_at TIMESTAMPTZ DEFAULT now()
)
RETURNS video_history
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result video_history;
BEGIN
    INSERT INTO video_history (user_id, course_id, video_id, watched_at)
    VALUES (auth.uid(), p_course_id, p_video_id, p_watched_at)
    ON CONFLICT (user_id, course_id, video_id) DO NOTHING
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;

-- 7.3 Update activity log
CREATE OR REPLACE FUNCTION increment_activity_log(
    p_activity_date DATE DEFAULT CURRENT_DATE,
    p_increment INTEGER DEFAULT 1
)
RETURNS activity_log
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result activity_log;
BEGIN
    INSERT INTO activity_log (user_id, activity_date, activity_count)
    VALUES (auth.uid(), p_activity_date, p_increment)
    ON CONFLICT (user_id, activity_date) DO UPDATE SET
        activity_count = activity_log.activity_count + p_increment
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;

-- 7.4 Get user stats summary
CREATE OR REPLACE FUNCTION get_user_stats_summary()
RETURNS TABLE (
    total_work_seconds BIGINT,
    total_break_seconds BIGINT,
    total_pause_seconds BIGINT,
    total_sessions INT,
    total_videos_watched INT,
    streak_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN ss.session_type = 'work' THEN ss.duration_seconds ELSE 0 END), 0)::BIGINT as total_work_seconds,
        COALESCE(SUM(CASE WHEN ss.session_type IN ('break', 'long_break') THEN ss.duration_seconds ELSE 0 END), 0)::BIGINT as total_break_seconds,
        COALESCE(SUM(CASE WHEN ss.session_type = 'pause' THEN ss.duration_seconds ELSE 0 END), 0)::BIGINT as total_pause_seconds,
        COUNT(DISTINCT ss.id)::INT as total_sessions,
        (SELECT COUNT(DISTINCT vh.id)::INT FROM video_history vh WHERE vh.user_id = auth.uid()) as total_videos_watched,
        (SELECT COUNT(DISTINCT al.activity_date)::INT FROM activity_log al WHERE al.user_id = auth.uid()) as streak_days
    FROM study_sessions ss
    WHERE ss.user_id = auth.uid();
END;
$$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION add_study_session(TEXT, TEXT, INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION add_video_history(TEXT, INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_activity_log(DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats_summary() TO authenticated;

-- =====================================================
-- Done! Schema is now normalized with proper pause support.
-- You can import your CSV data after running this migration.
-- =====================================================
