import { Youtube, Timer } from 'lucide-react';
import { RANK_ICONS } from '@/constants/styles';
import { Goal } from 'lucide-react';
import { ProgressBar } from '@/components/stats/ProgressBars';
import { formatHours } from '@/utils';
import type { Rank } from '@/types';
import { motion as Motion } from 'framer-motion';


interface ProgressCardProps {
    totalPercentage: number;
    rankInfo: Rank;
    nextRank: Rank;
    completedHours: number;
    completedCount: number;
    totalVideos: number;
    totalHours: number;
    sessions?: any[];
    onCompletedClick?: () => void;
    onDurationClick?: () => void;
}

export default function ProgressCard({
    totalPercentage,
    rankInfo,
    nextRank,
    completedHours,
    completedCount,
    totalVideos,
    totalHours,
    sessions = [],
    onCompletedClick,
    onDurationClick
}: ProgressCardProps) {
    const Icon = RANK_ICONS[nextRank.icon] || Goal;

    return (
        <Motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-4 relative"
        >
            {/* Ambient Background Glow */}
            <div className="absolute -inset-1 bg-primary/5 blur-2xl rounded-[2rem] opacity-30" />

            <div className="relative glass-card rounded-[1.5rem] overflow-hidden border border-white/10 bg-primary/10 shadow-xl shadow-black/40">
                <div className="p-4 sm:p-4.5">
                    <div className="flex flex-col md:flex-row items-center gap-5 mb-4">
                        {/* 1. Icon Box - More Compact */}
                        <div className="relative group shrink-0">
                            <div className="relative p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shadow-lg shadow-black/20">
                                <Icon size={28} className="text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.3)]" />
                            </div>
                        </div>

                        {/* 2. Rank Info - More Compact */}
                        <div className="flex-1 text-center md:text-left min-w-0">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-0.5">
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Sonraki Rütbe</span>
                            </div>
                            <h2 className="text-xl font-black text-white/80 flex items-center justify-center md:justify-start gap-2">
                                {nextRank.title}
                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
                            </h2>
                            <p className="text-white/60 text-[13px] font-medium leading-tight">
                                Hedefe ulaşmak için <span className="text-primary font-bold">{(nextRank.min - totalPercentage).toFixed(1)}%</span>
                                {(() => {
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
                                    const remainingPercentage = nextRank.min - totalPercentage;
                                    const hoursNeededForNextRank = (remainingPercentage / 100) * totalHours;
                                    const daysLeft = Math.ceil(hoursNeededForNextRank / dailyAvg);
                                    return (
                                        <>
                                            <span className="mx-1.5 opacity-40">/</span>
                                            ~<span className="text-white font-bold">{daysLeft} gün</span>
                                        </>
                                    );
                                })()} daha çalışmalısın
                            </p>
                        </div>

                        {/* 3. General Progress - More Compact */}
                        <div className="flex flex-col items-center justify-center shrink-0 bg-white/[0.04] p-2.5 px-5 rounded-xl border border-white/5 min-w-[130px]">
                            <span className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] mb-0.5">Toplam İlerleme</span>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-black text-primary tracking-tighter">
                                    {totalPercentage.toFixed(1)}
                                </span>
                                <span className="text-base font-bold text-primary">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Progress Bar - More Integrated */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end px-0.5 h-3">
                            <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{rankInfo.title}</span>
                            <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{nextRank.title}</span>
                        </div>
                        <ProgressBar
                            progress={totalPercentage}
                            currentLevelMin={rankInfo.min}
                            nextLevelMin={nextRank.min}
                        />
                    </div>
                </div>

                {/* Bottom Stats Grid - Simplified */}
                <div className="grid grid-cols-2 border-t border-white/5">
                    <StatItem
                        icon={<Youtube size={16} className="text-red-500" />}
                        label="Tamamlanan"
                        value={completedCount.toString()}
                        total={`/ ${totalVideos}`}
                        onClick={onCompletedClick}
                    />
                    <StatItem
                        icon={<Timer size={16} className="text-primary" />}
                        label="Toplam Süre"
                        value={formatHours(completedHours)}
                        total={`/ ${formatHours(totalHours)}`}
                        onClick={onDurationClick}
                    />
                </div>
            </div>
        </Motion.div>
    );
}

function StatItem({ icon, label, value, total, onClick }: {
    icon: React.ReactNode,
    label: string,
    value: string,
    total: string,
    onClick?: () => void
}) {
    return (
        <button
            type="button"
            className="p-3 flex flex-row items-center justify-center gap-3 hover:bg-white/[0.02] active:bg-white/[0.05] cursor-pointer transition-colors border-r border-white/5 last:border-0 w-full group"
            onClick={onClick}
        >
            <div className="p-1.5 rounded-lg bg-white/5 text-white/40 group-hover:text-white/80 group-hover:bg-white/10 transition-colors">
                {icon}
            </div>
            <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">{label}</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-white/90">{value}</span>
                    <span className="text-[10px] font-medium text-white/70">{total}</span>
                </div>
            </div>
        </button>
    );
}

