/**
 * QuizOption Component
 * Interactive quiz option with animations
 */

import { motion, Variants } from 'framer-motion';
import { Check, X } from 'lucide-react';

const optionVariants: Variants = {
    idle: {
        scale: 1,
        x: 0,
        backgroundColor: '#1f2937', // gray-800
        borderColor: '#4b5563'      // gray-600
    },
    hover: {
        scale: 1.02,
        backgroundColor: '#1f2937',
        borderColor: '#6b7280'      // gray-500
    },
    correct: {
        scale: 1,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: '#22c55e'
    },
    incorrect: {
        x: [0, -10, 10, -10, 10, 0],
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
        transition: {
            x: { type: 'tween', duration: 0.5, ease: 'easeInOut' },
            backgroundColor: { duration: 0.3 },
            borderColor: { duration: 0.3 }
        }
    },
    revealed: {
        scale: 1,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: '#22c55e'
    },
    selected: {
        scale: 1.02,
        backgroundColor: '#1f2937',
        borderColor: '#6366f1'      // indigo-500
    }
};

interface QuizOptionProps {
    optionKey: string;
    optionText: string;
    isSelected: boolean;
    isCorrect: boolean;
    isRevealed: boolean;
    showResult: boolean;
    onSelect: (key: string) => void;
    disabled?: boolean;
}

export function QuizOption({
    optionKey,
    optionText,
    isSelected,
    isCorrect,
    isRevealed,
    showResult,
    onSelect,
    disabled
}: QuizOptionProps) {
    const getVariant = () => {
        if (!showResult) {
            if (isSelected) return 'selected';
            return 'idle';
        }
        if (isSelected && isCorrect) return 'correct';
        if (isSelected && !isCorrect) return 'incorrect';
        if (isCorrect && isRevealed) return 'revealed';
        return 'idle';
    };

    const getStyles = () => {
        const baseStyles = `
            relative flex items-start gap-3 p-4 rounded-xl border-2 
            transition-none cursor-pointer
            text-left w-full
        `;

        if (!showResult) {
            return `${baseStyles} ${isSelected ? '' : ''}`;
        }

        if (isSelected && isCorrect) {
            return `${baseStyles}`;
        }
        if (isSelected && !isCorrect) {
            return `${baseStyles}`;
        }
        if (isCorrect && isRevealed) {
            return `${baseStyles}`;
        }
        return `${baseStyles} opacity-60`;
    };

    return (
        <motion.button
            className={getStyles()}
            variants={optionVariants}
            initial="idle"
            animate={getVariant()}
            whileHover={!disabled && !showResult ? 'hover' : undefined}
            onClick={() => !disabled && onSelect(optionKey)}
            disabled={disabled}
        >
            {/* Option Key Badge */}
            <span className={`
                shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                text-sm font-bold
                ${showResult && isCorrect
                    ? 'bg-green-500 text-emerald'
                    : showResult && isSelected && !isCorrect
                        ? 'bg-red-500 text-emerald'
                        : isSelected
                            ? 'bg-indigo-500 text-emerald'
                            : 'bg-gray-700 text-gray-300'
                }
            `}>
                {showResult && isCorrect ? (
                    <Check size={16} />
                ) : showResult && isSelected && !isCorrect ? (
                    <X size={16} />
                ) : (
                    optionKey
                )}
            </span>

            {/* Option Text - Same neutral color for all options before result */}
            <span className={`
                flex-1 text-sm leading-relaxed
                ${showResult && isCorrect
                    ? 'text-green-300 font-medium'
                    : showResult && isSelected && !isCorrect
                        ? 'text-red-300'
                        : 'text-gray-200'
                }
            `}>
                {optionText}
            </span>

            {/* Result Icon */}
            {showResult && (
                <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="shrink-0"
                >
                    {isCorrect ? (
                        <Check className="text-green-400" size={20} />
                    ) : isSelected ? (
                        <X className="text-red-400" size={20} />
                    ) : null}
                </motion.span>
            )}
        </motion.button>
    );
}

export default QuizOption;
