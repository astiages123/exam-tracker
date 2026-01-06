import { useMemo } from 'react';
import { getLocalYMD } from '@/utils/date';
import type { StudySession, VideoHistoryItem, UserProgressData } from '@/types';

export const useActivityTracking = (
    sessions: StudySession[] = [],
    videoHistory: VideoHistoryItem[] = [],
    isDataLoaded: boolean = false,
    progressData: UserProgressData = {}
): Record<string, number> => {
    // Use useMemo instead of useState + useEffect to avoid cascading renders
    const activityLog = useMemo(() => {
        if (!isDataLoaded) return {};

        // Calculate activity log purely from source of truth (sessions & history)
        const newActivityLog: Record<string, number> = {};

        // 1. Map Work Sessions to Dates
        sessions.forEach(session => {
            if (session.type === 'work') {
                const dateStr = getLocalYMD(new Date(session.timestamp));
                newActivityLog[dateStr] = (newActivityLog[dateStr] || 0) + 1;
            }
        });

        // 2. Map Video History to Dates (Only if they are still marked as completed)
        videoHistory.forEach(historyItem => {
            const courseProgress = progressData[historyItem.courseId] || [];
            const isStillCompleted = courseProgress.some(id => Number(id) === Number(historyItem.videoId));
            if (isStillCompleted) {
                const dateStr = getLocalYMD(new Date(historyItem.timestamp));
                newActivityLog[dateStr] = (newActivityLog[dateStr] || 0) + 1;
            }
        });

        return newActivityLog;
    }, [sessions, videoHistory, isDataLoaded, progressData]);

    return activityLog;
};
