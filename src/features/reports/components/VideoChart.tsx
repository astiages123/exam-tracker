import React from 'react';
import { MonitorPlay } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CustomTooltip from './CustomTooltip';
import type { ChartItem } from '../hooks/useReportData';

interface VideoChartProps {
    data: ChartItem[];
    onShowFullHistory: () => void;
}

const VideoChart = React.memo(({ data, onShowFullHistory }: VideoChartProps) => {
    return (
        <Card
            className="cursor-pointer hover:bg-white/[0.03] transition-all group border-border/40"
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
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-auto px-1.5 py-0.5 bg-orange-400/10 border border-orange-400/20 rounded text-[9px] text-orange-400 font-bold uppercase tracking-tight hover:bg-orange-400/25 hover:text-orange-400 shadow-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowFullHistory();
                        }}
                    >
                        Tümü
                    </Button>
                </div>
                {data.length > 0 ? (
                    <div className="w-full h-[200px] sm:h-[260px]">
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
