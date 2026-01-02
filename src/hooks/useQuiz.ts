/**
 * useQuiz Hook
 * Manages quiz state, data loading, and analytics integration
 * 
 * Quiz Generation Logic:
 * - Initial session: 10 questions
 * - When 5 questions answered (5 remaining): prefetch 10 more in background
 * - Each session has exactly 10 questions
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createQuizSession, completeQuizSession } from '../services/analyticsService';

interface QuizQuestion {
    id?: string; // Question Bank ID
    question: string;
    options: { A: string; B: string; C: string; D: string; E: string };
    correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
    explanation: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    source_chunk_id?: string;
    verified?: boolean;
    verification_notes?: string;
    chart_data?: { type: 'bar' | 'line' | 'pie'; title?: string; data: { label: string; value: number }[] } | null;
}

interface QuizState {
    questions: QuizQuestion[];
    currentQuestionIndex: number;
    prefetchedQuestions: QuizQuestion[];
    isPrefetching: boolean;
    isLoading: boolean;
    isGenerating: boolean;
    generationProgress: { current: number; total: number };
    error: string | null;
    sessionId: string | null;
    hasCachedContent: boolean;
    isChecking: boolean;
    hasNextSession: boolean;
}

interface QuestionTime {
    chunk_id: string | undefined;
    title: string;
    time_ms: number;
    is_correct: boolean;
    order: number;
}

const QUESTIONS_PER_SESSION = 10;
const PREFETCH_TRIGGER_INDEX = 4; // Trigger prefetch when user answers 5th question (index 4)

export function useQuiz(courseId: string | null, lessonType: string | null) {
    const [state, setState] = useState<QuizState>({
        questions: [],
        currentQuestionIndex: 0,
        prefetchedQuestions: [],
        isPrefetching: false,
        isLoading: false,
        isGenerating: false,
        generationProgress: { current: 0, total: 0 },
        error: null,
        sessionId: null,
        hasCachedContent: false,
        isChecking: true,
        hasNextSession: false
    });

    const questionTimesRef = useRef<QuestionTime[]>([]);
    const questionStartTimeRef = useRef<number>(Date.now());
    const prefetchTriggeredRef = useRef<boolean>(false);

    // Helper function to fetch questions from bank or generate new ones
    const fetchOrGenerateQuestions = useCallback(async (
        count: number,
        excludeIds: string[],
        showProgress: boolean = true
    ): Promise<QuizQuestion[]> => {
        if (!supabase) throw new Error('Supabase istemcisi başlatılamadı.');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

        const { getQuestionsFromBank } = await import('../services/quizService');

        // Try to get existing questions from bank
        let finalQuestions: QuizQuestion[] = [];
        const bankQuestions = await getQuestionsFromBank(lessonType || 'Genel', count, excludeIds);

        console.log(`[Quiz Debug] Bank returned ${bankQuestions.length} questions for ${lessonType}`);

        if (bankQuestions.length > 0) {
            finalQuestions = bankQuestions.map(q => ({
                ...q.question_data,
                id: q.id,
                source_chunk_id: q.chunk_id
            }));
        }

        // If bank doesn't have enough questions, generate new ones
        if (finalQuestions.length < count) {
            const neededCount = count - finalQuestions.length;
            console.log(`[Quiz Debug] Need ${neededCount} more questions, calling initialize_quiz...`);

            if (showProgress) {
                setState(prev => ({ ...prev, isGenerating: true }));
            }

            const { data: chunks, error } = await supabase.rpc('initialize_quiz', {
                p_user_id: user.id,
                p_lesson_type: lessonType || 'Genel',
                p_total_questions: neededCount
            });

            if (error) throw error;

            console.log(`[Quiz Debug] initialize_quiz returned ${chunks?.length || 0} chunks for ${lessonType}`);

            if (chunks && chunks.length > 0) {
                // Eğer yeterli chunk yoksa, mevcut chunk'ları tekrar kullanarak 10'a tamamla
                const targetCount = neededCount;
                const availableChunks = chunks.length;

                // Chunk'ları döngüsel olarak kullan (örn: 8 chunk varsa, 0,1,2,3,4,5,6,7,0,1... şeklinde)
                const chunksToProcess: typeof chunks = [];
                for (let i = 0; i < targetCount; i++) {
                    chunksToProcess.push(chunks[i % availableChunks]);
                }

                console.log(`[Quiz Debug] Will generate ${chunksToProcess.length} questions from ${availableChunks} unique chunks`);

                if (showProgress) {
                    setState(prev => ({
                        ...prev,
                        generationProgress: { current: 0, total: chunksToProcess.length }
                    }));
                }

                // Chunk'ları 3'erli gruplar halinde işle (Batch Processing)
                const BATCH_SIZE = 3;
                for (let i = 0; i < chunksToProcess.length; i += BATCH_SIZE) {
                    const batchChunks = chunksToProcess.slice(i, i + BATCH_SIZE);

                    try {
                        // Gruplar arası kısa bekleme (Rate limit koruması)
                        if (i > 0) await new Promise(resolve => setTimeout(resolve, 3000));

                        const { generateBatchQuestions, saveQuestionToBank } = await import('../services/quizService');

                        // Batch için veri hazırla
                        const batchInput = batchChunks.map((c: any) => ({
                            id: c.chunk_id,
                            content: c.content_md
                        }));

                        console.log(`[Quiz Debug] Processing batch ${i / BATCH_SIZE + 1}, size: ${batchInput.length}`);

                        // Toplu üretim isteği
                        const batchResults = await generateBatchQuestions(batchInput, lessonType || 'Genel');

                        // Sonuçları işle ve kaydet
                        for (const result of batchResults) {
                            if (result.question) {
                                // Uygun chunk'ı bul (başlık vs için)
                                const originalChunk = batchChunks.find((c: any) => c.chunk_id === result.id);

                                const savedId = await saveQuestionToBank(result.id, result.question);

                                finalQuestions.push({
                                    ...result.question,
                                    id: savedId || undefined,
                                    source_chunk_id: result.id,
                                    category: originalChunk?.title || result.question.category
                                });
                            }
                        }

                    } catch (genError) {
                        console.warn(`Batch üretimi başarısız:`, genError);
                    }

                    if (showProgress) {
                        setState(prev => ({
                            ...prev,
                            generationProgress: {
                                current: Math.min(i + BATCH_SIZE, chunksToProcess.length),
                                total: chunksToProcess.length
                            }
                        }));
                    }
                }
            }

            // Filter out duplicates
            finalQuestions = finalQuestions.filter(q => !q.id || !excludeIds.includes(q.id));
        }

        return finalQuestions;
    }, [lessonType]);

    // Check for cached content on mount
    const checkAvailability = useCallback(async () => {
        if (!courseId || !supabase) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get IDs to exclude (answered and not due for review)
            const { data: answeredData } = await supabase
                .from('user_responses')
                .select('question_id')
                .eq('user_id', user.id)
                .gt('next_review_at', new Date().toISOString());

            const excludeIds = answeredData?.map(a => a.question_id) || [];

            // Check if ANY questions exist in bank for this lesson (excluding answered)
            const { getQuestionsFromBank } = await import('../services/quizService');
            const cached = await getQuestionsFromBank(lessonType || 'Genel', 10, excludeIds);

            if (cached && cached.length > 0) {
                setState(prev => ({ ...prev, hasCachedContent: true, isChecking: false }));
            } else {
                setState(prev => ({ ...prev, hasCachedContent: false, isChecking: false }));
            }
        } catch (err) {
            console.warn('Availability check failed:', err);
            setState(prev => ({ ...prev, isChecking: false }));
        }
    }, [courseId, lessonType]);

    // Run check on mount
    useState(() => {
        checkAvailability();
    });

    // Background prefetch - runs silently when 5 questions remain
    const prefetchQuestions = useCallback(async () => {
        if (state.isPrefetching || state.prefetchedQuestions.length > 0) return;
        if (!courseId || !supabase) return;

        console.log('[Quiz] Starting background prefetch of next session...');
        setState(prev => ({ ...prev, isPrefetching: true }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get all current + prefetched question IDs to exclude
            const currentIds = state.questions.map(q => q.id).filter(Boolean) as string[];

            const { data: answeredData } = await supabase
                .from('user_responses')
                .select('question_id')
                .eq('user_id', user.id)
                .gt('next_review_at', new Date().toISOString());

            const answeredIds = answeredData?.map(a => a.question_id) || [];
            const excludeIds = [...currentIds, ...answeredIds];

            // Fetch questions silently (no progress UI)
            const prefetched = await fetchOrGenerateQuestions(QUESTIONS_PER_SESSION, excludeIds, false);

            if (prefetched.length > 0) {
                console.log(`[Quiz] Prefetched ${prefetched.length} questions for next session`);
                setState(prev => ({
                    ...prev,
                    prefetchedQuestions: prefetched,
                    isPrefetching: false,
                    hasNextSession: true
                }));
            } else {
                setState(prev => ({ ...prev, isPrefetching: false }));
            }
        } catch (error) {
            console.warn('[Quiz] Prefetch failed:', error);
            setState(prev => ({ ...prev, isPrefetching: false }));
        }
    }, [courseId, state.isPrefetching, state.prefetchedQuestions.length, state.questions, fetchOrGenerateQuestions]);

    // Manual question generation - user triggers this (initial session)
    const generateQuestions = useCallback(async () => {
        if (!courseId) return;

        // Reset prefetch tracking for new session
        prefetchTriggeredRef.current = false;

        setState(prev => ({
            ...prev,
            isLoading: true,
            isGenerating: false,
            error: null,
            currentQuestionIndex: 0
        }));

        try {
            if (!supabase) throw new Error('Supabase istemcisi başlatılamadı.');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

            // Get IDs to exclude (answered and not due for review)
            const { data: answeredData } = await supabase
                .from('user_responses')
                .select('question_id')
                .eq('user_id', user.id)
                .gt('next_review_at', new Date().toISOString());

            const excludeIds = answeredData?.map(a => a.question_id) || [];

            // Fetch or generate 10 questions for the session
            const finalQuestions = await fetchOrGenerateQuestions(QUESTIONS_PER_SESSION, excludeIds, true);

            if (finalQuestions.length === 0) {
                throw new Error('Soru bulunamadı veya üretilemedi.');
            }

            // Create analytics session
            const session = await createQuizSession(lessonType || 'Genel', finalQuestions.length);

            setState(prev => ({
                questions: finalQuestions,
                currentQuestionIndex: 0,
                prefetchedQuestions: prev.prefetchedQuestions,
                isPrefetching: prev.isPrefetching,
                isLoading: false,
                isGenerating: false,
                generationProgress: { current: 0, total: 0 },
                error: null,
                sessionId: session?.id || null,
                hasCachedContent: prev.hasCachedContent,
                isChecking: false,
                hasNextSession: prev.hasNextSession
            }));

            questionTimesRef.current = [];
            questionStartTimeRef.current = Date.now();

        } catch (error) {
            console.error('Quiz initialization failed:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                isGenerating: false,
                error: error instanceof Error ? error.message : 'Bir hata oluştu'
            }));
        }
    }, [courseId, lessonType, fetchOrGenerateQuestions]);

    // Start next session with prefetched questions
    const startNextSession = useCallback(async () => {
        if (state.prefetchedQuestions.length === 0) {
            // No prefetched questions, generate new ones
            await generateQuestions();
            return;
        }

        // Reset prefetch tracking for new session
        prefetchTriggeredRef.current = false;

        // Create analytics session for new questions
        const session = await createQuizSession(lessonType || 'Genel', state.prefetchedQuestions.length);

        setState(prev => ({
            ...prev,
            questions: prev.prefetchedQuestions,
            prefetchedQuestions: [],
            currentQuestionIndex: 0,
            sessionId: session?.id || null,
            hasNextSession: false
        }));

        questionTimesRef.current = [];
        questionStartTimeRef.current = Date.now();

        console.log('[Quiz] Started next session with prefetched questions');
    }, [state.prefetchedQuestions, lessonType, generateQuestions]);

    // Track question time
    const trackQuestionTime = useCallback((questionIndex: number, isCorrect: boolean) => {
        const now = Date.now();
        const timeSpent = now - questionStartTimeRef.current;
        const question = state.questions[questionIndex];

        if (question) {
            questionTimesRef.current.push({
                chunk_id: question.source_chunk_id,
                title: question.question.substring(0, 50),
                time_ms: timeSpent,
                is_correct: isCorrect,
                order: questionIndex + 1
            });
        }

        questionStartTimeRef.current = now;
    }, [state.questions]);

    // Handle answer submission
    const submitAnswer = useCallback(async (
        questionIndex: number,
        selectedAnswer: string,
        isCorrect: boolean
    ) => {
        const question = state.questions[questionIndex];
        if (!question) return;

        trackQuestionTime(questionIndex, isCorrect);

        // Update current question index
        setState(prev => ({
            ...prev,
            currentQuestionIndex: questionIndex + 1
        }));

        // Trigger prefetch when reaching the 5th answered question (index 4)
        // This means 5 questions answered, 5 remaining
        if (questionIndex === PREFETCH_TRIGGER_INDEX && !prefetchTriggeredRef.current) {
            prefetchTriggeredRef.current = true;
            console.log('[Quiz] Triggering background prefetch (5 questions answered, 5 remaining)');
            prefetchQuestions();
        }

        try {
            console.log('Submitting answer for question:', { id: question.id, index: questionIndex });

            // Unified progress update: handles SRS, mastery, and error history in one call
            if (question.id) {
                const { markQuestionAnswered } = await import('../services/quizService');
                const timeSpent = questionTimesRef.current[questionIndex]?.time_ms || 0;

                await markQuestionAnswered(
                    question.id,
                    isCorrect,
                    selectedAnswer,
                    question.explanation || (isCorrect ? undefined : 'Konuyu tekrar gözden geçirmenizde fayda var.'),
                    timeSpent
                );
            }
        } catch (error) {
            console.error('Answer submit error:', error);
        }
    }, [state.questions, trackQuestionTime, prefetchQuestions]);

    // Complete quiz
    const completeQuiz = useCallback(async (results: { correct: number; incorrect: number }) => {
        const totalTimeMs = questionTimesRef.current.reduce((sum, q) => sum + q.time_ms, 0);

        try {
            if (state.sessionId) {
                await completeQuizSession(state.sessionId, {
                    correct: results.correct,
                    incorrect: results.incorrect,
                    totalTimeMs,
                    questionTimes: questionTimesRef.current
                });
            }
        } catch (error) {
            console.error('Complete quiz error:', error);
        }

        return {
            ...results,
            totalTimeMs,
            avgTimeMs: Math.round(totalTimeMs / (results.correct + results.incorrect)),
            questionTimes: questionTimesRef.current,
            hasNextSession: state.prefetchedQuestions.length > 0
        };
    }, [state.sessionId, state.prefetchedQuestions.length]);

    // Get source chunk for reference
    const getSourceChunk = useCallback((_chunkId: string) => {
        // TODO: Load from output.json or API if needed
        return null;
    }, []);

    return {
        ...state,
        generateQuestions,
        submitAnswer,
        completeQuiz,
        getSourceChunk,
        startNextSession,
        questionTimes: questionTimesRef.current
    };
}

export default useQuiz;
