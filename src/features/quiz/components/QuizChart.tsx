/**
 * QuizChart Component
 * 
 * A flexible chart component for rendering various chart types (line, bar, pie, area)
 * used within quiz questions and statistics.
 */

import React from 'react';
import {
    LineChart, Line,
    BarChart, Bar,
    PieChart, Pie, Cell,
    AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, LabelList,
    PieLabelRenderProps
} from 'recharts';

// Chart color palette
export const CHART_COLORS = ['#04b2a6', '#f97316', '#8b5cf6', '#ec4899', '#22c55e', '#3b82f6', '#eab308', '#ef4444'];

export interface ChartData {
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    displayMode?: 'percent' | 'angle';
    data: Array<{ label: string; value: number; angle?: number; }>;
}

/**
 * Custom label renderer for pie chart slices
 * Supports both angle (216°) and percent (%60) display modes
 */
export const createPieLabel = (displayMode: 'angle' | 'percent' = 'percent') => (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, payload } = props;
    // Recharts types might be loose, but usually cx/cy are numbers.
    // Need to cast if they are undefined in type definition but present in runtime.
    const RADIAN = Math.PI / 180;

    // Safety check for required coordinates
    const _cx = Number(cx) || 0;
    const _cy = Number(cy) || 0;
    const _midAngle = Number(midAngle) || 0;
    const _inner = Number(innerRadius) || 0;
    const _outer = Number(outerRadius) || 0;

    const radius = _inner + (_outer - _inner) * 0.5;
    const x = _cx + radius * Math.cos(-_midAngle * RADIAN);
    const y = _cy + radius * Math.sin(-_midAngle * RADIAN);

    // Angle mode: show as 216°
    // Percent mode: show as %60
    const displayText = displayMode === 'angle' && payload.angle
        ? `${payload.angle}°`
        : `%${((percent || 0) * 100).toFixed(0)}`;

    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
            {displayText}
        </text>
    );
};

interface QuizChartProps {
    chartData?: ChartData | null;
}

/**
 * QuizChart Component
 * 
 * Renders various chart types based on chartData configuration.
 */
const QuizChart: React.FC<QuizChartProps> = ({ chartData }) => {
    if (!chartData || !chartData.data || chartData.data.length === 0) return null;

    const { type, title, xAxisLabel, yAxisLabel, data, displayMode } = chartData;

    const commonProps = {
        margin: { top: 25, right: 30, left: 0, bottom: 0 }
    };

    const renderChart = () => {
        switch (type) {
            case 'line':
                return (
                    <LineChart data={data} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#04b2a6" strokeWidth={2} dot={{ fill: '#04b2a6', r: 5 }}>
                            <LabelList dataKey="value" position="top" fill="#f3f4f6" fontSize={11} />
                        </Line>
                    </LineChart>
                );
            case 'bar':
                return (
                    <BarChart data={data} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <Legend />
                        <Bar dataKey="value" fill="#04b2a6" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="value" position="top" fill="#f3f4f6" fontSize={11} />
                        </Bar>
                    </BarChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={createPieLabel(displayMode || 'percent')}
                            labelLine={false}
                        >
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend />
                    </PieChart>
                );
            case 'area':
                return (
                    <AreaChart data={data} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <Legend />
                        <Area type="monotone" dataKey="value" stroke="#04b2a6" fill="#04b2a6" fillOpacity={0.3}>
                            <LabelList dataKey="value" position="top" fill="#f3f4f6" fontSize={11} />
                        </Area>
                    </AreaChart>
                );
            default:
                return null;
        }
    };

    return (
        <div className="my-4 p-4 bg-muted/30 rounded-xl border border-border">
            {title && (
                <h4 className="text-sm font-semibold text-foreground mb-3 text-center">{title}</h4>
            )}
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart() as React.ReactElement}
                </ResponsiveContainer>
            </div>
            {(xAxisLabel || yAxisLabel) && (
                <div className="flex justify-between text-xs text-muted-foreground mt-2 px-4">
                    {xAxisLabel && <span>X: {xAxisLabel}</span>}
                    {yAxisLabel && <span>Y: {yAxisLabel}</span>}
                </div>
            )}
        </div>
    );
};

export default QuizChart;
