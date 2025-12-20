import React from 'react';
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle, Lock, Star, User, CreditCard, Search, Shield, Award, Crown } from 'lucide-react';
import { RANKS } from '../data';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const RANK_ICONS = {
    User,
    CreditCard,
    Search,
    Shield,
    Award,
    Crown
};

const RankModal = ({ currentRank, onClose, totalHours = 0, completedHours = 0, sessions = [] }) => {
    const currentRankIndex = RANKS.findIndex(r => r.title === currentRank.title);

    // Calculate daily average study hours
    const stats = React.useMemo(() => {
        const workSessions = sessions.filter(s => s.type === 'work' && s.duration);
        if (workSessions.length === 0) return { avg: 0, uniqueDays: 0 };

        const totalWorkMins = workSessions.reduce((acc, s) => acc + (s.duration / 60), 0);
        const daySet = new Set(workSessions.map(s => new Date(s.timestamp).toLocaleDateString()));
        const uniqueDays = daySet.size;

        return {
            avg: totalWorkMins / (uniqueDays || 1) / 60, // in hours
            uniqueDays
        };
    }, [sessions]);

    const formatAvg = (h) => {
        const hrs = Math.floor(h);
        const mins = Math.round((h - hrs) * 60);
        if (hrs === 0) return `${mins}dk`;
        return `${hrs}sa ${mins}dk`;
    };

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Modal scroll lock
        document.body.style.overflow = 'hidden';

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-custom-header border border-custom-category rounded-2xl p-8 w-full max-w-2xl shadow-2xl shadow-custom-accent/10 relative my-auto flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between mb-2 border-b border-custom-category/30 pb-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-custom-accent/10 p-3 rounded-xl">
                                <Trophy size={32} className="text-custom-accent" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-custom-text">Unvan Yolculuğu</h2>
                                <p className="text-custom-title/70 text-sm">
                                    {stats.uniqueDays > 0 ? (
                                        <>Günlük Ortalama: <span className="text-custom-accent font-bold">{formatAvg(stats.avg)}</span></>
                                    ) : (
                                        "Kariyer basamakların"
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-custom-category/50 rounded-lg transition-colors text-custom-title/50 hover:text-custom-text"
                        >
                            <span className="text-3xl leading-none">&times;</span>
                        </button>
                    </div>

                    <div className="relative flex flex-col gap-2">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-custom-category/30 -z-10" />

                        {RANKS.map((rank, index) => {
                            const isCompleted = index < currentRankIndex;
                            const isCurrent = index === currentRankIndex;

                            // Calculate remaining days for this rank
                            let daysText = "";
                            if (!isCompleted && !isCurrent && stats.avg > 0) {
                                const targetHours = totalHours * (rank.min / 100);
                                const remainingHours = Math.max(0, targetHours - completedHours);
                                const days = Math.ceil(remainingHours / stats.avg);
                                daysText = `~${days} gün kaldı`;
                            }

                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "relative flex items-center gap-4 p-3 rounded-xl border transition-all duration-300",
                                        isCurrent
                                            ? "bg-custom-accent/5 border-custom-accent/30 shadow-lg shadow-custom-accent/5 scale-[1.02]"
                                            : "bg-custom-header border-transparent hover:bg-custom-bg/50"
                                    )}
                                >
                                    {/* Status Icon */}
                                    <div className={cn(
                                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 z-10",
                                        isCompleted ? "bg-custom-accent text-white border-custom-header" :
                                            isCurrent ? "bg-custom-header text-custom-accent border-custom-accent" :
                                                "bg-custom-header text-custom-title/30 border-custom-category/50"
                                    )}>
                                        {(() => {
                                            const IconComponent = RANK_ICONS[rank.icon] || Star;
                                            return <IconComponent size={24} className={isCurrent ? "fill-current" : ""} />;
                                        })()}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={cn(
                                                "font-bold text-lg",
                                                isCurrent ? rank.color : isCompleted ? "text-custom-title/70" : "text-custom-title/40"
                                            )}>
                                                {rank.title}
                                            </h3>
                                            <div className="flex flex-col items-end">
                                                <span className={cn(
                                                    "text-xs font-bold px-2 py-1 rounded-md",
                                                    isCurrent ? "bg-custom-accent/10 text-custom-accent" : "bg-custom-bg text-custom-title/40"
                                                )}>
                                                    %{rank.min}+
                                                </span>
                                                {daysText && (
                                                    <span className="text-[10px] font-bold text-custom-accent/60 mt-1 uppercase tracking-wider">
                                                        {daysText}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className={cn(
                                            "text-sm",
                                            isCurrent ? "text-custom-title" : "text-custom-title/50"
                                        )}>
                                            {isCurrent ? "Şu an buradasınız" :
                                                isCompleted ? "Tamamlandı" :
                                                    `Bu unvana ulaşmak için %${rank.min} ilerleme gerekli`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default RankModal;
