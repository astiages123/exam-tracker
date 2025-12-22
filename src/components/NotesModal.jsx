import React, { useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';

export default function NotesModal({ courseName, notePath, onClose }) {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <Motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-7xl h-[85vh] bg-custom-bg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-custom-category/20"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-custom-category/20 bg-custom-header">
                        <h2 className="text-xl font-bold text-custom-title truncate pr-4">
                            {courseName} - Ders Notları
                        </h2>
                        <div className="flex items-center gap-2">
                            <a
                                href={notePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-custom-title/70 hover:text-custom-accent hover:bg-custom-accent/10 rounded-lg transition-colors"
                                title="Yeni sekmede aç"
                            >
                                <ExternalLink size={20} />
                            </a>
                            <button
                                onClick={onClose}
                                className="p-2 text-custom-title/70 hover:text-custom-error hover:bg-custom-error/10 rounded-lg transition-colors"
                                title="Kapat"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-white relative">
                        <iframe
                            src={notePath}
                            className="w-full h-full border-0"
                            title={`${courseName} Notes`}
                            loading="lazy"
                        />
                    </div>
                </Motion.div>
            </div>
        </AnimatePresence>
    );
}
