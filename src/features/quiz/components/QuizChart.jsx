/**
 * QuizChart Component
 * Renders dynamic charts based on chart_data using Recharts
 */
import React from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function QuizChart({ chartData, className = '' }) {
    if (!chartData || !chartData.data || !Array.isArray(chartData.data) || chartData.data.length === 0) return null;

    // Defensive check for data integrity
    const isValidData = chartData.data.every(d => d && (typeof d.value === 'number' || !isNaN(Number(d.value))));
    if (!isValidData) {
        console.warn('Invalid chart data values detected in QuizChart');
        return null;
    }

    const { type, title, data, xAxisLabel, yAxisLabel } = chartData;

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                axisLine={{ stroke: '#4b5563' }}
                                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 12 } : undefined}
                            />
                            <YAxis
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                axisLine={{ stroke: '#4b5563' }}
                                tickCount={8}
                                allowDecimals={false}
                                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 } : undefined}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                axisLine={{ stroke: '#4b5563' }}
                                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 12 } : undefined}
                            />
                            <YAxis
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                axisLine={{ stroke: '#4b5563' }}
                                tickCount={8}
                                allowDecimals={false}
                                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 } : undefined}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={{ fill: '#6366f1', strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: '#818cf8' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`quiz-chart bg-gray-800/50 rounded-xl p-4 ${className}`}>
            {title && (
                <h4 className="text-sm font-medium text-gray-300 mb-3 text-center">
                    {title}
                </h4>
            )}
            {renderChart()}
        </div>
    );
}

export default QuizChart;
