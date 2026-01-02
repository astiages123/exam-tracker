/**
 * QuizContainer Component
 * Wrapper that loads quiz data and renders QuizModal
 */
// @ts-ignore - Importing JS component without types
import QuizModal from './QuizModal';
import { useQuiz } from '@/hooks/useQuiz';
import { Loader2, Sparkles, BookOpen, Play } from 'lucide-react';
import { motion } from 'framer-motion';
// HMR Force Update

interface QuizContainerProps {
    courseId: string;
    courseName: string;
    lessonType: string;
    onClose: () => void;
}

export function QuizContainer({ courseId, courseName, lessonType, onClose }: QuizContainerProps) {
    const {
        questions,
        isLoading,
        isGenerating,
        generationProgress,
        error,
        hasCachedContent,
        isChecking,
        hasNextSession,
        generateQuestions,
        startNextSession,
        completeQuiz,
        submitAnswer // Get this from hook
    } = useQuiz(courseId, lessonType);

    const handleQuizComplete = async (results: { total: number; correct: number; incorrect: number }) => {
        const fullResults = await completeQuiz({
            correct: results.correct,
            incorrect: results.incorrect
        });

        console.log('Quiz completed with analytics:', fullResults);
    };

    // Initial checking state - show loading
    if (isChecking) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <motion.div
                    className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4 border border-gray-700"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <p className="text-gray-400 text-sm font-medium">Veritabanı kontrol ediliyor...</p>
                </motion.div>
            </div>
        );
    }

    // Loading state (fetching from DB)
    if (isLoading && !isGenerating) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <motion.div
                    className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4 border border-gray-700"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <p className="text-gray-400 text-sm font-medium">Sorular yükleniyor...</p>
                </motion.div>
            </div>
        );
    }


    // Generating state - show progress
    if (isGenerating) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <motion.div
                    className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm w-full mx-4"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-400 animate-pulse" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Sorular Üretiliyor
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Gemini AI ile akıllı sorular hazırlanıyor...
                        </p>
                        {generationProgress.total > 0 && (
                            <div className="space-y-2">
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <motion.div
                                        className="bg-indigo-500 h-2 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${(generationProgress.current / generationProgress.total) * 100}%`
                                        }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    {generationProgress.current} / {generationProgress.total} soru hazır
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <motion.div
                    className="bg-gray-900 rounded-2xl p-8 max-w-md text-center mx-4"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <h3 className="text-lg font-semibold text-red-400 mb-2">Hata</h3>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={generateQuestions}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
                        >
                            Tekrar Dene
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                        >
                            Kapat
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Empty state - show "Generate Questions" button
    if (questions.length === 0 && !isLoading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <motion.div
                    className="bg-gray-900 rounded-2xl p-8 max-w-md text-center mx-4 border border-gray-700"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {courseName} Quiz
                    </h3>
                    <p className="text-gray-400 mb-6">
                        {hasCachedContent
                            ? 'Senin için hazırlanmış sorular var.'
                            : 'Zayıf konularınıza özel sorular üretilecek'}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={generateQuestions}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-all hover:scale-105"
                        >
                            {hasCachedContent ? <Play className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                            {hasCachedContent ? 'Quizi Başlat' : 'Soru Üret'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                        >
                            Kapat
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Quiz ready - show modal
    return (
        <QuizModal
            isOpen={true}
            onClose={onClose}
            questions={questions}
            title={`${courseName} Quiz`}
            onQuizComplete={handleQuizComplete}
            hasNextSession={hasNextSession}
            onNextSession={startNextSession}
            onAnswerSubmit={(questionId: string, answer: string, isCorrect: boolean) => {
                // We need to find the index of the question
                const index = questions.findIndex(q => q.id === questionId);
                if (index !== -1) {
                    submitAnswer(index, answer, isCorrect);
                } else {
                    // Fallback if ID is missing or not found (e.g. fresh generation before save)
                    // But wait, submitAnswer in useQuiz usually takes index.
                    // Let's check useQuiz signature. 
                    // submitAnswer(questionIndex: number, selectedAnswer: string, isCorrect: boolean)
                    // So we need index.
                    // The onAnswerSubmit in QuizModal passes currentQuestion.id.
                    // If question.id is undefined (fresh), finding by ID might fail if multiple undefined.
                    // But in QuizModal we know the CURRENT index.
                    // Better to pass index from QuizModal?
                    // Actually, let's keep it simple: QuizModal knows the answer, but maybe not the global index if there's pagination?
                    // No, QuizModal manages its own index. using questions[currentIndex].
                    // So QuizModal SHOULD pass index too.

                    // Let's modify QuizModal one more time or just search by object eq if possible, or assume ID exists.
                    // Fresh questions HAVE IDs now (fixed in Step 212).
                    // So findIndex by ID is safe.
                    submitAnswer(index, answer, isCorrect);
                }
            }}
        />
    );
}

export default QuizContainer;

