/**
 * ErrorBook Component (The Case File)
 * Shows wrong answers with AI advice
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, BookX, AlertTriangle, Lightbulb,
    ChevronDown, ChevronUp, CheckCircle, ExternalLink
} from 'lucide-react';
import { LatexRenderer } from '../quiz/LatexRenderer';

export function ErrorBook({
    isOpen,
    onClose,
    errors = [],
    onViewSource,
    title = 'Hata Defteri'
}) {
    const [expandedId, setExpandedId] = useState(null);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="relative w-full max-w-2xl max-h-[85vh] bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-red-500/10">
                        <div className="flex items-center gap-3">
                            <BookX className="text-red-400" size={24} />
                            <div>
                                <h2 className="text-lg font-semibold text-white">{title}</h2>
                                <p className="text-xs text-gray-400">
                                    {errors.length} yanlış soru
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
                        {errors.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    Hata Yok!
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    Tüm sorulara doğru cevap verdiniz.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {errors.map((error, index) => (
                                    <ErrorCard
                                        key={error.id || index}
                                        error={error}
                                        isExpanded={expandedId === (error.id || index)}
                                        onToggle={() => setExpandedId(
                                            expandedId === (error.id || index) ? null : (error.id || index)
                                        )}
                                        onViewSource={() => onViewSource?.(error.chunk_id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function ErrorCard({ error, isExpanded, onToggle, onViewSource }) {
    const questionData = error.question_data || {};

    return (
        <motion.div
            className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
            layout
        >
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <AlertTriangle className="text-red-400 shrink-0" size={18} />
                    <div>
                        <div className="text-sm font-medium text-white">
                            {error.chunk_title || 'Soru'}
                        </div>
                        <div className="text-xs text-gray-500">
                            {error.lesson_type} • {new Date(error.created_at).toLocaleDateString('tr-TR')}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
                        Verdiğin: {error.user_answer}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                        Doğru: {error.correct_answer}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="text-gray-400" size={18} />
                    ) : (
                        <ChevronDown className="text-gray-400" size={18} />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-4 pb-4 border-t border-gray-700 pt-4">
                            {/* Question */}
                            <div className="mb-4">
                                <h4 className="text-xs font-medium text-gray-500 mb-2">SORU</h4>
                                <LatexRenderer
                                    content={questionData.question}
                                    className="text-sm text-gray-300"
                                />
                            </div>

                            {/* Options */}
                            {questionData.options && (
                                <div className="mb-4 space-y-1">
                                    {Object.entries(questionData.options).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className={`
                                                text-xs px-3 py-2 rounded-lg
                                                ${key === error.correct_answer
                                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                    : key === error.user_answer
                                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                        : 'bg-gray-700/30 text-gray-400'
                                                }
                                            `}
                                        >
                                            <span className="font-bold mr-2">{key}.</span>
                                            {value}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* AI Advice - Müfettiş Tavsiyesi */}
                            {error.ai_advice && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <Lightbulb className="text-amber-400 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <h4 className="text-sm font-semibold text-amber-400 mb-1">
                                                🔍 Müfettiş Tavsiyesi
                                            </h4>
                                            <p className="text-sm text-amber-200/80">
                                                {error.ai_advice}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Source Reference Button */}
                            <button
                                onClick={onViewSource}
                                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <ExternalLink size={14} />
                                Notlara Dön
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default ErrorBook;
