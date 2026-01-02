import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatHours } from '@/utils';

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
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Combine hours and mins back to fractional hours for formatHours
    const workHours = totalHours + (remainingMins / 60);
    const breakHrs = totalBreakHours + (remainingBreakMins / 60);
    const pauseHrs = totalPauseHours + (remainingPauseMins / 60);

    return (
        <div className="px-6 py-8 sm:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-border bg-card/50">
            <Card className="bg-card border-border/50 shadow-none">
                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">
                        Toplam Çalışma
                    </span>
                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5">
                        {formatHours(workHours, isMobile)}
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-card border-border/50 shadow-none">
                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">
                        Toplam Mola
                    </span>
                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5">
                        {formatHours(breakHrs, isMobile)}
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-card border-border/50 shadow-none">
                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">
                        Toplam Duraklatma
                    </span>
                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5 whitespace-nowrap">
                        {formatHours(pauseHrs, isMobile)}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});


ReportStats.displayName = 'ReportStats';
export default ReportStats;
