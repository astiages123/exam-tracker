-- =====================================================
-- Mastery Level & Session Tracking Migration
-- =====================================================

-- 1. Add mastery tracking columns to user_statistics
ALTER TABLE user_statistics 
ADD COLUMN IF NOT EXISTS mastery_level TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_correct_dates DATE[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_time_spent_ms INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 0;

-- Create index for mastery queries
CREATE INDEX IF NOT EXISTS user_statistics_mastery_idx 
ON user_statistics(user_id, mastery_level);

-- =====================================================
-- 2. Session Stats Table
-- =====================================================
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_type TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    total_questions INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    incorrect_count INT DEFAULT 0,
    total_time_ms INT DEFAULT 0,
    question_times JSONB DEFAULT '[]', -- [{chunk_id, time_ms, is_correct}]
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for quiz_sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
ON quiz_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON quiz_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON quiz_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 3. Error Book Table (Wrong Answers History)
-- =====================================================
CREATE TABLE IF NOT EXISTS error_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES lesson_chunks(id) ON DELETE CASCADE,
    question_data JSONB NOT NULL, -- Full question object
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    ai_advice TEXT, -- Müfettiş Tavsiyesi
    reviewed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, chunk_id, created_at)
);

-- RLS for error_book
ALTER TABLE error_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own errors"
ON error_book FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own errors"
ON error_book FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own errors"
ON error_book FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 4. Mastery Level Update Function
-- =====================================================
CREATE OR REPLACE FUNCTION update_mastery_level(
    p_chunk_id UUID,
    p_is_correct BOOLEAN,
    p_time_spent_ms INT DEFAULT 0
)
RETURNS TABLE (
    new_mastery_level TEXT,
    streak_days INT,
    is_newly_mastered BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_current_dates DATE[];
    v_today DATE;
    v_new_dates DATE[];
    v_streak INT;
    v_mastery TEXT;
    v_was_mastered BOOLEAN;
    v_is_mastered BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    v_today := CURRENT_DATE;
    
    -- Get current state
    SELECT 
        us.last_correct_dates,
        us.mastery_level = 'mastered'
    INTO v_current_dates, v_was_mastered
    FROM user_statistics us
    WHERE us.user_id = v_user_id AND us.chunk_id = p_chunk_id;
    
    -- Initialize if null
    v_current_dates := COALESCE(v_current_dates, '{}');
    
    IF p_is_correct THEN
        -- Add today if not already in array
        IF NOT v_today = ANY(v_current_dates) THEN
            v_new_dates := v_current_dates || v_today;
            -- Keep only last 7 days
            v_new_dates := (
                SELECT ARRAY_AGG(d ORDER BY d DESC)
                FROM UNNEST(v_new_dates) d
                WHERE d >= CURRENT_DATE - INTERVAL '7 days'
            );
        ELSE
            v_new_dates := v_current_dates;
        END IF;
        
        -- Calculate streak (consecutive unique days)
        v_streak := ARRAY_LENGTH(v_new_dates, 1);
        
        -- Check mastery (3 different days correct)
        IF v_streak >= 3 THEN
            v_mastery := 'mastered';
        ELSIF v_streak >= 1 THEN
            v_mastery := 'improving';
        ELSE
            v_mastery := 'learning';
        END IF;
    ELSE
        -- Wrong answer: reset streak but keep dates
        v_new_dates := '{}';
        v_streak := 0;
        v_mastery := 'learning';
    END IF;
    
    -- Update user_statistics
    UPDATE user_statistics
    SET 
        mastery_level = v_mastery,
        streak_days = v_streak,
        last_correct_dates = v_new_dates,
        total_time_spent_ms = total_time_spent_ms + p_time_spent_ms,
        attempt_count = attempt_count + 1,
        correct_count = correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        incorrect_count = incorrect_count + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
        last_reviewed_at = now()
    WHERE user_id = v_user_id AND chunk_id = p_chunk_id;
    
    -- Insert if not exists
    IF NOT FOUND THEN
        INSERT INTO user_statistics (
            user_id, chunk_id, mastery_level, streak_days, 
            last_correct_dates, total_time_spent_ms, attempt_count,
            correct_count, incorrect_count
        ) VALUES (
            v_user_id, p_chunk_id, v_mastery, v_streak,
            v_new_dates, p_time_spent_ms, 1,
            CASE WHEN p_is_correct THEN 1 ELSE 0 END,
            CASE WHEN p_is_correct THEN 0 ELSE 1 END
        );
    END IF;
    
    v_is_mastered := v_mastery = 'mastered' AND NOT v_was_mastered;
    
    RETURN QUERY SELECT v_mastery, v_streak, v_is_mastered;
END;
$$;

-- =====================================================
-- 5. Get User Mastery Summary
-- =====================================================
CREATE OR REPLACE FUNCTION get_mastery_summary(
    p_lesson_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_chunks INT,
    mastered_count INT,
    improving_count INT,
    learning_count INT,
    mastery_percentage FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT AS total_chunks,
        COUNT(*) FILTER (WHERE us.mastery_level = 'mastered')::INT AS mastered_count,
        COUNT(*) FILTER (WHERE us.mastery_level = 'improving')::INT AS improving_count,
        COUNT(*) FILTER (WHERE us.mastery_level = 'learning')::INT AS learning_count,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE (COUNT(*) FILTER (WHERE us.mastery_level = 'mastered')::FLOAT / COUNT(*)::FLOAT) * 100
        END AS mastery_percentage
    FROM user_statistics us
    INNER JOIN lesson_chunks lc ON lc.id = us.chunk_id
    INNER JOIN lessons l ON l.id = lc.lesson_id
    WHERE us.user_id = auth.uid()
        AND (p_lesson_type IS NULL OR LOWER(l.name) = LOWER(p_lesson_type));
END;
$$;

-- =====================================================
-- 6. Get Error Book Entries
-- =====================================================
CREATE OR REPLACE FUNCTION get_error_book(
    p_lesson_type TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    chunk_id UUID,
    chunk_title TEXT,
    lesson_type TEXT,
    question_data JSONB,
    user_answer TEXT,
    correct_answer TEXT,
    ai_advice TEXT,
    reviewed BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eb.id,
        eb.chunk_id,
        lc.title AS chunk_title,
        l.name AS lesson_type,
        eb.question_data,
        eb.user_answer,
        eb.correct_answer,
        eb.ai_advice,
        eb.reviewed,
        eb.created_at
    FROM error_book eb
    INNER JOIN lesson_chunks lc ON lc.id = eb.chunk_id
    INNER JOIN lessons l ON l.id = lc.lesson_id
    WHERE eb.user_id = auth.uid()
        AND (p_lesson_type IS NULL OR LOWER(l.name) = LOWER(p_lesson_type))
    ORDER BY eb.created_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- 7. Save Error to Error Book
-- =====================================================
CREATE OR REPLACE FUNCTION save_to_error_book(
    p_chunk_id UUID,
    p_question_data JSONB,
    p_user_answer TEXT,
    p_correct_answer TEXT,
    p_ai_advice TEXT DEFAULT NULL
)
RETURNS error_book
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result error_book;
BEGIN
    INSERT INTO error_book (
        user_id, chunk_id, question_data, 
        user_answer, correct_answer, ai_advice
    ) VALUES (
        auth.uid(), p_chunk_id, p_question_data,
        p_user_answer, p_correct_answer, p_ai_advice
    )
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;
