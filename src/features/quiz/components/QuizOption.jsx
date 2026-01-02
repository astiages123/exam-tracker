/**
 * QuizOption Component
 * Interactive quiz option with animations
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const optionVariants = {
    idle: { scale: 1, x: 0 },
    hover: { scale: 1.02 },
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
    }
};

export function QuizOption({
    optionKey,
    optionText,
    isSelected,
    isCorrect,
    isRevealed,
    showResult,
    onSelect,
    disabled,
    className
}) {
    const getVariant = () => {
        if (!showResult) {
            return isSelected ? 'hover' : 'idle';
        }
        if (isSelected && isCorrect) return 'correct';
        if (isSelected && !isCorrect) return 'incorrect';
        if (isCorrect && isRevealed) return 'revealed';
        return 'idle';
    };

    const getStyles = () => {
        const baseStyles = `
            relative flex items-start gap-3 p-4 rounded-xl border-2 
            transition-all duration-200 cursor-pointer
            text-left w-full
        `;

        let styles = baseStyles;

        if (!showResult) {
            styles += isSelected
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-700';
        } else if (isSelected && isCorrect) {
            styles += ' border-green-500 bg-green-500/20';
        } else if (isSelected && !isCorrect) {
            styles += ' border-red-500 bg-red-500/20';
        } else if (isCorrect && isRevealed) {
            styles += ' border-green-500 bg-green-500/10';
        } else {
            styles += ' border-gray-700 bg-gray-800/30 opacity-60';
        }

        return `${styles} ${className || ''}`;
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
                flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                text-base font-bold
                ${showResult && isCorrect
                    ? 'bg-green-500 text-white'
                    : showResult && isSelected && !isCorrect
                        ? 'bg-red-500 text-white'
                        : isSelected
                            ? 'bg-indigo-500 text-white'
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

            {/* Option Text */}
            <span className={`
                flex-1 text-base leading-relaxed
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
                    className="flex-shrink-0"
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
