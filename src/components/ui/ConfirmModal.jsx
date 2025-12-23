import React, { useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Evet, Onayla', cancelText = 'İptal' }) {
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
            }
        };

        window.addEventListener('keydown', handleEscape, true);
        return () => window.removeEventListener('keydown', handleEscape, true);
    }, [isOpen, onCancel]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[4px]"
                    />
                    <Motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 8 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 400,
                            mass: 0.8
                        }}
                        className="relative w-full max-w-[380px] bg-[#1a1a1c] border border-white/[0.08] rounded-[24px] shadow-2xl overflow-hidden will-change-transform"
                    >
                        <div className="p-8 pb-6">
                            <div className="flex flex-col items-center text-center gap-4">
                                <Motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.05 }}
                                    className="w-14 h-14 rounded-full bg-rose-400/10 flex items-center justify-center border border-rose-400/20"
                                >
                                    <AlertTriangle className="text-rose-400/80" size={28} />
                                </Motion.div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white tracking-tight">
                                        {title || 'Emin misiniz?'}
                                    </h3>
                                    <p className="text-[#a1a1aa] text-sm leading-relaxed px-2">
                                        {message || 'Bu işlemi yapmak istediğinize emin misiniz?'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6 pt-2 flex flex-col gap-2">
                            <button
                                onClick={onConfirm}
                                className="w-full py-3.5 rounded-2xl bg-rose-400/10 hover:bg-rose-400/20 text-rose-300 font-bold text-sm transition-colors duration-200 border border-rose-400/20 active:scale-[0.98]"
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={onCancel}
                                className="w-full py-3.5 rounded-2xl text-[#71717a] hover:text-[#a1a1aa] font-semibold text-sm transition-colors duration-200"
                            >
                                {cancelText}
                            </button>
                        </div>
                    </Motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
