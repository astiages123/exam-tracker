/**
 * QuizProgressBar Component
 * Shows quiz progress with animated transitions
 */

import { motion } from 'framer-motion';

interface QuizProgressBarProps {
    currentQuestion: number;
    totalQuestions: number;
    correctCount?: number;
    incorrectCount?: number;
}

export function QuizProgressBar({
    currentQuestion,
    totalQuestions,
    correctCount = 0,
    incorrectCount = 0
}: QuizProgressBarProps) {
    const progress = ((currentQuestion) / totalQuestions) * 100;
    const answeredCount = correctCount + incorrectCount;

    return (
        <div className="quiz-progress w-full mb-6">
            {/* Stats Row */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                    Soru <span className="text-white font-semibold">{currentQuestion}</span>
                    <span className="text-gray-500"> / {totalQuestions}</span>
                </span>

                {answeredCount > 0 && (
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-green-400">{correctCount}</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-red-400">{incorrectCount}</span>
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 bg-linear-to-r from-indigo-500/20 to-purple-500/20" />

                {/* Progress fill */}
                <motion.div
                    className="absolute top-0 left-0 h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />

                {/* Shine effect */}
                <motion.div
                    className="absolute top-0 left-0 h-full w-1/4 bg-linear-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['0%', '400%'] }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                        repeatDelay: 1
                    }}
                />
            </div>

            {/* Question Dots */}
            <div className="flex items-center justify-center gap-1 mt-3">
                {Array.from({ length: totalQuestions }).map((_, index) => (
                    <motion.div
                        key={index}
                        className={`
                            w-2 h-2 rounded-full transition-all duration-300
                            ${index < currentQuestion - 1
                                ? 'bg-indigo-500'
                                : index === currentQuestion - 1
                                    ? 'bg-white scale-125'
                                    : 'bg-gray-600'
                            }
                        `}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    />
                ))}
            </div>
        </div>
    );
}

export default QuizProgressBar;
