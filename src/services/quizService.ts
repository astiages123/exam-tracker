/**
 * Quiz Service - Supabase RPC wrapper
 * 
 * Kullanıcının zayıf konularına göre hibrit quiz oluşturur.
 */

import { supabase } from '../lib/supabaseClient';


export interface QuizQuestionData {
    question: string;
    options: {
        A: string;
        B: string;
        C: string;
        D: string;
        E: string;
    };
    correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    verified: boolean;
    verification_notes: string;
    chart_data?: {
        type: 'bar' | 'line' | 'pie';
        title?: string;
        xAxisLabel?: string;
        yAxisLabel?: string;
        data: { label: string; value: number }[];
    } | null;
}

export interface WeakTopic {
    chunk_id: string;
    title: string;
    lesson_type: string;
    mastery_level: number;
    correct_count: number;
    incorrect_count: number;
}

/**
 * Quiz başlatır - Zayıf konular + rastgele dağılım
 * 
 * @param {string} userId - Kullanıcı UUID
 * @param {string} lessonType - Ders adı (Örn: 'Muhasebe')
 * @param {number} totalQuestions - Toplam soru sayısı (default: 10)
 * @returns {Promise<Array<any>>} Quiz soruları
 */
export async function initializeQuiz(userId: string, lessonType: string, totalQuestions = 10): Promise<any[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.rpc('initialize_quiz', {
        p_user_id: userId,
        p_lesson_type: lessonType,
        p_total_questions: totalQuestions
    });

    if (error) {
        console.error('initializeQuiz error:', error);
        throw new Error(`Quiz başlatılamadı: ${error.message}`);
    }

    return data || [];
}

/**
 * Kullanıcının zayıf konularını getirir
 * 
 * @param {string} userId - Kullanıcı UUID
 * @param {string} lessonType - Ders adı
 * @param {number} limit - Maksimum sonuç sayısı
 * @returns {Promise<Array<WeakTopic>>} Zayıf konular listesi
 */
export async function getUserWeakTopics(userId: string, lessonType: string, limit = 5): Promise<WeakTopic[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.rpc('get_user_weak_topics', {
        p_user_id: userId,
        p_lesson_type: lessonType,
        p_limit: limit
    });

    if (error) {
        console.error('getUserWeakTopics error:', error);
        throw new Error(`Zayıf konular alınamadı: ${error.message}`);
    }

    return data || [];
}

// Redundant submitQuizAnswer removed as it's now handled by unified progress update.

/**
 * Kullanıcının ders bazlı istatistiklerini hesaplar
 * 
 * @param {string} userId - Kullanıcı UUID
 * @param {string} lessonType - Ders adı
 * @returns {Promise<any>} İstatistikler
 */
export async function getLessonStatistics(userId: string, lessonType: string): Promise<any> {
    const weakTopics = await getUserWeakTopics(userId, lessonType, 100);

    const totalQuestions = weakTopics.length;
    const totalCorrect = weakTopics.reduce((sum, t) => sum + t.correct_count, 0);
    const totalIncorrect = weakTopics.reduce((sum, t) => sum + t.incorrect_count, 0);
    const totalAttempts = totalCorrect + totalIncorrect;

    return {
        lesson_type: lessonType,
        total_chunks: totalQuestions,
        total_attempts: totalAttempts,
        total_correct: totalCorrect,
        total_incorrect: totalIncorrect,
        accuracy_rate: totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0,
        weak_topics: weakTopics.slice(0, 5)
    };
}

import { GoogleGenerativeAI } from '@google/generative-ai';

const googleApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = googleApiKey ? new GoogleGenerativeAI(googleApiKey) : null;

import { getSpecializedPrompt } from './quizPrompts';

/**
 * Gemma 3 27B (Google) ile soru üretir - TEKLİ MOD (Arşivleme için)
 * @param {string} chunkContent - Metin içeriği
 * @param {string} lessonType - Ders adı
 * @returns {Promise<QuizQuestionData|null>} Soru objesi
 */
