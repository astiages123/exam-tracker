import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Calendar, BookOpen, Trash2, BarChart2, List, MonitorPlay } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { courseData } from '../data';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from './ui/ConfirmModal';

const CATEGORY_STYLES = {
    'DEFAULT': { bg: 'bg-white/5', border: 'border-white/10', text: 'text-custom-title/80' }
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const isDuration = payload[0].dataKey === 'hours';

        let valueText = '';
        if (isDuration) {
            const totalMinutes = Math.round(payload[0].value * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            valueText = hours > 0 ? `${hours} sa ${minutes} dk` : `${minutes} dk`;
        } else {
            valueText = `${payload[0].value} video`;
        }

        return (
            <div className="bg-custom-header border border-custom-category p-3 rounded-lg shadow-xl min-w-[150px]">
                <p className="text-custom-title/80 text-xs mb-1 font-medium border-b border-white/5 pb-1">{data.fullDate}</p>
                <p className="text-custom-accent font-bold text-sm mt-1">
                    {valueText}
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

export default function ReportModal({ sessions = [], onClose, courses = [], onDelete, videoHistory = [] }) {
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showFullHistory, setShowFullHistory] = useState(null); // 'duration', 'videos' or null
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'graph'
    const [confirmDelete, setConfirmDelete] = useState(null); // { sessionIds: [] } or null

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !selectedGroup && !showFullHistory) onClose();
            if (e.key === 'Escape') {
                if (selectedGroup) setSelectedGroup(null);
                if (showFullHistory) setShowFullHistory(null);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose, selectedGroup, showFullHistory]);

    const getCourseCategory = React.useCallback((courseId) => {
        if (!courseId) return '';
        const categoryGroup = courseData.find(cat => cat.courses.some(c => c.id === courseId));
        return categoryGroup ? categoryGroup.category.split('(')[0].replace(/^\d+\.\s*/, '').trim() : '';
    }, []);

    const getCourseName = React.useCallback((courseId) => {
        if (!courseId) return 'Genel Çalışma';
        if (!Array.isArray(courses)) return 'Bilinmeyen Ders';
        const found = courses.find(c => c.id === courseId);
        return found ? found.name : 'Bilinmeyen Ders';
    }, [courses]);

    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const workSessions = safeSessions.filter(s => s && s.type === 'work');
    const breakSessions = safeSessions.filter(s => s && s.type === 'break');

    const totalMinutes = workSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = Math.round(totalMinutes % 60);

    const totalBreakMinutesRaw = breakSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
    const totalBreakHours = Math.floor(totalBreakMinutesRaw / 60);
    const remainingBreakMins = Math.round(totalBreakMinutesRaw % 60);

    const aggregatedSessions = useMemo(() => {
        const groups = {};
        workSessions.forEach(session => {
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

    const filterWeekends = (data) => {
        const satIndex = data.findIndex(r => {
            const d = new Date(r.date);
            return d.getDay() === 6;
        });
        const sunIndex = data.findIndex(r => {
            const d = new Date(r.date);
            return d.getDay() === 0;
        });

        if (satIndex !== -1 && sunIndex !== -1) {
            const satVal = data[satIndex].hours !== undefined ? data[satIndex].hours : data[satIndex].count;
            const sunVal = data[sunIndex].hours !== undefined ? data[sunIndex].hours : data[sunIndex].count;
            if (satVal > 0 && sunVal === 0) {
                data.splice(sunIndex, 1);
            } else if (sunVal > 0 && satVal === 0) {
                data.splice(satIndex, 1);
            }
        }
        return data;
    };

    const chartData = useMemo(() => {
        const dailyData = {};
        workSessions.forEach(session => {
            if (!session.timestamp) return;
            const dateObj = new Date(session.timestamp);
            const dateKey = dateObj.toLocaleDateString("en-CA");
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { seconds: 0, courseIds: new Set() };
            }
            dailyData[dateKey].seconds += (session.duration || 0);
            if (session.courseId) dailyData[dateKey].courseIds.add(session.courseId);
        });

        let result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toLocaleDateString("en-CA");
            const dayInfo = dailyData[dateKey] || { seconds: 0, courseIds: new Set() };
            const courseNames = Array.from(dayInfo.courseIds).map(id => getCourseName(id));

            result.push({
                date: dateKey,
                hours: parseFloat((dayInfo.seconds / 3600).toFixed(1)),
                fullDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                displayDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                courses: courseNames
            });
        }
        return filterWeekends(result);
    }, [workSessions, getCourseName]);

    const videoChartData = useMemo(() => {
        const dailyCounts = {};
        (videoHistory || []).forEach(history => {
            if (!history.timestamp) return;
            const dateKey = new Date(history.timestamp).toLocaleDateString("en-CA");
            if (!dailyCounts[dateKey]) {
                dailyCounts[dateKey] = { count: 0, courseIds: new Set() };
            }
            dailyCounts[dateKey].count += 1;
            if (history.courseId) dailyCounts[dateKey].courseIds.add(history.courseId);
        });

        let result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toLocaleDateString("en-CA");
            const dayInfo = dailyCounts[dateKey] || { count: 0, courseIds: new Set() };
            const courseNames = Array.from(dayInfo.courseIds).map(id => getCourseName(id));

            result.push({
                date: dateKey,
                count: dayInfo.count,
                fullDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                displayDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                courses: courseNames
            });
        }
        return filterWeekends(result);
    }, [videoHistory, getCourseName]);

    const fullChartData = useMemo(() => {
        const dates = {};
        workSessions.forEach(s => {
            if (!s.timestamp) return;
            const dateStr = new Date(s.timestamp).toLocaleDateString("en-CA");
            if (!dates[dateStr]) dates[dateStr] = { hours: 0, count: 0, date: dateStr, courseIds: new Set() };
            dates[dateStr].hours += (s.duration || 0) / 3600;
            if (s.courseId) dates[dateStr].courseIds.add(s.courseId);
        });
        (videoHistory || []).forEach(h => {
            if (!h.timestamp) return;
            const dateStr = new Date(h.timestamp).toLocaleDateString("en-CA");
            if (!dates[dateStr]) dates[dateStr] = { hours: 0, count: 0, date: dateStr, courseIds: new Set() };
            dates[dateStr].count += 1;
            if (h.courseId) dates[dateStr].courseIds.add(h.courseId);
        });
        return Object.values(dates)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(item => ({
                ...item,
                hours: parseFloat(item.hours.toFixed(1)),
                displayDate: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                fullDate: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                courses: Array.from(item.courseIds).map(id => getCourseName(id))
            }));
    }, [workSessions, videoHistory, getCourseName]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
            onClick={onClose}
        >
            <Motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-custom-bg border border-custom-category rounded-2xl w-[95%] sm:w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-custom-category flex justify-between items-center bg-custom-header rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-custom-text flex items-center gap-2">
                            <BookOpen className="text-custom-accent" size={20} />
                            Çalışma Raporu
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <button
                                onClick={() => setActiveTab('list')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'list'
                                    ? 'bg-custom-accent/10 text-custom-accent ring-1 ring-custom-accent/30'
                                    : 'text-custom-title/60 hover:bg-custom-header hover:text-custom-text'
                                    }`}
                            >
                                <List size={16} />
                                Oturumlar
                            </button>
                            <button
                                onClick={() => setActiveTab('graph')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'graph'
                                    ? 'bg-custom-accent/10 text-custom-accent ring-1 ring-custom-accent/30'
                                    : 'text-custom-title/60 hover:bg-custom-header hover:text-custom-text'
                                    }`}
                            >
                                <BarChart2 size={16} />
                                Çalışma Grafiği
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
                <div className="px-4 py-6 md:px-6 grid grid-cols-2 gap-4 border-b border-custom-category bg-custom-bg/50">
                    <div className="bg-custom-header p-2.5 rounded-xl border border-custom-category/20">
                        <span className="text-[10px] text-custom-title/40 uppercase tracking-wider font-bold">Toplam Çalışma</span>
                        <div className="text-xl font-mono font-bold text-custom-text mt-0.5">
                            {totalHours}sa {remainingMins}dk
                        </div>
                    </div>
                    <div className="bg-custom-header p-2.5 rounded-xl border border-custom-category/20">
                        <span className="text-[10px] text-custom-title/40 uppercase tracking-wider font-bold">Toplam Mola</span>
                        <div className="text-xl font-mono font-bold text-custom-text mt-0.5">
                            {totalBreakHours}sa {remainingBreakMins}dk
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
                    {activeTab === 'list' ? (
                        aggregatedSessions.length === 0 ? (
                            <div className="text-center py-12 text-custom-title/40">
                                <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Henüz kayıtlı bir çalışma oturumu bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {aggregatedSessions.map((group) => (
                                    <div
                                        key={group.key}
                                        className="relative flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:px-4 sm:py-3 bg-custom-header/40 rounded-xl border border-custom-category/20 hover:border-custom-accent/30 hover:bg-custom-header/60 transition-all duration-300 group gap-2 sm:gap-0 cursor-pointer shadow-sm"
                                        onClick={() => setSelectedGroup(group)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-full bg-custom-accent/10 text-custom-accent">
                                                <BookOpen size={14} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-custom-text text-sm w-full sm:max-w-[250px] truncate leading-tight">
                                                    {getCourseName(group.courseId)}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[11px] text-custom-title/60 font-medium mt-0.5">
                                                    <Calendar size={10} />
                                                    {new Date(group.date).toLocaleDateString('tr-TR')}
                                                    {getCourseCategory(group.courseId) && (
                                                        <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded border-[0.5px] bg-white/5 border-white/10 text-custom-title/50 ml-1 whitespace-nowrap">
                                                            {getCourseCategory(group.courseId)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 mt-2 sm:mt-0">
                                            <div className="text-right">
                                                <span className="font-mono font-bold text-custom-text text-sm">{Math.round(group.totalDuration / 60)}</span>
                                                <span className="text-[10px] text-custom-title/40 ml-0.5 uppercase">dk</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDelete({ sessionIds: group.sessionIds });
                                                }}
                                                className="p-1.5 text-custom-title/20 hover:text-custom-error hover:bg-custom-error/10 rounded-lg transition-colors cursor-pointer"
                                                title="Kaydı Sil"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                            {/* Duration Chart */}
                            <div
                                className="bg-custom-header/20 p-4 sm:p-5 rounded-2xl border border-custom-category/10 cursor-pointer hover:bg-custom-header/40 transition-all group"
                                onClick={() => setShowFullHistory('duration')}
                            >
                                <div className="mb-4 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-base font-bold text-custom-text group-hover:text-custom-accent transition-colors">Çalışma Süresi</h3>
                                        <p className="text-[11px] text-custom-title/40">Son 1 haftayı gösterir</p>
                                    </div>
                                    <div className="px-1.5 py-0.5 bg-custom-accent/10 border border-custom-accent/20 rounded text-[9px] text-custom-accent font-bold uppercase tracking-tight">Tümü</div>
                                </div>
                                {chartData.length > 0 ? (
                                    <div className="w-full h-[260px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                                <XAxis dataKey="displayDate" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                                <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}s`} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[260px] text-custom-title/30">
                                        <BarChart2 size={32} className="mb-2 opacity-20" />
                                        <p className="text-xs">Veri yok</p>
                                    </div>
                                )}
                            </div>

                            {/* Video Count Chart */}
                            <div
                                className="bg-custom-header/20 p-4 sm:p-5 rounded-2xl border border-custom-category/10 cursor-pointer hover:bg-custom-header/40 transition-all group"
                                onClick={() => setShowFullHistory('videos')}
                            >
                                <div className="mb-4 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-base font-bold text-custom-text group-hover:text-orange-400 transition-colors">İzlenen Video</h3>
                                        <p className="text-[11px] text-custom-title/40">Son 1 haftayı gösterir</p>
                                    </div>
                                    <div className="px-1.5 py-0.5 bg-orange-400/10 border border-orange-400/20 rounded text-[9px] text-orange-400 font-bold uppercase tracking-tight">Tümü</div>
                                </div>
                                {videoChartData.length > 0 ? (
                                    <div className="w-full h-[260px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={videoChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                                <XAxis dataKey="displayDate" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                                <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line type="monotone" dataKey="count" name="Video" stroke="#ea580c" strokeWidth={3} dot={{ fill: '#ea580c', r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[260px] text-custom-title/30">
                                        <MonitorPlay size={32} className="mb-2 opacity-20" />
                                        <p className="text-xs">Veri yok</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Motion.div>

            {/* Sub-Modal for Detailed Chart */}
            <AnimatePresence>
                {selectedGroup && (
                    <SessionChartModal
                        group={selectedGroup}
                        courseName={getCourseName(selectedGroup.courseId)}
                        workSessions={workSessions}
                        breakSessions={breakSessions}
                        onClose={() => setSelectedGroup(null)}
                        onDelete={onDelete}
                    />
                )}
            </AnimatePresence>

            {/* Full History Graph Modal */}
            <AnimatePresence>
                {showFullHistory && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200"
                        onClick={() => setShowFullHistory(null)}
                    >
                        <Motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-custom-bg border border-custom-category rounded-2xl shadow-2xl w-full max-w-5xl aspect-[16/10] sm:aspect-auto sm:h-[75vh] overflow-hidden flex flex-col cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-custom-category bg-custom-header flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-custom-text">
                                        {showFullHistory === 'duration' ? 'Çalışma Süresi' : 'İzlenen Video'}
                                    </h3>
                                    <p className="text-[11px] text-custom-title/40">
                                        {showFullHistory === 'duration' ? 'Günlük saat bazlı performans' : 'Günlük tamamlanan video sayıları'}
                                    </p>
                                </div>
                                <button onClick={() => setShowFullHistory(null)} className="p-2 hover:bg-custom-bg rounded-xl text-custom-title/40 hover:text-custom-text transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 p-4 sm:p-6">
                                <div className="w-full h-full min-h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={fullChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                            <XAxis
                                                dataKey="displayDate"
                                                stroke="#ffffff30"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={15}
                                                interval={fullChartData.length > 20 ? 'preserveStartEnd' : 0}
                                            />
                                            <YAxis
                                                stroke="#ffffff30"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => showFullHistory === 'duration' ? `${v}s` : v}
                                                allowDecimals={showFullHistory === 'duration'}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line
                                                type="monotone"
                                                dataKey={showFullHistory === 'duration' ? 'hours' : 'count'}
                                                name={showFullHistory === 'duration' ? 'Süre' : 'Video'}
                                                stroke={showFullHistory === 'duration' ? '#a78bfa' : '#fb923c'}
                                                strokeWidth={4}
                                                dot={fullChartData.length < 50 ? { fill: showFullHistory === 'duration' ? '#a78bfa' : '#fb923c', r: 4 } : false}
                                                activeDot={{ r: 8, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="p-4 border-t border-custom-category bg-custom-header/50 flex justify-center gap-12">
                                <div className="text-center">
                                    <p className="text-[10px] text-custom-title/40 uppercase font-bold tracking-widest mb-1 font-sans">Toplam Gün</p>
                                    <p className="text-xl font-mono font-bold text-custom-text">{fullChartData.length}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-custom-title/40 uppercase font-bold tracking-widest mb-1 font-sans">
                                        {showFullHistory === 'duration' ? 'Toplam Süre' : 'Toplam Video'}
                                    </p>
                                    <p className="text-xl font-mono font-bold text-custom-accent">
                                        {showFullHistory === 'duration'
                                            ? (() => {
                                                const totalHours = fullChartData.reduce((acc, curr) => acc + curr.hours, 0);
                                                const h = Math.floor(totalHours);
                                                const m = Math.round((totalHours - h) * 60);
                                                return h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
                                            })()
                                            : `${fullChartData.reduce((acc, curr) => acc + curr.count, 0)} video`}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-custom-title/40 uppercase font-bold tracking-widest mb-1 font-sans">
                                        {showFullHistory === 'duration' ? 'En Fazla Çalışma' : 'En Fazla Video'}
                                    </p>
                                    <p className="text-xl font-mono font-bold text-custom-text">
                                        {showFullHistory === 'duration'
                                            ? (() => {
                                                const peak = Math.max(...fullChartData.map(d => d.hours), 0);
                                                const h = Math.floor(peak);
                                                const m = Math.round((peak - h) * 60);
                                                return h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
                                            })()
                                            : `${Math.max(...fullChartData.map(d => d.count), 0)} video`}
                                    </p>
                                </div>
                            </div>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Kaydı Sil"
                message="Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmText="Evet, Sil"
                cancelText="İptal"
                onConfirm={() => {
                    if (onDelete && confirmDelete?.sessionIds) {
                        onDelete(confirmDelete.sessionIds);
                    }
                    setConfirmDelete(null);
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}

function SessionChartModal({ group, courseName, workSessions, breakSessions, onClose, onDelete }) {
    const [confirmDelete, setConfirmDelete] = useState(null); // { sessionId } or null
    const isSameDay = (d1, d2) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const { timelineItems, startHour, endHour, isToday } = useMemo(() => {
        const targetDate = new Date(group.date);
        const dayWork = workSessions.filter(s => isSameDay(s.timestamp, targetDate) && s.courseId === group.courseId);
        const dayBreaks = breakSessions.filter(s => isSameDay(s.timestamp, targetDate));

        let finalItems = [];

        dayWork.forEach(s => {
            const start = new Date(s.timestamp);
            const end = new Date(s.timestamp + (s.duration * 1000));
            finalItems.push({ start, end, type: 'work', duration: s.duration, sessionId: s.timestamp });

            if (s.pauses && s.pauses.length > 0) {
                s.pauses.forEach((p, idx) => {
                    if (p.start && p.end) {
                        finalItems.push({
                            start: new Date(p.start),
                            end: new Date(p.end),
                            type: 'pause-interval',
                            duration: (p.end - p.start) / 1000
                        });
                    }
                });
            }
        });

        dayBreaks.forEach(s => {
            const start = new Date(s.timestamp);
            const end = new Date(s.timestamp + (s.duration * 1000));
            finalItems.push({ start, end, type: 'break', duration: s.duration, sessionId: s.timestamp });
        });

        finalItems.sort((a, b) => a.start - b.start);

        let minTime = null;
        let maxTime = null;

        finalItems.forEach(item => {
            if (!minTime || item.start < minTime) minTime = item.start;
            if (!maxTime || item.end > maxTime) maxTime = item.end;
        });

        const today = new Date();
        const viewedDate = new Date(group.date);
        const isTodayDate = isSameDay(today, viewedDate);

        // Eğer bugünse, mevcut saati de görünür alan içinde tutalım
        if (isTodayDate) {
            if (!minTime || today < minTime) minTime = today;
            if (!maxTime || today > maxTime) maxTime = today;
        }

        let sHour = 9;
        let eHour = 18;

        if (minTime && maxTime) {
            sHour = minTime.getHours();
            eHour = maxTime.getHours() + 1;

            // 1 saatlik esneklik/pad ekleyelim
            sHour = Math.max(0, sHour - 1);
            eHour = Math.min(24, eHour + 1);
        }

        return {
            timelineItems: finalItems,
            startHour: sHour,
            endHour: eHour,
            isToday: isTodayDate
        };
    }, [group, workSessions, breakSessions]);

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
            <Motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-custom-header border border-custom-category rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-3 border-b border-custom-category bg-custom-bg/30 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-custom-text text-sm">Günlük Zaman Çizelgesi</h3>
                        <p className="text-[10px] text-custom-title/40">{new Date(group.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-custom-bg rounded-lg text-custom-title/40 hover:text-custom-text transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 overflow-x-auto overflow-y-visible custom-scrollbar">
                    <div className="relative min-w-[700px] h-48 pt-20">
                        <div className="absolute inset-0 w-full h-full pointer-events-none">
                            {Array.from({ length: (endHour - startHour) * 2 + 1 }).map((_, i) => {
                                const totalMinutes = (startHour * 60) + (i * 30);
                                const hour = Math.floor(totalMinutes / 60);
                                const minute = totalMinutes % 60;
                                const leftPercent = (i / ((endHour - startHour) * 2)) * 100;
                                return (
                                    <div
                                        key={i}
                                        className={`absolute top-0 bottom-0 border-l ${minute === 30 ? 'border-white/5' : 'border-white/10'} flex flex-col justify-end pb-0`}
                                        style={{ left: `${leftPercent}%` }}
                                    >
                                        <span className="absolute top-4 -translate-x-1/2 text-[10px] text-custom-title/30 font-mono font-bold whitespace-nowrap">
                                            {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {currentTimePos !== null && (
                            <div
                                className="absolute top-[-24px] bottom-0 w-[2px] bg-red-500/80 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                style={{ left: `${currentTimePos}%` }}
                            >
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
                                <div className="absolute top-1 left-2 text-[9px] font-bold text-red-500 bg-black/60 px-1 rounded">Şimdi</div>
                            </div>
                        )}

                        <div className="absolute top-0 bottom-0 left-0 right-0">
                            {timelineItems.map((item, index) => {
                                const itemStartHour = item.start.getHours() + (item.start.getMinutes() / 60);
                                const itemEndHour = item.end.getHours() + (item.end.getMinutes() / 60);
                                const startPercent = ((itemStartHour - startHour) / (endHour - startHour)) * 100;
                                const durationPercent = ((itemEndHour - itemStartHour) / (endHour - startHour)) * 100;

                                const isWork = item.type === 'work';
                                const isBreak = item.type === 'break';
                                const isPause = item.type === 'pause-interval';

                                let bgClass = 'bg-white/5';
                                let borderClass = 'border-white/5';
                                let shadowClass = 'shadow-none';
                                let label = 'Boş Zaman';

                                if (isWork) {
                                    bgClass = 'bg-indigo-500/30';
                                    borderClass = 'border-indigo-500/40';
                                    shadowClass = 'shadow-none';
                                    label = 'Çalışma Bloğu';
                                } else if (isBreak) {
                                    bgClass = 'bg-emerald-500/30';
                                    borderClass = 'border-emerald-500/40';
                                    shadowClass = 'shadow-none';
                                    label = 'Mola';
                                } else if (isPause) {
                                    bgClass = 'bg-custom-title/10';
                                    borderClass = 'border-custom-title/20';
                                    label = 'Durduruldu';
                                }

                                return (
                                    <div
                                        key={index}
                                        className={`absolute h-12 rounded-lg border-2 ${bgClass} ${borderClass} shadow-lg ${shadowClass} transition-all duration-200 hover:scale-105 hover:z-30 cursor-pointer group/block flex items-center justify-center`}
                                        style={{
                                            left: `${startPercent}%`,
                                            width: `calc(${Math.max(durationPercent, 0.5)}% - 2px)`,
                                            top: '64px'
                                        }}
                                        onClick={async (e) => {
                                            if (isWork || isBreak) {
                                                e.stopPropagation();
                                                setConfirmDelete({ sessionId: item.sessionId });
                                            }
                                        }}
                                    >
                                        {durationPercent > 3 && (
                                            <div className="text-white/90">
                                                {isWork && <BookOpen size={14} />}
                                                {isBreak && <Clock size={14} />}
                                            </div>
                                        )}

                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-custom-header border border-custom-category text-xs p-3 rounded-lg shadow-xl whitespace-nowrap z-50 opacity-0 group-hover/block:opacity-100 transition-opacity pointer-events-none min-w-[140px]">
                                            <div className="font-bold mb-1 text-center text-custom-text border-b border-white/10 pb-2">
                                                {item.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {item.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="flex items-center justify-center gap-2 mt-2">
                                                <div className={`w-2 h-2 rounded-full ${isWork ? 'bg-indigo-400' : (isBreak ? 'bg-emerald-400' : 'bg-custom-title/20')}`}></div>
                                                <span className={`${isWork ? 'text-indigo-400' : (isBreak ? 'text-emerald-400' : 'text-custom-title')} font-bold`}>
                                                    {label}
                                                </span>
                                            </div>
                                            <div className="text-center text-custom-title/60 mt-1">
                                                {Math.round(item.duration / 60)} dakika
                                            </div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-custom-header"></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-3 border-t border-custom-category bg-custom-bg/30 flex justify-center gap-6 text-[10px] font-medium text-custom-title/40 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-indigo-500/40 border border-indigo-500/50"></div>
                        <span>Çalışma Oturumu ({courseName})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-emerald-500/40 border border-emerald-500/50"></div>
                        <span>Mola</span>
                    </div>
                </div>
            </Motion.div>

            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Kaydı Sil"
                message="Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmText="Evet, Sil"
                cancelText="İptal"
                onConfirm={() => {
                    if (onDelete && confirmDelete?.sessionId) {
                        onDelete([confirmDelete.sessionId]);
                        onClose();
                    }
                    setConfirmDelete(null);
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
