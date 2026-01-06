/**
 * useUserData Hook
 * 
 * Encapsulates all user data loading, saving, and state management
 * for progress, sessions, schedule, and video history.
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';
import courseDataJson from '@/features/course/data/courses.json';
import type { CourseCategory } from '@/types';

const courseData = courseDataJson as unknown as CourseCategory[];
import type {
    UserProgressData,
    StudySession,
    WeeklySchedule,
    VideoHistoryItem
} from '@/types';

// Define the return type of the hook
interface UseUserDataReturn {
    progressData: UserProgressData;
    sessions: StudySession[];
    schedule: WeeklySchedule;
    videoHistory: VideoHistoryItem[];
    isDataLoaded: boolean;
    lastActiveCourseId: string | null;

    // Setters (exposed but primarily for internal use or specific overrides)
    setProgressData: React.Dispatch<React.SetStateAction<UserProgressData>>;
    setSessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
    setSchedule: React.Dispatch<React.SetStateAction<WeeklySchedule>>;
    setVideoHistory: React.Dispatch<React.SetStateAction<VideoHistoryItem[]>>;
    setLastActiveCourseId: React.Dispatch<React.SetStateAction<string | null>>;

    // Methods
    updateProgress: (courseId: string, newCompletedIds: number[], onCelebration?: (courseName: string) => void) => void;
    addSession: (session: StudySession) => void;
    deleteSessions: (timestampsToDelete: number[]) => void;
    updateSchedule: (newSchedule: WeeklySchedule) => void;
    updateSession: (oldTimestamp: number, updatedSession: StudySession) => void;
}

/**
 * Hook for managing user data persistence with Supabase
 * 
 * @param user - The authenticated user object (Supabase User)
 * @returns User data state and methods
 */
