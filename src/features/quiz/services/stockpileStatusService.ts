import { supabase } from '@/config/supabase';

/**
 * Stockpile Status Service
 * Real-time fill rate tracking for question bank
 */

export interface StockpileStatus {
    lesson_name: string;
    target_count: number;
    current_count: number;
    fill_percentage: number;
    verified_count: number;
    unverified_count: number;
    priority: number;
}

export interface LessonStockpileStatus {
    lesson_name: string;
    target_count: number;
    current_count: number;
    fill_percentage: number;
    verified_count: number;
    remaining_to_target: number;
}

export interface StockpileSummary {
    total_target: number;
    total_current: number;
    overall_percentage: number;
    total_verified: number;
    lessons_above_50_percent: number;
    lessons_above_80_percent: number;
    lessons_complete: number;
}

/**
 * Get stockpile status for all lessons
 * Returns fill rates ordered by lowest fill percentage first
 */
export async function getStockpileStatus(): Promise<StockpileStatus[]> {
    const { data, error } = await supabase!.rpc('get_stockpile_status');

    if (error) {
        console.error('[StockpileStatus] Error fetching status:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get stockpile status for a specific lesson
 */
export async function getLessonStockpileStatus(lessonName: string): Promise<LessonStockpileStatus | null> {
    const { data, error } = await supabase!.rpc('get_lesson_stockpile_status', {
        p_lesson_name: lessonName
    });

    if (error) {
        console.error(`[StockpileStatus] Error fetching status for ${lessonName}:`, error);
        throw error;
    }

    return data && data.length > 0 ? data[0] : null;
}

/**
 * Get overall stockpile summary statistics
 */
export async function getStockpileSummary(): Promise<StockpileSummary | null> {
    const { data, error } = await supabase!.rpc('get_stockpile_summary');

    if (error) {
        console.error('[StockpileStatus] Error fetching summary:', error);
        throw error;
    }

    return data && data.length > 0 ? data[0] : null;
}

/**
 * Get lessons that need the most attention (lowest fill rates)
 */
export async function getLessonsNeedingAttention(limit: number = 5): Promise<StockpileStatus[]> {
    const allStatus = await getStockpileStatus();
    return allStatus
        .filter(s => s.fill_percentage < 100)
        .slice(0, limit);
}

/**
 * Get fill status color based on percentage
 */
export function getFillStatusColor(percentage: number): string {
    if (percentage >= 100) return '#22c55e'; // green-500
    if (percentage >= 80) return '#84cc16';  // lime-500
    if (percentage >= 50) return '#eab308';  // yellow-500
    if (percentage >= 25) return '#f97316';  // orange-500
    return '#ef4444'; // red-500
}

/**
 * Get fill status label based on percentage
 */
export function getFillStatusLabel(percentage: number): string {
    if (percentage >= 100) return 'Tamamlandı';
    if (percentage >= 80) return 'Neredeyse Hazır';
    if (percentage >= 50) return 'Yarıya Gelindi';
    if (percentage >= 25) return 'Başlangıç';
    return 'Kritik';
}

/**
 * Calculate estimated time to complete stockpile based on current rate
 */
export function estimateCompletionTime(
    currentCount: number,
    targetCount: number,
    questionsPerHour: number = 10
): string {
    const remaining = targetCount - currentCount;
    if (remaining <= 0) return 'Tamamlandı';

    const hoursNeeded = remaining / questionsPerHour;

    if (hoursNeeded < 1) return `~${Math.ceil(hoursNeeded * 60)} dakika`;
    if (hoursNeeded < 24) return `~${Math.ceil(hoursNeeded)} saat`;
    if (hoursNeeded < 168) return `~${Math.ceil(hoursNeeded / 24)} gün`;
    return `~${Math.ceil(hoursNeeded / 168)} hafta`;
}
