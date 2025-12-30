export interface Video {
    id: number;
    title: string;
    duration: string;
    durationMinutes: number;
}

export interface Course {
    id: string;
    name: string;
    totalVideos: number;
    totalHours: number;
    notePath?: string;
    playlistUrl?: string;
    hasQuiz?: boolean;
    questionBankUrl?: string;
    videos: Video[];
}

export interface CourseCategory {
    category: string;
    courses: Course[];
}

export interface Rank {
    title: string;
    min: number;
    color: string;
    icon: string;
}

export interface Pause {
    start: number;
    end: number;
}

// Renamed to StudySession to avoid conflict with Auth Session
export interface StudySession {
    timestamp: number;
    duration: number;
    type: 'work' | 'break' | 'long_break'; // Assuming potential types
    courseId: string;
    pauses?: Pause[];
}

export interface UserProgressData {
    [courseId: string]: number[]; // Array of completed video IDs
}

export interface VideoHistoryItem {
    videoId: number;
    courseId: string;
    timestamp: string; // ISO Date string
}

export interface ScheduleItem {
    time: string;
    subject: string;
}

export interface WeeklySchedule {
    [day: string]: ScheduleItem[];
}

export interface ActivityLogItem {
    date: string; // YYYY-MM-DD
    count: number; // completed videos + sessions?
    intensity: number; // 0-4
}

// Supabase User type is imported from @supabase/supabase-js usually, 
// but we can define a wrapper if needed.
// For now, we rely on Supabase types in files.
