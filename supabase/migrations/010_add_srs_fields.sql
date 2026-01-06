-- =====================================================
-- SRS Migration (Robust Version)
-- Ensure table exists, then add SRS fields
-- =====================================================

-- 1. Ensure Table Exists (If 006 was skipped)
CREATE TABLE IF NOT EXISTS user_answered_questions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES question_bank(id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT false,
    answered_at TIMESTAMPTZ DEFAULT now(),
    next_review_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 day',
    PRIMARY KEY (user_id, question_id)
);

-- Enable RLS if created now
ALTER TABLE user_answered_questions ENABLE ROW LEVEL SECURITY;

-- Re-apply policies (IF NOT EXISTS check logic via DO block or just drop/create)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own answered questions" ON user_answered_questions;
    CREATE POLICY "Users can view own answered questions"
    ON user_answered_questions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert own answered questions" ON user_answered_questions;
    CREATE POLICY "Users can insert own answered questions"
    ON user_answered_questions FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can update own answered questions" ON user_answered_questions;
    CREATE POLICY "Users can update own answered questions"
    ON user_answered_questions FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);
END $$;

-- 2. Add SRS Columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_answered_questions' AND column_name = 'ease_factor') THEN
        ALTER TABLE user_answered_questions ADD COLUMN ease_factor FLOAT DEFAULT 2.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_answered_questions' AND column_name = 'interval') THEN
        ALTER TABLE user_answered_questions ADD COLUMN interval INT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_answered_questions' AND column_name = 'repetition_count') THEN
        ALTER TABLE user_answered_questions ADD COLUMN repetition_count INT DEFAULT 0;
    END IF;
END $$;

-- 3. Update defaults for any existing rows that might have nulls
UPDATE user_answered_questions 
SET ease_factor = 2.5, interval = 0, repetition_count = 0
WHERE ease_factor IS NULL;

-- 4. Indicies
CREATE INDEX IF NOT EXISTS user_answers_next_review_idx 
ON user_answered_questions(user_id, next_review_at);
