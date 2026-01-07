import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useUserData } from '@/hooks/useUserData';
import { useModals } from '@/hooks/useModals';
import { useActivityTracking } from '@/features/reports/hooks/useActivityTracking';
import courseDataJson from '@/features/course/data/courses.json';
import { RANKS } from '@/features/ranks/constants/ranks';
import type { CourseCategory, Pause, StudySession } from '@/types';
import { calculateStreak } from '@/utils/streak';

const courseData = courseDataJson as unknown as CourseCategory[];

export const useAppController = () => {
    const { user, logout, loading } = useAuth();
    const { showToast } = useNotification();

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
    const dailyFocus = useMemo(() => {
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
            'ÇARŞAMBA': 'MUHASEBE - MALİYE',
            'PERŞEMBE': 'EKONOMİ',
            'CUMA': 'HUKUK',
            'CUMARTESİ / PAZAR': 'MATEMATİK - İŞLETME',
        };
        return defaultSchedule[todayKey] || 'BELİRSİZ';
    }, [schedule]);

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
    const handleSessionComplete = useCallback((
        duration: number,
        type: 'work' | 'break',
        overrideCourseId: string | null = null,
        startTime: number = Date.now(),
        pauses: Pause[] = []
    ) => {
        if (!isDataLoaded) return;

        // Minimum 1 dakika (60 saniye) altındaki work/break oturumlarını kaydetme
        if (duration < 60) {
            showToast('Oturum 1 dakikadan kısa olduğu için kaydedilmedi.', 'warning');
            return;
        }

        // Her zaman aktif kurs ID'sini kullan (bulamazsa 'general')
        const currentCourseId = overrideCourseId || lastActiveCourseId || 'general';

        // If there are pauses, we need to split the session into segments
        if (pauses && pauses.length > 0) {
            const sortedPauses = [...pauses].sort((a, b) => a.start - b.start);
            let currentStart = startTime;

            sortedPauses.forEach(pause => {
                if (pause.start > currentStart) {
                    const segmentDuration = Math.floor((pause.start - currentStart) / 1000);
                    if (segmentDuration > 0) {
                        addSession({
                            timestamp: currentStart,
                            duration: segmentDuration,
                            type: type, // Use original session type
                            courseId: currentCourseId
                        });
                    }
                }

                const pauseDuration = Math.floor((pause.end - pause.start) / 1000);
                if (pauseDuration > 0) {
                    addSession({
                        timestamp: pause.start,
                        duration: pauseDuration,
                        type: 'pause',
                        courseId: currentCourseId // Pause should belong to the current course
                    });
                }
                currentStart = pause.end;
            });

            // Final segment after the last pause
            const sessionEndTime = startTime + (duration * 1000);
            const totalPauseMs = sortedPauses.reduce((acc, p) => acc + (p.end - p.start), 0);
            const adjustedEndTime = sessionEndTime + totalPauseMs;

            if (adjustedEndTime > currentStart) {
                const remainingDuration = Math.floor((adjustedEndTime - currentStart) / 1000);
                if (remainingDuration > 0) {
                    addSession({
                        timestamp: currentStart,
                        duration: remainingDuration,
                        type: type, // Use original session type
                        courseId: currentCourseId
                    });
                }
            }
        } else {
            addSession({
                timestamp: startTime || Date.now(),
                duration,
                type,
                courseId: currentCourseId
            });
        }
    }, [isDataLoaded, lastActiveCourseId, addSession, showToast]);

    const handleUpdateSession = useCallback((oldTimestamp: number, updatedSession: StudySession) => {
        updateSession(oldTimestamp, updatedSession);
    }, [updateSession]);

    const handleDeleteSessions = useCallback((sessionIds: number[]) => {
        deleteSessions(sessionIds);
    }, [deleteSessions]);

    const handleUpdateProgress = useCallback((courseId: string, newIds: number[]) => {
        updateProgress(courseId, newIds, (courseName) => modals.triggerCelebration(courseName));
    }, [updateProgress, modals]);

    // Refs for stable handlers
    const progressDataRef = useRef(progressData);
    useEffect(() => {
        progressDataRef.current = progressData;
    }, [progressData]);

    // Rank Change Detection
    const prevRankRef = useRef<any | null>(null);

    useEffect(() => {
        if (!isDataLoaded) return;

        // Initialize ref on first loaded render
        if (prevRankRef.current === null) {
            prevRankRef.current = rankInfo;
            return;
        }

        // Check for rank change
        if (prevRankRef.current.title !== rankInfo.title) {
            // Only celebrate if it's an upgrade (higher completion percentage requirement)
            if (rankInfo.min > prevRankRef.current.min) {
                modals.triggerRankCelebration(rankInfo);
            }
            prevRankRef.current = rankInfo;
        }
    }, [rankInfo, isDataLoaded, modals]);

    const handleVideoClick = useCallback((e: React.MouseEvent, courseId: string, videoId: number) => {
        const currentProgressData = progressDataRef.current;

        // Input validation
        if (!courseId || typeof videoId !== 'number' || isNaN(videoId)) {
            console.warn('Invalid video click parameters:', { courseId, videoId });
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            const currentCompleted = currentProgressData[courseId] || [];
            const isCompleted = currentCompleted.includes(videoId);
            if (isCompleted) {
                handleUpdateProgress(courseId, currentCompleted.filter((id: number) => id !== videoId));
            } else {
                handleUpdateProgress(courseId, [...currentCompleted, videoId]);
            }
            return;
        }

        const currentCompleted = currentProgressData[courseId] || [];
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
    }, [handleUpdateProgress]);

    const toggleCategory = useCallback((categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    }, []);

    const toggleCourse = useCallback((courseId: string) => {
        setExpandedCourses(prev => {
            const next = new Set(prev);
            if (next.has(courseId)) {
                next.delete(courseId);
            } else {
                next.add(courseId);
            }
            return next;
        });
    }, []);

    return useMemo(() => ({
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
    }), [
        user, logout, loading,
        progressData, sessions, videoHistory, schedule, isDataLoaded, lastActiveCourseId,
        totalPercentage, rankInfo, nextRank, completedHours, completedCount, totalVideos, totalHours, currentStreak, dailyFocus,
        modals,
        expandedCategories, expandedCourses,
        handleSessionComplete, handleUpdateSession, handleDeleteSessions, handleUpdateProgress, handleVideoClick, toggleCategory, toggleCourse, updateSchedule
    ]);
};

