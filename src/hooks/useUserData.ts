/**
 * useUserData Hook
 * 
 * Encapsulates all user data loading, saving, and state management
 * for progress, sessions, schedule, and video history.
 * 
 * Uses legacy user_progress table with JSONB columns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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

// Activity log type
interface ActivityLog {
    [date: string]: number; // date (YYYY-MM-DD) -> video count
}

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
 * Uses legacy user_progress table with JSONB columns
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
    const [activityLog, setActivityLog] = useState<ActivityLog>({});
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

    // Track the last active course for session management
    const [lastActiveCourseId, setLastActiveCourseId] = useState<string | null>(null);

    // Track added sessions - use ref to detect new sessions reliably
    const prevSessionsCountRef = useRef<number>(0);

    // Debounce timer ref for saving
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load user data from user_progress table
    useEffect(() => {
        // Reset state immediately to prevent data leakage from previous user
        setIsDataLoaded(false);
        setProgressData({});
        setSessions([]);
        setSchedule({});
        setVideoHistory([]);
        setActivityLog({});
        prevSessionsCountRef.current = 0;

        async function loadData() {
            if (user && supabase) {
                try {
                    const { data, error } = await supabase
                        .from('user_progress')
                        .select('progress_data, sessions, schedule, activity_log, video_history')
                        .eq('user_id', user.id)
                        .single();

                    if (error) {
                        if (error.code === 'PGRST116') {
                            // No row found, create initial row
                            await supabase.from('user_progress').insert({
                                user_id: user.id,
                                progress_data: {},
                                sessions: [],
                                schedule: {},
                                activity_log: {},
                                video_history: []
                            });
                        } else {
                            console.error('Error loading user_progress:', error);
                        }
                    } else if (data) {
                        // Course ID Migration Mapping (Old -> New)
                        const idMigrationMap: Record<string, string> = {
                            'ekonomi_1': 'mikro-iktisat',
                            'ekonomi_2': 'makro-iktisat',
                            'ekonomi_3': 'para-banka-ve-kredi',
                            'ekonomi_4': 'uluslararasi-ticaret',
                            'ekonomi_5': 'turkiye-ekonomisi',
                            'hukuk_1': 'medeni-hukuk',
                            'hukuk_2': 'borclar-hukuku',
                            'hukuk_3': 'ticaret-hukuku',
                            'hukuk_4': 'bankacilik-hukuku',
                            'hukuk_5': 'icra-ve-iflas-hukuku',
                            'hukuk_6': 'ceza-hukuku',
                            'hukuk_7': 'is-hukuku',
                            'muhasebe_1': 'muhasebe',
                            'muhasebe_2': 'isletme-yonetimi',
                            'muhasebe_3': 'pazarlama-yonetimi',
                            'muhasebe_4': 'finansal-yonetim',
                            'muhasebe_5': 'maliye',
                            'yetenek_1': 'finans-matematigi',
                            'yetenek_2': 'matematik-sayisal-mantik',
                            'yetenek_3': 'istatistik',
                            'yetenek_4': 'banka-muhasebesi'
                        };

                        const migrateId = (oldId: string): string => idMigrationMap[oldId] || oldId;
                        const migrateIdNullable = (oldId: string | null): string | null => {
                            if (!oldId) return oldId;
                            return idMigrationMap[oldId] || oldId;
                        };

                        // Set progress data
                        if (data.progress_data) {
                            const rawProgress = data.progress_data as UserProgressData;
                            const migratedProgress: UserProgressData = {};
                            Object.entries(rawProgress).forEach(([id, progress]) => {
                                migratedProgress[migrateId(id)] = progress;
                            });
                            setProgressData(migratedProgress);
                        }

                        // Set sessions
                        if (data.sessions && Array.isArray(data.sessions)) {
                            const rawSessions = data.sessions as StudySession[];
                            const migratedSessions = rawSessions.map(s => ({
                                ...s,
                                courseId: migrateIdNullable(s.courseId)
                            }));
                            setSessions(migratedSessions);
                            prevSessionsCountRef.current = migratedSessions.length;
                        }

                        // Set schedule
                        if (data.schedule) {
                            setSchedule(data.schedule as WeeklySchedule);
                        }

                        // Set activity log
                        if (data.activity_log) {
                            setActivityLog(data.activity_log as ActivityLog);
                        }

                        // Set video history
                        if (data.video_history && Array.isArray(data.video_history)) {
                            const rawHistory = data.video_history as VideoHistoryItem[];
                            const migratedHistory = rawHistory.map(h => ({
                                ...h,
                                courseId: migrateId(h.courseId)
                            }));
                            setVideoHistory(migratedHistory);
                        }
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
                setIsDataLoaded(true);
            }
        }
        loadData();
    }, [user]);

    // Save all data to user_progress table (debounced)
    const saveData = useCallback(async () => {
        if (!user || !supabase || !isDataLoaded) return;

        try {
            const { error } = await supabase
                .from('user_progress')
                .update({
                    progress_data: progressData,
                    sessions: sessions,
                    schedule: schedule,
                    activity_log: activityLog,
                    video_history: videoHistory,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (error) {
                console.error('[useUserData] Error saving data:', error);
            }
        } catch (e) {
            console.error('[useUserData] Exception saving data:', e);
        }
    }, [user, isDataLoaded, progressData, sessions, schedule, activityLog, videoHistory]);

    // Trigger save whenever data changes (debounced)
    useEffect(() => {
        if (!isDataLoaded) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveData();
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [progressData, sessions, schedule, activityLog, videoHistory, isDataLoaded, saveData]);

    /**
     * Update progress for a specific course
     * Handles video history updates and triggers celebrations
     */
    const updateProgress = useCallback((courseId: string, newCompletedIds: number[], onCelebration?: (courseName: string) => void) => {
        if (!user) return;

        setLastActiveCourseId(courseId);

        // Calculate changes
        setProgressData(prev => {
            const oldCompletedIds = prev[courseId] || [];
            const addedIds = newCompletedIds.filter(id => !oldCompletedIds.includes(id));
            const removedIds = oldCompletedIds.filter(id => !newCompletedIds.includes(id));

            // Update video history for added videos
            if (addedIds.length > 0) {
                const now = new Date();
                const newHistoryItems: VideoHistoryItem[] = addedIds.map(vidId => ({
                    videoId: vidId,
                    courseId: courseId,
                    timestamp: now.toISOString()
                }));

                setVideoHistory(prevHistory => {
                    const existingIds = new Set(
                        prevHistory
                            .filter(h => h.courseId === courseId)
                            .map(h => h.videoId)
                    );
                    const toAdd = newHistoryItems.filter(item => !existingIds.has(item.videoId));
                    return [...prevHistory, ...toAdd];
                });

                // Update activity log
                const dateKey = now.toISOString().split('T')[0];
                setActivityLog(prevLog => ({
                    ...prevLog,
                    [dateKey]: (prevLog[dateKey] || 0) + addedIds.length
                }));
            }

            // Remove from video history for removed videos
            if (removedIds.length > 0) {
                setVideoHistory(prevHistory =>
                    prevHistory.filter(h => !(h.courseId === courseId && removedIds.includes(h.videoId)))
                );
            }

            // Celebration logic
            const course = courseData.flatMap(cat => cat.courses).find(c => c.id === courseId);
            if (course && newCompletedIds.length === course.totalVideos && oldCompletedIds.length < course.totalVideos) {
                if (onCelebration) onCelebration(course.name);
            }

            // Return new progress state
            const newState = { ...prev };
            if (newCompletedIds.length === 0) {
                delete newState[courseId];
            } else {
                newState[courseId] = newCompletedIds;
            }
            return newState;
        });
    }, [user]);

    /**
     * Add a new session (work, break, or pause)
     */
    const addSession = useCallback((session: StudySession) => {
        setSessions(prev => [...prev, session]);
    }, []);

    /**
     * Delete sessions by their timestamps
     */
    const deleteSessions = useCallback((timestampsToDelete: number[]) => {
        if (!user) return;
        setSessions(prev => prev.filter(s => !timestampsToDelete.includes(s.timestamp)));
    }, [user]);

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
        if (!user) return;
        setSessions(prev => prev.map(s => s.timestamp === oldTimestamp ? updatedSession : s));
    }, [user]);

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
