import { useState, useMemo } from 'react';
import type { StudySession } from '@/types';
import { isSameDay, formatTimeForInput } from '@/utils/date';

export interface EditingSessionState {
    sessionId: number;
    type: string;
    startTime: string;
    endTime: string;
    originalSession: StudySession;
    pauseIndex?: number;
}

export interface TimelineItem {
    start: Date;
    end: Date;
    type: 'work' | 'break' | 'pause-interval';
    duration: number;
    sessionId?: number;
    originalSession?: StudySession;
    segmentLabel?: string | null;
    pauseIndex?: number;
    label?: string;
}

interface UseSessionChartProps {
    group: {
        date: string;
        courseId: string | null;
    };
    workSessions: StudySession[];
    breakSessions: StudySession[];
    pauseSessions?: StudySession[]; // New: pause sessions as separate entities
    isMobile: boolean;
    onUpdate: (oldTimestamp: number, updatedSession: StudySession) => void;
}

export const useSessionChart = ({
    group,
    workSessions,
    breakSessions,
    pauseSessions = [],
    isMobile,
    onUpdate
}: UseSessionChartProps) => {
    const [confirmDelete, setConfirmDelete] = useState<{ sessionId: number } | null>(null);
    const [selectedItem, setSelectedItem] = useState<number | null>(null);
    const [editingSession, setEditingSession] = useState<EditingSessionState | null>(null);

    const handleSaveEdit = (newStartTimeStr: string, newEndTimeStr: string) => {
        if (!editingSession) return;

        const date = new Date(group.date);
        const [sH, sM] = newStartTimeStr.split(':').map(Number);
        const [eH, eM] = newEndTimeStr.split(':').map(Number);

        const newStart = new Date(date);
        newStart.setHours(sH, sM, 0, 0);

        const newEnd = new Date(date);
        newEnd.setHours(eH, eM, 0, 0);

        if (newEnd <= newStart) {
            alert("Bitiş saati başlangıç saatinden büyük olmalıdır.");
            return;
        }

        const { originalSession, type, pauseIndex } = editingSession;
        let updatedSession = { ...originalSession };

        if (type === 'work' || type === 'break') {
            updatedSession.timestamp = newStart.getTime();
            // Calculate total pause duration
            const pauses = updatedSession.pauses || [];
            const totalPauseMs = pauses.reduce((acc, p) => acc + (p.end - p.start), 0);

            // Recalculate duration
            updatedSession.duration = Math.max(0, (newEnd.getTime() - newStart.getTime() - totalPauseMs) / 1000);
        } else if (type === 'pause-interval' && pauseIndex !== undefined) {
            const newPauses = [...(updatedSession.pauses || [])];
            newPauses[pauseIndex] = { start: newStart.getTime(), end: newEnd.getTime() };
            updatedSession.pauses = newPauses;
        }

        onUpdate(originalSession.timestamp, updatedSession);
        setEditingSession(null);
        setSelectedItem(null);
    };

    const { timelineItems, startHour, endHour, dayStats, isToday } = useMemo(() => {
        const targetDate = new Date(group.date);
        const dayWork = workSessions.filter(s => isSameDay(s.timestamp, targetDate) && s.courseId === group.courseId);
        const dayBreaks = breakSessions.filter(s => isSameDay(s.timestamp, targetDate));
        const dayPauses = pauseSessions.filter(s => isSameDay(s.timestamp, targetDate) && s.courseId === group.courseId);

        let finalItems: TimelineItem[] = [];

        // Process work sessions
        dayWork.forEach(s => {
            // Check if session has nested pauses (legacy data)
            const hasNestedPauses = s.pauses && s.pauses.length > 0;

            if (hasNestedPauses) {
                // Legacy handling: split work session by nested pauses
                const pauses = [...(s.pauses || [])].sort((a, b) => a.start - b.start);
                const totalPauseMs = pauses.reduce((acc, p) => acc + (p.end - p.start), 0);
                const sessionEndMs = s.timestamp + (s.duration * 1000) + totalPauseMs;

                let currentStart = s.timestamp;
                let segmentIndex = 1;

                pauses.forEach((p, pIdx) => {
                    if (p.start > currentStart) {
                        finalItems.push({
                            start: new Date(currentStart),
                            end: new Date(p.start),
                            type: 'work',
                            duration: (p.start - currentStart) / 1000,
                            sessionId: s.timestamp,
                            originalSession: s,
                            segmentLabel: segmentIndex === 1 ? 'Başlangıç' : 'Devam'
                        });
                        segmentIndex++;
                    }
                    finalItems.push({
                        start: new Date(p.start),
                        end: new Date(p.end),
                        type: 'pause-interval',
                        duration: (p.end - p.start) / 1000,
                        sessionId: s.timestamp,
                        pauseIndex: pIdx,
                        originalSession: s
                    });
                    currentStart = p.end;
                });

                if (sessionEndMs > currentStart) {
                    finalItems.push({
                        start: new Date(currentStart),
                        end: new Date(sessionEndMs),
                        type: 'work',
                        duration: (sessionEndMs - currentStart) / 1000,
                        sessionId: s.timestamp,
                        originalSession: s,
                        segmentLabel: segmentIndex === 1 ? null : 'Devam'
                    });
                }
            } else {
                // New format: simple work session without nested pauses
                const start = new Date(s.timestamp);
                const end = new Date(s.timestamp + (s.duration * 1000));
                finalItems.push({
                    start,
                    end,
                    type: 'work',
                    duration: s.duration,
                    sessionId: s.timestamp,
                    originalSession: s
                });
            }
        });

        // Process pause sessions (new format - separate sessions)
        dayPauses.forEach(s => {
            const start = new Date(s.timestamp);
            const end = new Date(s.timestamp + (s.duration * 1000));
            finalItems.push({
                start,
                end,
                type: 'pause-interval',
                duration: s.duration,
                sessionId: s.timestamp,
                originalSession: s
            });
        });

        // Process break sessions
        dayBreaks.forEach(s => {
            const start = new Date(s.timestamp);
            const end = new Date(s.timestamp + (s.duration * 1000));
            finalItems.push({ start, end, type: 'break', duration: s.duration, sessionId: s.timestamp, originalSession: s });
        });

        finalItems.sort((a, b) => a.start.getTime() - b.start.getTime());

        // Fill gaps between sessions as pause intervals
        const gapItems: TimelineItem[] = [];
        for (let i = 0; i < finalItems.length - 1; i++) {
            const currentItem = finalItems[i];
            const nextItem = finalItems[i + 1];
            const gapMs = nextItem.start.getTime() - currentItem.end.getTime();
            if (gapMs >= 60000) {
                gapItems.push({
                    start: new Date(currentItem.end),
                    end: new Date(nextItem.start),
                    type: 'pause-interval',
                    duration: gapMs / 1000,
                    label: 'Boşluk (Duraklatıldı)'
                });
            }
        }

        if (gapItems.length > 0) {
            finalItems = [...finalItems, ...gapItems].sort((a, b) => a.start.getTime() - b.start.getTime());
        }

        let minTime: Date | null = null;
        let maxTime: Date | null = null;
        let workTime = 0;
        let breakTime = 0;
        let pauseTime = 0;

        finalItems.forEach(item => {
            if (!minTime || item.start < minTime) minTime = item.start;
            if (!maxTime || item.end > maxTime) maxTime = item.end;

            if (item.type === 'work') workTime += item.duration;
            else if (item.type === 'break') breakTime += item.duration;
            else if (item.type === 'pause-interval') pauseTime += item.duration;
        });

        const today = new Date();
        const viewedDate = new Date(group.date);
        const isTodayDate = isSameDay(today, viewedDate);

        let sHour = 9;
        let eHour = 18;

        if (minTime && maxTime) {
            sHour = (minTime as Date).getHours();
            eHour = (maxTime as Date).getHours() + 1;
            sHour = Math.max(0, isMobile ? sHour : sHour - 1);
            eHour = Math.min(24, eHour + 1);
        }

        return {
            timelineItems: finalItems,
            startHour: sHour,
            endHour: eHour,
            isToday: isTodayDate,
            dayStats: {
                work: Math.round(workTime / 60),
                break: Math.round(breakTime / 60),
                pause: Math.round(pauseTime / 60)
            }
        };
    }, [group, workSessions, breakSessions, isMobile]);

    return {
        timelineItems,
        startHour,
        endHour,
        dayStats,
        isToday,
        confirmDelete,
        setConfirmDelete,
        selectedItem,
        setSelectedItem,
        editingSession,
        setEditingSession,
        handleSaveEdit,
        formatTimeForInput
    };
};
