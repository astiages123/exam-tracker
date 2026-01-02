-- =====================================================
-- Question Bank Migration
-- Store generated questions for reuse
-- =====================================================

CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES lesson_chunks(id) ON DELETE CASCADE,
    question_data JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT question_bank_data_check CHECK (jsonb_typeof(question_data) = 'object')
);

-- Index for searching questions by lesson/chunk
CREATE INDEX IF NOT EXISTS question_bank_chunk_id_idx ON question_bank(chunk_id);

-- RLS
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- Everyone can read questions (Shared bank)
DROP POLICY IF EXISTS "Question bank is viewable by everyone" ON question_bank;
CREATE POLICY "Question bank is viewable by everyone"
ON question_bank FOR SELECT
TO authenticated, anon
USING (true);

-- Authenticated users can insert
DROP POLICY IF EXISTS "Users can insert into question bank" ON question_bank;
CREATE POLICY "Users can insert into question bank"
ON question_bank FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- RPC: Get Random Questions from Bank
-- =====================================================
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
    ORDER BY random() -- Random selection
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- RPC: Get Questions for Specific Chunks
-- =====================================================
CREATE OR REPLACE FUNCTION get_questions_for_chunks(
    p_chunk_ids UUID[]
)
RETURNS TABLE (
    chunk_id UUID,
    question_data JSONB,
    id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qb.chunk_id,
        qb.question_data,
        qb.id
    FROM question_bank qb
    WHERE qb.chunk_id = ANY(p_chunk_ids)
    ORDER BY qb.chunk_id, random();
END;
$$;

-- =====================================================
-- RPC: Save Question to Bank
-- =====================================================
CREATE OR REPLACE FUNCTION save_question_to_bank(
    p_chunk_id UUID,
    p_question_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO question_bank (chunk_id, question_data, created_by)
    VALUES (p_chunk_id, p_question_data, auth.uid())
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;