export const useUserData = (user: User | null): UseUserDataReturn => {
    // Core data state
    const [progressData, setProgressData] = useState<UserProgressData>({});
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [schedule, setSchedule] = useState<WeeklySchedule>({});
    const [videoHistory, setVideoHistory] = useState<VideoHistoryItem[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

    // Track the last active course for session management
    const [lastActiveCourseId, setLastActiveCourseId] = useState<string | null>(null);

    // Load user data from Supabase
    useEffect(() => {
        // Reset state immediately to prevent data leakage from previous user
        setIsDataLoaded(false);
        setProgressData({});
        setSessions([]);
        setSchedule({});
        setVideoHistory([]);

        async function loadData() {
            if (user && supabase) {
                try {
                    // Fetch all normalized data in parallel
                    const [
                        { data: progressRows },
                        { data: sessionRows },
                        { data: scheduleRows },
                        { data: videoHistoryRows }
                    ] = await Promise.all([
                        supabase.from('course_progress').select('course_id, completed_video_ids').eq('user_id', user.id),
                        supabase.from('study_sessions').select('*').eq('user_id', user.id).order('started_at', { ascending: true }),
                        supabase.from('user_schedule').select('day_of_week, time_slot, subject').eq('user_id', user.id),
                        supabase.from('video_history').select('course_id, video_id, watched_at').eq('user_id', user.id).order('watched_at', { ascending: true })
                    ]);

                    // Map course_progress to UserProgressData
                    if (progressRows) {
                        const pData: UserProgressData = {};
                        progressRows.forEach(row => {
                            pData[row.course_id] = row.completed_video_ids;
                        });
                        setProgressData(pData);
                    }

                    // Map study_sessions to StudySession[]
                    if (sessionRows) {
                        const sData: StudySession[] = sessionRows.map(row => ({
                            timestamp: new Date(row.started_at).getTime(),
                            duration: row.duration_ms,
                            type: row.session_type as any,
                            courseId: row.course_id,
                            pauses: row.pauses
                        }));
                        setSessions(sData);
                    }

                    // Map user_schedule to WeeklySchedule
                    if (scheduleRows) {
                        const schData: WeeklySchedule = {};
                        scheduleRows.forEach(row => {
                            const day = row.day_of_week;
                            if (!schData[day]) schData[day] = [];
                            schData[day].push({ time: row.time_slot, subject: row.subject });
                        });
                        setSchedule(schData);
                    }

                    // Map video_history to VideoHistoryItem[]
                    if (videoHistoryRows) {
                        const vhData: VideoHistoryItem[] = videoHistoryRows.map(row => ({
                            videoId: row.video_id,
                            courseId: row.course_id,
                            timestamp: row.watched_at
                        }));
                        setVideoHistory(vhData);
                    }

                } catch (error) {
                    console.error('Error loading normalized data:', error);
                }
                setIsDataLoaded(true);
            }
        }
        loadData();
    }, [user]);

    // Debounced save to Supabase (Individual table updates)
    // Note: In a fully optimized app, we would update tables immediately on action,
    // but to keep the current hook logic, we sync the state.
    useEffect(() => {
        if (user && isDataLoaded && supabase) {
            const saveData = async () => {
                if (!supabase) return;

                try {
                    // 1. Update Course Progress
                    for (const [courseId, videoIds] of Object.entries(progressData)) {
                        await supabase.rpc('update_course_progress', {
                            p_course_id: courseId,
                            p_completed_video_ids: videoIds
                        });
                    }

                    // 2. Update Schedule (simplified: delete and re-insert for the user)
                    // In a production app, you might want to be more surgical
                    if (Object.keys(schedule).length > 0) {
                        await supabase.from('user_schedule').delete().eq('user_id', user.id);
                        const scheduleInserts = Object.entries(schedule).flatMap(([day, items]) =>
                            items.map(item => ({
                                user_id: user.id,
                                day_of_week: day,
                                time_slot: item.time,
                                subject: item.subject
                            }))
                        );
                        if (scheduleInserts.length > 0) {
                            await supabase.from('user_schedule').insert(scheduleInserts);
                        }
                    }

                    // Note: Sessions and Video History are typically added via actions, 
                    // not debounced state sync, to avoid duplicates.
                    // The useEffect here handles progress and schedule sync.

                } catch (e) {
                    console.error('Unexpected error saving data:', e instanceof Error ? e.message : e);
                }
            };

            const timeoutId = setTimeout(saveData, 1000); // Longer debounce for batch updates
            return () => clearTimeout(timeoutId);
        }
    }, [user, progressData, schedule, isDataLoaded]);

    // Track added sessions separately to avoid bulk sync issues
    useEffect(() => {
        if (user && isDataLoaded && supabase && sessions.length > 0) {
            const lastSession = sessions[sessions.length - 1];
            // Simple check: if it's very recent, add it to DB
            const isRecent = (Date.now() - lastSession.timestamp) < 5000;
            if (isRecent) {
                supabase.rpc('add_study_session', {
                    p_course_id: lastSession.courseId,
                    p_session_type: lastSession.type,
                    p_duration_ms: lastSession.duration,
                    p_pauses: lastSession.pauses
                });
            }
        }
    }, [sessions.length]);

    /**
     * Update progress for a specific course
     * Handles video history updates and triggers celebrations
     */
    const updateProgress = useCallback((courseId: string, newCompletedIds: number[], onCelebration?: (courseName: string) => void) => {
        setLastActiveCourseId(courseId);

        // Get old state for comparison
        setProgressData(prev => {
            const oldCompletedIds = prev[courseId] || [];

            // Find newly added videos
            const addedIds = newCompletedIds.filter(id => !oldCompletedIds.includes(id));

            // Update video history for new completions
            if (addedIds.length > 0) {
                setVideoHistory(prevHistory => {
                    let updatedHistory = [...prevHistory];

                    addedIds.forEach(vidId => {
                        const alreadyExists = updatedHistory.some(
                            h => h.courseId === courseId && h.videoId === vidId
                        );
                        if (!alreadyExists) {
                            updatedHistory.push({
                                videoId: vidId,
                                courseId: courseId,
                                timestamp: new Date().toISOString()
                            });
                        }
                    });

                    return updatedHistory;
                });
            }

            // Trigger celebration for course completion
            const course = courseData.flatMap(cat => cat.courses).find(c => c.id === courseId);
            if (course && newCompletedIds.length === course.totalVideos) {
                const wasCompletedBefore = oldCompletedIds.length === course.totalVideos;
                if (!wasCompletedBefore && onCelebration) {
                    onCelebration(course.name);
                }
            }

            // Update progress data
            if (newCompletedIds.length === 0) {
                const newState = { ...prev };
                delete newState[courseId];
                return newState;
            }
            return {
                ...prev,
                [courseId]: newCompletedIds
            };
        });
    }, []);

    /**
     * Add a new session (work or break)
     */
    const addSession = useCallback((session: StudySession) => {
        setSessions(prev => [...prev, session]);
    }, []);

    /**
     * Delete sessions by their timestamps
     */
    const deleteSessions = useCallback((timestampsToDelete: number[]) => {
        setSessions(prev => prev.filter(s => !timestampsToDelete.includes(s.timestamp)));
    }, []);

    /**
     * Update the schedule
     */
    const updateSchedule = useCallback((newSchedule: WeeklySchedule) => {
        setSchedule(newSchedule);
    }, []);

    /**
     * Update an existing session
     */
    const updateSession = useCallback((oldTimestamp: number, updatedSession: StudySession) => {
        setSessions(prev => prev.map(s => s.timestamp === oldTimestamp ? updatedSession : s));
    }, []);

    return {
        // Data state
        progressData,
        sessions,
        schedule,
        videoHistory,
        isDataLoaded,
        lastActiveCourseId,

        // Setters for external control
        setProgressData,
        setSessions,
        setSchedule,
        setVideoHistory,
        setLastActiveCourseId,

        // Actions
        updateProgress,
        addSession,
        deleteSessions,
        updateSchedule,
        updateSession
    };
};
