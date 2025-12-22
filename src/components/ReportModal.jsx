import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Calendar, BookOpen, Trash2, ChevronDown, BarChart2, List } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { courseData } from '../data';
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_STYLES = {
    'DEFAULT': { bg: 'bg-white/5', border: 'border-white/10', text: 'text-custom-title/80' }
};

export default function ReportModal({ sessions = [], onClose, courses = [], onDelete }) {
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'graph'

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only close if ESC is pressed AND no sub-modal (highlighted chart) is open
            if (e.key === 'Escape' && !selectedGroup) onClose();
        };

        // Modal scroll lock
        document.body.style.overflow = 'hidden';

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose, selectedGroup]);

    // Helper to find course category
    const getCourseCategory = (courseId) => {
        if (!courseId) return '';
        const categoryGroup = courseData.find(cat => cat.courses.some(c => c.id === courseId));
        return categoryGroup ? categoryGroup.category.split('(')[0].replace(/^\d+\.\s*/, '').trim() : '';
    };

    const getCourseName = (courseId) => {
        if (!courseId) return 'Genel Çalışma';
        if (!Array.isArray(courses)) return 'Bilinmeyen Ders';
        const found = courses.find(c => c.id === courseId);
        return found ? found.name : 'Bilinmeyen Ders';
    };

    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const workSessions = safeSessions.filter(s => s && s.type === 'work');
    const breakSessions = safeSessions.filter(s => s && s.type === 'break');

    // Stats Calculations
    const totalMinutes = workSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = Math.round(totalMinutes % 60);

    const totalBreakMinutesRaw = breakSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
    const totalBreakHours = Math.floor(totalBreakMinutesRaw / 60);
    const remainingBreakMins = Math.round(totalBreakMinutesRaw % 60);

    // Aggregate sessions by Date and Course
    const aggregatedSessions = useMemo(() => {
        const groups = {};

        workSessions.forEach(session => {
            // Safety check for timestamp
            if (!session.timestamp) return;

            const dateKey = new Date(session.timestamp).toLocaleDateString();
            const key = `${dateKey}_${session.courseId}`;

            if (!groups[key]) {
                groups[key] = {
                    key,
                    date: session.timestamp,
                    courseId: session.courseId,
                    totalDuration: 0,
                    sessionIds: []
                };
            }
            groups[key].totalDuration += (session.duration || 0);
            groups[key].sessionIds.push(session.timestamp);
        });

        return Object.values(groups).sort((a, b) => b.date - a.date);
    }, [workSessions]);

    // Graph Data Calculation
    const chartData = useMemo(() => {
        const dailyData = {};

        workSessions.forEach(session => {
            if (!session.timestamp) return;
            // Use local date string to group by day safely
            const dateObj = new Date(session.timestamp);
            const dateKey = dateObj.toLocaleDateString("en-CA"); // YYYY-MM-DD

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { seconds: 0, courseIds: new Set() };
            }
            dailyData[dateKey].seconds += (session.duration || 0);
            if (session.courseId) {
                dailyData[dateKey].courseIds.add(session.courseId);
            }
        });

        // Generate last 6 days
        const result = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toLocaleDateString("en-CA");

            const dayInfo = dailyData[dateKey] || { seconds: 0, courseIds: new Set() };
            const courseNames = Array.from(dayInfo.courseIds).map(id => getCourseName(id));

            result.push({
                date: dateKey,
                hours: parseFloat((dayInfo.seconds / 3600).toFixed(1)), // Hours with 1 decimal
                fullDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                displayDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                dayIndex: d.getDay(), // 0 = Sun, 6 = Sat
                courses: courseNames
            });
        }

        // Weekend Logic: If one weekend day has work and the other is 0, hide the 0 day.
        const satIndex = result.findIndex(r => r.dayIndex === 6);
        const sunIndex = result.findIndex(r => r.dayIndex === 0);

        if (satIndex !== -1 && sunIndex !== -1) {
            const satHours = result[satIndex].hours;
            const sunHours = result[sunIndex].hours;

            if (satHours > 0 && sunHours === 0) {
                // Remove Sunday
                result.splice(sunIndex, 1);
            } else if (sunHours > 0 && satHours === 0) {
                // Remove Saturday
                result.splice(satIndex, 1);
            }
        }

        return result;
    }, [workSessions, courses]);

    // Custom Tooltip for Chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-custom-header border border-custom-category p-3 rounded-lg shadow-xl min-w-[150px]">
                    <p className="text-custom-title/80 text-xs mb-1 font-medium border-b border-white/5 pb-1">{data.fullDate}</p>
                    <p className="text-custom-accent font-bold text-sm mt-1">
                        {payload[0].value} Saat
                    </p>
                    {data.courses && data.courses.length > 0 && (
                        <div className="mt-2 space-y-1">
                            <p className="text-[10px] text-custom-title/40 uppercase font-bold tracking-wider">Çalışılan Dersler:</p>
                            {data.courses.map((course, idx) => (
                                <div key={idx} className="text-xs text-custom-text flex items-center gap-1.5 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-custom-accent/40" />
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

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-custom-bg border border-custom-category rounded-2xl w-[95%] sm:w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-custom-category flex justify-between items-center bg-custom-header rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-custom-text flex items-center gap-2">
                            <BookOpen className="text-custom-accent" />
                            Çalışma Raporu
                        </h2>
                        {/* Tab Navigation */}
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                onClick={() => setActiveTab('list')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'list'
                                    ? 'bg-custom-accent/10 text-custom-accent ring-1 ring-custom-accent/50'
                                    : 'text-custom-title/60 hover:bg-custom-header hover:text-custom-text'
                                    }`}
                            >
                                <List size={16} />
                                Oturumlar
                            </button>
                            <button
                                onClick={() => setActiveTab('graph')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'graph'
                                    ? 'bg-custom-accent/10 text-custom-accent ring-1 ring-custom-accent/50'
                                    : 'text-custom-title/60 hover:bg-custom-header hover:text-custom-text'
                                    }`}
                            >
                                <BarChart2 size={16} />
                                Performans Grafiği
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-custom-bg/50 rounded-lg text-custom-title/50 hover:text-white hover:bg-custom-error/20 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>


                {/* Stats */}
                <div className="p-4 md:p-6 grid grid-cols-2 gap-3 md:gap-4 border-b border-custom-category bg-custom-bg/50">
                    <div className="bg-custom-header p-4 rounded-xl border border-custom-category/30">
                        <span className="text-xs text-custom-title/50 uppercase tracking-wider font-bold">Toplam Çalışma</span>
                        <div className="text-2xl font-mono font-bold text-custom-text mt-1">
                            {totalHours}sa {remainingMins}dk
                        </div>
                    </div>
                    <div className="bg-custom-header p-4 rounded-xl border border-custom-category/30">
                        <span className="text-xs text-custom-title/50 uppercase tracking-wider font-bold">Toplam Mola Süresi</span>
                        <div className="text-2xl font-mono font-bold text-custom-text mt-1">
                            {totalBreakHours}sa {remainingBreakMins}dk
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    {activeTab === 'list' ? (
                        /* List View */
                        <>
                            {aggregatedSessions.length === 0 ? (
                                <div className="text-center py-12 text-custom-title/40">
                                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Henüz kayıtlı bir çalışma oturumu bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {aggregatedSessions.map((group) => {
                                        const style = CATEGORY_STYLES['DEFAULT'];

                                        return (
                                            <div
                                                key={group.key}
                                                className="relative flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-custom-header/40 rounded-xl border border-custom-category/20 hover:border-custom-accent/30 hover:bg-custom-header/60 transition-all duration-300 group gap-3 sm:gap-0 cursor-pointer shadow-sm hover:shadow-md"
                                                onClick={() => setSelectedGroup(group)}
                                            >

                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 rounded-full bg-custom-accent/10 text-custom-accent">
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-custom-text text-sm w-full sm:max-w-[300px] truncate">
                                                            {getCourseName(group.courseId)}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs text-custom-title/80 font-semibold mt-1">
                                                            <Calendar size={12} />
                                                            {new Date(group.date).toLocaleDateString('tr-TR')}
                                                            {getCourseCategory(group.courseId) && (
                                                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-none border-[0.5px] ${style.bg} ${style.border} ${style.text} ml-2 whitespace-nowrap`}>
                                                                    {getCourseCategory(group.courseId)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 mt-2 sm:mt-0">
                                                    <div className="text-right">
                                                        <span className="font-mono font-bold text-custom-text">{Math.round(group.totalDuration / 60)}</span>
                                                        <span className="text-xs text-custom-title/50 ml-1">dk</span>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onDelete) onDelete(group.sessionIds);
                                                        }}
                                                        className="p-2 text-custom-title/30 hover:text-custom-error hover:bg-custom-error/10 rounded-lg transition-colors cursor-pointer"
                                                        title="Kaydı Sil"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Graph View */
                        <div className="h-full min-h-[400px] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-custom-text">Günlük Çalışma Performansı</h3>
                                    <p className="text-sm text-custom-title/60">Son 6 gün içindeki günlük çalışma süreleri</p>
                                </div>
                            </div>

                            {chartData.length > 0 ? (
                                <div className="w-full h-[400px] min-h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={chartData}
                                            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis
                                                dataKey="displayDate"
                                                stroke="#ffffff50"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={10}
                                            />
                                            <YAxis
                                                stroke="#ffffff50"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => `${value}s`}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 2 }} />
                                            <Line
                                                type="monotone"
                                                dataKey="hours"
                                                stroke="#a855f7" // custom-accent color hardcoded or use variable if possible, but hex is safer for recharts
                                                strokeWidth={3}
                                                dot={{ fill: '#a855f7', strokeWidth: 2, r: 4, stroke: '#1a1a1a' }}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-custom-title/40">
                                    <BarChart2 size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Görüntülenecek veri bulunamadı.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Sub-Modal for Detailed Chart */}
            <AnimatePresence>
                {selectedGroup && (
                    <SessionChartModal
                        group={selectedGroup}
                        courseName={getCourseName(selectedGroup.courseId)}
                        workSessions={workSessions}
                        breakSessions={breakSessions}
                        onClose={() => setSelectedGroup(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function SessionChartModal({ group, courseName, workSessions, breakSessions, onClose }) {
    // Esc key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Prepare Timeline Data
    const { timelineItems, startHour, endHour, isToday } = useMemo(() => {
        const items = [];

        // Helper to check same day
        const isSameDay = (d1, d2) => {
            const date1 = new Date(d1);
            const date2 = new Date(d2);
            return date1.getDate() === date2.getDate() &&
                date1.getMonth() === date2.getMonth() &&
                date1.getFullYear() === date2.getFullYear();
        };

        // Filter and Process Work Sessions
        workSessions.forEach(s => {
            if (s.courseId === group.courseId && isSameDay(s.timestamp, group.date)) {

                const start = new Date(s.timestamp);
                const pauses = s.pauses || [];

                if (pauses.length === 0) {
                    // Standard continuous session
                    const end = new Date(start.getTime() + (s.duration * 1000));
                    items.push({
                        type: 'work',
                        start: start,
                        end: end,
                        duration: s.duration,
                        courseId: s.courseId
                    });
                } else {
                    // Session with pauses - fragment it
                    let currentStart = start.getTime();
                    let accumulatedWork = 0;

                    // Sort pauses to be safe
                    const sortedPauses = [...pauses].sort((a, b) => a.start - b.start);

                    sortedPauses.forEach(pause => {
                        // 1. Work Segment before pause
                        // Check if there is actual work time before this pause starts
                        if (pause.start > currentStart) {
                            const segDuration = (pause.start - currentStart) / 1000;
                            if (segDuration > 0) {
                                items.push({
                                    type: 'work',
                                    start: new Date(currentStart),
                                    end: new Date(pause.start),
                                    duration: segDuration,
                                    courseId: s.courseId
                                });
                                accumulatedWork += segDuration;
                            }
                        }

                        // 2. Pause Segment
                        const pauseDuration = (pause.end - pause.start) / 1000;
                        if (pauseDuration > 0) {
                            items.push({
                                type: 'pause-interval', // Distinct from 'break' (standard pomodoro break)
                                start: new Date(pause.start),
                                end: new Date(pause.end),
                                duration: pauseDuration
                            });
                        }

                        currentStart = pause.end;
                    });

                    // 3. Remaining Work Segment after last pause
                    const remainingWork = s.duration - accumulatedWork;
                    if (remainingWork > 0) {
                        items.push({
                            type: 'work',
                            start: new Date(currentStart),
                            end: new Date(currentStart + (remainingWork * 1000)),
                            duration: remainingWork,
                            courseId: s.courseId
                        });
                    }
                }
            }
        });

        // Filter and Process Break Sessions
        breakSessions.forEach(s => {
            if (isSameDay(s.timestamp, group.date)) {
                // User's data indicates timestamp is START TIME
                const start = new Date(s.timestamp);
                const end = new Date(start.getTime() + (s.duration * 1000));

                items.push({
                    type: 'break',
                    start: start,
                    end: end,
                    duration: s.duration
                });
            }
        });

        // Sort by start time
        items.sort((a, b) => a.start - b.start);

        // Determine Range (Earliest Start -> Latest End)
        let minTime = new Date(group.date).setHours(24, 0, 0, 0);
        let maxTime = new Date(group.date).setHours(0, 0, 0, 0);
        let hasData = false;

        items.forEach(item => {
            if (item.start < minTime) minTime = item.start;
            if (item.end > maxTime) maxTime = item.end;
            hasData = true;
        });

        // Default range if no data
        let sHour = 9;
        let eHour = 18;

        if (hasData) {
            sHour = new Date(minTime).getHours();
            eHour = new Date(maxTime).getHours() + 1; // Round up

            // Add padding
            sHour = Math.max(0, sHour - 1);
            eHour = Math.min(24, eHour + 1);
        }

        // Check if viewed date is today
        const today = new Date();
        const viewedDate = new Date(group.date);
        const isTodayDate = isSameDay(today, viewedDate);

        return {
            timelineItems: items,
            startHour: sHour,
            endHour: eHour,
            isToday: isTodayDate
        };
    }, [group, workSessions, breakSessions]);

    // Current Time Position Calculation
    const getCurrentTimePosition = () => {
        const now = new Date();
        const currentHour = now.getHours() + (now.getMinutes() / 60);

        if (currentHour < startHour || currentHour > endHour) return null;

        return ((currentHour - startHour) / (endHour - startHour)) * 100;
    };

    const currentTimePos = isToday ? getCurrentTimePosition() : null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-custom-header border border-custom-category rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-custom-category bg-custom-bg/30 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-custom-text">Günlük Zaman Çizelgesi</h3>
                        <p className="text-xs text-custom-title/60">{new Date(group.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-custom-bg rounded-lg text-custom-title/50 hover:text-custom-text transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Timeline Container */}
                <div className="p-6 overflow-x-auto overflow-y-visible custom-scrollbar">
                    <div className="relative min-w-[800px] h-64 pt-32">

                        {/* Grid & Time Labels */}
                        <div className="absolute inset-0 w-full h-full pointer-events-none">
                            {Array.from({ length: endHour - startHour + 1 }).map((_, i) => {
                                const hour = startHour + i;
                                const leftPercent = (i / (endHour - startHour)) * 100;

                                return (
                                    <div
                                        key={hour}
                                        className="absolute top-0 bottom-0 border-l border-white/5 flex flex-col justify-end pb-0"
                                        style={{ left: `${leftPercent}%` }}
                                    >
                                        <span className="absolute top-4 -translate-x-1/2 text-xs text-custom-title/30 font-mono font-medium">
                                            {hour.toString().padStart(2, '0')}:00
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Current Time Indicator */}
                        {currentTimePos !== null && (
                            <div
                                className="absolute top-[-24px] bottom-0 w-[2px] bg-red-500/80 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                style={{ left: `${currentTimePos}%` }}
                            >
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
                                <div className="absolute top-1 left-2 text-[10px] font-bold text-red-500 bg-black/80 px-1 rounded">Şimdi</div>
                            </div>
                        )}

                        {/* Session Blocks */}
                        <div className="absolute top-0 bottom-0 left-0 right-0">
                            {timelineItems.map((item, index) => {
                                // Calculate Position
                                const itemStartHour = item.start.getHours() + (item.start.getMinutes() / 60);
                                const itemEndHour = item.end.getHours() + (item.end.getMinutes() / 60);

                                const startPercent = ((itemStartHour - startHour) / (endHour - startHour)) * 100;
                                const durationPercent = ((itemEndHour - itemStartHour) / (endHour - startHour)) * 100;

                                // Colors & Styles
                                const isWork = item.type === 'work';
                                const isBreak = item.type === 'break';
                                const isPause = item.type === 'pause-interval';

                                let bgClass = '';
                                let borderClass = '';
                                let shadowClass = '';

                                if (isWork) {
                                    bgClass = 'bg-custom-accent/80';
                                    borderClass = 'border-custom-accent';
                                    shadowClass = 'shadow-custom-accent/20';
                                } else if (isBreak) {
                                    bgClass = 'bg-custom-success/80';
                                    borderClass = 'border-custom-success';
                                    shadowClass = 'shadow-custom-success/20';
                                } else if (isPause) {
                                    bgClass = 'bg-custom-title/10'; // Gray for pause
                                    borderClass = 'border-custom-title/20';
                                    shadowClass = 'shadow-none';
                                }

                                return (
                                    <div
                                        key={index}
                                        className={`absolute h-12 rounded-lg border-2 ${bgClass} ${borderClass} shadow-lg ${shadowClass} transition-all duration-200 hover:scale-105 hover:z-30 cursor-pointer group/block flex items-center justify-center`}
                                        style={{
                                            left: `${startPercent}%`,
                                            width: `calc(${Math.max(durationPercent, 0.5)}% - 2px)`, // -2px for visual gap
                                            top: '96px' // Fixed top position for single lane (approx center of remaining space)
                                        }}
                                    >
                                        {/* Icon (only if width permits) */}
                                        {durationPercent > 3 && (
                                            <div className="text-white/90">
                                                {isWork && <BookOpen size={14} />}
                                                {isBreak && <Clock size={14} />}
                                                {/* No icon for pause or maybe a pause icon? */}
                                            </div>
                                        )}

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-custom-header border border-custom-category text-xs p-3 rounded-lg shadow-xl whitespace-nowrap z-50 opacity-0 group-hover/block:opacity-100 transition-opacity pointer-events-none min-w-[140px]">
                                            <div className="font-bold mb-1 text-center text-custom-text border-b border-white/10 pb-2">
                                                {item.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {item.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="flex items-center justify-center gap-2 mt-2">
                                                <div className={`w-2 h-2 rounded-full ${isWork ? 'bg-custom-accent' : (isBreak ? 'bg-custom-success' : 'bg-custom-title/50')}`}></div>
                                                <span className={`${isWork ? 'text-custom-accent' : (isBreak ? 'text-custom-success' : 'text-custom-title')} font-bold`}>
                                                    {isWork ? 'Çalışma Bloğu' : (isBreak ? 'Mola' : 'Durduruldu')}
                                                </span>
                                            </div>
                                            <div className="text-center text-custom-title/60 mt-1">
                                                {Math.round(item.duration / 60)} dakika
                                            </div>

                                            {/* Tooltip Arrow */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-custom-header"></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Legend */}
                <div className="p-4 border-t border-custom-category bg-custom-bg/30 flex justify-center gap-8 text-xs font-medium text-custom-title/60 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-custom-accent/80 border border-custom-accent"></div>
                        <span>Çalışma Oturumu ({courseName})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-custom-success/80 border border-custom-success"></div>
                        <span>Mola</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
