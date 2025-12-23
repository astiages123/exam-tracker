import React, { useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const TOAST_TYPES = {
    success: {
        icon: CheckCircle,
        accent: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        border: 'border-emerald-400/20',
        bar: 'bg-emerald-400',
        title: 'Başarılı'
    },
    error: {
        icon: XCircle,
        accent: 'text-rose-400',
        bg: 'bg-rose-400/10',
        border: 'border-rose-400/20',
        bar: 'bg-rose-400',
        title: 'Hata'
    },
    warning: {
        icon: AlertCircle,
        accent: 'text-amber-400',
        bg: 'bg-amber-400/10',
        border: 'border-amber-400/20',
        bar: 'bg-amber-400',
        title: 'Uyarı'
    },
    info: {
        icon: Info,
        accent: 'text-custom-accent',
        bg: 'bg-custom-accent/10',
        border: 'border-custom-accent/20',
        bar: 'bg-custom-accent',
        title: 'Bilgi'
    }
};

const DURATION = 4000;

export default function Toast({ id, message, type = 'info', onClose }) {
    const style = TOAST_TYPES[type] || TOAST_TYPES.info;
    const Icon = style.icon;

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, DURATION);

        return () => clearTimeout(timer);
    }, [id, onClose]);

    return (
        <Motion.div
            layout
            initial={{ opacity: 0, x: 20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
                "pointer-events-auto relative min-w-[300px] max-w-[400px] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col",
                "bg-custom-header border-custom-category/40"
            )}
        >
            <div className="p-4 flex items-start gap-4">
                <div className={cn("shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border", style.bg, style.border)}>
                    <Icon size={20} className={style.accent} />
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs font-bold uppercase tracking-widest text-custom-title/40 mb-1">
                        {style.title}
                    </p>
                    <p className="text-[14px] font-medium text-custom-text leading-relaxed">
                        {message}
                    </p>
                </div>

                <button
                    onClick={() => onClose(id)}
                    className="shrink-0 p-1.5 rounded-lg text-custom-title/30 hover:text-custom-text hover:bg-white/5 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Smooth Progress Bar */}
            <div className="h-[2px] w-full bg-white/5">
                <Motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: 0 }}
                    transition={{ duration: DURATION / 1000, ease: 'linear' }}
                    className={cn("h-full opacity-60", style.bar)}
                />
            </div>
        </Motion.div>
    );
}
