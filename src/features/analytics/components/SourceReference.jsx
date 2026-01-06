/**
 * SourceReference Component
 * "Notlara Dön" button to view original chunk content
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ExternalLink, Book } from 'lucide-react';
import { LatexRenderer } from '../quiz/LatexRenderer';

export function SourceReferenceButton({
    onClick,
    label = 'Notlara Dön',
    size = 'sm',
    className = ''
}) {
    const sizeClasses = {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-1.5',
        lg: 'text-base px-4 py-2'
    };

    return (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-1.5 rounded-lg
                bg-indigo-500/10 hover:bg-indigo-500/20
                text-indigo-400 hover:text-indigo-300
                border border-indigo-500/30 hover:border-indigo-500/50
                transition-all duration-200
                ${sizeClasses[size]}
                ${className}
            `}
        >
            <ExternalLink size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
            {label}
        </button>
    );
}

export function SourceReferenceModal({
    isOpen,
    onClose,
    chunk,
    title = 'Kaynak Not'
}) {
    if (!isOpen || !chunk) return null;

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
                    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-indigo-500/10">
                        <div className="flex items-center gap-3">
                            <Book className="text-indigo-400" size={24} />
                            <div>
                                <h2 className="text-lg font-semibold text-white">{title}</h2>
                                <p className="text-xs text-gray-400">
                                    {chunk.lesson_type} • {chunk.title}
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
                    <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
                        {/* Chunk Info */}
                        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                            <FileText size={14} />
                            <span>ID: {chunk.id}</span>
                            <span>•</span>
                            <span>Sıra: {chunk.order}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-white mb-4">
                            {chunk.title}
                        </h3>

                        {/* Markdown Content */}
                        <div className="prose prose-invert prose-sm max-w-none">
                            <LatexRenderer
                                content={chunk.content_md}
                                className="text-gray-300 leading-relaxed"
                            />
                        </div>

                        {/* Images */}
                        {chunk.images && chunk.images.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <h4 className="text-sm font-medium text-gray-400 mb-3">
                                    📷 Görseller ({chunk.images.length})
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {chunk.images.map((img, i) => (
                                        <div
                                            key={i}
                                            className="bg-gray-800 rounded-lg p-2 text-xs text-gray-500"
                                        >
                                            {img}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Hook to manage source reference state
 */
export function useSourceReference(chunks = []) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedChunk, setSelectedChunk] = useState(null);

    const openSource = (chunkId) => {
        const chunk = chunks.find(c => c.id === chunkId);
        if (chunk) {
            setSelectedChunk(chunk);
            setIsOpen(true);
        }
    };

    const closeSource = () => {
        setIsOpen(false);
        setSelectedChunk(null);
    };

    return {
        isOpen,
        selectedChunk,
        openSource,
        closeSource
    };
}

export default SourceReferenceModal;
