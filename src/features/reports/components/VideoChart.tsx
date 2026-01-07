import React from 'react';
import { MonitorPlay } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import CustomTooltip from './CustomTooltip';
import type { ChartItem } from '../hooks/useReportData';
import { cn } from '@/lib/utils';

interface VideoChartProps {
    data: ChartItem[];
    onShowFullHistory: () => void;
    className?: string;
}

const VideoChart = React.memo(({ data = [], onShowFullHistory, className }: VideoChartProps) => {
    return (
        <Card
            className="cursor-pointer hover:bg-white/3 transition-all group border-border/40"
            onClick={onShowFullHistory}
        >
            <CardContent className="p-5">
                <div className="mb-4 flex justify-between items-start">
                    <div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-orange-400 transition-colors">
                            İzlenen Video
                        </h3>
                        <p className="text-[11px] text-zinc-300 font-medium">
                            Son 1 haftayı gösterir
                        </p>
                    </div>
                </div>
                {data.length > 0 ? (
                    <div className={cn("w-full h-[200px] sm:h-[260px]", className)}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="displayDate"
                                    stroke="#d4d4d8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                />
                                <YAxis
                                    stroke="#d4d4d8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                    domain={[0, (max: number) => Math.max(12, Math.ceil(max / 3) * 3)]}
                                    ticks={[0, 3, 6, 9, 12]}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    name="Video"
                                    stroke="#ea580c"
                                    strokeWidth={3}
                                    dot={{ fill: '#ea580c', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground/30">
                        <MonitorPlay size={32} className="mb-2 opacity-20" />
                        <p className="text-xs">Veri yok</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

VideoChart.displayName = 'VideoChart';
export default VideoChart;
