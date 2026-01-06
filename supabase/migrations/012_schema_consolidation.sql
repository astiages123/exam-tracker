-- =====================================================
-- SCHEMA CONSOLIDATION MIGRATION
-- Fixes duplicate tables, consolidates functions, optimizes indexes
-- =====================================================
-- ⚠️ BACKUP YOUR DATA BEFORE RUNNING THIS MIGRATION!
-- Run: pg_dump -Fc your_database > backup.dump

-- =====================================================
-- 1. TABLE CONSOLIDATION: Merge user_responses into user_answered_questions
-- =====================================================

-- 1.1 Add missing columns to user_answered_questions (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_answered_questions' AND column_name = 'user_answer') THEN
        ALTER TABLE user_answered_questions ADD COLUMN user_answer TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_answered_questions' AND column_name = 'ai_advice') THEN
        ALTER TABLE user_answered_questions ADD COLUMN ai_advice TEXT;
    END IF;
END $$;

-- 1.2 Migrate data from user_responses if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_responses') THEN
        -- Insert data that doesn't exist in user_answered_questions
        INSERT INTO user_answered_questions (user_id, question_id, is_correct, answered_at, next_review_at, user_answer, ai_advice)
        SELECT ur.user_id, ur.question_id, ur.is_correct, ur.answered_at, ur.next_review_at, ur.user_answer, ur.ai_advice
        FROM user_responses ur
        ON CONFLICT (user_id, question_id) 
        DO UPDATE SET
            user_answer = COALESCE(EXCLUDED.user_answer, user_answered_questions.user_answer),
            ai_advice = COALESCE(EXCLUDED.ai_advice, user_answered_questions.ai_advice);
    END IF;
END $$;

-- 1.3 Drop user_responses table
DROP TABLE IF EXISTS user_responses CASCADE;

-- =====================================================
-- 2. CLEANUP: Remove duplicate column from lesson_chunks
-- =====================================================

-- 2.1 Migrate name data to title if title is null
UPDATE lesson_chunks 
SET title = name 
WHERE title IS NULL AND name IS NOT NULL;

-- 2.2 Drop the redundant name column
ALTER TABLE lesson_chunks DROP COLUMN IF EXISTS name;

-- =====================================================
-- 3. FUNCTION CONSOLIDATION: All functions use user_answered_questions
-- =====================================================

-- 3.1 Drop ALL functions that will be redefined (handles return type changes)
DROP FUNCTION IF EXISTS submit_quiz_answer(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS upsert_user_statistic(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS save_to_error_book(UUID, JSONB, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_error_book(TEXT, INT);
DROP FUNCTION IF EXISTS update_user_progress(UUID, BOOLEAN, TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS mark_question_answered(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS mark_question_answered(UUID, BOOLEAN, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_questions_from_bank(TEXT, INT, UUID[]);
DROP FUNCTION IF EXISTS get_user_error_history(TEXT, INT);
DROP FUNCTION IF EXISTS get_new_questions_for_user(TEXT, INT);

-- 3.2 Unified: Get Questions From Bank (SRS-aware)
CREATE OR REPLACE FUNCTION get_questions_from_bank(
    p_lesson_type TEXT,
    p_limit INT DEFAULT 10,
    p_exclude_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (
    id UUID,
    chunk_id UUID,
    question_data JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qb.id,
        qb.chunk_id,
        qb.question_data,
        qb.created_at
    FROM question_bank qb
    INNER JOIN lesson_chunks lc ON lc.id = qb.chunk_id
    INNER JOIN lessons l ON l.id = lc.lesson_id
    WHERE 
        (p_lesson_type IS NULL OR LOWER(l.name) = LOWER(p_lesson_type))
        AND (p_exclude_ids IS NULL OR NOT (qb.id = ANY(p_exclude_ids)))
        AND NOT EXISTS (
            SELECT 1 FROM user_answered_questions uaq
            WHERE uaq.question_id = qb.id 
            AND uaq.user_id = auth.uid()
            AND uaq.next_review_at > now()
        )
    ORDER BY random()
    LIMIT p_limit;
END;
$$;

-- 3.3 Unified: Mark Question Answered (with SRS)
CREATE OR REPLACE FUNCTION mark_question_answered(
    p_question_id UUID,
    p_is_correct BOOLEAN,
    p_user_answer TEXT DEFAULT NULL,
    p_ai_advice TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current user_answered_questions%ROWTYPE;
    v_new_ef FLOAT;
    v_new_interval INT;
    v_new_reps INT;
    v_quality INT;
BEGIN
    -- SM-2 quality score: 5 for correct, 1 for incorrect
    v_quality := CASE WHEN p_is_correct THEN 5 ELSE 1 END;
    
    -- Get current SRS state
    SELECT * INTO v_current
    FROM user_answered_questions
    WHERE user_id = auth.uid() AND question_id = p_question_id;
    
    IF v_current IS NULL THEN
        -- First time answering
        v_new_ef := 2.5;
        v_new_reps := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
        v_new_interval := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
    ELSE
        -- SM-2 Algorithm
        v_new_ef := GREATEST(1.3, v_current.ease_factor + (0.1 - (5 - v_quality) * (0.08 + (5 - v_quality) * 0.02)));
        
        IF p_is_correct THEN
            v_new_reps := v_current.repetition_count + 1;
            IF v_new_reps = 1 THEN
                v_new_interval := 1;
            ELSIF v_new_reps = 2 THEN
                v_new_interval := 6;
            ELSE
                v_new_interval := CEIL(v_current.interval * v_new_ef)::INT;
            END IF;
        ELSE
            v_new_reps := 0;
            v_new_interval := 1;
        END IF;
    END IF;
    
    -- Upsert
    INSERT INTO user_answered_questions (
        user_id, question_id, is_correct, user_answer, ai_advice,
        ease_factor, interval, repetition_count, next_review_at
    )
    VALUES (
        auth.uid(), p_question_id, p_is_correct, p_user_answer, p_ai_advice,
        v_new_ef, v_new_interval, v_new_reps, now() + (v_new_interval || ' days')::INTERVAL
    )
    ON CONFLICT (user_id, question_id)
    DO UPDATE SET 
        is_correct = EXCLUDED.is_correct,
        user_answer = COALESCE(EXCLUDED.user_answer, user_answered_questions.user_answer),
        ai_advice = COALESCE(EXCLUDED.ai_advice, user_answered_questions.ai_advice),
        ease_factor = EXCLUDED.ease_factor,
        interval = EXCLUDED.interval,
        repetition_count = EXCLUDED.repetition_count,
        answered_at = now(),
        next_review_at = EXCLUDED.next_review_at;
END;
$$;

-- 3.4 Unified: Update User Progress (combines mastery + answer tracking)
CREATE OR REPLACE FUNCTION update_user_progress(
    p_question_id UUID,
    p_is_correct BOOLEAN,
    p_user_answer TEXT DEFAULT NULL,
    p_ai_advice TEXT DEFAULT NULL,
    p_time_spent_ms INT DEFAULT 0
)
RETURNS TABLE (
    new_mastery_level TEXT,
    streak_days INT,
    is_newly_mastered BOOLEAN,
    next_review_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_chunk_id UUID;
    v_mastery_result RECORD;
    v_next_review TIMESTAMPTZ;
BEGIN
    -- Get chunk_id from question
    SELECT qb.chunk_id INTO v_chunk_id 
    FROM question_bank qb
    WHERE qb.id = p_question_id;
    
    -- Mark question answered (handles SRS)
    PERFORM mark_question_answered(p_question_id, p_is_correct, p_user_answer, p_ai_advice);
    
    -- Get next_review_at
    SELECT uaq.next_review_at INTO v_next_review
    FROM user_answered_questions uaq
    WHERE uaq.user_id = auth.uid() AND uaq.question_id = p_question_id;
    
    -- Update mastery level
    SELECT * INTO v_mastery_result 
    FROM update_mastery_level(v_chunk_id, p_is_correct, p_time_spent_ms);
    
    RETURN QUERY SELECT 
        v_mastery_result.new_mastery_level,
        v_mastery_result.streak_days,
        v_mastery_result.is_newly_mastered,
        v_next_review;
END;
$$;

-- 3.5 Get User Error History (uses user_answered_questions)
CREATE OR REPLACE FUNCTION get_user_error_history(
    p_lesson_type TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    question_id UUID,
    question_data JSONB,
    user_answer TEXT,
    ai_advice TEXT,
    created_at TIMESTAMPTZ,
    lesson_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uaq.question_id AS id,
        uaq.question_id,
        qb.question_data,
        uaq.user_answer,
        uaq.ai_advice,
        uaq.answered_at AS created_at,
        l.name AS lesson_name
    FROM user_answered_questions uaq
    INNER JOIN question_bank qb ON qb.id = uaq.question_id
    INNER JOIN lesson_chunks lc ON lc.id = qb.chunk_id
    INNER JOIN lessons l ON l.id = lc.lesson_id
    WHERE uaq.user_id = auth.uid()
        AND uaq.is_correct = false
        AND (p_lesson_type IS NULL OR LOWER(l.name) = LOWER(p_lesson_type))
    ORDER BY uaq.answered_at DESC
    LIMIT p_limit;
END;
$$;

-- 3.6 Get New Questions For User (optimized)
CREATE OR REPLACE FUNCTION get_new_questions_for_user(
    p_lesson_type TEXT,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    chunk_id UUID,
    question_data JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT qb.id, qb.chunk_id, qb.question_data, qb.created_at
    FROM question_bank qb
    INNER JOIN lesson_chunks lc ON lc.id = qb.chunk_id
    INNER JOIN lessons l ON l.id = lc.lesson_id
    WHERE LOWER(l.name) = LOWER(p_lesson_type)
      AND NOT EXISTS (
          SELECT 1 FROM user_answered_questions uaq
          WHERE uaq.question_id = qb.id AND uaq.user_id = auth.uid()
      )
    ORDER BY random()
    LIMIT p_limit;
$$;

-- =====================================================
-- 4. INDEX OPTIMIZATION
-- =====================================================

-- 4.1 User answered questions indexes
CREATE INDEX IF NOT EXISTS uaq_user_review_idx 
ON user_answered_questions(user_id, next_review_at);

CREATE INDEX IF NOT EXISTS uaq_question_user_idx 
ON user_answered_questions(question_id, user_id);

-- 4.2 Quiz sessions index
CREATE INDEX IF NOT EXISTS quiz_sessions_user_idx 
ON quiz_sessions(user_id, created_at DESC);

-- 4.3 Question bank indexes
CREATE INDEX IF NOT EXISTS question_bank_chunk_idx 
ON question_bank(chunk_id);

-- 4.4 Lesson chunks index
CREATE INDEX IF NOT EXISTS lesson_chunks_lesson_idx 
ON lesson_chunks(lesson_id);

-- 4.5 User statistics composite index
CREATE INDEX IF NOT EXISTS user_stats_user_chunk_idx 
ON user_statistics(user_id, chunk_id);

-- 4.6 Cleanup old redundant indexes
DROP INDEX IF EXISTS user_answers_next_review_idx;
DROP INDEX IF EXISTS user_answers_question_user_idx;

-- =====================================================
-- 5. RLS POLICIES (ensure consistency)
-- =====================================================

-- Drop and recreate policies for user_answered_questions
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own answered questions" ON user_answered_questions;
    DROP POLICY IF EXISTS "Users can insert own answered questions" ON user_answered_questions;
    DROP POLICY IF EXISTS "Users can update own answered questions" ON user_answered_questions;
    DROP POLICY IF EXISTS "Users can delete own answered questions" ON user_answered_questions;
END $$;

CREATE POLICY "Users can view own answered questions"
ON user_answered_questions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answered questions"
ON user_answered_questions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answered questions"
ON user_answered_questions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own answered questions"
ON user_answered_questions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_questions_from_bank(TEXT, INT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_question_answered(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_progress(UUID, BOOLEAN, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_error_history(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_new_questions_for_user(TEXT, INT) TO authenticated;

-- =====================================================
-- Done! Schema is now consolidated and optimized.
-- =====================================================