export async function generateQuestionFromChunk(chunkContent: string, lessonType: string = 'Genel'): Promise<QuizQuestionData | null> {
    if (!genAI) {
        console.error("Google API key is missing!");
        return null;
    }

    // Akıllı Odaklanma: Metni alt başlıklara böl ve rastgele birini seç
    const { title: sectionTitle, content: sectionContent } = extractRandomSection(chunkContent);

    console.log(`[SmartFocus] Seçilen Alt Başlık: ${sectionTitle}`);

    const specializedDirective = getSpecializedPrompt(lessonType);

    const prompt = `Sen KPSS A Grubu sınavlarına hazırlık yapan bir uzman sınav hazırlayıcısısın. 
Tek bir çoktan seçmeli soru oluşturacaksın.

=== ODAKLANILACAK KONU ===
${sectionTitle}
(Soruyu özellikle bu alt başlık kapsamındaki bilgilerden üret)

=== KAYNAK METİN (BÖLÜM) ===
${sectionContent}

=== SORU HAZIRLAMA YÖNERGELERİ ===
${specializedDirective || '- Genel olarak, metindeki bilgileri test eden, düşündürücü bir soru oluştur.\n- difficulty alanını "medium" olarak ayarla.'}

=== YANIT FORMATI ===
Yanıtını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin, açıklama veya markdown ekleme:
{
  "question": "Soru metni (açık, net ve tek anlama gelen)",
  "options": {
    "A": "Birinci secenek",
    "B": "Ikinci secenek", 
    "C": "Ucuncu secenek",
    "D": "Dorduncu secenek",
    "E": "Besinci secenek"
  },
  "correct_answer": "A",
  "explanation": "Neden bu cevabın dogru oldugunu ve diger seceneklerin neden yanlis oldugunu acikla",
  "difficulty": "easy|medium|hard",
  "category": "${lessonType}",
  "verified": true,
  "verification_notes": "Sorunun kalite kontrol notu",
  "chart_data": null
}

=== GRAFİK VERİLERİ (chart_data) ===
Eğer soru sayısal karşılaştırma, trend analizi veya oranlar içeriyorsa chart_data ekle:
{
  "chart_data": {
    "type": "bar|line|pie",
    "title": "Grafik başlığı",
    "xAxisLabel": "X ekseni neyi gösteriyor (örn: Yıl, Miktar)",
    "yAxisLabel": "Y ekseni neyi gösteriyor (örn: Değer, Oran)",
    "data": [
      {"label": "Etiket 1", "value": 100},
      {"label": "Etiket 2", "value": 200}
    ]
  }
}
Grafik gerekmiyorsa chart_data: null olarak bırak.

=== KRİTİK KURALLAR ===
1. Yanıtta SADECE JSON olsun, markdown kod bloğu (backtick) KULLANMA
2. Seçenekler birbirine yakın uzunlukta olsun
3. Doğru cevabın konumu rastgele olsun
4. Standart Türkçe karakterler kullan`;

    console.log(`[DEBUG] Generated SINGLE prompt for ${lessonType}`);

    try {
        // gemma-3-27b-it kullanıyoruz (Kaliteli model, günlük 14.4k limit)
        const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text() || "";

        // Clean up the response
        let jsonString = responseText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

        const firstOpen = jsonString.indexOf('{');
        const lastClose = jsonString.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            jsonString = jsonString.substring(firstOpen, lastClose + 1);
        }

        // Fix common JSON issues
        jsonString = jsonString
            .replace(/[\x00-\x1F\x7F]/g, ' ')
            .replace(/\\\\/g, '\\')
            .replace(/\\([^"\\\/bfnrtu])/g, '$1');

        try {
            return JSON.parse(jsonString) as QuizQuestionData;
        } catch (parseError) {
            console.warn("Parse hatası, temizlenip tekrar deneniyor...", parseError);
            jsonString = jsonString.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\t/g, ' ').replace(/\s+/g, ' ');
            return JSON.parse(jsonString) as QuizQuestionData;
        }
    } catch (error) {
        console.error("Google AI Soru Üretme Hatası:", error);
        return null;
    }
}

/**
 * Get random questions from the question bank
 */
export async function getQuestionsFromBank(lessonType: string, limit = 10, excludeIds: string[] = []): Promise<any[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_questions_from_bank', {
        p_lesson_type: lessonType,
        p_limit: limit,
        p_exclude_ids: excludeIds
    });
    if (error) {
        // Fallback to empty if RPC missing
        console.warn('get_questions_from_bank RPC failed:', error);
        return [];
    }
    return data || [];
}

/**
 * Get random questions for specific chunks
 */
export async function getQuestionsForChunks(chunkIds: string[]): Promise<any[]> {
    if (chunkIds.length === 0 || !supabase) return [];

    const { data, error } = await supabase.rpc('get_questions_for_chunks', {
        p_chunk_ids: chunkIds
    });
    if (error) {
        console.warn('get_questions_for_chunks RPC failed:', error);
        return [];
    }
    return data || [];
}

/**
 * Save a question to the bank
 */
export async function saveQuestionToBank(chunkId: string, questionData: any): Promise<string | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('save_question_to_bank', {
        p_chunk_id: chunkId,
        p_question_data: questionData
    });
    if (error) {
        console.error('Failed to save question to bank', error);
        return null;
    }
    return data;
}
/**
 * Mark a question as answered and update user progress (unified)
 */
export async function markQuestionAnswered(
    questionId: string,
    isCorrect: boolean,
    userAnswer?: string,
    aiAdvice?: string,
    timeSpentMs = 0
): Promise<any> {
    if (!supabase) return null;

    console.log('Updating user progress:', { questionId, isCorrect });

    const { data, error } = await supabase.rpc('update_user_progress', {
        p_question_id: questionId,
        p_is_correct: isCorrect,
        p_user_answer: userAnswer,
        p_ai_advice: aiAdvice,
        p_time_spent_ms: timeSpentMs
    });

    if (error) {
        console.error('Failed to update progress', error);
        throw error;
    }

    return data?.[0] || null;
}

