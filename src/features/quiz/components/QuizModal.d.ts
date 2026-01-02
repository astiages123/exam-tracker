// Type declarations for quiz components
declare module '@/components/quiz/QuizModal' {
    import { FC } from 'react';

    interface QuizQuestion {
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
        chart_data?: {
            type: 'bar' | 'line' | 'pie';
            title?: string;
            data: Array<{ label: string; value: number }>;
        } | null;
    }

    interface QuizResults {
        total: number;
        correct: number;
        incorrect: number;
    }

    interface QuizModalProps {
        isOpen: boolean;
        onClose: () => void;
        questions: QuizQuestion[];
        onQuizComplete?: (results: QuizResults) => void;
        onAnswerSubmit?: (questionId: string | undefined, answer: string, isCorrect: boolean) => void;
        hasNextSession?: boolean;
        onNextSession?: () => void;
        title?: string;
    }

    const QuizModal: FC<QuizModalProps>;
    export default QuizModal;
    export { QuizModal, QuizQuestion, QuizResults, QuizModalProps };
}

declare module '@/components/quiz' {
    export * from '@/components/quiz/QuizModal';
}
