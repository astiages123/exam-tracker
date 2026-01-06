-- =====================================================
-- Performance Optimization Migration
-- Adds indexes and RPC for efficient question fetching
-- =====================================================

-- 1. Case-insensitive index on lessons.name
-- Enables index usage for LOWER() comparisons
CREATE INDEX IF NOT EXISTS lessons_name_lower_idx 
ON lessons (LOWER(name));

-- 2. Composite index on question_bank for chunk + time queries
CREATE INDEX IF NOT EXISTS question_bank_chunk_created_idx
ON question_bank(chunk_id, created_at DESC);

-- 3. Partial index for verified questions in JSONB
-- Only indexes rows where verified = 'true'
CREATE INDEX IF NOT EXISTS question_bank_verified_idx
ON question_bank ((question_data->>'verified')) 
WHERE question_data->>'verified' = 'true';

-- 4. Index on user_answered_questions for efficient NOT EXISTS lookups
CREATE INDEX IF NOT EXISTS user_answers_question_user_idx
ON user_answered_questions(question_id, user_id);

-- =====================================================
-- RPC: Get New Questions for User (Not Yet Answered)
-- Replaces client-side filtering for better performance
-- =====================================================
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_new_questions_for_user(TEXT, INT) TO authenticated;
