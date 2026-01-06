-- =====================================================
-- Stockpile Status Migration
-- Real-time lesson fill rate tracking
-- =====================================================

-- 1. Create stockpile config table
CREATE TABLE IF NOT EXISTS stockpile_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_name TEXT NOT NULL UNIQUE,
    target_count INT NOT NULL DEFAULT 100,
    priority INT DEFAULT 1, -- Higher = more important to fill
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE stockpile_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read stockpile config
DROP POLICY IF EXISTS "Stockpile config is viewable by everyone" ON stockpile_config;
CREATE POLICY "Stockpile config is viewable by everyone"
ON stockpile_config FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can modify (via service role or manual SQL)
-- No INSERT/UPDATE/DELETE policies for regular users

-- 2. Seed initial stockpile targets from our config
-- Using UPSERT to avoid duplicates on re-run
INSERT INTO stockpile_config (lesson_name, target_count, priority) VALUES
    -- Ekonomi (High Priority)
    ('Mikro İktisat', 1000, 3),
    ('Makro İktisat', 900, 3),
    ('Para, Banka ve Kredi', 300, 2),
    ('Uluslararası Ticaret', 300, 2),
    ('Türkiye Ekonomisi', 400, 2),
    
    -- Hukuk (Medium-High Priority)
    ('Medeni Hukuk', 600, 3),
    ('Borçlar Hukuku', 500, 3),
    ('Ticaret Hukuku', 700, 3),
    ('Bankacılık Hukuku', 150, 2),
    ('İcra ve İflas Hukuku', 250, 2),
    ('Ceza Hukuku', 360, 2),
    ('İş Hukuku', 90, 1),
    
    -- Muhasebe & Maliye (High Priority)
    ('Muhasebe', 1250, 3),
    ('Maliye', 750, 3),
    
    -- Bankacılık & Finans & İşletme
    ('Banka Muhasebesi', 150, 2),
    ('Finans Matematiği', 200, 2),
    ('İşletme Yönetimi', 80, 1),
    ('Pazarlama Yönetimi', 80, 1),
    ('Finansal Yönetim', 80, 1),
    
    -- Genel Yetenek
    ('Matematik & Sayısal Mantık', 500, 2),
    ('İstatistik', 150, 1)
ON CONFLICT (lesson_name) DO UPDATE SET
    target_count = EXCLUDED.target_count,
    priority = EXCLUDED.priority,
    updated_at = now();

