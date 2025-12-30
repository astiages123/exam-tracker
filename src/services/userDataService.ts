/**
 * User Data Service
 * 
 * Encapsulates all Supabase operations for user data.
 * Provides a clean API layer between the UI and database.
 */

import { supabase } from '@/lib/supabaseClient';
import type {
    UserProgressData,
    StudySession,
    WeeklySchedule,
    VideoHistoryItem
} from '@/types';

export interface UserData {
    progressData: UserProgressData;
    sessions: StudySession[];
    schedule: WeeklySchedule;
    videoHistory: VideoHistoryItem[];
}

export interface LoadUserDataResult {
    data: UserData | null;
    error: string | null;
}

export interface SaveUserDataResult {
    success: boolean;
    error: string | null;
}

/**
 * User Data Service
 * Handles all database operations for user progress data
 */
export const userDataService = {
    /**
     * Load user data from Supabase
     */
    async loadUserData(userId: string): Promise<LoadUserDataResult> {
        if (!supabase) {
            return { data: null, error: 'Supabase not initialized' };
        }

        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select('progress_data, sessions, schedule, video_history')
                .eq('user_id', userId)
                .single();

            if (error) {
                // PGRST116 is "no rows returned" - not an error for new users
                if (error.code === 'PGRST116') {
                    return {
                        data: {
                            progressData: {},
                            sessions: [],
                            schedule: {},
                            videoHistory: []
                        },
                        error: null
                    };
                }
                return { data: null, error: error.message };
            }

            return {
                data: {
                    progressData: (data.progress_data as UserProgressData) || {},
                    sessions: (data.sessions as StudySession[]) || [],
                    schedule: (data.schedule as WeeklySchedule) || {},
                    videoHistory: (data.video_history as VideoHistoryItem[]) || []
                },
                error: null
            };
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error loading data';
            return { data: null, error: message };
        }
    },

    /**
     * Save user data to Supabase
     */
    async saveUserData(userId: string, data: UserData): Promise<SaveUserDataResult> {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: userId,
                    progress_data: data.progressData,
                    sessions: data.sessions,
                    schedule: data.schedule,
                    video_history: data.videoHistory,
                    updated_at: new Date()
                });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error saving data';
            return { success: false, error: message };
        }
    },

    /**
     * Delete specific sessions by timestamps
     */
    async deleteSessions(
        userId: string,
        currentSessions: StudySession[],
        timestampsToDelete: number[]
    ): Promise<SaveUserDataResult> {
        const updatedSessions = currentSessions.filter(
            s => !timestampsToDelete.includes(s.timestamp)
        );

        // This requires a full save - we're just updating the sessions array
        // In a production app, you might want a more granular approach
        return this.saveUserData(userId, {
            progressData: {},
            sessions: updatedSessions,
            schedule: {},
            videoHistory: []
        });
    }
};

export default userDataService;
