import { FC } from 'react';

export interface QuizQuestion {
    id?: string;
    question: string;
    options: {
        A: string;
        B: string;
        C: string;
        D: string;
        E: string;
    };
    correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
    explanation: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    source_chunk_id?: string;
    verified?: boolean;
    verification_notes?: string;
    related_image?: string;
    chart_data?: {
        type: 'bar' | 'line' | 'pie';
        title?: string;
        data: Array<{ label: string; value: number }>;
    } | null;
}

export interface QuizResults {
    total: number;
    correct: number;
    incorrect: number;
}

export interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: QuizQuestion[];
    onQuizComplete?: (results: QuizResults) => void;
    onAnswerSubmit?: (questionId: string | undefined, answer: string, isCorrect: boolean) => void;
    hasNextSession?: boolean;
    onNextSession?: () => void;
    title?: string;
}

export const QuizModal: FC<QuizModalProps>;
export default QuizModal;

