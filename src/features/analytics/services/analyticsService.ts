/**
 * Analytics Service - Supabase RPC wrappers
 */
import { supabase } from '@/config/supabase';

export interface MasterySummary {
    total_chunks: number;
    mastered_count: number;
    improving_count: number;
    learning_count: number;
    mastery_percentage: number;
}

export interface QuestionTimeEntry {
    chunk_id: string | undefined;
    title: string;
    time_ms: number;
    is_correct: boolean;
    order: number;
}

export interface QuestionData {
    question: string;
    options: { A: string; B: string; C: string; D: string; E: string };
    correct_answer: string;
    explanation?: string;
}

export interface ErrorBookEntry {
    chunk_id: string;
    question_data: QuestionData;
    user_answer: string;
    correct_answer: string;
    ai_advice: string | null;
    created_at?: string;
}

export interface MasteryUpdateResult {
    mastery_level: 'learning' | 'improving' | 'mastered';
    correct_count: number;
    incorrect_count: number;
}

export interface QuizSession {
    id: string;
    user_id: string;
    lesson_type: string;
    total_questions: number;
    correct_count: number;
    incorrect_count: number;
    total_time_ms: number;
    question_times: QuestionTimeEntry[];
    created_at: string;
    completed_at: string | null;
}

/**
 * Update mastery level after answering a question
 */
export async function updateMasteryLevel(chunkId: string, isCorrect: boolean, timeSpentMs = 0): Promise<MasteryUpdateResult | null> {
    if (!supabase) return null;

    const { data, error } = await supabase.rpc('update_mastery_level', {
        p_chunk_id: chunkId,
        p_is_correct: isCorrect,
        p_time_spent_ms: timeSpentMs
    });

    if (error) {
        console.error('updateMasteryLevel error:', error);
        throw new Error(`Mastery güncellenemedi: ${error.message}`);
    }

    return data?.[0] || null;
}

/**
 * Get user's mastery summary for a lesson
 */
export async function getMasterySummary(lessonType: string | null = null): Promise<MasterySummary> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.rpc('get_mastery_summary', {
        p_lesson_type: lessonType
    });

    if (error) {
        console.error('getMasterySummary error:', error);
        throw new Error(`Mastery özeti alınamadı: ${error.message}`);
    }

    return data?.[0] || {
        total_chunks: 0,
        mastered_count: 0,
        improving_count: 0,
        learning_count: 0,
        mastery_percentage: 0
    };
}

/**
 * Get error book entries (from unified user_answered_questions table)
 */
export async function getErrorBook(lessonType: string | null = null, limit = 20): Promise<ErrorBookEntry[]> {
    if (!supabase) return [];

    const { data, error } = await supabase.rpc('get_user_error_history', {
        p_lesson_type: lessonType,
        p_limit: limit
    });

    if (error) {
        console.error('getErrorBook error:', error);
        throw new Error(`Hata defteri alınamadı: ${error.message}`);
    }

    return data || [];
}

/**
 * Save wrong answer to progress (unified)
 * Note: This functionality is now handled by update_user_progress RPC in quizService.
 * This function is kept for backward compatibility with existing imports but updated to be a no-op.
 */
export async function saveToErrorBook(
    _chunkId: string,
    _questionData: QuestionData,
    _userAnswer: string,
    _correctAnswer: string,
    _aiAdvice: string | null = null
): Promise<null> {
    return null;
}

/**
 * Create a new quiz session
 */
export async function createQuizSession(lessonType: string, totalQuestions: number): Promise<QuizSession | null> {
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

    const { data, error } = await supabase
        .from('quiz_sessions')
        .insert({
            user_id: user.id,
            lesson_type: lessonType,
            total_questions: totalQuestions,
            question_times: []
        })
        .select()
        .single();

    if (error) {
        console.error('createQuizSession error:', error);
        throw new Error(`Oturum oluşturulamadı: ${error.message}`);
    }

    return data;
}

/**
 * Complete a quiz session with stats
 */