-- =====================================================
-- 3. MAIN FUNCTION: Get Stockpile Status
-- Returns real-time fill rates for each lesson
-- =====================================================
CREATE OR REPLACE FUNCTION get_stockpile_status()
RETURNS TABLE (
    lesson_name TEXT,
    target_count INT,
    current_count BIGINT,
    fill_percentage FLOAT,
    verified_count BIGINT,
    unverified_count BIGINT,
    priority INT
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        l.name AS lesson_name,
        COALESCE(sc.target_count, 100) AS target_count,
        COUNT(qb.id) AS current_count,
        ROUND((COUNT(qb.id)::NUMERIC / NULLIF(COALESCE(sc.target_count, 100), 0)) * 100, 2)::FLOAT AS fill_percentage,
        COUNT(qb.id) FILTER (WHERE qb.question_data->>'verified' = 'true') AS verified_count,
        COUNT(qb.id) FILTER (WHERE qb.question_data->>'verified' != 'true' OR qb.question_data->>'verified' IS NULL) AS unverified_count,
        COALESCE(sc.priority, 1) AS priority
    FROM lessons l
    LEFT JOIN lesson_chunks lc ON lc.lesson_id = l.id
    LEFT JOIN question_bank qb ON qb.chunk_id = lc.id
    LEFT JOIN stockpile_config sc ON LOWER(sc.lesson_name) = LOWER(l.name)
    GROUP BY l.name, sc.target_count, sc.priority
    ORDER BY fill_percentage ASC, sc.priority DESC;
$$;

-- =====================================================
-- 4. HELPER: Get Stockpile Status for Specific Lesson
-- =====================================================
CREATE OR REPLACE FUNCTION get_lesson_stockpile_status(p_lesson_name TEXT)
RETURNS TABLE (
    lesson_name TEXT,
    target_count INT,
    current_count BIGINT,
    fill_percentage FLOAT,
    verified_count BIGINT,
    remaining_to_target BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        l.name AS lesson_name,
        COALESCE(sc.target_count, 100) AS target_count,
        COUNT(qb.id) AS current_count,
        ROUND((COUNT(qb.id)::NUMERIC / NULLIF(COALESCE(sc.target_count, 100), 0)) * 100, 2)::FLOAT AS fill_percentage,
        COUNT(qb.id) FILTER (WHERE qb.question_data->>'verified' = 'true') AS verified_count,
        GREATEST(0, COALESCE(sc.target_count, 100) - COUNT(qb.id)::INT) AS remaining_to_target
    FROM lessons l
    LEFT JOIN lesson_chunks lc ON lc.lesson_id = l.id
    LEFT JOIN question_bank qb ON qb.chunk_id = lc.id
    LEFT JOIN stockpile_config sc ON LOWER(sc.lesson_name) = LOWER(l.name)
    WHERE LOWER(l.name) = LOWER(p_lesson_name)
    GROUP BY l.name, sc.target_count;
$$;

-- =====================================================
-- 5. PERFORMANCE: Get Summary Stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_stockpile_summary()
RETURNS TABLE (
    total_target BIGINT,
    total_current BIGINT,
    overall_percentage FLOAT,
    total_verified BIGINT,
    lessons_above_50_percent INT,
    lessons_above_80_percent INT,
    lessons_complete INT
)
LANGUAGE sql
STABLE
AS $$
    WITH stats AS (
        SELECT 
            COALESCE(sc.target_count, 100) AS target,
            COUNT(qb.id) AS current,
            COUNT(qb.id) FILTER (WHERE qb.question_data->>'verified' = 'true') AS verified
        FROM lessons l
        LEFT JOIN lesson_chunks lc ON lc.lesson_id = l.id
        LEFT JOIN question_bank qb ON qb.chunk_id = lc.id
        LEFT JOIN stockpile_config sc ON LOWER(sc.lesson_name) = LOWER(l.name)
        GROUP BY l.name, sc.target_count
    )
    SELECT 
        SUM(target)::BIGINT AS total_target,
        SUM(current)::BIGINT AS total_current,
        ROUND((SUM(current)::NUMERIC / NULLIF(SUM(target), 0)) * 100, 2)::FLOAT AS overall_percentage,
        SUM(verified)::BIGINT AS total_verified,
        COUNT(*) FILTER (WHERE (current::FLOAT / NULLIF(target, 0)) >= 0.5)::INT AS lessons_above_50_percent,
        COUNT(*) FILTER (WHERE (current::FLOAT / NULLIF(target, 0)) >= 0.8)::INT AS lessons_above_80_percent,
        COUNT(*) FILTER (WHERE current >= target)::INT AS lessons_complete
    FROM stats;
$$;

-- =====================================================
-- 6. INDEX: Optimize JSON verification lookups
-- =====================================================
CREATE INDEX IF NOT EXISTS question_bank_verified_idx 
ON question_bank ((question_data->>'verified'));

COMMENT ON FUNCTION get_stockpile_status() IS 'Returns real-time stockpile fill rates for all lessons, ordered by fill percentage (lowest first)';
COMMENT ON FUNCTION get_lesson_stockpile_status(TEXT) IS 'Returns stockpile status for a specific lesson';
COMMENT ON FUNCTION get_stockpile_summary() IS 'Returns overall stockpile statistics summary';
COMMENT ON TABLE stockpile_config IS 'Target question counts for each lesson - synced with frontend stockpileConfig.ts';
