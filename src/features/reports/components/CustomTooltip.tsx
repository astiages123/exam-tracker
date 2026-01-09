/**
 * CustomTooltip Component
 * 
 * A styled tooltip component for Recharts graphs.
 * Displays detailed information about chart data points.
 */

import React from 'react';
import { TooltipProps } from 'recharts';
import { formatHours } from '@/utils';

interface ChartDataPayload {
    name: string;
    hours: number;
    videos: number;
    fullDate: string;
    workCourses: string[];
    videoCourses: string[];
}

/**
 * Custom tooltip for session duration and video count charts
 */
const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        // Cast payload data to our custom shape
        const data = payload[0].payload as ChartDataPayload;
        const isDuration = payload[0].dataKey === 'hours';

        let valueText = '';
        if (isDuration) {
            const val = Number(payload[0].value) || 0;
            valueText = formatHours(val);
        } else {
            valueText = `${payload[0].value} video`;
        }


        // Get the relevant course list based on the active metric
        const displayCourses = isDuration ? data.workCourses : data.videoCourses;

        return (
            <div className="bg-card border border-secondary p-3 rounded-lg shadow-xl min-w-[150px]">
                <p className="text-muted-foreground text-xs mb-1 font-medium border-b border-white/5 pb-1">{data.fullDate}</p>
                <p className="text-emerald font-bold text-sm mt-1">
                    {valueText}
                </p>
                {displayCourses && displayCourses.length > 0 && (
                    <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {isDuration ? 'Çalışılan Dersler:' : 'İzlenen Dersler:'}
                        </p>
                        {displayCourses.map((course, idx) => (
                            <div key={idx} className="text-xs text-foreground flex items-center gap-1.5 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald/40" />
                                {course}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export default CustomTooltip;
