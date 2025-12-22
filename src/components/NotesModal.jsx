import React, { useEffect, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileQuestion, Loader2, HelpCircle } from 'lucide-react';
import QuizModal from './QuizModal';

export default function NotesModal({ courseName, notePath, onClose, courseId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Check if the note exists and is not the SPA fallback
    useEffect(() => {
        const checkNote = async () => {
            setLoading(true);
            setError(false);
            try {
                const response = await fetch(notePath);
                const text = await response.text();

                // If the response contains 'id="root"', it's most likely the SPA fallback index.html
                // indicating the specific note file doesn't exist.
                if (text.includes('id="root"') || !response.ok) {
                    setError(true);
                } else {
                    setError(false);
                }
            } catch (err) {
                console.error('Note check failed:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (notePath) {
            checkNote();
        } else {
            setError(true);
            setLoading(false);
        }
    }, [notePath]);

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
                            <button
                                onClick={() => setShowQuiz(true)}
                                className="p-2 text-custom-title/70 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors flex items-center gap-2"
                                title="Soru Çöz"
                            >
                                <HelpCircle size={20} />
                                <span className="text-sm font-semibold hidden sm:inline">Soru Çöz</span>
                            </button>
                            <div className="w-px h-6 bg-custom-category/30 mx-1" />
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
                    <div className="flex-1 bg-custom-bg/50 relative flex items-center justify-center">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4 text-custom-accent">
                                <Loader2 className="animate-spin" size={48} />
                                <p className="text-lg font-medium text-custom-title">Notlar yükleniyor...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-6 text-center px-6">
                                <div className="w-20 h-20 bg-custom-error/10 text-custom-error rounded-full flex items-center justify-center shadow-inner">
                                    <FileQuestion size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-custom-title">Not Henüz Eklenmedi</h3>
                                    <p className="text-custom-title/60 max-w-md">
                                        Bu ders için hazırlanan notlar henüz sisteme yüklenmemiş veya güncelleniyor olabilir.
                                        Lütfen daha sonra tekrar kontrol edin.
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3 bg-custom-category text-white font-semibold rounded-xl hover:bg-custom-category/80 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
                                >
                                    Geri Dön
                                </button>
                            </div>
                        ) : (
                            <iframe
                                src={notePath}
                                className="w-full h-full border-0 bg-white"
                                title={`${courseName} Notes`}
                                loading="lazy"
                            />
                        )}
                    </div>
                </Motion.div>

                {/* Quiz Modal Integration */}
                <QuizModal
                    isOpen={showQuiz}
                    onClose={() => setShowQuiz(false)}
                    courseId={courseId}
                    courseName={courseName}
                    notePath={notePath}
                />
            </div>
        </AnimatePresence>
    );
}
