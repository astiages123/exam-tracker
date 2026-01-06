/**
 * useReportData Hook
 * 
 * Encapsulates all data processing and calculations for the Report Modal.
 * Includes session aggregation, chart data generation, and statistics.
 */

import { useMemo, useCallback } from 'react';
import { getLocalYMD } from '@/utils/date';
import courseDataJson from '@/features/course/data/courses.json';
import type { StudySession, Course, VideoHistoryItem, UserProgressData, CourseCategory } from '@/types';

const courseData = courseDataJson as unknown as CourseCategory[];

export interface GroupedSession {
    key: string;
    date: number;
    courseId: string;
    totalDuration: number;
    sessionIds: number[];
}

export interface ChartItem {
    date: string;
    hours: number;
    count: number;
    fullDate: string;
    displayDate: string;
    workCourses: string[];
    videoCourses: string[];
    workCourseIds?: Set<string>;
    videoCourseIds?: Set<string>;
}

interface UseReportDataProps {
    sessions: StudySession[];
    courses: Course[];
    videoHistory: VideoHistoryItem[];
    progressData: UserProgressData;
    isMobile: boolean;
}

interface ReportStats {
    totalHours: number;
    remainingMins: number;
    totalBreakHours: number;
    remainingBreakMins: number;
    totalPauseHours: number;
    remainingPauseMins: number;
}

