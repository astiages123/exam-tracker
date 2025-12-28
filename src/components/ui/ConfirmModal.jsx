import { motion as Motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                onClick={onCancel}
            >
                <Motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-full bg-amber-500/20">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    </div>
                    <p className="text-muted-foreground mb-6">{message}</p>
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={onCancel}>
                            İptal
                        </Button>
                        <Button variant="destructive" onClick={onConfirm}>
                            Onayla
                        </Button>
                    </div>
                </Motion.div>
            </Motion.div>
        </AnimatePresence>
    );
};

export default ConfirmModal;
