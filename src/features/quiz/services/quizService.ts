import { normalizeLatex, extractImagesFromMarkdown, getLessonMediaPath, extractRandomSection } from '@/features/quiz/services/quizUtils';
import { getSpecializedPrompt } from '@/features/quiz/services/quizPrompts';

import { supabase } from '@/config/supabase';
import OpenAI from 'openai';
import { rateLimiter } from '@/utils/rateLimiter';
import { calculateSRS } from '@/features/quiz/logic/srsEngine';

// Initialize OpenAI client for Groq
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
const openai = groqApiKey ? new OpenAI({
    apiKey: groqApiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    dangerouslyAllowBrowser: true
}) : null;

const GROQ_MODEL = "llama-3.3-70b-versatile";

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
    related_image?: string | null;
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
 * Soru bankasından belirtilen ders tipine göre sorular getirir
 */
export async function getQuestionsFromBank(lessonType: string, count: number, excludeIds: string[] = []): Promise<any[]> {
    if (!supabase) return [];

    let query = supabase
        .from('question_bank')
        .select(`
            id,
            chunk_id,
            question_data,
            lesson_chunks!inner (
                lessons!inner ( name )
            )
        `)
        .ilike('lesson_chunks.lessons.name', lessonType)
        .limit(count);

    if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('getQuestionsFromBank error:', error);
        return [];
    }

    return data || [];
}

/**
 * Quiz başlatır - Zayıf konular + rastgele dağılım + SRS
 * Replaces initializeQuiz RPC with TS logic
 */
export async function initializeQuiz(userId: string, lessonType: string, totalQuestions = 10): Promise<any[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Fetch Questions using Smart Mix (SRS + New)
    const questions = await fetchSmartMixQuestions(userId, lessonType, totalQuestions);

    return questions;
}

/**
 * Fetches a mix of "Due" (SRS) and "New" questions
 * Ratio: ~80% Due, ~20% New (configurable)
 */
async function fetchSmartMixQuestions(userId: string, lessonType: string, total: number): Promise<any[]> {
    const dueCount = Math.floor(total * 0.8);



    // A. Fetch Due Questions (next_review_at <= NOW)
    const nowISO = new Date().toISOString();
    const { data: dueData, error: dueError } = await supabase!
        .from('user_answered_questions')
        .select(`
            question_id,
            question_bank!inner (
                id,
                chunk_id,
                question_data,
                created_at,
                lesson_chunks!inner (
                    lesson_id, 
                    lessons!inner ( name )
                )
            )
        `)
        .eq('user_id', userId)
        .lte('next_review_at', nowISO)
        .limit(dueCount);

    if (dueError) {
        console.error('Error fetching due questions:', dueError);
    }

    // Format Due Questions
    const dueQuestions = (dueData || []).map((item: any) => ({
        id: item.question_bank.id,
        chunk_id: item.question_bank.chunk_id,
        question_data: item.question_bank.question_data,
        is_due: true
    }));

    // B. Fetch New Questions (Not in user_answered_questions)
    // Uses RPC for efficient server-side filtering instead of client-side
    const remainingNeeded = total - dueQuestions.length;

    const { data: newData, error: newError } = await supabase!
        .rpc('get_new_questions_for_user', {
            p_lesson_type: lessonType,
            p_limit: remainingNeeded
        });

    if (newError) {
        console.error('Error fetching new questions:', newError);
    }

    const newQuestions = (newData || []).map((q: any) => ({
        id: q.id,
        chunk_id: q.chunk_id,
        question_data: q.question_data,
        is_new: true
    }));

    // C. Combine and Shuffle
    const combined = [...dueQuestions, ...newQuestions];
    return combined.sort(() => Math.random() - 0.5);
}

/**
 * Kullanıcının zayıf konularını getirir
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
        return [];
    }

    return data || [];
}

/**
 * Chunk önceliklerini getirir
 */
export async function getChunkPriorities(lessonType: string | null): Promise<any[]> {
    // Keep as is for now, or deprecate if unused
    if (!supabase) return [];
    const { data } = await supabase.rpc('get_chunk_priorities', { p_lesson_type: lessonType });
    return data || [];
}

/**
 * Üretilen soruyu bankaya kaydeder
 */
export async function saveQuestionToBank(chunkId: string, questionData: QuizQuestionData): Promise<string | null> {
    if (!supabase) return null;

    const { data, error } = await supabase.rpc('save_question_to_bank', {
        p_chunk_id: chunkId,
        p_question_data: questionData
    });

    if (error) {
        console.error('saveQuestionToBank error:', error);
        return null;
    }

    return data;
}

/**
 * Soruyu cevaplanmış olarak işaretler ve SRS motorunu çalıştırır
 */
