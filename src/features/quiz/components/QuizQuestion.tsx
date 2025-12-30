/**
 * QuizQuestion Component
 * 
 * Displays a single quiz question with options and handles answer selection.
 */

import { CheckCircle, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { renderMathText } from "@/utils/mathText";
import QuizChart from "./QuizChart";
import type { GeneratedQuestion } from '@/lib/ai';

interface QuizQuestionProps {
    question: GeneratedQuestion;
    questionIndex: number;
    totalQuestions: number;
    selectedAnswer: number | undefined;
    isSubmitted: boolean;
    onOptionSelect: (optionIndex: number) => void;
    getDifficultyStars: (difficulty: string | number) => string;
}

export default function QuizQuestion({
    question,
    questionIndex,
    totalQuestions,
    selectedAnswer,
    isSubmitted,
    onOptionSelect,
    getDifficultyStars
}: QuizQuestionProps) {
    const correctIndex = question.correct_option_index;

    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-100 ease-out"
                    style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
                />
            </div>

            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Soru {questionIndex + 1} / {totalQuestions}</span>
                <span>Zorluk: {getDifficultyStars(question.difficulty_level)}</span>
            </div>

            <div className="space-y-6">
                <h3 className="text-lg font-medium text-foreground leading-relaxed">
                    {renderMathText(question.question_text)}
                </h3>

                {/* Chart Area */}
                {question.chart_data && (
                    <QuizChart chartData={question.chart_data} />
                )}

                {/* Options */}
                <div className="space-y-3">
                    {question.options.map((option, idx) => {
                        const isSelected = selectedAnswer === idx;
                        const isCorrect = idx === correctIndex;

                        return (
                            <button
                                key={idx}
                                onClick={() => onOptionSelect(idx)}
                                disabled={isSubmitted}
                                className={cn(
                                    "w-full p-3 rounded-xl border-2 text-left transition-all duration-75 flex items-center justify-between group",
                                    isSubmitted
                                        ? isCorrect
                                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                            : isSelected
                                                ? "bg-rose-500/10 border-rose-500 text-rose-500"
                                                : "bg-muted/20 border-transparent text-muted-foreground opacity-40"
                                        : isSelected
                                            ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(4,178,166,0.2)] scale-[1.02]"
                                            : "bg-card/40 border-primary/40 hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_10px_rgba(4,178,166,0.1)] transition-all"
                                )}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <span className={cn(
                                        "flex items-center justify-center w-7 h-7 rounded-lg border text-xs font-bold shrink-0 transition-colors",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-muted/50 border-border group-hover:border-primary/50"
                                    )}>
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className="text-[15px]">{renderMathText(option)}</span>
                                </div>
                                {isSubmitted && isCorrect && <CheckCircle className="text-green-500" size={20} />}
                                {isSubmitted && isSelected && !isCorrect && <XCircle className="text-destructive" size={20} />}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                    {isSubmitted && question.explanation && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-blue-700 dark:text-blue-300 text-sm"
                        >
                            <strong>Açıklama:</strong> {question.explanation}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
