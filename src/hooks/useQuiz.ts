/**
 * useQuiz Hook
 * Manages quiz state, data loading, and analytics integration
 * 
 * Quiz Generation Logic:
 * - Initial session: 10 questions
 * - When 5 questions answered (5 remaining): prefetch 10 more in background
 * - Each session has exactly 10 questions
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import { createQuizSession, completeQuizSession } from '@/features/analytics/services/analyticsService';

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

    isLoading: boolean;
    isGenerating: boolean;
    generationProgress: { current: number; total: number };
    error: string | null;
    sessionId: string | null;
    hasCachedContent: boolean;
    isChecking: boolean;
    hasNextSession: boolean;
    cachedQuestionCount: number;
}

interface QuestionTime {
    chunk_id: string | undefined;
    title: string;
    time_ms: number;
    is_correct: boolean;
    order: number;
}

const QUESTIONS_PER_SESSION = 10;

export function useQuiz(courseId: string | null, lessonType: string | null) {
    const [state, setState] = useState<QuizState>({
        questions: [],
        currentQuestionIndex: 0,

        isLoading: false,
        isGenerating: false,
        generationProgress: { current: 0, total: 0 },
        error: null,
        sessionId: null,
        hasCachedContent: false,
        isChecking: true,
        hasNextSession: false,
        cachedQuestionCount: 0
    });

    const questionTimesRef = useRef<QuestionTime[]>([]);
    const questionStartTimeRef = useRef<number>(Date.now());

    // Helper function to fetch questions from bank or generate new ones
    const fetchOrGenerateQuestions = useCallback(async (
        count: number,
        excludeIds: string[],
        showProgress: boolean = true
    ): Promise<QuizQuestion[]> => {
        if (!supabase) throw new Error('Supabase istemcisi başlatılamadı.');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

        const { getQuestionsFromBank } = await import('@/features/quiz/services/quizService');

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

                // Tek tek soru üret (AutoQuiz gibi - Rate limit dostu)
                const { generateQuestionFromChunk, saveQuestionToBank } = await import('@/features/quiz/services/quizService');

                for (let i = 0; i < chunksToProcess.length; i++) {
                    const chunk = chunksToProcess[i];

                    try {
                        // Proactive rate limit prevention: Handled by quizService internal RateLimiter
                        // No need for manual sleep here anymore.
                        console.log(`[Quiz Debug] Processing chunk ${i + 1}/${chunksToProcess.length}: ${chunk.title || chunk.chunk_id}`);

                        // Tekli soru üretimi (AutoQuiz gibi)
                        const question = await generateQuestionFromChunk(chunk.content_md, lessonType || 'Genel');

                        if (question) {
                            const savedId = await saveQuestionToBank(chunk.chunk_id, question);

                            finalQuestions.push({
                                ...question,
                                id: savedId || undefined,
                                source_chunk_id: chunk.chunk_id,
                                category: chunk.title || question.category
                            });

                            console.log(`[Quiz Debug] Question saved for chunk: ${chunk.title || chunk.chunk_id}`);
                        } else {
                            console.warn(`[Quiz Debug] No question generated for chunk: ${chunk.chunk_id}`);
                        }

                    } catch (genError) {
                        console.warn(`Tekli üretim başarısız (${chunk.chunk_id}):`, genError);
                    }

                    if (showProgress) {
                        setState(prev => ({
                            ...prev,
                            generationProgress: {
                                current: i + 1,
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
                .from('user_answered_questions')
                .select('question_id')
                .eq('user_id', user.id)
                .gt('next_review_at', new Date().toISOString());

            const excludeIds = answeredData?.map(a => a.question_id) || [];

            // Check if ANY questions exist in bank for this lesson (excluding answered)
            const { getQuestionsFromBank } = await import('@/features/quiz/services/quizService');
            const cached = await getQuestionsFromBank(lessonType || 'Genel', 100, excludeIds); // Get up to 100 to count

            const count = cached?.length || 0;

            setState(prev => ({
                ...prev,
                hasCachedContent: count > 0,
                cachedQuestionCount: count,
                isChecking: false
            }));
        } catch (err) {
            console.warn('Availability check failed:', err);
            setState(prev => ({ ...prev, isChecking: false }));
        }
    }, [courseId, lessonType]);

    // Run check on mount
    useEffect(() => {
        checkAvailability();
    }, [checkAvailability]);

    // Manual question generation - user triggers this (initial session)
    const generateQuestions = useCallback(async () => {
        if (!courseId) return;



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
                .from('user_answered_questions')
                .select('question_id')
                .eq('user_id', user.id)
                .gt('next_review_at', new Date().toISOString());

            const excludeIds = answeredData?.map(a => a.question_id) || [];

            // Fetch or generate 10 questions for the session
            const finalQuestions = await fetchOrGenerateQuestions(QUESTIONS_PER_SESSION, excludeIds, true);

            if (finalQuestions.length === 0) {
                // Check if we even got chunks
                if (!excludeIds || excludeIds.length === 0) {
                    throw new Error(`"${lessonType || 'Genel'}" dersi için içerik bulunamadı. Lütfen yönetim panelinden içeriklerin yüklendiğini kontrol edin.`);
                } else {
                    throw new Error('Yeni soru üretilemedi. Tüm mevcut içerikler tüketilmiş olabilir.');
                }
            }

            // Create analytics session
            const session = await createQuizSession(lessonType || 'Genel', finalQuestions.length);

            setState(prev => ({
                questions: finalQuestions,
                currentQuestionIndex: 0,

                isLoading: false,
                isGenerating: false,
                generationProgress: { current: 0, total: 0 },
                error: null,
                sessionId: session?.id || null,
                hasCachedContent: prev.hasCachedContent,
                isChecking: false,
                hasNextSession: prev.hasNextSession,
                cachedQuestionCount: prev.cachedQuestionCount
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

    // Start next session (manually triggered)
    const startNextSession = useCallback(async () => {
        await generateQuestions();
    }, [generateQuestions]);

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
        questionId: string | undefined,
        _selectedAnswer: string,
        isCorrect: boolean
    ) => {
        let questionIndex = state.questions.findIndex(q => q.id === questionId);
        if (questionIndex === -1) questionIndex = state.currentQuestionIndex;

        const question = state.questions[questionIndex];
        if (!question) return null;

        trackQuestionTime(questionIndex, isCorrect);

        // Update current question index
        setState(prev => ({
            ...prev,
            currentQuestionIndex: questionIndex + 1
        }));

        try {
            console.log('Submitting answer for question:', { id: question.id, index: questionIndex });

            if (question.id) {
                const { markQuestionAnswered } = await import('@/features/quiz/services/quizService');
                // We pass question.id (Bank ID) and lessonType
                const result = await markQuestionAnswered(
                    question.id,
                    isCorrect,
                    lessonType || 'Genel'
                );
                return result;
            }
        } catch (error) {
            console.error('Answer submit error:', error);
            return null;
        }
        return null;
    }, [state.questions, trackQuestionTime, lessonType]);

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
            hasNextSession: false
        };
    }, [state.sessionId]);

    // Get source chunk for reference
    const getSourceChunk = useCallback((_chunkId: string) => {
        // TODO: Load from output.json or API if needed
        return null;
    }, []);

    // Load ONLY existing questions from bank (no generation)
    const loadExistingQuestions = useCallback(async () => {
        if (!courseId) return;

        setState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            currentQuestionIndex: 0
        }));

        try {
            if (!supabase) throw new Error('Supabase istemcisi başlatılamadı.');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

            // Get IDs to exclude (answered and not due for review)
            const { data: answeredData } = await supabase
                .from('user_answered_questions')
                .select('question_id')
                .eq('user_id', user.id)
                .gt('next_review_at', new Date().toISOString());

            const excludeIds = answeredData?.map(a => a.question_id) || [];

            // Get ONLY existing questions from bank (no generation)
            const { getQuestionsFromBank } = await import('@/features/quiz/services/quizService');
            const bankQuestions = await getQuestionsFromBank(lessonType || 'Genel', QUESTIONS_PER_SESSION, excludeIds);

            if (!bankQuestions || bankQuestions.length === 0) {
                throw new Error('Mevcut soru bulunamadı. Önce soru üretin.');
            }

            const finalQuestions = bankQuestions.map(q => ({
                ...q.question_data,
                id: q.id,
                source_chunk_id: q.chunk_id
            }));

            // Create analytics session
            const session = await createQuizSession(lessonType || 'Genel', finalQuestions.length);

            setState(prev => ({
                questions: finalQuestions,
                currentQuestionIndex: 0,

                isLoading: false,
                isGenerating: false,
                generationProgress: { current: 0, total: 0 },
                error: null,
                sessionId: session?.id || null,
                hasCachedContent: prev.hasCachedContent,
                isChecking: false,
                hasNextSession: prev.hasNextSession,
                cachedQuestionCount: prev.cachedQuestionCount
            }));

            questionTimesRef.current = [];
            questionStartTimeRef.current = Date.now();

        } catch (error) {
            console.error('Quiz load failed:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Bir hata oluştu'
            }));
        }
    }, [courseId, lessonType]);

    return {
        ...state,
        generateQuestions,
        loadExistingQuestions,
        submitAnswer,
        completeQuiz,
        getSourceChunk,
        startNextSession,
        questionTimes: questionTimesRef.current
    };
}

export default useQuiz;