export const useReportData = ({
    sessions,
    courses,
    videoHistory,
    progressData,
    isMobile
}: UseReportDataProps) => {
    // Helper functions
    const getCourseCategory = useCallback((courseId: string | null) => {
        if (!courseId) return '';
        const categoryGroup = courseData.find(cat => cat.courses.some(c => c.id === courseId));
        return categoryGroup ? categoryGroup.category.split('(')[0].replace(/^\d+\.\s*/, '').trim() : '';
    }, []);

    const getCourseName = useCallback((courseId: string | null) => {
        if (!courseId) return 'Genel Çalışma';
        if (!Array.isArray(courses)) return 'Bilinmeyen Ders';
        const found = courses.find(c => c.id === courseId);
        return found ? found.name : 'Bilinmeyen Ders';
    }, [courses]);

    // Session filtering
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const workSessions = useMemo(() =>
        safeSessions.filter(s => s && s.type === 'work'),
        [safeSessions]
    );
    const breakSessions = useMemo(() =>
        safeSessions.filter(s => s && s.type === 'break'),
        [safeSessions]
    );

    // Statistics calculations
    const stats: ReportStats = useMemo(() => {
        const totalMinutes = workSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMins = Math.round(totalMinutes % 60);

        const totalBreakMinutesRaw = breakSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
        const totalBreakHours = Math.floor(totalBreakMinutesRaw / 60);
        const remainingBreakMins = Math.round(totalBreakMinutesRaw % 60);

        const pauseSessions = safeSessions.filter(s => s && s.type === 'pause');

        // Calculate total pause minutes
        let totalPauseMs = 0;

        // 1. Explicit pause sessions (New system)
        pauseSessions.forEach(s => {
            totalPauseMs += (s.duration || 0) * 1000;
        });

        // 2. Pauses within work sessions (Legacy system)
        workSessions.forEach(s => {
            if (s.pauses) {
                s.pauses.forEach(p => {
                    totalPauseMs += (p.end - p.start);
                });
            }
        });

        // 3. Gaps between sessions on the same day (Automatic pause detection)
        const sessionsByDay: Record<string, Array<{ start: number; end: number }>> = {};
        [...workSessions, ...breakSessions, ...pauseSessions].forEach(s => {
            if (!s.timestamp) return;
            const dateStr = new Date(s.timestamp).toISOString().split('T')[0];
            if (!sessionsByDay[dateStr]) sessionsByDay[dateStr] = [];

            const internalPauseMs = s.pauses ? s.pauses.reduce((acc, p) => acc + (p.end - p.start), 0) : 0;
            const start = s.timestamp;
            const end = s.timestamp + ((s.duration || 0) * 1000) + internalPauseMs;

            sessionsByDay[dateStr].push({ start, end });
        });

        Object.values(sessionsByDay).forEach(daySessions => {
            daySessions.sort((a, b) => a.start - b.start);
            for (let i = 0; i < daySessions.length - 1; i++) {
                const gap = daySessions[i + 1].start - daySessions[i].end;
                if (gap > 1000) totalPauseMs += gap;
            }
        });

        const totalPauseMinutes = Math.floor(totalPauseMs / 1000 / 60);
        const totalPauseHours = Math.floor(totalPauseMinutes / 60);
        const remainingPauseMins = totalPauseMinutes % 60;

        return {
            totalHours,
            remainingMins,
            totalBreakHours,
            remainingBreakMins,
            totalPauseHours,
            remainingPauseMins
        };
    }, [workSessions, breakSessions, safeSessions]);

    // Filtered video history (only currently completed videos)
    const filteredVideoHistory = useMemo(() => {
        return (videoHistory || []).filter(h => {
            const completedIds = progressData[h.courseId] || [];
            return completedIds.includes(h.videoId);
        });
    }, [videoHistory, progressData]);

    // Aggregated sessions for list view
    const aggregatedSessions = useMemo(() => {
        const groups: Record<string, GroupedSession> = {};
        workSessions.forEach(session => {
            if (!session.timestamp) return;
            const dateKey = new Date(session.timestamp).toLocaleDateString();
            const key = `${dateKey}_${session.courseId}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    date: session.timestamp,
                    courseId: session.courseId || '',
                    totalDuration: 0,
                    sessionIds: []
                };
            }
            groups[key].totalDuration += (session.duration || 0);
            groups[key].sessionIds.push(session.timestamp);
        });
        return Object.values(groups).sort((a, b) => b.date - a.date);
    }, [workSessions]);

    // Weekend gap filtering logic
    const filterWeekendGaps = useCallback((data: ChartItem[]) => {
        return data.filter((item) => {
            const d = new Date(item.date);
            const day = d.getDay(); // 0: Sunday, 6: Saturday
            const hasValue = (item.hours !== undefined && item.hours > 0) || (item.count !== undefined && item.count > 0);

            // Keep all weekdays
            if (day !== 0 && day !== 6) return true;

            // Keep weekend days with values
            if (hasValue) return true;

            // Weekend day is 0. Check the other day of the same weekend.
            const otherDayOffset = day === 6 ? 1 : -1;
            const targetDate = new Date(d);
            targetDate.setDate(d.getDate() + otherDayOffset);
            const targetDateStr = targetDate.toLocaleDateString("en-CA");

            const otherDay = data.find(other => other.date === targetDateStr);

            if (!otherDay) return false;

            const otherHasValue = (otherDay.hours !== undefined && otherDay.hours > 0) || (otherDay.count !== undefined && otherDay.count > 0);

            if (otherHasValue) return false;

            // Both are 0, keep only Sunday
            return day === 0;
        });
    }, []);

    // Chart data for duration
    const chartData = useMemo(() => {
        const dailyData: Record<string, { seconds: number; courseIds: Set<string> }> = {};
        workSessions.forEach(session => {
            if (!session.timestamp) return;
            const dateObj = new Date(session.timestamp);
            const dateKey = getLocalYMD(dateObj);
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { seconds: 0, courseIds: new Set() };
            }
            dailyData[dateKey].seconds += (session.duration || 0);
            if (session.courseId) dailyData[dateKey].courseIds.add(session.courseId);
        });

        const result: ChartItem[] = [];
        const loopDays = isMobile ? 3 : 6;
        for (let i = loopDays; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = getLocalYMD(d);
            const dayInfo = dailyData[dateKey] || { seconds: 0, courseIds: new Set() };
            const courseNames = Array.from(dayInfo.courseIds).map(id => getCourseName(id));

            result.push({
                date: dateKey,
                hours: dayInfo.seconds / 3600,
                count: 0,
                fullDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                displayDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                workCourses: courseNames,
                videoCourses: []
            });
        }
        return filterWeekendGaps(result);
    }, [workSessions, getCourseName, isMobile, filterWeekendGaps]);

    // Chart data for videos
    const videoChartData = useMemo(() => {
        const dailyCounts: Record<string, { count: number; courseIds: Set<string> }> = {};
        filteredVideoHistory.forEach(history => {
            if (!history.timestamp) return;
            const dateKey = getLocalYMD(history.timestamp);
            if (!dailyCounts[dateKey]) {
                dailyCounts[dateKey] = { count: 0, courseIds: new Set() };
            }
            dailyCounts[dateKey].count += 1;
            if (history.courseId) dailyCounts[dateKey].courseIds.add(history.courseId);
        });

        const result: ChartItem[] = [];
        const loopDays = isMobile ? 3 : 6;
        for (let i = loopDays; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = getLocalYMD(d);
            const dayInfo = dailyCounts[dateKey] || { count: 0, courseIds: new Set() };
            const courseNames = Array.from(dayInfo.courseIds).map(id => getCourseName(id));

            result.push({
                date: dateKey,
                hours: 0,
                count: dayInfo.count,
                fullDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                displayDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                workCourses: [],
                videoCourses: courseNames
            });
        }
        return filterWeekendGaps(result);
    }, [filteredVideoHistory, getCourseName, isMobile, filterWeekendGaps]);

    // Full chart data for history modal
    const fullChartData = useMemo(() => {
        const dates: Record<string, {
            hours: number;
            count: number;
            date: string;
            workCourseIds: Set<string>;
            videoCourseIds: Set<string>
        }> = {};

        workSessions.forEach(s => {
            if (!s.timestamp) return;
            const dateStr = getLocalYMD(s.timestamp);
            if (!dates[dateStr]) {
                dates[dateStr] = {
                    hours: 0,
                    count: 0,
                    date: dateStr,
                    workCourseIds: new Set(),
                    videoCourseIds: new Set()
                };
            }
            dates[dateStr].hours += (s.duration || 0) / 3600;
            if (s.courseId) dates[dateStr].workCourseIds.add(s.courseId);
        });

        filteredVideoHistory.forEach(h => {
            if (!h.timestamp) return;
            const dateStr = getLocalYMD(h.timestamp);
            if (!dates[dateStr]) {
                dates[dateStr] = {
                    hours: 0,
                    count: 0,
                    date: dateStr,
                    workCourseIds: new Set(),
                    videoCourseIds: new Set()
                };
            }
            dates[dateStr].count += 1;
            if (h.courseId) dates[dateStr].videoCourseIds.add(h.courseId);
        });

        return Object.values(dates)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(item => ({
                date: item.date,
                hours: item.hours,
                count: item.count,
                displayDate: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                fullDate: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                workCourses: Array.from(item.workCourseIds).map(id => getCourseName(id)),
                videoCourses: Array.from(item.videoCourseIds).map(id => getCourseName(id))
            }));
    }, [workSessions, filteredVideoHistory, getCourseName]);

    return {
        // Helper functions
        getCourseCategory,
        getCourseName,
        // Session data
        workSessions,
        breakSessions,
        aggregatedSessions,
        // Statistics
        stats,
        // Chart data
        chartData,
        videoChartData,
        fullChartData
    };
};
