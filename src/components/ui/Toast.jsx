import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

// Note: App.jsx exports 'cn' but it might not be a named export in the final build or difficult to import if App is default export.
// It's safer to define a local utility or import established one. I will define local for now to be safe.
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const TOAST_TYPES = {
    success: {
        icon: CheckCircle,
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-500',
        title: 'Başarılı'
    },
    error: {
        icon: XCircle,
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        text: 'text-rose-500',
        title: 'Hata'
    },
    warning: {
        icon: AlertCircle,
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-500',
        title: 'Uyarı'
    },
    info: {
        icon: Info,
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/20',
        text: 'text-sky-500',
        title: 'Bilgi'
    }
};

export default function Toast({ id, message, type = 'info', onClose }) {
    const style = TOAST_TYPES[type] || TOAST_TYPES.info;
    const Icon = style.icon;

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 4000);

        return () => clearTimeout(timer);
    }, [id, onClose]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
                "pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-lg backdrop-blur-xl p-4 flex gap-3",
                "bg-custom-header/90", // Base dark background
                style.border
            )}
        >
            <div className={cn("shrink-0 p-2 rounded-lg bg-custom-bg/50", style.text)}>
                <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <h4 className={cn("font-bold text-sm", style.text)}>
                    {style.title}
                </h4>
                <p className="mt-1 text-sm text-custom-text/90 leading-relaxed">
                    {message}
                </p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="shrink-0 p-1.5 rounded-lg text-custom-title/40 hover:text-custom-text hover:bg-white/5 transition-colors self-start"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
}
