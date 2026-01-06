/**
 * QuizExplanation Component
 * Animated explanation panel with Chain of Thought formatting
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, CheckCircle, XCircle } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';

const containerVariants = {
    hidden: {
        height: 0,
        opacity: 0,
        marginTop: 0
    },
    visible: {
        height: 'auto',
        opacity: 1,
        marginTop: 16,
        transition: {
            height: { duration: 0.4, ease: 'easeOut' },
            opacity: { duration: 0.3, delay: 0.1 }
        }
    },
    exit: {
        height: 0,
        opacity: 0,
        marginTop: 0,
        transition: { duration: 0.2 }
    }
};

import { Calendar, Clock, RotateCw } from 'lucide-react';

export function QuizExplanation({
    explanation,
    isCorrect,
    isVisible,
    verificationNotes,
    srsResult // New prop
}) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="overflow-hidden"
                >
                    <div className={`
                        rounded-xl p-5 border-2
                        ${isCorrect
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-amber-500/10 border-amber-500/30'
                        }
                    `}>
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.3, type: 'spring' }}
                            >
                                {isCorrect ? (
                                    <CheckCircle className="text-green-400" size={24} />
                                ) : (
                                    <Lightbulb className="text-amber-400" size={24} />
                                )}
                            </motion.div>
                            <h4 className={`
                                text-lg font-semibold
                                ${isCorrect ? 'text-green-400' : 'text-amber-400'}
                            `}>
                                {isCorrect ? 'Doğru Cevap!' : 'Açıklama'}
                            </h4>
                        </div>

                        {/* SRS Feedback Section (New) */}
                        {srsResult && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mb-4 bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 flex flex-wrap gap-4 items-center"
                            >
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <Calendar size={16} className="text-indigo-400" />
                                    <span>
                                        Tekrar: <span className="text-white font-medium">
                                            {new Date(srsResult.nextReviewDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <Clock size={16} className="text-indigo-400" />
                                    <span>
                                        Süre: <span className="text-white font-medium">
                                            {srsResult.interval === 0 ? 'Hemen' : `${srsResult.interval} Gün`}
                                        </span>
                                    </span>
                                </div>
                                {srsResult.repetitionCount > 1 && (
                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                        <RotateCw size={16} className="text-emerald-400" />
                                        <span>
                                            Tekrar Sayısı: <span className="text-white font-medium">{srsResult.repetitionCount}</span>
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Explanation Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-sm text-gray-300 leading-relaxed space-y-3"
                        >
                            <LatexRenderer
                                content={explanation}
                                className="explanation-content"
                            />
                        </motion.div>

                        {/* Verification Notes (if available) */}
                        {verificationNotes && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="mt-4 pt-4 border-t border-gray-700"
                            >
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <CheckCircle size={12} />
                                    <span>Doğrulama: {verificationNotes}</span>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default QuizExplanation;