export async function markQuestionAnswered(
    questionId: string,
    isCorrect: boolean,
    _lessonType: string
): Promise<import('@/features/quiz/logic/srsEngine').SRSResult | null> {
    if (!supabase) return null;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // 1. Get current SRS state for this question
        const { data: currentEntry } = await supabase
            .from('user_answered_questions')
            .select('ease_factor, interval, repetition_count, next_review_at')
            .eq('user_id', user.id)
            .eq('question_id', questionId)
            .maybeSingle();

        // 2. Calculate New SRS Values
        const srsResult = calculateSRS({
            isCorrect,
            currentEaseFactor: currentEntry?.ease_factor,
            currentInterval: currentEntry?.interval,
            currentRepetitionCount: currentEntry?.repetition_count
        });

        // 3. Update Database (SRS Table)
        const { error: srsError } = await supabase
            .from('user_answered_questions')
            .upsert({
                user_id: user.id,
                question_id: questionId,
                is_correct: isCorrect,
                answered_at: new Date().toISOString(),
                next_review_at: srsResult.nextReviewDate.toISOString(),
                ease_factor: srsResult.easeFactor,
                interval: srsResult.interval,
                repetition_count: srsResult.repetitionCount
            }, { onConflict: 'user_id, question_id' });

        if (srsError) {
            console.error('SRS update error:', srsError);
        }

        // 4. Update Mastery (Statistics)
        // We try to find the chunk_id to update aggregated stats
        const { data: qData } = await supabase
            .from('question_bank')
            .select('chunk_id')
            .eq('id', questionId)
            .single();

        if (qData?.chunk_id) {
            await supabase.rpc('update_mastery_level', {
                p_chunk_id: qData.chunk_id,
                p_is_correct: isCorrect
            });
        }

        return srsResult;

    } catch (e) {
        console.error("SRS Update Exception", e);
        return null;
    }
}




/**
 * Groq API ile soru üretir
 * Model: openai/gpt-oss-120b
 * Not: Bu model görselleri göremez (Text-Only). Ancak görsel metadata'sı prompt'a eklenir.
 */
