import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface ReportStatsProps {
    totalHours: number;
    remainingMins: number;
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
    return (
        <div className="px-6 py-8 sm:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-border bg-card/50">
            <Card className="bg-card border-border/50 shadow-none">
                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">
                        Toplam Çalışma
                    </span>
                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5">
                        {totalHours}sa {remainingMins}dk
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-card border-border/50 shadow-none">
                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">
                        Toplam Mola
                    </span>
                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5">
                        {totalBreakHours}sa {remainingBreakMins}dk
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-card border-border/50 shadow-none">
                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">
                        Toplam Duraklatma
                    </span>
                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5 whitespace-nowrap">
                        {totalPauseHours > 0 ? `${totalPauseHours}sa ` : ''}{remainingPauseMins}dk
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});

ReportStats.displayName = 'ReportStats';
export default ReportStats;
