-- =====================================================
-- Initialize Quiz RPC Function
-- =====================================================
-- Kullanıcının zayıf konularına göre hibrit quiz oluşturur
-- %30 zayıf konular + %70 rastgele havuz

-- Ana quiz başlatma fonksiyonu
CREATE OR REPLACE FUNCTION initialize_quiz(
    p_user_id UUID,
    p_lesson_type TEXT,
    p_total_questions INT DEFAULT 10
)
RETURNS TABLE (
    chunk_id UUID,
    title TEXT,
    content_md TEXT,
    metadata JSONB,
    source_type TEXT  -- 'weak' veya 'random'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_weak_count INT;
    v_random_count INT;
    v_lesson_id UUID;
BEGIN
    -- Soru dağılımını hesapla (%30 zayıf, %70 rastgele)
    v_weak_count := CEIL(p_total_questions * 0.3);      -- 3 soru
    v_random_count := p_total_questions - v_weak_count;  -- 7 soru
    
    -- Dersin ID'sini bul
    SELECT l.id INTO v_lesson_id
    FROM lessons l
    WHERE LOWER(l.name) = LOWER(p_lesson_type)
    LIMIT 1;
    
    -- Ders bulunamazsa boş döndür
    IF v_lesson_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Sonuçları döndür
    RETURN QUERY
    WITH 
    -- 1. Kullanıcının en çok hata yaptığı 3 chunk (zayıf konular)
    weak_chunks AS (
        SELECT 
            lc.id,
            lc.title,
            lc.content_md,
            lc.metadata,
            'weak'::TEXT AS source_type,
            COALESCE(us.incorrect_count, 0) AS errors
        FROM lesson_chunks lc
        LEFT JOIN user_statistics us 
            ON us.chunk_id = lc.id 
            AND us.user_id = p_user_id
        WHERE lc.lesson_id = v_lesson_id
        ORDER BY COALESCE(us.incorrect_count, 0) DESC
        LIMIT v_weak_count
    ),
    
    -- 2. Çözülmemiş parçalara öncelik veren rastgele seçim
    random_chunks AS (
        SELECT 
            lc.id,
            lc.title,
            lc.content_md,
            lc.metadata,
            'random'::TEXT AS source_type,
            CASE 
                WHEN us.id IS NULL THEN 0  -- Çözülmemiş: öncelik
                ELSE 1 
            END AS priority
        FROM lesson_chunks lc
        LEFT JOIN user_statistics us 
            ON us.chunk_id = lc.id 
            AND us.user_id = p_user_id
        WHERE lc.lesson_id = v_lesson_id
            AND lc.id NOT IN (SELECT id FROM weak_chunks)  -- Zayıf konuları hariç tut
        ORDER BY priority, RANDOM()
        LIMIT v_random_count
    )
    
    -- Sonuçları birleştir
    SELECT wc.id, wc.title, wc.content_md, wc.metadata, wc.source_type
    FROM weak_chunks wc
    UNION ALL
    SELECT rc.id, rc.title, rc.content_md, rc.metadata, rc.source_type
    FROM random_chunks rc;
    
END;
$$;

-- =====================================================
-- Yardımcı Fonksiyon: Kullanıcının zayıf konularını getir
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_weak_topics(
    p_user_id UUID,
    p_lesson_type TEXT,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    title TEXT,
    incorrect_count INT,
    correct_count INT,
    accuracy_rate FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lc.id AS chunk_id,
        lc.title,
        COALESCE(us.incorrect_count, 0) AS incorrect_count,
        COALESCE(us.correct_count, 0) AS correct_count,
        CASE 
            WHEN COALESCE(us.correct_count, 0) + COALESCE(us.incorrect_count, 0) = 0 THEN 0
            ELSE COALESCE(us.correct_count, 0)::FLOAT / 
                 (COALESCE(us.correct_count, 0) + COALESCE(us.incorrect_count, 0))::FLOAT
        END AS accuracy_rate
    FROM lesson_chunks lc
    INNER JOIN lessons l ON l.id = lc.lesson_id
    LEFT JOIN user_statistics us 
        ON us.chunk_id = lc.id 
        AND us.user_id = p_user_id
    WHERE LOWER(l.name) = LOWER(p_lesson_type)
    ORDER BY COALESCE(us.incorrect_count, 0) DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- Yardımcı Fonksiyon: Quiz sonuçlarını kaydet
-- =====================================================
CREATE OR REPLACE FUNCTION submit_quiz_answer(
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
