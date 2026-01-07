/**
 * FullHistoryModal Component
 * 
 * Modal showing full history chart for either duration or videos.
 */

import { BarChart2, MonitorPlay } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ModalCloseButton from '@/components/ui/ModalCloseButton';
import CustomTooltip from './CustomTooltip';
import type { ChartItem } from '../hooks/useReportData';
import { formatHours } from '@/utils';


interface FullHistoryModalProps {
    isOpen: boolean;
    type: 'duration' | 'videos' | null;
    data: ChartItem[];
    onClose: () => void;
}

export default function FullHistoryModal({ isOpen, type, data, onClose }: FullHistoryModalProps) {
    if (!type) return null;

    const isDuration = type === 'duration';

    // Calculate totals
    const totalHours = data.reduce((acc, curr) => acc + (curr.hours || 0), 0);
    const totalVideos = data.reduce((acc, curr) => acc + (curr.count || 0), 0);
    const peakHours = Math.max(...data.map(d => d.hours || 0), 0);
    const peakVideos = Math.max(...data.map(d => d.count || 0), 0);



    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="w-full max-w-full sm:max-w-7xl h-dvh sm:h-[90vh] sm:rounded-lg shadow-2xl overflow-hidden focus-visible:outline-none bg-background border-border rounded-none"
            >
                <div className="p-6 sm:p-8 border-b border-border bg-card/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3.5 rounded-xl border border-primary/10 mt-1">
                            {isDuration ? (
                                <BarChart2 className="text-primary" size={32} />
                            ) : (
                                <MonitorPlay className="text-orange-400" size={32} />
                            )}
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-foreground">
                                {isDuration ? 'Çalışma Süresi' : 'İzlenen Video'}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                                {isDuration ? 'Günlük saat bazlı performans' : 'Günlük tamamlanan video sayıları'}
                            </DialogDescription>
                        </div>
                    </div>
                    <ModalCloseButton onClick={onClose} className="-mr-2" />
                </div>

                <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                    <div className="w-full h-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="displayDate"
                                    stroke="#d4d4d8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    minTickGap={20}
                                />
                                <YAxis
                                    stroke="#d4d4d8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                    tickFormatter={(v) => {
                                        if (!isDuration) return v;
                                        return v === 0 ? "0" : formatHours(v);
                                    }}
                                    ticks={!isDuration ? [0, 3, 6, 9, 12] : undefined}
                                    domain={!isDuration ? [0, (max: number) => Math.max(12, Math.ceil(max / 3) * 3)] : [0, 'auto']}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey={isDuration ? 'hours' : 'count'}
                                    name={isDuration ? 'Süre' : 'Video'}
                                    stroke={isDuration ? '#a78bfa' : '#fb923c'}
                                    strokeWidth={4}
                                    dot={data.length < 50 ? { fill: isDuration ? '#a78bfa' : '#fb923c', r: 4 } : false}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="p-4 border-t border-border bg-card/30 flex justify-center gap-12">
                    <div className="text-center">
                        <p className="text-[10px] text-zinc-300 uppercase font-bold tracking-widest mb-1">Toplam Gün</p>
                        <p className="text-xl font-mono font-bold text-foreground">{data.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-zinc-300 uppercase font-bold tracking-widest mb-1">
                            {isDuration ? 'Toplam Süre' : 'Toplam Video'}
                        </p>
                        <p className="text-xl font-mono font-bold text-primary">
                            {isDuration ? formatHours(totalHours) : `${totalVideos} video`}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-zinc-300 uppercase font-bold tracking-widest mb-1">
                            {isDuration ? 'En Fazla Çalışma' : 'En Fazla Video'}
                        </p>
                        <p className="text-xl font-mono font-bold text-foreground">
                            {isDuration ? formatHours(peakHours) : `${peakVideos} video`}
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
