-- =====================================================
-- Prevent Duplicate Questions in Bank
-- =====================================================

-- 1. Cleanup existing duplicates (Keeping the one with earliest created_at)
-- referencing self for deletion
DELETE FROM question_bank qb1
WHERE EXISTS (
    SELECT 1 FROM question_bank qb2
    WHERE qb2.chunk_id = qb1.chunk_id
    AND qb2.question_data->>'question' = qb1.question_data->>'question'
    AND (
        qb2.created_at < qb1.created_at 
        OR (qb2.created_at = qb1.created_at AND qb2.id < qb1.id)
    )
);

-- 2. Update save_question_to_bank to prevent new duplicates
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
    -- Check for existing question content (same chunk, same question text)
    SELECT id INTO v_id 
    FROM question_bank 
    WHERE chunk_id = p_chunk_id 
    AND question_data->>'question' = p_question_data->>'question'
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    INSERT INTO question_bank (chunk_id, question_data, created_by)
    VALUES (p_chunk_id, p_question_data, auth.uid())
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;
