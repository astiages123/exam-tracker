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

export interface PeriodStats {
    totalHours: number;
    sessionCount: number;
    videoCount: number;
    activeDays: number;
    averagePerDay: number;
}

export interface TrendComparison {
    current: PeriodStats;
    previous: PeriodStats;
    percentChange: number;  // Positive = increase, negative = decrease
}

export interface WeeklyChartItem {
    weekLabel: string;
    weekStart: string;
    hours: number;
    videoCount: number;
}

export interface MonthlyChartItem {
    monthLabel: string;
    monthStart: string;
    hours: number;
    videoCount: number;
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

    // Unified Chart data for duration and videos
    const chartData = useMemo(() => {
        const dailyDuration: Record<string, { seconds: number; courseIds: Set<string> }> = {};
        workSessions.forEach(session => {
            if (!session.timestamp) return;
            const dateObj = new Date(session.timestamp);
            const dateKey = getLocalYMD(dateObj);
            if (!dailyDuration[dateKey]) {
                dailyDuration[dateKey] = { seconds: 0, courseIds: new Set() };
            }
            dailyDuration[dateKey].seconds += (session.duration || 0);
            if (session.courseId) dailyDuration[dateKey].courseIds.add(session.courseId);
        });

        const dailyVideoCounts: Record<string, { count: number; courseIds: Set<string> }> = {};
        filteredVideoHistory.forEach(history => {
            if (!history.timestamp) return;
            const dateKey = getLocalYMD(history.timestamp);
            if (!dailyVideoCounts[dateKey]) {
                dailyVideoCounts[dateKey] = { count: 0, courseIds: new Set() };
            }
            dailyVideoCounts[dateKey].count += 1;
            if (history.courseId) dailyVideoCounts[dateKey].courseIds.add(history.courseId);
        });

        const result: ChartItem[] = [];
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonth = now.getDate(); // Show up to today

        for (let i = 0; i < daysInMonth; i++) {
            const d = new Date(startOfMonth);
            d.setDate(d.getDate() + i);
            const dateKey = getLocalYMD(d);

            const durationInfo = dailyDuration[dateKey] || { seconds: 0, courseIds: new Set<string>() };
            const videoInfo = dailyVideoCounts[dateKey] || { count: 0, courseIds: new Set<string>() };

            const workCourseNames = Array.from(durationInfo.courseIds).map(id => getCourseName(id));
            const videoCourseNames = Array.from(videoInfo.courseIds).map(id => getCourseName(id));

            result.push({
                date: dateKey,
                hours: durationInfo.seconds / 3600,
                count: videoInfo.count,
                fullDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                displayDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                workCourses: workCourseNames,
                videoCourses: videoCourseNames
            });
        }
        return filterWeekendGaps(result);
    }, [workSessions, filteredVideoHistory, getCourseName, isMobile, filterWeekendGaps]);

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

