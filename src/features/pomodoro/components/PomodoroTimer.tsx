/**
 * PomodoroTimer Component
 * 
 * Main Pomodoro timer component that orchestrates course selection
 * and timer display using the usePomodoroTimer hook.
 * 
 * Refactored: Logic moved to usePomodoroTimer hook,
 * UI split into CourseSelector and TimerDisplay components.
 */

import { useEffect } from 'react';
import { usePomodoroTimer } from '@/features/pomodoro/hooks/usePomodoroTimer';
import CourseSelector from '@/features/pomodoro/components/CourseSelector';
import TimerDisplay from '@/features/pomodoro/components/TimerDisplay';
import type { Course } from '@/types';

interface PomodoroTimerProps {
    initialCourse?: Course | null;
    courses: Course[];
    sessionsCount?: number;
    onSessionComplete: (
        duration: number,
        type: 'work' | 'break',
        courseId: string | null,
        startTime?: number,
        pauses?: Array<{ start: number; end: number }>
    ) => void;
    onClose: () => void;
    onZenModeChange?: (isZen: boolean) => void;
}

export default function PomodoroTimer({
    initialCourse,
    courses,
    sessionsCount = 0,
    onSessionComplete,
    onClose,
    onZenModeChange
}: PomodoroTimerProps) {
    const [state, actions] = usePomodoroTimer({
        initialCourse,
        courses,
        onSessionComplete,
        onClose
    });

    // Zen Mode Logic
    useEffect(() => {
        if (onZenModeChange) {
            // Dashboard'u blurlamak ve UI'ı gizlemek için 'timer' görünümüne geçince Zen Mode'u tetikle
            onZenModeChange(state.view === 'timer');
        }

        return () => {
            if (onZenModeChange) {
                // Modal kapandığında Zen Mode'u mutlaka sıfırla
                onZenModeChange(false);
            }
        };
    }, [state.view, onZenModeChange]);

    // Handle escape key and scroll lock for selection view
    useEffect(() => {
        if (state.view === 'selection') {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };

            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                document.body.style.overflow = 'unset';
            };
        }
    }, [state.view, onClose]);

    if (state.view === 'selection') {
        return (
            <CourseSelector
                courses={courses}
                selectedCourseId={state.selectedCourseId}
                isDropdownOpen={state.isDropdownOpen}
                onCourseSelect={actions.setSelectedCourseId}
                onDropdownToggle={actions.setIsDropdownOpen}
                onStartSession={actions.handleStartSession}
                onClose={onClose}
            />
        );
    }

    return (
        <TimerDisplay
            mode={state.mode}
            selectedCourseName={state.selectedCourseName}
            timeText={state.timeText}
            isOvertime={state.isOvertime}
            isActive={state.isActive}
            sessionsCount={sessionsCount}
            onToggleTimer={actions.toggleTimer}
            onStartBreak={actions.handleStartBreak}
            onFinishSession={actions.handleFinishSession}
            onSkipBreak={actions.handleSkipBreak}
            onCancel={actions.handleCancel}
            isZenMode={state.isActive && state.mode === 'work'}
        />
    );
}
