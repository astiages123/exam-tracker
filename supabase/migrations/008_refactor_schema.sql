-- =====================================================
-- SCHEMA REFACTORING & CLEANUP
-- Consolidating user_answered_questions and error_book
-- =====================================================

-- 1. Rename user_answered_questions to user_responses for a cleaner name
ALTER TABLE IF EXISTS user_answered_questions RENAME TO user_responses;

-- 2. Add missing columns from error_book to user_responses
ALTER TABLE user_responses 
ADD COLUMN IF NOT EXISTS user_answer TEXT,
ADD COLUMN IF NOT EXISTS ai_advice TEXT;

-- 3. Data Migration (Optional: move data from error_book to user_responses if needed)
-- Since error_book was experimental, we might just start fresh or try a best-effort move.
-- For this refactor, we assume starting fresh for error history is acceptable to prune complexity.

-- 4. Drop the redundant error_book table
DROP TABLE IF EXISTS error_book CASCADE;

-- 5. Drop redundant functions
DROP FUNCTION IF EXISTS submit_quiz_answer(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS upsert_user_statistic(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS save_to_error_book(UUID, JSONB, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_error_book(TEXT, INT);

-- 6. Unified Progress Update Function
-- We will refine update_mastery_level to handle everything
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
    is_newly_mastered BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_chunk_id UUID;
    v_interval INTERVAL;
BEGIN
    v_user_id := auth.uid();
    
    -- Get chunk_id from question
    SELECT chunk_id INTO v_chunk_id 
    FROM question_bank 
    WHERE id = p_question_id;

    -- Update SRS (User Responses)
    IF p_is_correct THEN
        v_interval := INTERVAL '3 days';
    ELSE
        v_interval := INTERVAL '1 day';
    END IF;

    INSERT INTO user_responses (
        user_id, question_id, is_correct, user_answer, ai_advice, next_review_at
    )
    VALUES (
        v_user_id, p_question_id, p_is_correct, p_user_answer, p_ai_advice, now() + v_interval
    )
    ON CONFLICT (user_id, question_id)
    DO UPDATE SET 
        is_correct = EXCLUDED.is_correct,
        user_answer = EXCLUDED.user_answer,
        ai_advice = EXCLUDED.ai_advice,
        answered_at = now(),
        next_review_at = now() + v_interval;

    -- Update Mastery (Statistics)
    -- We call the existing business logic but wrapped here
    RETURN QUERY SELECT * FROM update_mastery_level(v_chunk_id, p_is_correct, p_time_spent_ms);
END;
$$;

-- 7. Get Error History (Unified)
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
        ur.question_id AS id, -- Using question_id as identifier
        ur.question_id,
        qb.question_data,
        ur.user_answer,
        ur.ai_advice,
        ur.answered_at AS created_at,
        l.name AS lesson_name
    FROM user_responses ur
    INNER JOIN question_bank qb ON qb.id = ur.question_id
    INNER JOIN lesson_chunks lc ON lc.id = qb.chunk_id
    INNER JOIN lessons l ON l.id = lc.lesson_id
    WHERE ur.user_id = auth.uid()
        AND ur.is_correct = false
        AND (p_lesson_type IS NULL OR LOWER(l.name) = LOWER(p_lesson_type))
    ORDER BY ur.answered_at DESC
    LIMIT p_limit;
END;
$$;

-- 8. Update get_questions_from_bank to use renamed user_responses table
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
            SELECT 1 FROM user_responses ur
            WHERE ur.question_id = qb.id 
            AND ur.user_id = auth.uid()
            AND ur.next_review_at > now() -- Only exclude if review time hasn't come yet
        )
    ORDER BY random()
    LIMIT p_limit;
END;
$$;

-- 9. Update mark_question_answered to use renamed user_responses table
CREATE OR REPLACE FUNCTION mark_question_answered(
    p_question_id UUID,
    p_is_correct BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_interval INTERVAL;
BEGIN
    -- Simple Spaced Repetition Logic
    IF p_is_correct THEN
        v_interval := INTERVAL '3 days'; -- Review in 3 days if correct
    ELSE
        v_interval := INTERVAL '1 day'; -- Review in 1 day even if wrong (to allow new questions)
    END IF;

    INSERT INTO user_responses (user_id, question_id, is_correct, next_review_at)
    VALUES (auth.uid(), p_question_id, p_is_correct, now() + v_interval)
    ON CONFLICT (user_id, question_id)
    DO UPDATE SET 
        is_correct = p_is_correct,
        answered_at = now(),
        next_review_at = now() + v_interval;
END;
$$;
