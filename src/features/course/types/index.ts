export interface Video {
    id: number;
    title: string;
    duration: string;
    durationMinutes: number;
}

export interface Course {
    id: string;
    name: string;
    lessonType?: string; // For quiz system - maps to lessons.name in database
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

export interface UserProgressData {
    [courseId: string]: number[]; // Array of completed video IDs
}

export interface VideoHistoryItem {
    videoId: number;
    courseId: string;
    timestamp: string; // ISO Date string
}
