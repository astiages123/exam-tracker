/**
 * MasteryBadge Component
 * Shows mastery level with "Müfettiş Onayı" badge
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, BookOpen, CheckCircle } from 'lucide-react';

const MASTERY_CONFIG = {
    mastered: {
        label: 'Uzmanlaşıldı',
        badge: 'Müfettiş Onayı',
        icon: Award,
        bgColor: 'bg-gradient-to-r from-yellow-500 to-amber-500',
        textColor: 'text-yellow-900',
        borderColor: 'border-yellow-400',
        glowColor: 'shadow-yellow-500/50'
    },
    improving: {
        label: 'Gelişiyor',
        badge: 'İlerleme Kaydediliyor',
        icon: TrendingUp,
        bgColor: 'bg-gradient-to-r from-blue-500 to-indigo-500',
        textColor: 'text-white',
        borderColor: 'border-blue-400',
        glowColor: 'shadow-blue-500/30'
    },
    learning: {
        label: 'Öğreniliyor',
        badge: 'Çalışmaya Devam',
        icon: BookOpen,
        bgColor: 'bg-gradient-to-r from-gray-600 to-gray-700',
        textColor: 'text-gray-200',
        borderColor: 'border-gray-500',
        glowColor: ''
    }
};

export function MasteryBadge({
    level = 'learning',
    streakDays = 0,
    showStreak = true,
    size = 'md',
    animate = true
}) {
    const config = MASTERY_CONFIG[level] || MASTERY_CONFIG.learning;
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
    };

    const iconSizes = { sm: 12, md: 16, lg: 20 };

    return (
        <motion.div
            initial={animate ? { scale: 0, rotate: -10 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`
                inline-flex items-center gap-2 rounded-full border-2
                ${config.bgColor} ${config.textColor} ${config.borderColor}
                ${config.glowColor ? `shadow-lg ${config.glowColor}` : ''}
                ${sizeClasses[size]}
            `}
        >
            <Icon size={iconSizes[size]} />
            <span className="font-semibold">{config.badge}</span>

            {showStreak && streakDays > 0 && (
                <span className="flex items-center gap-1 ml-1 opacity-80">
                    <span className="text-xs">🔥</span>
                    <span className="text-xs font-medium">{streakDays}</span>
                </span>
            )}

            {level === 'mastered' && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <CheckCircle size={iconSizes[size]} className="text-yellow-900" />
                </motion.div>
            )}
        </motion.div>
    );
}

export function MasteryProgress({ summary, className = '' }) {
    const { total_chunks, mastered_count, improving_count, learning_count, mastery_percentage } = summary;

    if (total_chunks === 0) return null;

    return (
        <div className={`mastery-progress ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Uzmanlaşma Durumu</span>
                <span className="text-sm font-semibold text-white">
                    {mastery_percentage.toFixed(0)}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                {mastered_count > 0 && (
                    <motion.div
                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(mastered_count / total_chunks) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                )}
                {improving_count > 0 && (
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(improving_count / total_chunks) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    />
                )}
                {learning_count > 0 && (
                    <motion.div
                        className="h-full bg-gray-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(learning_count / total_chunks) * 100}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    />
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Uzman: {mastered_count}
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Gelişen: {improving_count}
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-600" />
                    Öğrenen: {learning_count}
                </span>
            </div>
        </div>
    );
}

export default MasteryBadge;
