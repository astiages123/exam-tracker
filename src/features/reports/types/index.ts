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
