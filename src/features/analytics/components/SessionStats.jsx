/**
 * SessionStats Component
 * Shows quiz session statistics and performance
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, TrendingUp, Target } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

function formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

export function SessionStats({
    session,
    questionTimes = [],
    previousSessions = [],
    className = ''
}) {
    // Calculate stats
    const totalTimeMs = questionTimes.reduce((sum, q) => sum + (q.time_ms || 0), 0);
    const avgTimeMs = questionTimes.length > 0
        ? Math.round(totalTimeMs / questionTimes.length)
        : 0;

    const sortedByTime = [...questionTimes].sort((a, b) => b.time_ms - a.time_ms);
    const slowestQuestions = sortedByTime.slice(0, 3);

    // Prepare trend data
    const trendData = previousSessions.slice(0, 5).reverse().map((s, i) => ({
        session: i + 1,
        accuracy: s.total_questions > 0
            ? Math.round((s.correct_count / s.total_questions) * 100)
            : 0,
        avgTime: s.question_times?.length > 0
            ? Math.round(s.question_times.reduce((sum, q) => sum + q.time_ms, 0) / s.question_times.length / 1000)
            : 0
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`session-stats bg-gray-800/50 rounded-xl p-6 ${className}`}
        >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="text-indigo-400" size={20} />
                Oturum Özeti
            </h3>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <Clock className="mx-auto text-blue-400 mb-1" size={20} />
                    <div className="text-lg font-bold text-white">{formatTime(avgTimeMs)}</div>
                    <div className="text-xs text-gray-400">Ort. Süre</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <Zap className="mx-auto text-yellow-400 mb-1" size={20} />
                    <div className="text-lg font-bold text-white">{formatTime(totalTimeMs)}</div>
                    <div className="text-xs text-gray-400">Toplam</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <TrendingUp className="mx-auto text-green-400 mb-1" size={20} />
                    <div className="text-lg font-bold text-white">
                        {session?.correct_count || 0}/{session?.total_questions || 0}
                    </div>
                    <div className="text-xs text-gray-400">Başarı</div>
                </div>
            </div>

            {/* Slowest Questions */}
            {slowestQuestions.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                        🐢 En Çok Düşünülen Sorular
                    </h4>
                    <div className="space-y-2">
                        {slowestQuestions.map((q, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm text-gray-300 truncate flex-1">
                                    {q.title || `Soru ${q.order || i + 1}`}
                                </span>
                                <span className={`
                                    text-sm font-medium ml-2
                                    ${q.is_correct ? 'text-green-400' : 'text-red-400'}
                                `}>
                                    {formatTime(q.time_ms)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Trend Chart */}
            {trendData.length > 1 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                        📈 Son 5 Quiz Başarı Trendi
                    </h4>
                    <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="session"
                                tick={{ fill: '#9ca3af', fontSize: 10 }}
                                axisLine={{ stroke: '#4b5563' }}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fill: '#9ca3af', fontSize: 10 }}
                                axisLine={{ stroke: '#4b5563' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#f3f4f6'
                                }}
                                formatter={(value) => [`${value}%`, 'Başarı']}
                            />
                            <Line
                                type="monotone"
                                dataKey="accuracy"
                                stroke="#22c55e"
                                strokeWidth={2}
                                dot={{ fill: '#22c55e', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </motion.div>
    );
}

export default SessionStats;
