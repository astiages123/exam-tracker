/**
 * useQuiz Hook
 * 
 * Encapsulates all quiz logic including:
 * - Question fetching and smart selection
 * - Answer handling and scoring
 * - Session statistics tracking
 * - Auto-generation of new questions
 * - Database operations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { generateQuestions, fetchNoteContent, GeneratedQuestion } from '@/lib/ai';

export interface UserStatistic {
    id: string;
    user_id: string;
    course_id: string;
    topic: string;
    correct_count: number;
    wrong_count: number;
    success_rate: number;
    last_attempt: string;
}

export interface SessionTopicStats {
    correct: number;
    wrong: number;
}

interface UseQuizProps {
    isOpen: boolean;
    courseId: string;
    courseName: string;
    notePath?: string;
}

export interface QuizState {
    questions: GeneratedQuestion[];
    currentIndex: number;
    loading: boolean;
    error: string | null;
    score: number;
    showResult: boolean;
    isGenerating: boolean;
    isAutoGenerating: boolean;
    answers: Record<number, number>;
    isSubmitted: boolean;
    userStats: UserStatistic[];
    sessionStats: Record<string, SessionTopicStats>;
}

export interface QuizActions {
    handleOptionSelect: (optionIndex: number) => void;
    handleSubmitAnswer: () => void;
    handleNextQuestion: () => void;
    handleRetry: () => void;
    handleGenerateMock: () => Promise<void>;
    getDifficultyStars: (difficulty: string | number) => string;
}

export const useQuiz = ({ isOpen, courseId, courseName, notePath }: UseQuizProps): [QuizState, QuizActions] => {
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [userStats, setUserStats] = useState<UserStatistic[]>([]);
    const [sessionStats, setSessionStats] = useState<Record<string, SessionTopicStats>>({});

    const shuffleArray = useCallback(<T,>(array: T[]) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }, []);

    const fetchUserStats = useCallback(async () => {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase!
            .from('user_statistics')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', courseId);

        if (error) {
            console.error("Error fetching stats:", error);
            return [];
        }
        return (data || []) as UserStatistic[];
    }, [courseId]);

    const fetchSmartQuestions = useCallback(async (weakTopicsList: string[]) => {
        setError(null);
        try {
            let selectedQuestions: GeneratedQuestion[] = [];

            if (weakTopicsList.length > 0) {
                const { data: weakData, error: weakError } = await supabase!
                    .from('questions')
                    .select('*')
                    .eq('course_id', courseId)
                    .in('topic', weakTopicsList)
                    .limit(30);

                if (!weakError && weakData) {
                    const shuffledWeak = shuffleArray(weakData).slice(0, 6);
                    selectedQuestions = [...shuffledWeak];
                }
            }

            const { data: allData, error: allError } = await supabase!
                .from('questions')
                .select('*')
                .eq('course_id', courseId)
                .limit(50);

            if (allError) throw allError;

            if (!allData || allData.length === 0) {
                setError("Soru havuzu boş. 'Soru Üret' butonuna basarak yapay zekaya soru hazırlatabilirsiniz.");
                return;
            }

            const existingIds = new Set(selectedQuestions.map(q => q.id));
            const availableGeneral = allData.filter(q => !existingIds.has(q.id));
            const neededCount = 20 - selectedQuestions.length;

            const shuffledGeneral = shuffleArray(availableGeneral).slice(0, neededCount);
            selectedQuestions = [...selectedQuestions, ...shuffledGeneral];

            setQuestions(shuffleArray(selectedQuestions));

        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : String(err);
            setError("Sorular yüklenirken bir hata oluştu: " + message);
        }
    }, [courseId, shuffleArray]);

    const initializeQuiz = useCallback(async () => {
        setLoading(true);
        try {
            const stats = await fetchUserStats();
            const weak = stats
                .sort((a, b) => a.success_rate - b.success_rate)
                .slice(0, 3)
                .map(s => s.topic);

            setUserStats(stats);
            await fetchSmartQuestions(weak);
        } catch (err: unknown) {
            console.error("Quiz Initialization Error", err);
            const message = err instanceof Error ? err.message : String(err);
            setError("Quiz başlatılırken hata oluştu: " + message);
        } finally {
            setLoading(false);
        }
    }, [fetchUserStats, fetchSmartQuestions]);

    // Initialize on open
    useEffect(() => {
        if (isOpen && courseId) {
            initializeQuiz();
        } else {
            // Reset state when closed
            setQuestions([]);
            setCurrentIndex(0);
            setScore(0);
            setShowResult(false);
            setAnswers({});
            setIsSubmitted(false);
            setSessionStats({});
        }
    }, [isOpen, courseId, initializeQuiz]);

    const handleOptionSelect = useCallback((optionIndex: number) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
    }, [isSubmitted, currentIndex]);

    const handleSubmitAnswer = useCallback(() => {
        if (answers[currentIndex] === undefined) return;

        const currentQuestion = questions[currentIndex];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = currentQuestion as unknown as Record<string, any>;
        let correctIndex = q.correct_option_index as number | undefined;

        if (correctIndex === undefined && q.answer && Array.isArray(q.options)) {
            const ans = (q.answer as string).trim();
            if (ans.length === 1 && ans >= 'A' && ans <= 'E') {
                correctIndex = ans.charCodeAt(0) - 65;
            } else {
                correctIndex = (q.options as string[]).findIndex((o: string) => o === ans);
            }
        }

        if (correctIndex === undefined) correctIndex = 0;

        const isCorrect = answers[currentIndex] === correctIndex;
        const topic = currentQuestion.topic || "Genel";

        setSessionStats(prev => {
            const currentTopicStats = prev[topic] || { correct: 0, wrong: 0 };
            return {
                ...prev,
                [topic]: {
                    correct: currentTopicStats.correct + (isCorrect ? 1 : 0),
                    wrong: currentTopicStats.wrong + (isCorrect ? 0 : 1)
                }
            };
        });

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        setIsSubmitted(true);
    }, [answers, currentIndex, questions]);

    const saveResultsToDb = useCallback(async () => {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return;

        const updates = Object.entries(sessionStats).map(async ([topic, stats]) => {
            const { data: existingData } = await supabase!
                .from('user_statistics')
                .select('*')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .eq('topic', topic)
                .single();

            const currentCorrect = existingData ? existingData.correct_count : 0;
            const currentWrong = existingData ? existingData.wrong_count : 0;

            const newCorrect = currentCorrect + stats.correct;
            const newWrong = currentWrong + stats.wrong;

            return supabase!
                .from('user_statistics')
                .upsert({
                    user_id: user.id,
                    course_id: courseId,
                    topic: topic,
                    correct_count: newCorrect,
                    wrong_count: newWrong,
                    last_attempt: new Date().toISOString()
                }, { onConflict: 'user_id,course_id,topic' });
        });

        await Promise.all(updates);
    }, [courseId, sessionStats]);

    const triggerAutoGenerate = useCallback(async () => {
        if (isAutoGenerating || !notePath) return;
        setIsAutoGenerating(true);
        try {
            const rawText = await fetchNoteContent(notePath);
            if (!rawText || rawText.length < 100) return;

            const weak = userStats
                .sort((a, b) => a.success_rate - b.success_rate)
                .slice(0, 3)
                .map(s => s.topic);

            const newQuestions = await generateQuestions(courseId, courseName, rawText, questions.length, weak);

            if (newQuestions && newQuestions.length > 0) {
                setQuestions(prev => [...prev, ...newQuestions]);
            }
        } catch (err) {
            console.error("Auto generation background error:", err);
        } finally {
            setIsAutoGenerating(false);
        }
    }, [isAutoGenerating, notePath, userStats, courseId, courseName, questions.length]);

    const handleNextQuestion = useCallback(() => {
        const remaining = questions.length - (currentIndex + 1);
        if (remaining <= 5 && !isAutoGenerating) {
            triggerAutoGenerate();
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsSubmitted(false);
        } else {
            setShowResult(true);
            saveResultsToDb();
        }
    }, [questions.length, currentIndex, isAutoGenerating, triggerAutoGenerate, saveResultsToDb]);

    const handleRetry = useCallback(() => {
        setScore(0);
        setCurrentIndex(0);
        setShowResult(false);
        setAnswers({});
        setIsSubmitted(false);
        initializeQuiz();
    }, [initializeQuiz]);

    const handleGenerateMock = useCallback(async () => {
        setIsGenerating(true);
        setError(null);
        try {
            if (!notePath) {
                throw new Error("Not dosyası yolu bulunamadı.");
            }

            const rawText = await fetchNoteContent(notePath);
            if (!rawText || rawText.length < 100) {
                throw new Error("Ders notu içeriği okunamadı veya çok kısa.");
            }

            await generateQuestions(courseId, courseName, rawText, questions.length);
            initializeQuiz();

        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : String(err);
            setError("Üretim Hatası: " + message);
        } finally {
            setIsGenerating(false);
        }
    }, [notePath, courseId, courseName, questions.length, initializeQuiz]);

    const getDifficultyStars = useCallback((difficulty: string | number) => {
        if (typeof difficulty === 'number') return Array(difficulty).fill('⭐').join('');
        return difficulty;
    }, []);

    const state: QuizState = {
        questions,
        currentIndex,
        loading,
        error,
        score,
        showResult,
        isGenerating,
        isAutoGenerating,
        answers,
        isSubmitted,
        userStats,
        sessionStats
    };

    const actions: QuizActions = {
        handleOptionSelect,
        handleSubmitAnswer,
        handleNextQuestion,
        handleRetry,
        handleGenerateMock,
        getDifficultyStars
    };

    return [state, actions];
};
