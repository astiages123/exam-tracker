import { Goal, Sparkles } from 'lucide-react';
import { RANK_ICONS } from '@/constants/styles';
import { ProgressBar } from '@/components/stats/ProgressBars';
import { motion as Motion } from 'framer-motion';
import type { Rank } from '@/types';
import { cn } from '@/lib/utils';

interface RankCardProps {
    rankInfo: Rank;
    nextRank: Rank;
    totalPercentage: number;
    sessions?: any[];
    completedHours: number;
    totalHours: number;
}

export default function RankCard({
    rankInfo,
    nextRank,
    totalPercentage,
    sessions = [],
    completedHours,
    totalHours
}: RankCardProps) {
    const Icon = RANK_ICONS[nextRank.icon] || Goal;
    const rankRange = nextRank.min - rankInfo.min;
    const progressInRank = totalPercentage - rankInfo.min;
    const relativeRemaining = Math.max(0, 100 - (progressInRank / (rankRange || 1)) * 100);

    // Days calculation logic
    const daysLeft = (() => {
        if (!sessions || sessions.length === 0 || completedHours === 0) return null;
        const daySet = new Set<string>();
        sessions.forEach(s => {
            if (s.type === 'work' && s.timestamp) {
                daySet.add(new Date(s.timestamp).toDateString());
            }
        });
        const uniqueDays = daySet.size;
        if (uniqueDays === 0) return null;
        const dailyAvg = completedHours / uniqueDays;
        if (dailyAvg === 0) return null;
        const hoursNeededForNextRank = ((relativeRemaining / 100) * rankRange / 100) * totalHours;
        return Math.ceil(hoursNeededForNextRank / dailyAvg);
    })();

    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-full"
        >
            {/* Gamified Background Glow */}
            <div className="absolute -inset-0.5 bg-linear-to-br from-primary/20 via-purple-500/10 to-blue-500/20 blur-2xl rounded-4xl opacity-50" />

            <div className="relative glass-card h-full rounded-3xl overflow-hidden border border-white/10 bg-[#0A0A0A]/60 shadow-xl shadow-black/40 p-4 flex flex-col justify-between gap-4 group">

                {/* Header Section */}
                <div className="flex items-center gap-5">
                    <div className="relative shrink-0">
                        {/* Icon Background Glow */}
                        <div className="relative p-2.5 rounded-2xl bg-linear-to-br from-white/10 to-white/5 border border-white/10">
                            <Icon size={28} className="text-primary" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-sm bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-wide flex items-center gap-1.5">
                                <Sparkles size={10} />
                                Sonraki Hedef
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            {nextRank.title}
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                        </h2>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 transition-colors relative overflow-hidden group/stat">
                        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1 relative z-10">Kalan Yüzde</span>
                        <div className="flex items-baseline gap-1 relative z-10">
                            <span className="text-xl font-black text-primary drop-shadow-sm">%{relativeRemaining.toFixed(1)}</span>
                            <span className="text-xs font-bold text-white/30"></span>
                        </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 transition-colors relative overflow-hidden group/stat">
                        <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1 relative z-10">Tahmini Süre</span>
                        <div className="flex items-baseline gap-1 relative z-10">
                            {daysLeft !== null ? (
                                <>
                                    <span className="text-xl font-black text-white drop-shadow-sm">{daysLeft}</span>
                                    <span className="text-xs font-bold text-white/30">gün kaldı</span>
                                </>
                            ) : (
                                <span className="text-sm font-bold text-white/30 italic">Hesaplanıyor...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Gamified Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end px-1">
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mevcut</span>
                            <span className={cn("text-xs font-black tracking-wide", rankInfo.color)}>{rankInfo.title}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[10px] font-bold text-primary/50 uppercase tracking-widest">Hedef</span>
                            <span className="text-xs font-black text-primary tracking-wide">{nextRank.title}</span>
                        </div>
                    </div>

                    <div className="relative">
                        <ProgressBar
                            progress={totalPercentage}
                            currentLevelMin={rankInfo.min}
                            nextLevelMin={nextRank.min}
                            heightClass="h-4"
                        />
                    </div>
                </div>
            </div>
        </Motion.div>
    );
}