export async function completeQuizSession(sessionId: string, stats: {
    correct: number;
    incorrect: number;
    totalTimeMs: number;
    questionTimes: QuestionTimeEntry[]
}): Promise<QuizSession | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('quiz_sessions')
        .update({
            completed_at: new Date().toISOString(),
            correct_count: stats.correct,
            incorrect_count: stats.incorrect,
            total_time_ms: stats.totalTimeMs,
            question_times: stats.questionTimes
        })
        .eq('id', sessionId)
        .select()
        .single();

    if (error) {
        console.error('completeQuizSession error:', error);
        throw new Error(`Oturum tamamlanamadı: ${error.message}`);
    }

    return data;
}

/**
 * Get session statistics
 */
export async function getSessionStats(lessonType: string | null = null, limit = 10): Promise<QuizSession[]> {
    if (!supabase) return [];

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    let query = supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit);

    if (lessonType) {
        query = query.ilike('lesson_type', lessonType);
    }

    const { data, error } = await query;

    if (error) {
        console.error('getSessionStats error:', error);
        return [];
    }

    return data || [];
}

/**
 * Calculate session summary from question times
 */
export function calculateSessionSummary(questionTimes: QuestionTimeEntry[]) {
    if (!questionTimes || questionTimes.length === 0) {
        return {
            avgTimeMs: 0,
            slowestQuestions: [],
            fastestQuestions: [],
            totalTimeMs: 0
        };
    }

    const sorted = [...questionTimes].sort((a, b) => b.time_ms - a.time_ms);
    const totalTimeMs = questionTimes.reduce((sum, q) => sum + q.time_ms, 0);
    const avgTimeMs = Math.round(totalTimeMs / questionTimes.length);

    return {
        avgTimeMs,
        slowestQuestions: sorted.slice(0, 3),
        fastestQuestions: sorted.slice(-3).reverse(),
        totalTimeMs
    };
}

export interface LessonStatistics {
    stockpileCount: number;
    rejectedCount: number;
    learnedCount: number;
    reviewCount: number;
    criticalCount: number;
}

/**
 * Get comprehensive statistics for a specific lesson type
 * - Stockpile (Verified count)
 * - Rejected Count (Quality check)
 * - SRS distribution (Learned, Review, Critical)
 */
export async function getLessonStatistics(lessonType: string): Promise<LessonStatistics> {
    if (!supabase) return { stockpileCount: 0, rejectedCount: 0, learnedCount: 0, reviewCount: 0, criticalCount: 0 };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { stockpileCount: 0, rejectedCount: 0, learnedCount: 0, reviewCount: 0, criticalCount: 0 };

    try {
        // 1. Stockpile Stats (Verified & Rejected)
        const { data: bankData, error: bankError } = await supabase
            .from('question_bank')
            .select(`
                question_data,
                lesson_chunks!inner (
                    lessons!inner ( name )
                )
            `)
            .eq('lesson_chunks.lessons.name', lessonType);

        if (bankError) console.error('Bank stats error:', bankError);

        let verified = 0;
        let rejected = 0;

        if (bankData) {
            bankData.forEach((row: any) => {
                const qData = row.question_data;
                if (qData.verified === true || qData.verified === "true") {
                    verified++;
                } else {
                    rejected++;
                }
            });
        }

        // 2. SRS Distribution
        const { data: srsData, error: srsError } = await supabase
            .from('user_answered_questions')
            .select(`
                next_review_at,
                ease_factor,
                question_bank!inner (
                    lesson_chunks!inner (
                        lessons!inner ( name )
                    )
                )
            `)
            .eq('user_id', user.id)
            .eq('question_bank.lesson_chunks.lessons.name', lessonType);

        if (srsError) console.error('SRS stats error:', srsError);

        let learned = 0;
        let review = 0;
        let critical = 0;

        if (srsData) {
            const now = new Date();
            srsData.forEach((row: any) => {
                const nextReview = new Date(row.next_review_at);
                const ease = row.ease_factor || 2.5;

                if (ease < 1.3) {
                    critical++;
                } else if (nextReview <= now) {
                    review++;
                } else {
                    learned++;
                }
            });
        }

        return {
            stockpileCount: verified,
            rejectedCount: rejected,
            learnedCount: learned,
            reviewCount: review,
            criticalCount: critical + review // Keeping critical separate in count but logic allows overlap
        };


    } catch (error) {
        console.error('getLessonStatistics error:', error);
        return { stockpileCount: 0, rejectedCount: 0, learnedCount: 0, reviewCount: 0, criticalCount: 0 };
    }
}