export async function generateQuestionFromChunk(chunkContent: string, lessonType: string = 'Genel'): Promise<QuizQuestionData | null> {
    if (!openai) {
        console.error("Groq API key (VITE_GROQ_API_KEY) is missing!");
        return null;
    }

    // Rate Limit Check (wait if needed)
    await rateLimiter.waitForAvailability(1500); // Estimating ~1500 tokens for prompt+completion

    const normalizedContent = normalizeLatex(chunkContent);
    const { title: sectionTitle, content: sectionContent } = extractRandomSection(normalizedContent);

    console.log(`[Groq] Generating question for: ${sectionTitle}`);

    // Görsel referanslarını çıkar (Data yüklemiyoruz, sadece metadata)
    const images = extractImagesFromMarkdown(sectionContent);
    const lessonFolder = getLessonMediaPath(lessonType);

    // Process top 3 images to avoid confusing the text model
    const imagesToProcess = images.slice(0, 3);
    const imageContexts: string[] = [];

    imagesToProcess.forEach((img, index: number) => {
        // Resolve path for frontend display later
        const fullPath = img.relativePath.startsWith('media/')
            ? `${lessonFolder}/${img.relativePath}`
            : img.relativePath;

        // Build rich context from structured alt-text
        const desc = img.description || img.altText || 'Açıklama yok';
        const axisInfo = img.metadata
            ? `\n   Eksen: X=${img.metadata.xAxis || '-'}, Y=${img.metadata.yAxis || '-'}${img.metadata.type ? `, Tür: ${img.metadata.type}` : ''}`
            : '';

        imageContexts.push(`[GÖRSEL ${index + 1}]: "${desc}"${axisInfo}\n   Dosya: ${fullPath}`);
    });

    const specializedDirective = getSpecializedPrompt(lessonType);

    const imagePromptNote = imageContexts.length > 0
        ? `\n=== GÖRSEL NOTLARI ===\nMetin içinde şu görseller bulunmaktadır:\n${imageContexts.join('\n')}\nEğer soru metni bu görsellerle ilgiliyse, "related_image": "[GÖRSEL X]" alanını kullan.`
        : '';

    const systemPrompt = `Sen KPSS A Grubu sınavlarına hazırlık yapan bir uzman sınav hazırlayıcısısın. 
Tek bir çoktan seçmeli soru oluşturacaksın. Yanıtın SADECE geçerli bir JSON objesi olmalı.
ÖNEMLİ: Her soruda MUTLAKA 5 seçenek (A, B, C, D, E) olmalıdır. E seçeneğini asla ihmal etme.`;

    const userPrompt = `
=== ODAKLANILACAK KONU ===
${sectionTitle}

=== KAYNAK METİN ===
${sectionContent}
${imagePromptNote}

=== YÖNERGELER ===
${specializedDirective || '- Zorluk seviyesi: medium.\n- Metindeki bilgiyi test et.'}

=== YANIT FORMATI (JSON) ===
{
  "question": "Soru metni",
  "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
  "correct_answer": "A",
  "explanation": "Açıklama",
  "difficulty": "medium",
  "category": "${lessonType}",
  "verified": true,
  "verification_notes": "Kalite notu",
  "chart_data": null,
  "related_image": null
}

=== KURALLAR ===
1. SADECE JSON don. Markdown yok.
2. related_image kullanırken "[GÖRSEL 1]" formatını kullan.
3. Standart Türkçe karakterler.
4. Çarpma işlemi için * yerine \\times kullan.
5. Cümle tamamlama sorularında soru kökü "..." ile bitmeli veya "Aşağıdakilerden hangisidir?" şeklinde olmalı.
`;

    // Retry logic
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            console.log(`[Groq] Requesting ${GROQ_MODEL} (Attempt ${attempt + 1})`);

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: GROQ_MODEL,
                temperature: 0.7,
                response_format: { type: "json_object" } // Groq supports json_object
            });

            // Calculate usage
            const usage = completion.usage?.total_tokens || 0;
            rateLimiter.recordUsage(usage);

            const content = completion.choices[0].message.content || "";
            let parsedQuestion: QuizQuestionData;

            try {
                parsedQuestion = JSON.parse(content) as QuizQuestionData;
            } catch (e) {
                console.warn("[JSON Parse Error] Trying to cleanup", e);
                const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                parsedQuestion = JSON.parse(cleaned);
            }

            // --- VALIDATION & REPAIR ---

            // 1. Ensure Options A-E exist
            if (!parsedQuestion.options) {
                // If options keys are missing or malformed, we might need serious repair.
                // Assuming basic structure is close.
                parsedQuestion.options = {
                    A: "Seçenek A", B: "Seçenek B", C: "Seçenek C", D: "Seçenek D", E: "Seçenek E"
                };
            }

            // Fix case sensitivity
            const opts = parsedQuestion.options as any;
            if (opts.a && !opts.A) opts.A = opts.a;
            if (opts.b && !opts.B) opts.B = opts.b;
            if (opts.c && !opts.C) opts.C = opts.c;
            if (opts.d && !opts.D) opts.D = opts.d;
            if (opts.e && !opts.E) opts.E = opts.e;

            // Missing Option E fallback
            if (!parsedQuestion.options.E) {
                parsedQuestion.options.E = "Hiçbiri"; // Safe default
                console.warn('Option E was missing, added default "Hiçbiri"');
            }

            // Ensure other options are not empty
            ['A', 'B', 'C', 'D'].forEach(key => {
                if (!parsedQuestion.options[key as keyof typeof parsedQuestion.options]) {
                    parsedQuestion.options[key as keyof typeof parsedQuestion.options] = `(${key} seçeneği)`;
                }
            });

            // 2. Validate correct_answer
            const validKeys = ['A', 'B', 'C', 'D', 'E'];
            if (!validKeys.includes(parsedQuestion.correct_answer)) {
                // Try to fallback to lowercase check
                if (validKeys.includes((parsedQuestion.correct_answer as string).toUpperCase())) {
                    parsedQuestion.correct_answer = (parsedQuestion.correct_answer as string).toUpperCase() as any;
                } else {
                    parsedQuestion.correct_answer = 'A'; // Absolute fallback
                }
            }

            // Map Image Paths
            if (parsedQuestion.related_image && typeof parsedQuestion.related_image === 'string') {
                const match = parsedQuestion.related_image.match(/GÖRSEL\s+(\d+)/i);
                if (match) {
                    const idx = parseInt(match[1]) - 1;
                    if (imagesToProcess[idx]) {
                        const img = imagesToProcess[idx];
                        const fullPath = img.relativePath.startsWith('media/')
                            ? `${lessonFolder}/${img.relativePath}`
                            : img.relativePath;
                        parsedQuestion.related_image = fullPath;
                    } else {
                        parsedQuestion.related_image = null;
                    }
                }
            }

            // Map Charts (Sanitization)
            if (parsedQuestion.chart_data) {
                if (validateChartData(parsedQuestion.chart_data)) {
                    // Normalize data if valid
                    parsedQuestion.chart_data.data = parsedQuestion.chart_data.data.map((item: any) => ({
                        label: String(item.label),
                        value: Number(item.value)
                    }));
                } else {
                    console.warn('Invalid chart_data structure detected, nullifying:', parsedQuestion.chart_data);
                    parsedQuestion.chart_data = null;
                }
            }

            return parsedQuestion;

        } catch (error: any) {
            console.error(`[Groq Error] Attempt ${attempt + 1}:`, error);

            if (attempt === MAX_RETRIES - 1) break;

            // Rate limit handling
            if (error?.status === 429) {
                const wait = 5000 * (attempt + 1);
                console.log(`[Rate Limit] Waiting ${wait}ms...`);
                await new Promise(res => setTimeout(res, wait));
            }
        }
    }

    return null;
}

/**
 * Validates chart data structure and content values
 */
function validateChartData(chartData: any): boolean {
    if (!chartData?.type || !chartData?.data || !Array.isArray(chartData.data) || chartData.data.length === 0) {
        return false;
    }

    // Validate each data point
    return chartData.data.every((item: any) =>
        item &&
        (typeof item.label === 'string' || typeof item.label === 'number') &&
        (typeof item.value === 'number' || (typeof item.value === 'string' && !isNaN(Number(item.value)))) &&
        Number(item.value) >= 0 // Assuming non-negative values for basic charts
    );
}
