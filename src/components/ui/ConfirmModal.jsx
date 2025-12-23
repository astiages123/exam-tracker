import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-custom-header border border-custom-category rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex gap-4">
                        <div className="shrink-0 w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <AlertTriangle className="text-amber-500" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-custom-text">
                                {title || 'Emin misiniz?'}
                            </h3>
                            <p className="mt-2 text-custom-title/80 leading-relaxed">
                                {message || 'Bu işlemi yapmak istediğinize emin misiniz?'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-black/20 flex items-center justify-end gap-3 border-t border-custom-category/50">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-custom-title/70 font-medium hover:text-custom-text hover:bg-white/5 transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-xl bg-custom-accent/10 text-custom-accent border border-custom-accent/20 font-bold hover:bg-custom-accent/20 transition-all active:scale-95"
                    >
                        Evet, Onayla
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
