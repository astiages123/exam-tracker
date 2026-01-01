/**
 * useUserData Hook
 * 
 * Encapsulates all user data loading, saving, and state management
 * for progress, sessions, schedule, and video history.
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
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
                const { data, error } = await supabase
                    .from('user_progress')
                    .select('progress_data, sessions, schedule, activity_log, video_history')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setProgressData((data.progress_data as UserProgressData) || {});
                    setSessions((data.sessions as StudySession[]) || []);
                    setSchedule((data.schedule as WeeklySchedule) || {});
                    setVideoHistory((data.video_history as VideoHistoryItem[]) || []);
                } else if (error && error.code !== 'PGRST116') {
                    // PGRST116 is "no rows returned" - not an error for new users
                    console.error('Error loading data:', error);
                }
                setIsDataLoaded(true);
            }
        }
        loadData();
    }, [user]);

    // Debounced save to Supabase
    useEffect(() => {
        if (user && isDataLoaded && supabase) {
            const saveData = async () => {
                if (!supabase) return;

                try {
                    const { error } = await supabase
                        .from('user_progress')
                        .upsert({
                            user_id: user.id,
                            progress_data: progressData,
                            sessions: sessions,
                            schedule: schedule,
                            video_history: videoHistory,
                            updated_at: new Date()
                        });

                    if (error) {
                        console.error('Error saving data:', error.message);
                    }
                } catch (e) {
                    console.error('Unexpected error saving data:', e instanceof Error ? e.message : e);
                }
            };

            // Debounce save to avoid too many writes
            const timeoutId = setTimeout(saveData, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [user, progressData, sessions, schedule, videoHistory, isDataLoaded]);

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
