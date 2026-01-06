-- =====================================================
-- Supabase PostgreSQL Schema for Lesson Notes & Stats
-- =====================================================
-- Run this migration in Supabase SQL Editor or via CLI

-- 1. Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 2. TABLES
-- =====================================================

-- Lessons: Main lesson categories (Muhasebe, Mikro İktisat, etc.)
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Lesson Chunks: Individual note sections with embeddings
CREATE TABLE IF NOT EXISTS lesson_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_md TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster vector similarity search
CREATE INDEX IF NOT EXISTS lesson_chunks_embedding_idx 
ON lesson_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for filtering by lesson_id
CREATE INDEX IF NOT EXISTS lesson_chunks_lesson_id_idx 
ON lesson_chunks(lesson_id);

-- User Statistics: Track user performance per chunk
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES lesson_chunks(id) ON DELETE CASCADE,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Each user can have only one stat record per chunk
    UNIQUE(user_id, chunk_id)
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS user_statistics_user_id_idx 
ON user_statistics(user_id);

-- =====================================================
-- 3. VECTOR SEARCH FUNCTION
-- =====================================================

-- Semantic search within a specific lesson using cosine similarity
CREATE OR REPLACE FUNCTION match_lesson_chunks(
    query_embedding vector(1536),
    target_lesson_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content_md TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lc.id,
        lc.title,
        lc.content_md,
        lc.metadata,
        1 - (lc.embedding <=> query_embedding) AS similarity
    FROM lesson_chunks lc
    WHERE 
        lc.lesson_id = target_lesson_id
        AND lc.embedding IS NOT NULL
        AND 1 - (lc.embedding <=> query_embedding) > match_threshold
    ORDER BY lc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;

-- Lessons: Everyone can read
CREATE POLICY "Lessons are viewable by everyone"
ON lessons FOR SELECT
TO authenticated, anon
USING (true);

-- Lesson Chunks: Everyone can read
CREATE POLICY "Lesson chunks are viewable by everyone"
ON lesson_chunks FOR SELECT
TO authenticated, anon
USING (true);

-- User Statistics: Users can only access their own data
CREATE POLICY "Users can view own statistics"
ON user_statistics FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statistics"
ON user_statistics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics"
ON user_statistics FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own statistics"
ON user_statistics FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 5. HELPER FUNCTION: Upsert user statistics
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_user_statistic(
    p_chunk_id UUID,
    p_is_correct BOOLEAN
)
RETURNS user_statistics
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result user_statistics;
BEGIN
    INSERT INTO user_statistics (user_id, chunk_id, correct_count, incorrect_count, last_reviewed_at)
    VALUES (
        auth.uid(),
        p_chunk_id,
        CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        CASE WHEN p_is_correct THEN 0 ELSE 1 END,
        now()
    )
    ON CONFLICT (user_id, chunk_id)
    DO UPDATE SET
        correct_count = user_statistics.correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        incorrect_count = user_statistics.incorrect_count + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
        last_reviewed_at = now()
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;
