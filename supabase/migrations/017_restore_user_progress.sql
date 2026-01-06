-- =====================================================
-- RESTORE LEGACY user_progress TABLE
-- Removes normalized tables and restores JSONB structure
-- =====================================================

-- 1. DROP NORMALIZED TABLES
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS video_history CASCADE;
DROP TABLE IF EXISTS user_schedule CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;

-- 2. DROP RPC FUNCTIONS FOR NORMALIZED TABLES
DROP FUNCTION IF EXISTS add_study_session(TEXT, TEXT, INT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS add_video_history(TEXT, INT, TIMESTAMPTZ);

-- 3. CREATE user_progress TABLE (if not exists)
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    progress_data JSONB DEFAULT '{}'::jsonb,
    sessions JSONB DEFAULT '[]'::jsonb,
    schedule JSONB DEFAULT '{}'::jsonb,
    activity_log JSONB DEFAULT '{}'::jsonb,
    video_history JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENABLE RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 5. DROP EXISTING POLICIES (if any)
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;

-- 6. CREATE RLS POLICIES
CREATE POLICY "Users can view own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
    ON user_progress FOR DELETE
    USING (auth.uid() = user_id);

-- 7. CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_updated_at ON user_progress(updated_at);

-- 8. GRANT PERMISSIONS
GRANT ALL ON user_progress TO authenticated;

-- =====================================================
-- DONE! Now you can insert your data using:
-- INSERT INTO user_progress (user_id, progress_data, sessions, schedule, activity_log, video_history, updated_at)
-- VALUES (...);
-- =====================================================
