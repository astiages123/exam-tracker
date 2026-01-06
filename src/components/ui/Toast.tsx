import { motion as Motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, LucideIcon } from 'lucide-react';
import { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const iconMap: Record<ToastType, LucideIcon> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
};

const colorMap: Record<ToastType, string> = {
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100',
    error: 'bg-red-500/20 border-red-500/30 text-red-100',
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-100',
    info: 'bg-sky-500/20 border-sky-500/30 text-sky-100'
};

const iconColorMap: Record<ToastType, string> = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-sky-400'
};

interface ToastProps {
    id: string;
    message: string;
    type?: ToastType;
    onClose: (id: string) => void;
}

const Toast = ({ id, message, type = 'info', onClose }: ToastProps) => {
    const Icon = iconMap[type] || Info;

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    return (
        <Motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 
                rounded-lg border shadow-lg
                ${colorMap[type]}
            `}
        >
            <Icon className={`w-5 h-5 shrink-0 ${iconColorMap[type]}`} />
            <span className="text-sm font-medium">{message}</span>
            <button
                onClick={() => onClose(id)}
                className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                type="button"
            >
                <X className="w-4 h-4" />
            </button>
        </Motion.div>
    );
};

export default Toast;
