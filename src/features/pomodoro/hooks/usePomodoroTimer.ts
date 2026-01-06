/**
 * usePomodoroTimer Hook
 * 
 * Encapsulates all Pomodoro timer logic including:
 * - Timer state management (work/break modes)
 * - LocalStorage persistence and recovery
 * - Pause/Resume functionality
 * - Notification triggers
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playNotificationSound, initAudio } from '@/utils/sound';
import { requestNotificationPermission, sendNotification } from '@/utils/notification';
import { useNotification } from '@/context/NotificationContext';
import type { Course } from '@/types';

export const WORK_DURATION = 50 * 60;
export const BREAK_DURATION = 10 * 60;

export const STORAGE_KEYS = {
    END_TIME: 'pomo_endTime',
    START_TIME: 'pomo_startTime',
    IS_ACTIVE: 'pomo_isActive',
    MODE: 'pomo_mode',
    TIME_LEFT: 'pomo_timeLeft',
    COURSE_ID: 'pomo_courseId',
    VIEW: 'pomo_view',
    NOTIFIED_50: 'pomo_notified50',
    NOTIFIED_10: 'pomo_notified10',
    ORIGINAL_START_TIME: 'pomo_originalStartTime',
    PAUSES: 'pomo_pauses',
    PAUSE_START_TIME: 'pomo_pauseStartTime'
} as const;

interface UsePomodoroTimerProps {
    initialCourse?: Course | null;
    courses: Course[];
    onSessionComplete: (
        duration: number,
        type: 'work' | 'break',
        courseId: string | null,
        startTime?: number,
        pauses?: Array<{ start: number; end: number }>
    ) => void;
    onClose: () => void;
}

export interface PomodoroTimerState {
    view: string;
    selectedCourseId: string;
    isDropdownOpen: boolean;
    mode: 'work' | 'break';
    timeLeft: number;
    isActive: boolean;
    selectedCourseName: string | undefined;
    timeText: string;
    isOvertime: boolean;
}

export interface PomodoroTimerActions {
    setView: (view: string) => void;
    setSelectedCourseId: (id: string) => void;
    setIsDropdownOpen: (open: boolean) => void;
    handleStartSession: () => Promise<void>;
    toggleTimer: () => void;
    handleCancel: () => Promise<void>;
    handleStartBreak: () => void;
    handleFinishSession: () => Promise<void>;
    handleSkipBreak: () => void;
}

export const usePomodoroTimer = ({
    initialCourse,
    courses,
    onSessionComplete,
    onClose
}: UsePomodoroTimerProps): [PomodoroTimerState, PomodoroTimerActions] => {
    // State
    const [view, setView] = useState(() => localStorage.getItem(STORAGE_KEYS.VIEW) || 'selection');
    const [selectedCourseId, setSelectedCourseId] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.COURSE_ID);
        return (saved && saved !== 'null') ? saved : (initialCourse ? initialCourse.id : '');
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [mode, setMode] = useState<'work' | 'break'>(() =>
        (localStorage.getItem(STORAGE_KEYS.MODE) as 'work' | 'break') || 'work'
    );
    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.TIME_LEFT);
        return saved ? parseInt(saved, 10) : 0;
    });
    const [isActive, setIsActive] = useState(() =>
        localStorage.getItem(STORAGE_KEYS.IS_ACTIVE) === 'true'
    );

    const { showConfirm } = useNotification();

    // Refs
    const startTimeRef = useRef<number | null>(null);
    const originalStartTimeRef = useRef<number | null>(null);
    const pausesRef = useRef<Array<{ start: number; end: number }>>([]);
    const pauseStartRef = useRef<number | null>(null);
    const notified50MinRef = useRef(false);
    const notified10MinRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const selectedCourseName = courses?.find(c => c.id === selectedCourseId)?.name;

    // Restore Timer State on Mount
    useEffect(() => {
        const savedStartTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
        const savedOriginalStart = localStorage.getItem(STORAGE_KEYS.ORIGINAL_START_TIME);
        const savedPauses = localStorage.getItem(STORAGE_KEYS.PAUSES);
        const savedPauseStart = localStorage.getItem(STORAGE_KEYS.PAUSE_START_TIME);
        const savedIsActive = localStorage.getItem(STORAGE_KEYS.IS_ACTIVE) === 'true';
        const savedMode = localStorage.getItem(STORAGE_KEYS.MODE) || 'work';
        const savedNotified50 = localStorage.getItem(STORAGE_KEYS.NOTIFIED_50) === 'true';

        if (savedOriginalStart) originalStartTimeRef.current = parseInt(savedOriginalStart, 10);
        if (savedPauses) pausesRef.current = JSON.parse(savedPauses);
        if (savedPauseStart) pauseStartRef.current = parseInt(savedPauseStart, 10);

        if (savedIsActive && savedStartTime) {
            const start = parseInt(savedStartTime, 10);
            startTimeRef.current = start;

            if (savedMode === 'work') {
                notified50MinRef.current = savedNotified50;
            } else {
                notified10MinRef.current = localStorage.getItem(STORAGE_KEYS.NOTIFIED_10) === 'true';
            }
        }
    }, []);

    // Save State Changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.VIEW, view);
        localStorage.setItem(STORAGE_KEYS.MODE, mode);
        localStorage.setItem(STORAGE_KEYS.COURSE_ID, selectedCourseId || '');
        localStorage.setItem(STORAGE_KEYS.IS_ACTIVE, String(isActive));
        localStorage.setItem(STORAGE_KEYS.TIME_LEFT, String(timeLeft));

        if (originalStartTimeRef.current) {
            localStorage.setItem(STORAGE_KEYS.ORIGINAL_START_TIME, String(originalStartTimeRef.current));
        }
        localStorage.setItem(STORAGE_KEYS.PAUSES, JSON.stringify(pausesRef.current));

        if (pauseStartRef.current) {
            localStorage.setItem(STORAGE_KEYS.PAUSE_START_TIME, String(pauseStartRef.current));
        } else {
            localStorage.removeItem(STORAGE_KEYS.PAUSE_START_TIME);
        }

        if (isActive) {
            if (startTimeRef.current) {
                localStorage.setItem(STORAGE_KEYS.START_TIME, String(startTimeRef.current));
                if (mode === 'work') {
                    localStorage.setItem(STORAGE_KEYS.NOTIFIED_50, String(notified50MinRef.current));
                } else {
                    localStorage.setItem(STORAGE_KEYS.NOTIFIED_10, String(notified10MinRef.current));
                }
            }
        } else {
            localStorage.removeItem(STORAGE_KEYS.START_TIME);
            localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);
            localStorage.removeItem(STORAGE_KEYS.NOTIFIED_10);
        }
    }, [view, mode, selectedCourseId, isActive, timeLeft]);

    // Handle initial course selection
    useEffect(() => {
        if (initialCourse && view === 'selection') {
            setSelectedCourseId(initialCourse.id);
        }
    }, [initialCourse, view]);

    // Timer interval effect
    useEffect(() => {
        if (isActive) {
            if (!startTimeRef.current) {
                const savedStartTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
                startTimeRef.current = savedStartTime
                    ? parseInt(savedStartTime, 10)
                    : Date.now() - (timeLeft * 1000);
            }

            timerRef.current = setInterval(() => {
                const now = Date.now();
                if (!startTimeRef.current) return;

                const elapsed = Math.floor((now - startTimeRef.current) / 1000);
                setTimeLeft(elapsed);

                if (mode === 'work') {
                    if (elapsed >= WORK_DURATION && !notified50MinRef.current) {
                        playNotificationSound();
                        sendNotification("50 Dakika Doldu!", {
                            body: "Çalışma süren 50 dakikayı geçti. Devam edebilir veya molaya çıkabilirsin.",
                            tag: 'pomodoro-50min'
                        });
                        notified50MinRef.current = true;
                    }
                } else {
                    if (elapsed >= BREAK_DURATION && !notified10MinRef.current) {
                        playNotificationSound();
                        sendNotification("10 Dakika Doldu!", {
                            body: "Mola süren 10 dakikayı geçti. Çalışmaya geri dönebilir veya dinlenmeye devam edebilirsin.",
                            tag: 'pomodoro-10min'
                        });
                        notified10MinRef.current = true;
                    }
                }
            }, 100);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft, mode]);

    // Helper functions
    const clearSessionData = useCallback(() => {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }, []);

    const resetRefs = useCallback(() => {
        startTimeRef.current = null;
        originalStartTimeRef.current = null;
        pausesRef.current = [];
        pauseStartRef.current = null;
        notified50MinRef.current = false;
        notified10MinRef.current = false;
    }, []);

    // Actions
    const handleStartSession = useCallback(async () => {
        if (!selectedCourseId) return;

        await requestNotificationPermission();
        initAudio();
        setView('timer');
        setMode('work');
        setTimeLeft(0);
        setIsActive(false);
        resetRefs();
    }, [selectedCourseId, resetRefs]);

    const toggleTimer = useCallback(() => {
        const now = Date.now();
        if (isActive) {
            setIsActive(false);
            pauseStartRef.current = now;
        } else {
            initAudio();

            if (!originalStartTimeRef.current) {
                originalStartTimeRef.current = now;
            }

            startTimeRef.current = now - (timeLeft * 1000);

            if (pauseStartRef.current) {
                pausesRef.current.push({ start: pauseStartRef.current, end: now });
                pauseStartRef.current = null;
            }
            setIsActive(true);
        }
    }, [isActive, timeLeft]);

    const handleEndSession = useCallback(() => {
        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        clearSessionData();
        setMode('work');
        setTimeLeft(0);
        setSelectedCourseId(initialCourse ? initialCourse.id : '');
        setView('selection');
    }, [clearSessionData, initialCourse]);

    const handleCancel = useCallback(async () => {
        const confirmed = await showConfirm(
            "Çalışmayı İptal Et",
            "Bu oturumu iptal etmek istediğine emin misin? Süre kaydedilmeyecek."
        );
        if (!confirmed) return;

        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        clearSessionData();
        onClose();
    }, [showConfirm, clearSessionData, onClose]);

    const handleStartBreak = useCallback(() => {
        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        playNotificationSound();

        localStorage.removeItem(STORAGE_KEYS.START_TIME);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);

        const elapsedTime = timeLeft;

        sendNotification("Oturum Kaydedildi", {
            body: `${selectedCourseName || 'Ders'} çalışması ${Math.floor(elapsedTime / 60)} dk olarak kaydedildi. Mola başlıyor!`,
            tag: 'pomodoro-complete'
        });

        onSessionComplete(
            elapsedTime,
            'work',
            selectedCourseId,
            originalStartTimeRef.current || undefined,
            pausesRef.current
        );

        setMode('break');
        setTimeLeft(0);

        const now = Date.now();
        startTimeRef.current = now;
        originalStartTimeRef.current = now;
        pausesRef.current = [];
        pauseStartRef.current = null;
        notified10MinRef.current = false;
        setIsActive(true);
    }, [timeLeft, selectedCourseName, selectedCourseId, onSessionComplete]);

    const handleFinishSession = useCallback(async () => {
        const confirmed = await showConfirm(
            "Oturumu Bitir",
            "Mevcut oturumu bitirip sonuçları kaydetmek istiyor musun?"
        );
        if (!confirmed) return;

        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        playNotificationSound();

        localStorage.removeItem(STORAGE_KEYS.START_TIME);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);

        const elapsedTime = timeLeft;

        sendNotification("Oturum Kaydedildi", {
            body: `${selectedCourseName || 'Ders'} çalışması ${Math.floor(elapsedTime / 60)} dk olarak kaydedildi.`,
            tag: 'pomodoro-complete'
        });

        onSessionComplete(
            elapsedTime,
            'work',
            selectedCourseId,
            originalStartTimeRef.current || undefined,
            pausesRef.current
        );

        handleEndSession();
    }, [showConfirm, timeLeft, selectedCourseName, selectedCourseId, onSessionComplete, handleEndSession]);

    const handleSkipBreak = useCallback(() => {
        if (mode !== 'break') return;

        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);

        const breakElapsedTime = timeLeft;
        onSessionComplete(
            breakElapsedTime,
            'break',
            selectedCourseId,
            originalStartTimeRef.current || undefined,
            pausesRef.current
        );

        setMode('work');
        setTimeLeft(0);

        const now = Date.now();
        startTimeRef.current = now;
        originalStartTimeRef.current = now;
        pausesRef.current = [];
        pauseStartRef.current = null;
        notified50MinRef.current = false;
        setIsActive(true);
        playNotificationSound();
    }, [mode, timeLeft, onSessionComplete]);

    // Computed values
    const getDisplayState = useCallback(() => {
        const target = mode === 'work' ? WORK_DURATION : BREAK_DURATION;
        const remaining = target - timeLeft;
        const isOvertime = remaining < 0;
        const absSeconds = Math.abs(remaining);

        const mins = Math.floor(absSeconds / 60);
        const secs = absSeconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        return { text: isOvertime ? `+${timeStr}` : timeStr, isOvertime };
    }, [mode, timeLeft]);

    const { text: timeText, isOvertime } = getDisplayState();

    const state: PomodoroTimerState = {
        view,
        selectedCourseId,
        isDropdownOpen,
        mode,
        timeLeft,
        isActive,
        selectedCourseName,
        timeText,
        isOvertime
    };

    const actions: PomodoroTimerActions = {
        setView,
        setSelectedCourseId,
        setIsDropdownOpen,
        handleStartSession,
        toggleTimer,
        handleCancel,
        handleStartBreak,
        handleFinishSession,
        handleSkipBreak
    };

    return [state, actions];
};
