/**
 * QuizModal Component
 * Main quiz modal with all features integrated
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { X, ChevronRight, RotateCcw, Trophy, Maximize2, Minimize2 } from 'lucide-react';

import { QuizOption } from './QuizOption';
import { QuizChart } from './QuizChart';
import { QuizExplanation } from './QuizExplanation';
import { QuizProgressBar } from './QuizProgressBar';
import { LatexRenderer } from './LatexRenderer';
import { validateQuizResponse } from './schemas/questionSchema';

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.3, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: { duration: 0.2 }
    }
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

export function QuizModal({
    isOpen,
    onClose,
    questions = [],
    onQuizComplete,
    onAnswerSubmit,
    hasNextSession = false,
    onNextSession,
    title = 'Quiz'
}) {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [isQuizComplete, setIsQuizComplete] = useState(false);

    // New state for SRS Feedback
    const [srsResult, setSrsResult] = useState(null);

    // Validate questions on mount
    const validationError = React.useMemo(() => {
        if (questions.length > 0) {
            const validation = validateQuizResponse(questions);
            return validation.success ? null : validation.errors;
        }
        return null;
    }, [questions]);

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedAnswer === currentQuestion?.correct_answer;

    // Detect if this is a Scenario Question
    const isScenario = React.useMemo(() => {
        return currentQuestion?.question?.length > 300 || currentQuestion?.question?.includes('Senaryo') || currentQuestion?.question?.includes('Vaka');
    }, [currentQuestion]);

    // Handle answer selection
    const handleSelectAnswer = useCallback(async (answer) => {
        if (showResult) return;

        setSelectedAnswer(answer);
        setShowResult(true);

        const correct = answer === currentQuestion.correct_answer;

        if (correct) {
            setCorrectCount(prev => prev + 1);
        } else {
            setIncorrectCount(prev => prev + 1);
        }

        // Send answer and get SRS result
        if (onAnswerSubmit) {
            try {
                const result = await onAnswerSubmit(currentQuestion.id, answer, correct);
                setSrsResult(result);
            } catch (err) {
                console.error("Failed to submit answer:", err);
            }
        }

    }, [showResult, currentQuestion, onAnswerSubmit]);

    // Handle next question
    const handleNext = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowResult(false);
            setSrsResult(null); // Reset SRS result
        } else {
            setIsQuizComplete(true);
            onQuizComplete?.({
                total: questions.length,
                correct: correctCount + (isCorrect ? 1 : 0),
                incorrect: incorrectCount + (isCorrect ? 0 : 1)
            });
        }
    }, [currentIndex, questions.length, correctCount, incorrectCount, isCorrect, onQuizComplete]);

    // Reset quiz
    const handleReset = useCallback(() => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setSrsResult(null);
        setCorrectCount(0);
        setIncorrectCount(0);
        setIsQuizComplete(false);
    }, []);

    // Handle close
    const handleClose = useCallback(() => {
        handleReset();
        setIsFullScreen(false);
        onClose?.();
    }, [handleReset, onClose]);

    const toggleFullScreen = useCallback((e) => {
        e.stopPropagation();
        setIsFullScreen(prev => !prev);
    }, []);

    if (!isOpen) return null;

    // Validation error state
    if (validationError) {
        return (
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    <motion.div
                        className="relative w-full max-w-md bg-gray-900 rounded-2xl p-6 border border-red-500/30"
                        variants={modalVariants}
                    >
                        <div className="text-center">
                            <X className="mx-auto text-red-500 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-red-400 mb-2">
                                Veri Doğrulama Hatası
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Soru verileri geçersiz format içeriyor.
                            </p>
                            <div className="bg-gray-800 rounded-lg p-3 text-left text-xs text-gray-500 max-h-32 overflow-auto">
                                {validationError.map((err, i) => (
                                    <div key={i}>{err.path}: {err.message}</div>
                                ))}
                            </div>
                            <button
                                onClick={handleClose}
                                className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // Quiz complete state
    if (isQuizComplete) {
        const accuracy = ((correctCount / questions.length) * 100).toFixed(0);

        return (
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    <motion.div
                        className="relative w-full max-w-md bg-gray-900 rounded-2xl p-8 border border-gray-700"
                        variants={modalVariants}
                    >
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                                transition={{
                                    scale: { type: 'spring', delay: 0.2 },
                                    rotate: { type: 'tween', duration: 0.5, delay: 0.2 }
                                }}
                            >
                                <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
                            </motion.div>

                            <h3 className="text-2xl font-bold text-white mb-2">
                                Quiz Tamamlandı!
                            </h3>

                            <div className="flex justify-center gap-8 my-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-400">{correctCount}</div>
                                    <div className="text-xs text-gray-500">Doğru</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-red-400">{incorrectCount}</div>
                                    <div className="text-xs text-gray-500">Yanlış</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-indigo-400">{accuracy}%</div>
                                    <div className="text-xs text-gray-500">Başarı</div>
                                </div>
                            </div>

                            {hasNextSession ? (
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => {
                                            handleReset();
                                            onNextSession?.();
                                        }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                        Sonraki Oturuma Geç
                                    </button>
                                    <button
                                        onClick={handleClose}
                                        className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-amber-400/80 text-sm bg-amber-400/10 px-4 py-2 rounded-lg border border-amber-400/20">
                                        Sonraki oturum için sorular hazırlanamadı. Lütfen daha sonra tekrar deneyin.
                                    </p>
                                    <button
                                        onClick={handleClose}
                                        className="w-full px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={handleClose}
            >
                <motion.div
                    className={`relative w-full flex flex-col bg-gray-900 border border-gray-700 transition-all duration-300 ease-in-out ${isFullScreen
                        ? 'fixed inset-0 h-screen rounded-none z-60'
                        : 'max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden'
                        }`}
                    variants={modalVariants}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-semibold text-white">{title}</h2>
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-400 rounded-full">
                                {currentIndex + 1} / {questions.length}
                            </span>
                            {isScenario && (
                                <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 flex items-center gap-1">
                                    <span className="text-[10px]">🎭</span> Senaryo Sorusu
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleFullScreen}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                                title={isFullScreen ? "Küçült" : "Tam Ekran"}
                            >
                                {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                            </button>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                                title="Kapat"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 ${isFullScreen ? 'max-w-5xl mx-auto w-full' : ''}`}>
                        {/* Progress Bar */}
                        <QuizProgressBar
                            currentQuestion={currentIndex + 1}
                            totalQuestions={questions.length}
                            correctCount={correctCount}
                            incorrectCount={incorrectCount}
                        />

                        {/* Question */}
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="mb-6"
                        >
                            <LatexRenderer
                                content={currentQuestion?.question}
                                className="text-lg text-white leading-relaxed"
                            />
                        </motion.div>

                        {/* Related Image (New Feature) */}
                        {currentQuestion?.related_image && (
                            <div className="mb-6 flex justify-center">
                                <div className="relative rounded-xl overflow-hidden border border-gray-700 max-w-full md:max-w-xl group">
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur text-xs text-white rounded-md z-10">
                                        İlgili Görsel
                                    </div>
                                    <img
                                        src={currentQuestion.related_image.startsWith('http')
                                            ? currentQuestion.related_image
                                            : `/content/${currentQuestion.related_image}`}
                                        alt="Soru Görseli"
                                        className="w-full h-auto object-contain max-h-[400px] bg-black/50"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            console.warn('Görsel yüklenemedi:', currentQuestion.related_image);
                                        }}
                                    />
                                    {/* Zoom overlay hint could go here */}
                                </div>
                            </div>
                        )}

                        {/* Chart (if available) */}
                        {currentQuestion?.chart_data && (
                            <div className="mb-6">
                                <p className="text-sm text-indigo-400 font-medium mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                                    Aşağıdaki grafiğe göre soruyu cevaplayınız:
                                </p>
                                <QuizChart
                                    chartData={currentQuestion.chart_data}
                                />
                            </div>
                        )}

                        {/* Options */}
                        <div className="space-y-3 mb-4">
                            {currentQuestion?.options && Object.entries(currentQuestion.options).map(([key, value]) => (
                                <QuizOption
                                    key={key}
                                    optionKey={key}
                                    optionText={value}
                                    isSelected={selectedAnswer === key}
                                    isCorrect={key === currentQuestion.correct_answer}
                                    isRevealed={showResult}
                                    showResult={showResult}
                                    onSelect={handleSelectAnswer}
                                    disabled={showResult}
                                />
                            ))}
                        </div>

                        {/* Explanation */}
                        <QuizExplanation
                            explanation={currentQuestion?.explanation}
                            isCorrect={isCorrect}
                            isVisible={showResult}
                            verificationNotes={currentQuestion?.verification_notes}
                            srsResult={srsResult} // Pass SRS Result
                        />
                    </div>

                    {/* Footer */}
                    {showResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm shrink-0"
                        >
                            <button
                                onClick={handleNext}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors"
                            >
                                {currentIndex < questions.length - 1 ? (
                                    <>
                                        Sonraki Soru
                                        <ChevronRight size={20} />
                                    </>
                                ) : (
                                    <>
                                        Sonuçları Gör
                                        <Trophy size={20} />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default QuizModal;
