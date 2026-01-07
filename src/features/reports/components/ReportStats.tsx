import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatHours } from '@/utils';
import { Timer, Coffee, PauseCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ReportStatsProps {
    totalHours: number;
    remainingMins: number; // minutes
    totalBreakHours: number;
    remainingBreakMins: number;
    totalPauseHours: number;
    remainingPauseMins: number;
}

const ReportStats = React.memo(({
    totalHours,
    remainingMins,
    totalBreakHours,
    remainingBreakMins,
    totalPauseHours,
    remainingPauseMins
}: ReportStatsProps) => {
    // Combine hours and mins back to fractional hours for formatHours
    const workHours = totalHours + (remainingMins / 60);
    const breakHrs = totalBreakHours + (remainingBreakMins / 60);
    const pauseHrs = totalPauseHours + (remainingPauseMins / 60);

    const stats = [
        {
            label: 'Toplam Çalışma',
            value: workHours,
            icon: Timer,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20'
        },
        {
            label: 'Toplam Mola',
            value: breakHrs,
            icon: Coffee,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        },
        {
            label: 'Toplam Duraklatma',
            value: pauseHrs,
            icon: PauseCircle,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20'
        }
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {stats.map((stat, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Card
                        className={cn(
                            "relative overflow-hidden border transition-all duration-300",
                            "bg-zinc-900/40 hover:bg-zinc-900/60",
                            "hover:shadow-[0_0_20px_-12px_rgba(0,0,0,0.5)] group",
                            stat.border
                        )}
                    >


                        <CardContent className="relative p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-col gap-0.5 sm:gap-1">
                                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-zinc-400/80">
                                    {stat.label}
                                </span>
                                <div className={cn(
                                    "text-lg sm:text-2xl font-bold font-mono tracking-tight",
                                    "bg-linear-to-br from-white to-zinc-400 bg-clip-text text-transparent"
                                )}>
                                    {formatHours(stat.value)}
                                </div>
                            </div>
                            <div className={cn(
                                "self-end sm:self-center p-2 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                                stat.bg,
                                stat.color
                            )}>
                                <stat.icon size={20} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
});


ReportStats.displayName = 'ReportStats';
export default ReportStats;