/**
 * Prioritized Chunk Selection Logic
 * 
 * Fetches all chunks and their question counts for a specific lesson type (or all if 'Genel').
 * Calculates a 'scarcity score' to prioritize chunks with fewer questions.
 */
export interface ChunkPriority {
    chunk_id: string;
    title: string;
    lesson_type: string;
    content: string;
    question_count: number;
    priority_score: number;
}

export async function getChunkPriorities(lessonType: string | null = null): Promise<ChunkPriority[]> {
    if (!supabase) return [];

    console.log(`[Priority] Fetching chunk priorities for lesson: ${lessonType || 'ALL'}`);

    try {
        // 1. Fetch chunks using the new 'name' column for direct filtering
        let chunkQuery = supabase
            .from('lesson_chunks')
            .select(`
                id, 
                title, 
                content_md,
                name
            `)
            .limit(200);

        if (lessonType && lessonType !== 'Genel') {
            chunkQuery = chunkQuery.eq('name', lessonType);
        }

        // Note: Filtering by lessonType at the DB level is tricky with joins if we want to filter by lesson NAME.
        // It's safer to fetch and then filter in memory if the dataset is smallish (50 items), 
        // OR we need to know the lesson_id first.

        // Let's try to filter if possible, but for now simple fetch is safer to fix the 404.

        const { data: chunks, error: chunkError } = await chunkQuery;

        if (chunkError || !chunks) {
            console.error('[Priority] Chunk fetch failed:', chunkError);
            return [];
        }

        // 2. Fetch question counts for these chunks
        const chunkIds = chunks.map(c => c.id);

        const { data: questions } = await supabase
            .from('question_bank')
            .select('chunk_id')
            .in('chunk_id', chunkIds);

        // Count occurrences
        const counts: Record<string, number> = {};
        questions?.forEach((q: any) => {
            counts[q.chunk_id] = (counts[q.chunk_id] || 0) + 1;
        });

        // 3. Merge and Sort
        const priorities: ChunkPriority[] = chunks.map((chunk: any) => {
            const count = counts[chunk.id] || 0;
            const lessonName = chunk.name || 'Genel';

            // Filter out if specific lesson requested and doesn't match
            if (lessonType && lessonType !== 'Genel' && lessonName !== lessonType) {
                return null;
            }

            // Score calculation: Based on 50 target
            let score = 0;
            if (count === 0) score = 100;
            else if (count < 10) score = 80;
            else if (count < 20) score = 60;
            else if (count < 35) score = 40;
            else if (count < 50) score = 20;
            else score = 0; // Mission accomplished for this chunk

            return {
                chunk_id: chunk.id,
                title: chunk.title,
                lesson_type: lessonName,
                content: chunk.content_md,
                question_count: count,
                priority_score: score
            };
        }).filter(item => item !== null) as ChunkPriority[];

        // Sort by score desc, then random shuffle for variety among equals
        return priorities.sort((a, b) => b.priority_score - a.priority_score);

    } catch (err) {
        console.warn('[Priority] Error determining priorities:', err);
        return [];
    }
}

/**
 * Helper to split markdown content into sections based on headers
 * and pick a random one to ensure question variety.
 */
function extractRandomSection(content: string): { title: string, content: string } {
    // 1. Split logic: Look for H1, H2, H3 headers

    // Normalize newlines
    const normalized = content.replace(/\r\n/g, '\n');

    // Regex to identify headers (## Title or ### Title)
    // We assume the chunk generally starts with a header or intro text.
    // Let's split by lines that start with ## or ###
    const parts = normalized.split(/(?=^#{2,3}\s)/m);

    // Filter out parts that are just headers with no content
    // Example: "## A. Tek Ödemeli İşlemler" (Parent header with no text) should be ignored.
    const meaningfulParts = parts.filter(part => {
        // Remove the first line (the header itself) to check the body content
        const lines = part.trim().split('\n');
        if (lines.length <= 1) return false; // Only header exists

        // Join the rest and check length
        const body = lines.slice(1).join('\n').trim();
        return body.length > 50; // Must have at least 50 chars of actual content
    });

    // If no meaningful parts found (maybe it's a very short chunk), fall back to original logic or full content
    const candidates = meaningfulParts.length > 0 ? meaningfulParts : (parts.length > 0 ? parts : [content]);

    // Pick random from valid candidates
    const randomPart = candidates[Math.floor(Math.random() * candidates.length)];

    // Extract title from the specific part
    const titleMatch = randomPart.match(/^(#{2,3})\s+(.+)$/m);
    let title = 'İlgili Bölüm';

    if (titleMatch && titleMatch[2]) {
        title = titleMatch[2].trim();
    } else {
        // If no header found in the part, try to use the first line
        const firstLine = randomPart.trim().split('\n')[0];
        if (firstLine.length < 50) title = firstLine;
    }

    return {
        title: title,
        content: randomPart
    };
}
