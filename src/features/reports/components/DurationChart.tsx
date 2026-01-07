import React from 'react';
import { BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CustomTooltip from './CustomTooltip';
import type { ChartItem } from '../hooks/useReportData';
import { formatHours } from '@/utils';
import { cn } from '@/lib/utils';


interface DurationChartProps {
    data: ChartItem[];
    onShowFullHistory: () => void;
    className?: string;
}

const DurationChart = React.memo(({ data = [], onShowFullHistory, className }: DurationChartProps) => {
    return (
        <Card
            className="cursor-pointer hover:bg-white/3 transition-all group border-border/40"
            onClick={onShowFullHistory}
        >
            <CardContent className="p-5">
                <div className="mb-4 flex justify-between items-start">
                    <div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            Çalışma Süresi
                        </h3>
                        <p className="text-[11px] text-zinc-300 font-medium">
                            Son 1 haftayı gösterir
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-auto px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] text-primary font-bold uppercase tracking-tight hover:bg-primary/25 hover:text-primary shadow-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowFullHistory();
                        }}
                    >
                        Tümü
                    </Button>
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
                                    fontFamily="var(--font-mono)"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                />
                                <YAxis
                                    stroke="#d4d4d8"
                                    fontSize={10}
                                    fontFamily="var(--font-mono)"
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                    tickFormatter={(v) => v === 0 ? "0" : formatHours(v)}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="hours"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    dot={{ fill: '#8b5cf6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground/30">
                        <BarChart2 size={32} className="mb-2 opacity-20" />
                        <p className="text-xs">Veri yok</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

DurationChart.displayName = 'DurationChart';
export default DurationChart;
