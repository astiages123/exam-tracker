// Legacy pause interface - kept for backward compatibility during migration
export interface Pause {
    start: number;
    end: number;
}

// Session types
export type SessionType = 'work' | 'break' | 'pause';

// Renamed to StudySession to avoid conflict with Auth Session
export interface StudySession {
    timestamp: number;
    duration: number;
    type: SessionType;
    courseId: string | null;
    // Legacy field - pauses are now separate sessions, but kept for old data compatibility
    pauses?: Pause[];
}
