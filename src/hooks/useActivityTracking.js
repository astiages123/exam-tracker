import { useMemo } from 'react';

/**
 * Returns the date string in YYYY-MM-DD format for a given date object
 * Uses local system time logic consistent with the rest of the app.
 */
const getLocalYMD = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const useActivityTracking = (sessions = [], videoHistory = [], isDataLoaded = false, progressData = {}) => {
    // Use useMemo instead of useState + useEffect to avoid cascading renders
    const activityLog = useMemo(() => {
        if (!isDataLoaded) return {};

        // Calculate activity log purely from source of truth (sessions & history)
        const newActivityLog = {};

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
