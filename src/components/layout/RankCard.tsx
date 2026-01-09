import { Goal, Sparkles, TrendingUp } from 'lucide-react';
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
    const progressPercentage = Math.min(100, Math.max(0, (progressInRank / (rankRange || 1)) * 100));
    const relativeRemaining = 100 - progressPercentage;

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
            {/* Professional Background Glow */}
            <div className="absolute -inset-0.5 bg-linear-to-br from-blue-500/20 via-indigo-500/10 to-emerald-500/20 blur-2xl rounded-4xl opacity-50" />

            <div className="relative glass-card h-full rounded-3xl overflow-hidden border border-white/10 bg-[#0A0A0A]/60 shadow-xl shadow-black/40 p-5 flex flex-col justify-between gap-6 group">

                {/* Header Section */}
                <div className="flex items-center gap-5">
                    <div className="relative shrink-0">
                        {/* Icon Background Glow */}
                        <div className="relative p-3 rounded-2xl bg-linear-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-inner overflow-hidden">
                            {/* Filling Background Effect */}
                            <Motion.div
                                className="absolute bottom-0 left-0 right-0 bg-emerald/20"
                                initial={{ height: 0 }}
                                animate={{ height: `${progressPercentage}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />

                            <Icon size={32} className={cn("transition-colors duration-500 relative z-10", rankInfo.color.split(' ')[0])} />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles size={10} />
                                Hedef Terfi
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-emerald tracking-tight flex items-center gap-2.5">
                            {nextRank.title}
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse shadow-[0_0_12px_var(--color-primary)]" />
                        </h2>
                    </div>
                </div>

                {/* Progress Detail Grid */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 transition-all duration-300 group/stat relative overflow-hidden">
                        <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />

                        <div className="flex justify-between items-end mb-3">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-emerald/90 uppercase tracking-widest block">Kariyer İlerlemesi</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-emerald tracking-tighter">%{progressPercentage.toFixed(1)}</span>
                                    <span className="text-xs font-bold text-emerald/70 italic">doluluk oranı</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-emerald/90 uppercase tracking-widest block mb-1">Kalan</span>
                                <span className="text-sm font-black text-emerald/90">%{relativeRemaining.toFixed(1)}</span>
                            </div>
                        </div>

                        <div className="relative">
                            <ProgressBar
                                progress={totalPercentage}
                                currentLevelMin={rankInfo.min}
                                nextLevelMin={nextRank.min}
                                heightClass="h-2.5"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 transition-all duration-300 relative overflow-hidden flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <TrendingUp size={16} className="text-indigo-400" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-emerald/90 uppercase tracking-widest block">Tahmini Terfi</span>
                                <div className="flex items-baseline gap-1">
                                    {daysLeft !== null ? (
                                        <>
                                            <span className="text-lg font-black text-emerald">{daysLeft}</span>
                                            <span className="text-xs font-bold text-emerald/70 italic">çalışma günü</span>
                                        </>
                                    ) : (
                                        <span className="text-xs font-bold text-emerald/70 italic">Veri bekleniyor...</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rank Badges */}
                <div className="flex justify-between items-center px-1">
                    <div className="flex flex-col items-start gap-1">
                        <span className="text-[9px] font-bold text-emerald/70 uppercase tracking-[0.2em]">Mevcut Derece</span>
                        <div className={cn("px-2.5 py-1 rounded-lg bg-emerald/10 border border-primary/20 text-xs font-black  tracking-wide", rankInfo.color)}>
                            {rankInfo.title}
                        </div>
                    </div>

                    <div className="h-px bg-white/5 flex-1 mx-4" />

                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-bold text-emerald/70 uppercase tracking-[0.2em]">Sonraki Adım</span>
                        <div className="px-2.5 py-1 rounded-lg bg-emerald/10 border border-primary/20 text-xs font-black  tracking-wide">
                            {nextRank.title}
                        </div>
                    </div>
                </div>
            </div>
        </Motion.div>
    );
}
