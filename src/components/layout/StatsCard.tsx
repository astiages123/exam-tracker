import { Youtube, Timer, TrendingUp, ArrowUpRight } from 'lucide-react';
import { formatHours } from '@/utils';
import { motion as Motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    completedHours: number;
    completedCount: number;
    totalVideos: number;
    totalHours: number;
    totalPercentage: number;
    onCompletedClick?: () => void;
    onDurationClick?: () => void;
}

export default function StatsCard({
    completedHours,
    completedCount,
    totalVideos,
    totalHours,
    totalPercentage,
    onCompletedClick,
    onDurationClick
}: StatsCardProps) {
    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative h-full"
        >
            {/* Professional Background Glow */}
            <div className="absolute -inset-0.5 bg-linear-to-br from-primary/10 via-emerald-500/5 to-blue-500/10 blur-2xl rounded-4xl opacity-50" />

            <div className="relative glass-card h-full rounded-3xl overflow-hidden border border-white/10 bg-[#0A0A0A]/60 shadow-xl shadow-black/40 p-5 flex flex-col justify-between gap-6 group">

                {/* Header: Overview */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald/10 border border-primary/20">
                                <TrendingUp size={20} className="text-emerald" />
                            </div>
                            <span className="text-[10px] font-black text-emerald/95 uppercase tracking-[0.2em]">Genel Performans</span>
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                            Aktif Maraton
                        </div>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-4xl font-black tracking-tighter text-emerald">
                                %{totalPercentage.toFixed(1)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald/80 uppercase tracking-widest mt-1">Tamamlanma Oranı</span>
                        </div>

                        {/* Interactive Sparkline-like visual (Decorative) */}
                        <div className="flex items-end gap-1 h-12">
                            {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 1].map((h, i) => (
                                <Motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h * 100}%` }}
                                    transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }}
                                    className={cn(
                                        "w-1.5 rounded-t-sm",
                                        i === 6 ? "bg-white" : "bg-white/10"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent w-full" />

                {/* Stats Grid */}
                <div className="flex flex-col gap-3">
                    <StatRow
                        icon={<Youtube size={18} className="text-red-500" />}
                        label="Tamamlanan İçerik"
                        value={completedCount.toString()}
                        total={`/ ${totalVideos}`}
                        percentage={(completedCount / (totalVideos || 1)) * 100}
                        onClick={onCompletedClick}
                    />
                    <StatRow
                        icon={<Timer size={18} className="text-blue-400" />}
                        label="Toplam Süre"
                        value={formatHours(completedHours)}
                        total={`/ ${formatHours(totalHours)}`}
                        percentage={(completedHours / (totalHours || 1)) * 100}
                        onClick={onDurationClick}
                    />
                </div>
            </div>
        </Motion.div>
    );
}

function StatRow({ icon, label, value, total, percentage, onClick }: {
    icon: React.ReactNode,
    label: string,
    value: string,
    total: string,
    percentage: number,
    onClick?: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group w-full flex flex-col gap-3 p-3.5 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/6 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden"
        >
            {/* Hover Background Glow */}
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center gap-3 relative z-10">
                {/* Icon Box */}
                <div className="p-2 rounded-xl bg-white/5 group-hover:bg-emerald/10 transition-colors shrink-0 items-center justify-center flex border border-white/5 group-hover:border-primary/20 shadow-sm">
                    {icon}
                </div>

                {/* Text Content */}
                <div className="flex flex-col justify-center min-w-0 flex-1 h-full">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-bold text-emerald/90 uppercase tracking-widest truncate group-hover:text-emerald transition-colors">
                            {label}
                        </span>
                        <ArrowUpRight size={10} className="text-emerald/70 group-hover:text-emerald transition-colors" />
                    </div>
                    <div className="flex items-baseline gap-1.5 w-full truncate">
                        <span className="text-lg font-black text-emerald tracking-tight truncate group-hover:text-emerald transition-colors">
                            {value}
                        </span>
                        <span className="text-[10px] font-bold text-emerald/70 truncate">
                            {total}
                        </span>
                    </div>
                </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative z-10 border border-white/5">
                <Motion.div
                    className="h-full bg-emerald/40 group-hover:bg-emerald transition-colors shadow-[0_0_8px_rgba(var(--color-primary),0.3)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </div>
        </button>
    );
}

