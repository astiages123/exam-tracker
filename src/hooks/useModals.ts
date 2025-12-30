/**
 * useModals Hook
 * 
 * Centralized management of modal visibility state.
 */

import { useState, useCallback, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Course } from '@/types';

// Interfaces for active modal states
export interface ActiveNoteCourse {
    name: string;
    path: string;
    id: string;
    icon: LucideIcon;
}

export interface ActiveQuizCourse {
    name: string;
    path: string;
    id: string;
}

/**
 * Hook for managing multiple modal states
 */
export const useModals = () => {
    // Timer & Reports
    const [showTimer, setShowTimer] = useState<boolean>(false);
    const [showReport, setShowReport] = useState<boolean>(false);
    const [reportHistoryType, setReportHistoryType] = useState<'duration' | 'videos' | null>(null);
    const [showSchedule, setShowSchedule] = useState<boolean>(false);
    const [showRankModal, setShowRankModal] = useState<boolean>(false);

    // Course-specific modals
    const [activeNoteCourse, setActiveNoteCourse] = useState<ActiveNoteCourse | null>(null);
    const [activeQuizCourse, setActiveQuizCourse] = useState<ActiveQuizCourse | null>(null);

    // Celebration
    const [celebratingCourse, setCelebratingCourse] = useState<string | null>(null);

    // Open handlers
    const openTimer = useCallback(() => setShowTimer(true), []);
    const openReport = useCallback(() => setShowReport(true), []);
    const openSchedule = useCallback(() => setShowSchedule(true), []);
    const openRankModal = useCallback(() => setShowRankModal(true), []);

    // Close handlers
    const closeTimer = useCallback(() => setShowTimer(false), []);
    const closeReport = useCallback(() => {
        setShowReport(false);
        setReportHistoryType(null);
    }, []);
    const openReportWithHistory = useCallback((type: 'duration' | 'videos') => {
        setReportHistoryType(type);
        setShowReport(true);
    }, []);
    const closeSchedule = useCallback(() => setShowSchedule(false), []);
    const closeRankModal = useCallback(() => setShowRankModal(false), []);

    // Notes modal
    const openNotes = useCallback((course: Course, icon: any) => {
        if (!course.notePath) return; // Guard clause
        setActiveNoteCourse({
            name: course.name,
            path: course.notePath,
            id: course.id,
            icon: icon
        });
    }, []);
    const closeNotes = useCallback(() => setActiveNoteCourse(null), []);

    // Quiz modal
    const openQuiz = useCallback((course: Course) => {
        if (!course.notePath) return;
        setActiveQuizCourse({
            name: course.name,
            path: course.notePath,
            id: course.id
        });
    }, []);
    const closeQuiz = useCallback(() => setActiveQuizCourse(null), []);

    // Celebration
    const triggerCelebration = useCallback((courseName: string) => {
        setCelebratingCourse(courseName);
    }, []);
    const closeCelebration = useCallback(() => setCelebratingCourse(null), []);

    // Memoized return object for stable reference
    return useMemo(() => ({
        // States
        showTimer,
        showReport,
        showSchedule,
        showRankModal,
        activeNoteCourse,
        activeQuizCourse,
        celebratingCourse,

        // Toggle/Set methods (Exposed setters)
        setShowTimer,
        setShowReport,
        setShowSchedule,
        setShowRankModal,

        // Open/Close handlers
        openTimer,
        closeTimer,
        openReport,
        closeReport,
        openSchedule,
        closeSchedule,
        openRankModal,
        closeRankModal,

        // Course modals
        openNotes,
        closeNotes,
        openQuiz,
        closeQuiz,

        // Celebration
        triggerCelebration,
        closeCelebration,

        // Special openers
        openReportWithHistory,
        reportHistoryType
    }), [
        showTimer, showReport, showSchedule, showRankModal,
        activeNoteCourse, activeQuizCourse, celebratingCourse,
        openTimer, closeTimer, openReport, closeReport,
        openSchedule, closeSchedule, openRankModal, closeRankModal,
        openNotes, closeNotes, openQuiz, closeQuiz,
        triggerCelebration, closeCelebration,
        openReportWithHistory, reportHistoryType
    ]);
};
