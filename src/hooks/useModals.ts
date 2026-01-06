/**
 * useModals Hook
 * 
 * Centralized management of modal visibility state.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { BookOpen, type LucideIcon } from 'lucide-react';
import type { Course, CourseCategory, Rank } from '@/types';
import courseDataJson from '@/features/course/data/courses.json';
import { COURSE_ICONS } from '@/features/course/constants';

const courseData = courseDataJson as unknown as CourseCategory[];
const allCourses = courseData.flatMap(cat => cat.courses);

// Interfaces for active modal states
export interface ActiveNoteCourse {
    name: string;
    path: string;
    id: string;
    icon: LucideIcon;
}



/**
 * Hook for managing multiple modal states
 */
export const useModals = () => {
    // We use a local state to trigger re-renders when URL changes
    const [currentParams, setCurrentParams] = useState(new URLSearchParams(window.location.search));

    // Monitor URL changes (including back/forward button)
    useEffect(() => {
        const handlePopState = () => {
            setCurrentParams(new URLSearchParams(window.location.search));
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Helper to update search params and URL
    const updateParams = useCallback((newParams: URLSearchParams) => {
        const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
        window.history.pushState({}, '', newUrl);
        setCurrentParams(newParams);
    }, []);

    // --- State Getters ---
    const modalType = currentParams.get('modal');
    const courseId = currentParams.get('courseId');
    const reportHistoryType = currentParams.get('type') as 'duration' | 'videos' | null;

    // Non-URL Transient States
    const [celebratingCourse, setCelebratingCourse] = useState<string | null>(null);
    const [isZenMode, setIsZenMode] = useState<boolean>(false);

    // Derived States
    const showTimer = modalType === 'timer';
    const showReport = modalType === 'report';
    const showSchedule = modalType === 'schedule';
    const showRankModal = modalType === 'rank';
    const showQuiz = modalType === 'quiz';

    const showStats = modalType === 'stats';

    const activeNoteCourse = useMemo(() => {
        if (modalType !== 'note' || !courseId) return null;
        const course = allCourses.find(c => c.id === courseId);
        if (!course || !course.notePath) return null;
        const matchingKey = Object.keys(COURSE_ICONS).find(key => course.name.startsWith(key));
        const icon = matchingKey ? COURSE_ICONS[matchingKey] : BookOpen;
        return {
            name: course.name,
            path: course.notePath,
            id: course.id,
            icon
        } as ActiveNoteCourse;
    }, [modalType, courseId]);



    // --- Action Handlers ---
    const setModal = useCallback((type: string | null, params: Record<string, string> = {}) => {
        const p = new URLSearchParams();
        if (type) {
            p.set('modal', type);
            Object.entries(params).forEach(([k, v]) => p.set(k, v));
        }
        updateParams(p);
    }, [updateParams]);

    const closeAll = useCallback(() => setModal(null), [setModal]);

    // Open handlers
    const openTimer = useCallback(() => setModal('timer'), [setModal]);
    const openReport = useCallback(() => setModal('report'), [setModal]);
    const openSchedule = useCallback(() => setModal('schedule'), [setModal]);
    const openRankModal = useCallback(() => setModal('rank'), [setModal]);

    const openReportWithHistory = useCallback((type: 'duration' | 'videos') => {
        setModal('report', { type });
    }, [setModal]);

    const openNotes = useCallback((course: Course) => {
        if (!course.notePath) return;
        setModal('note', { courseId: course.id });
    }, [setModal]);

    const openQuiz = useCallback((course: Course) => {
        setModal('quiz', { courseId: course.id });
    }, [setModal]);

    const openStats = useCallback((course: Course) => {
        setModal('stats', { courseId: course.id });
    }, [setModal]);





    // Legacy Support (Setters)
    const setShowTimer = useCallback((show: boolean) => show ? openTimer() : closeAll(), [openTimer, closeAll]);
    const setShowReport = useCallback((show: boolean) => show ? openReport() : closeAll(), [openReport, closeAll]);
    const setShowSchedule = useCallback((show: boolean) => show ? openSchedule() : closeAll(), [openSchedule, closeAll]);
    const setShowRankModal = useCallback((show: boolean) => show ? openRankModal() : closeAll(), [openRankModal, closeAll]);

    // Celebration
    const triggerCelebration = useCallback((courseName: string) => setCelebratingCourse(courseName), []);
    const closeCelebration = useCallback(() => setCelebratingCourse(null), []);

    // Rank Celebration
    const [celebratingRank, setCelebratingRank] = useState<Rank | null>(null);
    const triggerRankCelebration = useCallback((rank: Rank) => setCelebratingRank(rank), []);
    const closeRankCelebration = useCallback(() => setCelebratingRank(null), []);

    // Memoized return object for stable reference
    return useMemo(() => ({
        // States
        showTimer,
        showReport,
        showSchedule,
        showRankModal,
        showStats,
        activeNoteCourse,
        celebratingCourse,
        celebratingRank,
        isZenMode,
        reportHistoryType,

        // Setters (Legacy & Direct)
        setShowTimer,
        setShowReport,
        setShowSchedule,
        setShowRankModal,
        setIsZenMode,

        // Open/Close handlers
        openTimer,
        closeTimer: closeAll,
        openReport,
        closeReport: closeAll,
        openSchedule,
        closeSchedule: closeAll,
        openRankModal,
        closeRankModal: closeAll,

        // Course modals
        openNotes,
        closeNotes: closeAll,
        openQuiz,
        closeQuiz: closeAll,
        openStats,
        closeStats: closeAll,
        showQuiz,
        quizCourseId: modalType === 'quiz' ? courseId : null,
        statsCourseId: modalType === 'stats' ? courseId : null,

        // Celebration
        triggerCelebration,
        closeCelebration,
        triggerRankCelebration,
        closeRankCelebration,

        // Special openers
        openReportWithHistory
    }), [
        showTimer, showReport, showSchedule, showRankModal, showQuiz, showStats,
        activeNoteCourse, celebratingCourse, celebratingRank, isZenMode,
        setShowTimer, setShowReport, setShowSchedule, setShowRankModal,
        openTimer, openReport, openSchedule, openRankModal, openQuiz, openStats,
        openNotes, triggerCelebration, closeCelebration,
        triggerRankCelebration, closeRankCelebration,
        openReportWithHistory, reportHistoryType, closeAll, courseId, modalType
    ]);
};
