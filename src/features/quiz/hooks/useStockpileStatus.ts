import { useState, useEffect, useCallback } from 'react';
import {
    getStockpileStatus,
    getStockpileSummary,
    getLessonStockpileStatus,
    StockpileStatus,
    StockpileSummary,
    LessonStockpileStatus
} from '@/features/quiz/services/stockpileStatusService';

/**
 * Hook for real-time stockpile status tracking
 */
export function useStockpileStatus(refreshInterval?: number) {
    const [status, setStatus] = useState<StockpileStatus[]>([]);
    const [summary, setSummary] = useState<StockpileSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [statusData, summaryData] = await Promise.all([
                getStockpileStatus(),
                getStockpileSummary()
            ]);

            setStatus(statusData);
            setSummary(summaryData);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch stockpile status'));
            console.error('[useStockpileStatus] Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();

        // Optional auto-refresh
        if (refreshInterval && refreshInterval > 0) {
            const interval = setInterval(refresh, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refresh, refreshInterval]);

    return {
        status,
        summary,
        loading,
        error,
        refresh
    };
}

/**
 * Hook for single lesson stockpile status
 */
export function useLessonStockpileStatus(lessonName: string | null) {
    const [status, setStatus] = useState<LessonStockpileStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        if (!lessonName) {
            setStatus(null);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data = await getLessonStockpileStatus(lessonName);
            setStatus(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch lesson status'));
            console.error('[useLessonStockpileStatus] Error:', err);
        } finally {
            setLoading(false);
        }
    }, [lessonName]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        status,
        loading,
        error,
        refresh
    };
}
