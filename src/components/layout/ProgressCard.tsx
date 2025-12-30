import { Youtube, Timer, BadgeCheck, Zap } from 'lucide-react';
import { RANK_ICONS } from '@/constants/styles';
import { Goal } from 'lucide-react';
import { ProgressBar } from '@/components/stats/ProgressBars';
import { formatHours } from '@/utils';
import type { Rank } from '@/types';
import { motion as Motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressCardProps {
    totalPercentage: number;
    rankInfo: Rank;
    nextRank: Rank;
    completedHours: number;
    completedCount: number;
    totalVideos: number;
    totalHours: number;
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
                <div className="p-4 sm:p-5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        {/* Current Rank & Next Goal */}
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="relative p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                                    <Icon size={24} className="text-primary" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Sonraki Rütbe</span>
                                    <Zap size={10} className="text-amber-400 fill-amber-400/20" />
                                </div>
                                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    {nextRank.title}
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                </h2>
                                <p className="text-white/60 text-[13px] font-medium mt-0.5">
                                    Hedefe ulaşmak için <span className="text-primary font-bold">{(nextRank.min - totalPercentage).toFixed(1)}%</span> daha çalışmalısın
                                </p>
                            </div>
                        </div>

                        {/* Overall Progress Circle/Display */}
                        <div className="flex items-center gap-4 bg-white/[0.02] p-3 sm:p-4 rounded-xl border border-white/5 ml-auto">
                            <div className="text-right">
                                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] block mb-0.5">Genel İlerleme</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                                        {totalPercentage.toFixed(1)}
                                    </span>
                                    <span className="text-base font-bold text-primary">%</span>
                                </div>
                            </div>
                            <div className="h-10 w-[1px] bg-white/10" />
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-[12px] font-bold text-white/70">
                                    <BadgeCheck size={14} className="text-emerald-400" />
                                    <span>{completedCount} Video</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[12px] font-bold text-white/70">
                                    <Timer size={14} className="text-sky-400" />
                                    <span>{formatHours(completedHours)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Progress Bar */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{rankInfo.title}</span>
                            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{nextRank.title}</span>
                        </div>
                        <ProgressBar
                            progress={totalPercentage}
                            currentLevelMin={rankInfo.min}
                            nextLevelMin={nextRank.min}
                        />
                    </div>
                </div>

                {/* Bottom Stats Grid */}
                <div className="grid grid-cols-2 border-t border-white/10 bg-black/20">
                    <StatItem
                        icon={<Youtube size={18} className="text-red-400" />}
                        label="Tamamlanan"
                        value={completedCount.toString()}
                        total={`/ ${totalVideos}`}
                        color="red"
                        onClick={onCompletedClick}
                    />
                    <StatItem
                        icon={<Timer size={18} className="text-sky-400" />}
                        label="Toplam Süre"
                        value={formatHours(completedHours)}
                        total={`/ ${formatHours(totalHours)}`}
                        color="sky"
                        onClick={onDurationClick}
                    />
                </div>
            </div>
        </Motion.div>
    );
}

function StatItem({ icon, label, value, total, color, onClick }: {
    icon: React.ReactNode,
    label: string,
    value: string,
    total: string,
    color: string,
    onClick?: () => void
}) {
    const colorVariants: Record<string, string> = {
        red: "bg-red-500/10 border-red-500/20",
        sky: "bg-sky-500/10 border-sky-500/20",
        emerald: "bg-emerald-500/10 border-emerald-500/20",
        violet: "bg-violet-500/10 border-violet-500/20"
    };

    return (
        <div
            className="p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:bg-white/[0.05] active:bg-white/[0.1] cursor-pointer transition-colors border-r border-white/5 last:border-0"
            onClick={onClick}
        >
            <div className={cn("p-1.5 rounded-lg border mb-0.5", colorVariants[color] || "bg-white/[0.03] border-white/5")}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{label}</span>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                    <span className="text-base font-black text-white">{value}</span>
                    <span className="text-[12px] font-medium text-white/60">{total}</span>
                </div>
            </div>
        </div>
    );
}

