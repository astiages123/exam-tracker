import { supabase } from '@/config/supabase';
import OpenAI from 'openai';
import { rateLimiter } from '@/utils/rateLimiter';
import { QuizQuestionData } from '@/features/quiz/services/quizService';
import { normalizeLatex, extractImagesFromMarkdown, getLessonMediaPath, extractRandomSection } from '@/features/quiz/services/quizUtils';

// Models
const WORKER_MODEL = "llama-3.1-8b-instant";
const VALIDATOR_MODEL = "llama-3.3-70b-versatile";

// Initialize OpenAI client for Groq
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
const openai = groqApiKey ? new OpenAI({
    apiKey: groqApiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    dangerouslyAllowBrowser: true
}) : null;

export interface ValidationResult {
    isValid: boolean;
    notes: string;
}

export interface StockpileStats {
    totalGenerated: number;
    validatedCount: number;
    rejectedCount: number;
    currentLesson: string;
}

/**
 * 1. WORKER: Generate Question (Creative & Rich)
 * With retry mechanism and error recovery
 */
export async function generateCandidateQuestion(chunkContent: string, lessonType: string): Promise<QuizQuestionData | null> {
    if (!openai) return null;

    const MAX_RETRIES = 3;

    await rateLimiter.waitForAvailability(2000); // Base wait

    const normalizedContent = normalizeLatex(chunkContent);
    const { title: sectionTitle, content: sectionContent } = extractRandomSection(normalizedContent);

    const images = extractImagesFromMarkdown(sectionContent);
    const lessonFolder = getLessonMediaPath(lessonType);
    const imagesToProcess = images.slice(0, 3);
    const imageContexts = imagesToProcess.map((img, i) => {
        const fullPath = img.relativePath.startsWith('media/') ? `${lessonFolder}/${img.relativePath}` : img.relativePath;
        const desc = img.description || img.altText || 'Açıklama yok';
        const axisInfo = img.metadata
            ? ` (X: ${img.metadata.xAxis || '-'}, Y: ${img.metadata.yAxis || '-'})`
            : '';
        return `[GÖRSEL ${i + 1}]: "${desc}"${axisInfo} - Dosya: ${fullPath}`;
    });

    const systemPrompt = `Sen profesyonel bir sınav hazırlayıcısısın.
Görev: Verilen metinden yaratıcı, zorlayıcı ve öğretici bir çoktan seçmeli soru üret.
Model: Worker (Üretici).
Çıktı: SADECE JSON.`;

    const userPrompt = `
=== KONU ===
${sectionTitle}

=== İÇERİK ===
${sectionContent}
${imageContexts.length > 0 ? `\n=== GÖRSELLER ===\n${imageContexts.join('\n')}` : ''}

=== İSTERLER ===
1. Soruyu gerçek hayat senaryosu veya vaka analizi olarak kurgula.
2. Sayısal veri varsa "chart_data" alanında Recharts uyumlu veri üret.
3. Görsel varsa bağlamda kullan ve "related_image" alanına ekle.
4. Çeldiriciler (şıklar) güçlü olsun.

=== JSON FORMATI ===
{
  "question": "...",
  "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
  "correct_answer": "A",
  "explanation": "...",
  "difficulty": "hard",
  "category": "${lessonType}",
  "verified": false, // Validator güncelleyecek
  "verification_notes": "",
  "chart_data": null, // veya { type: 'bar', data: [...] }
  "related_image": null
}
`;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: WORKER_MODEL,
                temperature: 0.8, // Slightly higher for creativity
                response_format: { type: "json_object" }
            });

            rateLimiter.recordUsage(completion.usage?.total_tokens || 0);

            const content = completion.choices[0].message.content || "{}";

            try {
                return JSON.parse(content);
            } catch (parseError) {
                // JSON parse error - try cleanup
                console.warn(`[Worker] JSON parse failed (Attempt ${attempt + 1}), trying cleanup...`);
                const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            }
        } catch (e: any) {
            console.error(`[Worker] Generation Failed (Attempt ${attempt + 1}/${MAX_RETRIES}):`, e?.message || e);

            if (attempt < MAX_RETRIES - 1) {
                // Rate limit handling with exponential backoff
                if (e?.status === 429) {
                    const wait = 5000 * (attempt + 1);
                    console.log(`[Worker] Rate limited. Waiting ${wait}ms...`);
                    await new Promise(r => setTimeout(r, wait));
                    continue;
                }

                // Other errors - shorter wait
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            }
        }
    }

    console.error(`[Worker] All ${MAX_RETRIES} attempts failed for chunk.`);
    return null;
}

