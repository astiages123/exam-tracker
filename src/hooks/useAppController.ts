import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useUserData } from '@/hooks/useUserData';
import { useModals } from '@/hooks/useModals';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import courseDataJson from '@/data/courses.json';
import { RANKS } from '@/features/ranks/constants/ranks';
import { CourseCategory } from '@/types';
import { calculateStreak } from '@/utils/streak';

const courseData = courseDataJson as unknown as CourseCategory[];

export const useAppController = () => {
    const { user, logout, loading } = useAuth();
    useNotification();

    // Custom Hooks
    const {
        progressData,
        sessions,
        videoHistory,
        schedule,
        isDataLoaded,
        lastActiveCourseId,
        updateProgress,
        addSession,
        deleteSessions,
        updateSchedule,
        updateSession
    } = useUserData(user);

    const modals = useModals();
    const { showTimer } = modals;

    // Effects
    useEffect(() => {
        localStorage.setItem('pomo_isVisible', String(showTimer));
    }, [showTimer]);

    // Derived State
    const activityLog = useActivityTracking(sessions, videoHistory, isDataLoaded, progressData);
    const currentStreak = useMemo(() => calculateStreak(activityLog), [activityLog]);

    // UI State
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

    // Daily Focus Logic
    const getDailyFocus = (): string => {
        const now = new Date();
        const dayIndex = now.getDay();

        const dayKeys = [
            'CUMARTESİ / PAZAR', // 0: Sunday
            'PAZARTESİ',         // 1
            'SALI',              // 2
            'ÇARŞAMBA',          // 3
            'PERŞEMBE',          // 4
            'CUMA',              // 5
            'CUMARTESİ / PAZAR'  // 6: Saturday
        ] as const;

        const todayKey = dayKeys[dayIndex];

        // Dynamic focus from schedule if available
        const todaySchedule = schedule[todayKey];
        if (todaySchedule && todaySchedule.length > 0) {
            return todaySchedule[0].subject.toUpperCase();
        }

        const defaultSchedule: Record<string, string> = {
            'PAZARTESİ': 'EKONOMİ',
            'SALI': 'HUKUK',
            'ÇARŞAMBA': 'MUHASEBE - İŞLETME - MALİYE',
            'PERŞEMBE': 'EKONOMİ',
            'CUMA': 'HUKUK',
            'CUMARTESİ / PAZAR': 'MATEMATİK - BANKA',
        };
        return defaultSchedule[todayKey] || 'BELİRSİZ';
    };
    const dailyFocus = getDailyFocus();

    // Stats Calculation
    const totalVideos = useMemo(() => courseData.reduce((acc, cat) =>
        acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalVideos, 0), 0), []);

    const totalHours = useMemo(() => courseData.reduce((acc, cat) =>
        acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalHours, 0), 0), []);

    const { totalPercentage, rankInfo, nextRank, completedHours, completedCount } = useMemo(() => {
        let totalCompletedMinutes = 0;
        let totalCompletedVideos = 0;

        // Iterate all courses to sum up activity
        courseData.forEach(category => {
            category.courses.forEach(course => {
                const completedIds = progressData[course.id] || [];
                totalCompletedVideos += completedIds.length;

                // Sum duration of completed videos
                const courseVideos = course.videos || [];
                completedIds.forEach(vidId => {
                    const video = courseVideos.find(v => v.id === vidId);
                    if (video && video.durationMinutes) {
                        totalCompletedMinutes += video.durationMinutes;
                    } else {
                        const avgDuration = (course.totalHours * 60) / course.totalVideos;
                        totalCompletedMinutes += avgDuration;
                    }
                });
            });
        });

        const completedHrs = totalCompletedMinutes / 60;
        const percent = totalHours > 0 ? (completedHrs / totalHours) * 100 : 0;

        let currentRank = RANKS[0];
        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (Math.floor(percent) >= RANKS[i].min) {
                currentRank = RANKS[i];
                break;
            }
        }

        const nextRankIndex = RANKS.findIndex(r => r.title === currentRank.title) + 1;
        const nextR = RANKS[nextRankIndex] || { min: 100, title: "Zirve" };

        return {
            totalPercentage: percent,
            rankInfo: currentRank,
            nextRank: nextR,
            completedHours: completedHrs,
            completedCount: totalCompletedVideos
        };
    }, [progressData, totalHours]);

    // Handlers
    const handleSessionComplete = (
        duration: number,
        type: 'work' | 'break',
        overrideCourseId: string | null = null,
        startTime: number = Date.now(),
        pauses: any[] = []
    ) => {
        if (!isDataLoaded) return;

        const newSession = {
            timestamp: startTime || new Date().setSeconds(0, 0),
            duration,
            type,
            courseId: overrideCourseId || lastActiveCourseId || 'general',
            pauses: pauses || []
        };

        addSession(newSession);
    };

    const handleUpdateSession = (oldTimestamp: number, updatedSession: any) => {
        updateSession(oldTimestamp, updatedSession);
    };

    const handleDeleteSessions = (sessionIds: number[]) => {
        deleteSessions(sessionIds);
    };

    const handleUpdateProgress = (courseId: string, newIds: number[]) => {
        updateProgress(courseId, newIds, (courseName) => modals.triggerCelebration(courseName));
    };

    const handleVideoClick = (e: React.MouseEvent, courseId: string, videoId: number) => {
        // Input validation
        if (!courseId || typeof videoId !== 'number' || isNaN(videoId)) {
            console.warn('Invalid video click parameters:', { courseId, videoId });
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            const currentCompleted = progressData[courseId] || [];
            const isCompleted = currentCompleted.includes(videoId);
            if (isCompleted) {
                handleUpdateProgress(courseId, currentCompleted.filter((id: number) => id !== videoId));
            } else {
                handleUpdateProgress(courseId, [...currentCompleted, videoId]);
            }
            return;
        }

        const currentCompleted = progressData[courseId] || [];
        const isCompleted = currentCompleted.includes(videoId);
        const course = courseData.flatMap(cat => cat.courses).find(c => c.id === courseId);
        const videos = course?.videos || [];
        const index = videos.findIndex(v => v.id === videoId);

        if (index === -1) return;

        if (isCompleted) {
            // Uncheck forward chain
            let chainEndIndex = index;
            while (chainEndIndex < videos.length - 1) {
                const nextVideoId = videos[chainEndIndex + 1].id;
                if (currentCompleted.includes(nextVideoId)) {
                    chainEndIndex++;
                } else {
                    break;
                }
            }
            const newIds = currentCompleted.filter((cId: number) => {
                const cIndex = videos.findIndex(v => v.id === cId);
                return cIndex < index || cIndex > chainEndIndex;
            });
            handleUpdateProgress(courseId, newIds);
        } else {
            // Smart fill
            const newIds = [...currentCompleted];
            for (let i = 0; i <= index; i++) {
                const vId = videos[i].id;
                if (!newIds.includes(vId)) {
                    newIds.push(vId);
                }
            }
            handleUpdateProgress(courseId, newIds);
        }
    };

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const toggleCourse = (courseId: string) => {
        setExpandedCourses(prev => {
            const next = new Set(prev);
            if (next.has(courseId)) {
                next.delete(courseId);
            } else {
                next.add(courseId);
            }
            return next;
        });
    };

    return {
        auth: { user, logout, loading },
        userData: {
            progressData,
            sessions,
            videoHistory,
            schedule,
            isDataLoaded,
            lastActiveCourseId,
        },
        stats: {
            totalPercentage,
            rankInfo,
            nextRank,
            completedHours,
            completedCount,
            totalVideos,
            totalHours,
            currentStreak,
            dailyFocus
        },
        modals,
        ui: {
            expandedCategories,
            expandedCourses
        },
        handlers: {
            handleSessionComplete,
            handleUpdateSession,
            handleDeleteSessions,
            handleUpdateProgress,
            handleVideoClick,
            toggleCategory,
            toggleCourse,
            updateSchedule
        }
    };
};
