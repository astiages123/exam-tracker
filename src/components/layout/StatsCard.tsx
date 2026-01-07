import { Youtube, Timer, TrendingUp } from 'lucide-react';
import { formatHours } from '@/utils';
import { motion as Motion } from 'framer-motion';

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
            {/* Ambiyans Glow */}
            <div className="absolute -inset-0.5 bg-linear-to-b from-primary/5 to-transparent blur-xl rounded-4xl opacity-50" />

            <div className="relative glass-card h-full rounded-3xl overflow-hidden border border-white/10 bg-[#0A0A0A]/60 shadow-xl shadow-black/40 p-4 flex flex-col justify-between gap-4">

                {/* Header Section */}
                <div className="flex items-center gap-4">
                    <div className="relative p-2.5 rounded-2xl bg-linear-to-br from-white/10 to-white/5 border border-white/10 shrink-0">
                        <TrendingUp size={24} className="text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">Genel İlerleme</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-linear-to-b from-white to-white/70">
                                %{totalPercentage.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/5 w-full" />

                {/* Stats List */}
                <div className="flex flex-col gap-2.5 flex-1 justify-center">
                    <StatRow
                        icon={<Youtube size={18} className="text-red-500" />}
                        label="Tamamlanan Video"
                        value={completedCount.toString()}
                        total={`/ ${totalVideos}`}
                        onClick={onCompletedClick}
                    />
                    <StatRow
                        icon={<Timer size={18} className="text-blue-400" />}
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

function StatRow({ icon, label, value, total, onClick }: {
    icon: React.ReactNode,
    label: string,
    value: string,
    total: string,
    onClick?: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all border border-transparent hover:border-white/5 cursor-pointer"
        >
            {/* Icon Box */}
            <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors shrink-0 items-center justify-center flex border border-white/5 group-hover:border-white/10">
                {icon}
            </div>

            {/* Text Content */}
            <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate w-full text-left group-hover:text-white/60 transition-colors">
                    {label}
                </span>
                <div className="flex items-baseline gap-1.5 w-full truncate">
                    <span className="text-base font-bold text-white tracking-tight truncate group-hover:text-primary transition-colors">
                        {value}
                    </span>
                    <span className="text-xs font-medium text-white/30 truncate">
                        {total}
                    </span>
                </div>
            </div>
        </button>
    );
}
