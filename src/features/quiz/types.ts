export interface ChartData {
    type: 'bar' | 'line' | 'pie';
    title?: string;
    data: {
        label: string;
        value: number;
    }[];
    _verified?: boolean;
    _match_check?: string;
}

export interface Question {
    id?: string;
    question: string;
    options: {
        A: string;
        B: string;
        C: string;
        D: string;
        E: string;
        [key: string]: string;
    };
    correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
    explanation: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    source_chunk_id?: string;
    verified?: boolean;
    verification_notes?: string;
    chart_data?: ChartData | null;
    related_image?: string;
}

export interface QuizResult {
    total: number;
    correct: number;
    incorrect: number;
}

export interface SrsResult {
    nextReviewDate: Date | string;
    interval: number;
    repetitionCount: number;
    easeFactor?: number;
    difficulty?: string;
    success?: boolean;
    nextSessionDate?: string;
}