    // Helper: Get start of week (Monday)
    const getWeekStart = useCallback((date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // Helper: Get start of month
    const getMonthStart = useCallback((date: Date): Date => {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // Calculate period stats helper
    const calculatePeriodStats = useCallback((
        startDate: Date,
        endDate: Date,
        sessions: typeof workSessions,
        videos: typeof filteredVideoHistory
    ): PeriodStats => {
        const startTs = startDate.getTime();
        const endTs = endDate.getTime();

        const periodSessions = sessions.filter(s =>
            s.timestamp && s.timestamp >= startTs && s.timestamp < endTs
        );
        const periodVideos = videos.filter(v => {
            const ts = typeof v.timestamp === 'number' ? v.timestamp : new Date(v.timestamp).getTime();
            return ts >= startTs && ts < endTs;
        });

        const totalHours = periodSessions.reduce((acc, s) => acc + ((s.duration || 0) / 3600), 0);
        const sessionCount = periodSessions.length;
        const videoCount = periodVideos.length;

        // Count unique active days
        const activeDaysSet = new Set<string>();
        periodSessions.forEach(s => {
            if (s.timestamp) activeDaysSet.add(getLocalYMD(s.timestamp));
        });
        periodVideos.forEach(v => {
            const ts = typeof v.timestamp === 'number' ? v.timestamp : new Date(v.timestamp).getTime();
            activeDaysSet.add(getLocalYMD(ts));
        });
        const activeDays = activeDaysSet.size;

        const averagePerDay = activeDays > 0 ? totalHours / activeDays : 0;

        return {
            totalHours,
            sessionCount,
            videoCount,
            activeDays,
            averagePerDay
        };
    }, []);

    // Weekly stats comparison
    const weeklyStats: TrendComparison = useMemo(() => {
        const now = new Date();
        const thisWeekStart = getWeekStart(now);
        const thisWeekEnd = new Date(thisWeekStart);
        thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = thisWeekStart;

        const current = calculatePeriodStats(thisWeekStart, thisWeekEnd, workSessions, filteredVideoHistory);
        const previous = calculatePeriodStats(lastWeekStart, lastWeekEnd, workSessions, filteredVideoHistory);

        const percentChange = previous.totalHours > 0
            ? ((current.totalHours - previous.totalHours) / previous.totalHours) * 100
            : (current.totalHours > 0 ? 100 : 0);

        return { current, previous, percentChange };
    }, [workSessions, filteredVideoHistory, getWeekStart, calculatePeriodStats]);

    // Monthly stats comparison
    const monthlyStats: TrendComparison = useMemo(() => {
        const now = new Date();
        const thisMonthStart = getMonthStart(now);
        const thisMonthEnd = new Date(thisMonthStart);
        thisMonthEnd.setMonth(thisMonthEnd.getMonth() + 1);

        const lastMonthStart = new Date(thisMonthStart);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        const lastMonthEnd = thisMonthStart;

        const current = calculatePeriodStats(thisMonthStart, thisMonthEnd, workSessions, filteredVideoHistory);
        const previous = calculatePeriodStats(lastMonthStart, lastMonthEnd, workSessions, filteredVideoHistory);

        const percentChange = previous.totalHours > 0
            ? ((current.totalHours - previous.totalHours) / previous.totalHours) * 100
            : (current.totalHours > 0 ? 100 : 0);

        return { current, previous, percentChange };
    }, [workSessions, filteredVideoHistory, getMonthStart, calculatePeriodStats]);

    // Weekly chart data (last 8 weeks)
    const weeklyChartData: WeeklyChartItem[] = useMemo(() => {
        const result: WeeklyChartItem[] = [];
        const now = new Date();

        for (let i = 7; i >= 0; i--) {
            const weekStart = getWeekStart(now);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const stats = calculatePeriodStats(weekStart, weekEnd, workSessions, filteredVideoHistory);

            // Format week label (e.g., "6-12 Oca")
            const weekEndDisplay = new Date(weekEnd);
            weekEndDisplay.setDate(weekEndDisplay.getDate() - 1);
            const weekLabel = `${weekStart.getDate()}-${weekEndDisplay.getDate()} ${weekStart.toLocaleDateString('tr-TR', { month: 'short' })}`;

            result.push({
                weekLabel,
                weekStart: getLocalYMD(weekStart),
                hours: stats.totalHours,
                videoCount: stats.videoCount
            });
        }

        return result;
    }, [workSessions, filteredVideoHistory, getWeekStart, calculatePeriodStats]);

    // Monthly chart data (last 6 months)
    const monthlyChartData: MonthlyChartItem[] = useMemo(() => {
        const result: MonthlyChartItem[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const monthStart = getMonthStart(now);
            monthStart.setMonth(monthStart.getMonth() - i);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);

            const stats = calculatePeriodStats(monthStart, monthEnd, workSessions, filteredVideoHistory);

            const monthLabel = monthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

            result.push({
                monthLabel,
                monthStart: getLocalYMD(monthStart),
                hours: stats.totalHours,
                videoCount: stats.videoCount
            });
        }

        return result;
    }, [workSessions, filteredVideoHistory, getMonthStart, calculatePeriodStats]);

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
        weeklyStats,
        monthlyStats,
        // Chart data
        chartData,
        fullChartData,
        weeklyChartData,
        monthlyChartData
    };
};