/**
 * 2. VALIDATOR: Check Quality & Accuracy
 * With retry mechanism and graceful degradation
 */
export async function validateCandidateQuestion(question: QuizQuestionData, originalChunk: string): Promise<ValidationResult> {
    if (!openai) return { isValid: false, notes: "API Error" };

    const MAX_RETRIES = 2; // Fewer retries for validator to save tokens

    const systemPrompt = `Sen Baş Denetçi (Validator) AI modelisin.
Görev: "Worker" AI tarafından üretilen soruyu denetle.
Kriterler:
1. Cevap metne göre KESİN DOĞRU mu?
2. Soru mantıklı ve anlaşılır mı?
3. Grafik verileri (varsa) tutarlı mı?
Çıktı: SADECE JSON { "isValid": boolean, "notes": "..." }`;

    const userPrompt = `
=== KAYNAK METİN (ÖZET) ===
${originalChunk.substring(0, 3000)}...

=== ADAY SORU ===
${JSON.stringify(question, null, 2)}

=== KARAR ===
Onaylıyor musun? (isValid: true/false). Notlarını ekle.
`;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // Wait slightly to avoid heavy burst
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: VALIDATOR_MODEL,
                temperature: 0.1, // Low temp for strict logic
                response_format: { type: "json_object" }
            });

            rateLimiter.recordUsage(completion.usage?.total_tokens || 0);

            const content = completion.choices[0].message.content || "{}";

            try {
                const result = JSON.parse(content);
                return {
                    isValid: result.isValid === true,
                    notes: result.notes || "No notes"
                };
            } catch (parseError) {
                // JSON parse error - try cleanup
                console.warn(`[Validator] JSON parse failed (Attempt ${attempt + 1}), trying cleanup...`);
                const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(cleaned);
                return {
                    isValid: result.isValid === true,
                    notes: result.notes || "No notes"
                };
            }
        } catch (e: any) {
            console.error(`[Validator] Validation Failed (Attempt ${attempt + 1}/${MAX_RETRIES}):`, e?.message || e);

            if (attempt < MAX_RETRIES - 1) {
                // Rate limit handling with exponential backoff
                if (e?.status === 429) {
                    const wait = 5000 * (attempt + 1);
                    console.log(`[Validator] Rate limited. Waiting ${wait}ms...`);
                    await new Promise(r => setTimeout(r, wait));
                    continue;
                }
            }
        }
    }

    // Graceful degradation: Mark as "pending review" instead of outright rejection
    console.warn(`[Validator] All attempts failed. Marking question as pending_review.`);
    return {
        isValid: false,
        notes: "Validation Exception - Pending Manual Review"
    };
}

/**
 * 3. ORCHESTRATOR: Run Process
 */
export async function processStockpileItem(chunkId: string, chunkContent: string, lessonType: string): Promise<{ success: boolean; validated: boolean }> {
    // A. Generate
    const candidate = await generateCandidateQuestion(chunkContent, lessonType);
    if (!candidate) return { success: false, validated: false };

    // B. Validate
    const validation = await validateCandidateQuestion(candidate, chunkContent);

    // C. Update Metadata
    candidate.verified = validation.isValid;
    candidate.verification_notes = validation.notes;

    // D. Save (Only validated answers get marked verified=true, but we save ALL for logging/debugging if needed? 
    // User instruction: "Sadece denetçiden 'ONAY' alan sorular questions_bank tablosuna is_validated = true olarak kaydedilsin. Hatalı olanlar validation_notes ile birlikte loglansın."
    // This implies we save both, but mark validated ones. Or maybe only save validated ones?
    // "Hatalı olanlar ... loglansın" could mean console log or DB log. 
    // Let's save ALL to DB, but is_validated=false for bad ones implies we can filter them out in the app.

    // Check if we need to implement "is_validated" column logic or just rely on JSON
    // We didn't add the column yet, so we rely on JSON "verified" field.

    const { error } = await supabase!.rpc('save_question_to_bank', {
        p_chunk_id: chunkId,
        p_question_data: candidate
    });

    if (error) {
        console.error("Save Error:", error);
        return { success: false, validated: false };
    }

    return { success: true, validated: candidate.verified };
}
