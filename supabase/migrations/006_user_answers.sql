
-- Table to track individual questions answered by users
CREATE TABLE IF NOT EXISTS user_answered_questions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES question_bank(id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT false,
    answered_at TIMESTAMPTZ DEFAULT now(),
    next_review_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 day',
    PRIMARY KEY (user_id, question_id)
);

ALTER TABLE user_answered_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own answered questions" ON user_answered_questions;
CREATE POLICY "Users can view own answered questions"
ON user_answered_questions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own answered questions" ON user_answered_questions;
CREATE POLICY "Users can insert own answered questions"
ON user_answered_questions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RPC to mark question as answered (with basic Spaced Repetition logic)
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

    INSERT INTO user_answered_questions (user_id, question_id, is_correct, next_review_at)
    VALUES (auth.uid(), p_question_id, p_is_correct, now() + v_interval)
    ON CONFLICT (user_id, question_id)
    DO UPDATE SET 
        is_correct = p_is_correct,
        answered_at = now(),
        next_review_at = now() + v_interval;
END;
$$;

-- REDEFINE get_questions_from_bank to exclude questions UNTIL next_review_at
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
            SELECT 1 FROM user_answered_questions uaq
            WHERE uaq.question_id = qb.id 
            AND uaq.user_id = auth.uid()
            AND uaq.next_review_at > now() -- Only exclude if review time hasn't come yet
        )
    ORDER BY random()
    LIMIT p_limit;
END;
$$;
