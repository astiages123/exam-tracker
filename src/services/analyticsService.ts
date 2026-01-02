/**
 * Analytics Service - Supabase RPC wrappers
 */
import { supabase } from '../lib/supabaseClient';

export interface MasterySummary {
    total_chunks: number;
    mastered_count: number;
    improving_count: number;
    learning_count: number;
    mastery_percentage: number;
}

export interface ErrorBookEntry {
    chunk_id: string;
    question_data: any;
    user_answer: string;
    correct_answer: string;
    ai_advice: string | null;
    created_at?: string;
}

export interface QuizSession {
    id: string;
    user_id: string;
    lesson_type: string;
    total_questions: number;
    correct_count: number;
    incorrect_count: number;
    total_time_ms: number;
    question_times: any[];
    created_at: string;
    completed_at: string | null;
}

/**
 * Update mastery level after answering a question
 */
export async function updateMasteryLevel(chunkId: string, isCorrect: boolean, timeSpentMs = 0): Promise<any> {
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
 * Get error book entries (from unified user_responses table)
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
    questionTimes: any[]
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
export function calculateSessionSummary(questionTimes: any[]) {
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
