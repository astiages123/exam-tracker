import React, { useState, useEffect, useMemo } from 'react';
import { Clock, BookOpen, Trash2, BarChart2, List, MonitorPlay, Edit2, Save, ChartNoAxesCombined, Calendar, ChartArea, Pause } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { courseData } from '../data';
import { COURSE_ICONS } from '../constants/styles';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmModal from './ui/ConfirmModal';
import ModalCloseButton from './ui/ModalCloseButton';



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

        // Get the relevant course list based on the active metric
        const displayCourses = isDuration ? data.workCourses : data.videoCourses;

        return (
            <div className="bg-card border border-secondary p-3 rounded-lg shadow-xl min-w-[150px]">
                <p className="text-muted-foreground text-xs mb-1 font-medium border-b border-white/5 pb-1">{data.fullDate}</p>
                <p className="text-primary font-bold text-sm mt-1">
                    {valueText}
                </p>
                {displayCourses && displayCourses.length > 0 && (
                    <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {isDuration ? 'Çalışılan Dersler:' : 'İzlenen Dersler:'}
                        </p>
                        {displayCourses.map((course, idx) => (
                            <div key={idx} className="text-xs text-foreground flex items-center gap-1.5 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
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

export default function ReportModal({ sessions = [], onClose, courses = [], onDelete, onUpdate, videoHistory = [], progressData = {} }) {
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showFullHistory, setShowFullHistory] = useState(null); // 'duration', 'videos' or null
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'graph'
    const [confirmDelete, setConfirmDelete] = useState(null); // { sessionIds: [] } or null
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Pre-calculate memoized styles for categories to avoid overhead
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

    const totalPauseMinutes = useMemo(() => {
        let totalMs = 0;

        // 1. İş oturumları içindeki duraklatmalar
        workSessions.forEach(s => {
            if (s.pauses) {
                s.pauses.forEach(p => {
                    totalMs += (p.end - p.start);
                });
            }
        });

        // 2. Aynı gün içindeki oturumlar arası boşluklar
        const sessionsByDay = {};
        [...workSessions, ...breakSessions].forEach(s => {
            if (!s.timestamp) return;
            const dateStr = new Date(s.timestamp).toLocaleDateString("en-CA");
            if (!sessionsByDay[dateStr]) sessionsByDay[dateStr] = [];

            const internalPauseMs = s.pauses ? s.pauses.reduce((acc, p) => acc + (p.end - p.start), 0) : 0;
            const start = s.timestamp;
            const end = s.timestamp + ((s.duration || 0) * 1000) + internalPauseMs;

            sessionsByDay[dateStr].push({ start, end });
        });

        Object.values(sessionsByDay).forEach(daySessions => {
            daySessions.sort((a, b) => a.start - b.start);
            for (let i = 0; i < daySessions.length - 1; i++) {
                const gap = daySessions[i + 1].start - daySessions[i].end;
                if (gap > 1000) totalMs += gap;
            }
        });

        return Math.floor(totalMs / 1000 / 60);
    }, [workSessions, breakSessions]);

    const totalPauseHours = Math.floor(totalPauseMinutes / 60);
    const remainingPauseMins = totalPauseMinutes % 60;

    const filteredVideoHistory = useMemo(() => {
        return (videoHistory || []).filter(h => {
            const completedIds = progressData[h.courseId] || [];
            return completedIds.includes(h.videoId);
        });
    }, [videoHistory, progressData]);

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
        return data.filter(item => {
            const val = item.hours !== undefined ? item.hours : item.count;
            return (val || 0) > 0;
        });
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
        const loopDays = isMobile ? 3 : 6;
        for (let i = loopDays; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toLocaleDateString("en-CA");
            const dayInfo = dailyData[dateKey] || { seconds: 0, courseIds: new Set() };
            const courseNames = Array.from(dayInfo.courseIds).map(id => getCourseName(id));

            result.push({
                date: dateKey,
                hours: dayInfo.seconds / 3600,
                fullDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                displayDate: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                workCourses: courseNames,
                videoCourses: []
            });
        }
        return filterWeekends(result);
    }, [workSessions, getCourseName, isMobile]);

    const videoChartData = useMemo(() => {
        const dailyCounts = {};
        filteredVideoHistory.forEach(history => {
            if (!history.timestamp) return;
            const dateKey = new Date(history.timestamp).toLocaleDateString("en-CA");
            if (!dailyCounts[dateKey]) {
                dailyCounts[dateKey] = { count: 0, courseIds: new Set() };
            }
            dailyCounts[dateKey].count += 1;
            if (history.courseId) dailyCounts[dateKey].courseIds.add(history.courseId);
        });

        let result = [];
        const loopDays = isMobile ? 3 : 6;
        for (let i = loopDays; i >= 0; i--) {
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
                workCourses: [],
                videoCourses: courseNames
            });
        }
        return filterWeekends(result);
    }, [filteredVideoHistory, getCourseName, isMobile]);

    const fullChartData = useMemo(() => {
        const dates = {};
        workSessions.forEach(s => {
            if (!s.timestamp) return;
            const dateStr = new Date(s.timestamp).toLocaleDateString("en-CA");
            if (!dates[dateStr]) dates[dateStr] = { hours: 0, count: 0, date: dateStr, workCourseIds: new Set(), videoCourseIds: new Set() };
            dates[dateStr].hours += (s.duration || 0) / 3600;
            if (s.courseId) dates[dateStr].workCourseIds.add(s.courseId);
        });
        filteredVideoHistory.forEach(h => {
            if (!h.timestamp) return;
            const dateStr = new Date(h.timestamp).toLocaleDateString("en-CA");
            if (!dates[dateStr]) dates[dateStr] = { hours: 0, count: 0, date: dateStr, workCourseIds: new Set(), videoCourseIds: new Set() };
            dates[dateStr].count += 1;
            if (h.courseId) dates[dateStr].videoCourseIds.add(h.courseId);
        });
        return Object.values(dates)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(item => ({
                ...item,
                hours: item.hours,
                displayDate: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                fullDate: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                workCourses: Array.from(item.workCourseIds).map(id => getCourseName(id)),
                videoCourses: Array.from(item.videoCourseIds).map(id => getCourseName(id))
            }));
    }, [workSessions, filteredVideoHistory, getCourseName]);

    return (
        <>
            <Dialog open={true} onOpenChange={(open) => {
                if (!open && !selectedGroup && !showFullHistory && !confirmDelete) {
                    onClose();
                }
            }}>
                <DialogContent className="w-full max-w-full sm:max-w-7xl h-[100dvh] sm:h-[90vh] flex flex-col p-0 gap-0 bg-background border-border shadow-2xl overflow-hidden focus-visible:outline-none rounded-none sm:rounded-lg">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-border flex justify-between items-center bg-card/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3.5 rounded-xl border border-primary/10 mt-1">
                                    <ChartNoAxesCombined className="text-primary" size={40} />
                                </div>
                                <div className="flex flex-col">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-bold text-foreground">
                                            Çalışma Raporu
                                        </DialogTitle>
                                        <DialogDescription className="sr-only">
                                            Detaylı çalışma raporu ve istatistikler.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <TabsList className="mt-2 bg-muted/50 w-full sm:w-auto grid grid-cols-2 sm:flex">
                                        <TabsTrigger value="list" className="gap-2">
                                            <List size={14} /> <span>Oturumlar</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="graph" className="gap-2">
                                            <BarChart2 size={14} /> <span>Çalışma Grafiği</span>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </div>
                            <DialogClose asChild>
                                <ModalCloseButton className="-mr-2" />
                            </DialogClose>
                        </div>

                        {/* Stats */}
                        <div className="px-6 py-8 sm:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-border bg-muted/20">
                            <Card className="bg-card border-border/50 shadow-none">
                                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">Toplam Çalışma</span>
                                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5">
                                        {totalHours}sa {remainingMins}dk
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-card border-border/50 shadow-none">
                                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">Toplam Mola</span>
                                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5">
                                        {totalBreakHours}sa {remainingBreakMins}dk
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-card border-border/50 shadow-none">
                                <CardContent className="p-3 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-3 sm:gap-0">
                                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold">Toplam Duraklatma</span>
                                    <div className="text-base sm:text-lg font-mono font-bold text-zinc-200 mt-0.5 whitespace-nowrap">
                                        {totalPauseHours > 0 ? `${totalPauseHours}sa ` : ''}{remainingPauseMins}dk
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            <ScrollArea className="h-full w-full">
                                <div className="p-6 sm:p-8 w-full">
                                    <TabsContent value="list" className="mt-0 focus-visible:ring-0">
                                        {aggregatedSessions.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground/40">
                                                <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                                <p>Henüz kayıtlı bir çalışma oturumu bulunmuyor.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {aggregatedSessions.map((group) => (
                                                    <Card
                                                        key={group.key}
                                                        className="relative cursor-pointer hover:bg-muted/50 transition-colors border-border/40 shadow-sm group bg-card/30"
                                                        onClick={() => setSelectedGroup(group)}
                                                    >
                                                        <CardContent className="p-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-3.5 rounded-full bg-primary/10 text-primary">
                                                                    {(() => {
                                                                        const courseName = getCourseName(group.courseId);
                                                                        const matchingKey = Object.keys(COURSE_ICONS).find(key => courseName.startsWith(key));
                                                                        const CourseIcon = matchingKey ? COURSE_ICONS[matchingKey] : BookOpen;
                                                                        return <CourseIcon size={32} />;
                                                                    })()}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-foreground text-base w-full sm:max-w-[350px] truncate leading-tight">
                                                                        {getCourseName(group.courseId)}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2.5 text-xs text-zinc-300 font-medium mt-1">
                                                                        <Calendar size={12} />
                                                                        {new Date(group.date).toLocaleDateString('tr-TR')}
                                                                        {getCourseCategory(group.courseId) && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border-[0.5px] bg-white/5 border-white/10 text-zinc-300 ml-1 whitespace-nowrap">
                                                                                {getCourseCategory(group.courseId)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-end w-full sm:w-auto gap-3 mt-2 sm:mt-0">
                                                                <div className="text-right">
                                                                    <span className="font-mono font-bold text-zinc-200 text-lg">
                                                                        {(() => {
                                                                            const mins = Math.round(group.totalDuration / 60);
                                                                            const h = Math.floor(mins / 60);
                                                                            const m = mins % 60;
                                                                            return h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConfirmDelete({ sessionIds: group.sessionIds });
                                                                    }}
                                                                    className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                                    title="Kaydı Sil"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="graph" className="mt-0 focus-visible:ring-0">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                            {/* Duration Chart */}
                                            <Card
                                                className="cursor-pointer hover:bg-muted/30 transition-all group border-border/40"
                                                onClick={() => setShowFullHistory('duration')}
                                            >
                                                <CardContent className="p-5">
                                                    <div className="mb-4 flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">Çalışma Süresi</h3>
                                                            <p className="text-[11px] text-zinc-300 font-medium">Son 1 haftayı gösterir</p>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-auto px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] text-primary font-bold uppercase tracking-tight hover:bg-primary/25 hover:text-primary shadow-none"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowFullHistory('duration');
                                                            }}
                                                        >
                                                            Tümü
                                                        </Button>
                                                    </div>
                                                    {chartData.length > 0 ? (
                                                        <div className="w-full h-[200px] sm:h-[260px]">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                    <XAxis dataKey="displayDate" stroke="#d4d4d8" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                                                    <YAxis
                                                                        stroke="#d4d4d8"
                                                                        fontSize={10}
                                                                        tickLine={false}
                                                                        axisLine={false}
                                                                        allowDecimals={false}
                                                                        tickFormatter={(v) => v === 0 ? "0" : `${v} sa`}
                                                                    />
                                                                    <Tooltip content={<CustomTooltip />} />
                                                                    <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
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

                                            {/* Video Count Chart */}
                                            <Card
                                                className="cursor-pointer hover:bg-muted/30 transition-all group border-border/40"
                                                onClick={() => setShowFullHistory('videos')}
                                            >
                                                <CardContent className="p-5">
                                                    <div className="mb-4 flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-base font-bold text-foreground group-hover:text-orange-400 transition-colors">İzlenen Video</h3>
                                                            <p className="text-[11px] text-zinc-300 font-medium">Son 1 haftayı gösterir</p>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-auto px-1.5 py-0.5 bg-orange-400/10 border border-orange-400/20 rounded text-[9px] text-orange-400 font-bold uppercase tracking-tight hover:bg-orange-400/25 hover:text-orange-400 shadow-none"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowFullHistory('videos');
                                                            }}
                                                        >
                                                            Tümü
                                                        </Button>
                                                    </div>
                                                    {videoChartData.length > 0 ? (
                                                        <div className="w-full h-[200px] sm:h-[260px]">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={videoChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                    <XAxis dataKey="displayDate" stroke="#d4d4d8" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                                                    <YAxis
                                                                        stroke="#d4d4d8"
                                                                        fontSize={10}
                                                                        tickLine={false}
                                                                        axisLine={false}
                                                                        allowDecimals={false}
                                                                        domain={[0, (max) => Math.max(12, Math.ceil(max / 3) * 3)]}
                                                                        ticks={[0, 3, 6, 9, 12]}
                                                                    />
                                                                    <Tooltip content={<CustomTooltip />} />
                                                                    <Line type="monotone" dataKey="count" name="Video" stroke="#ea580c" strokeWidth={3} dot={{ fill: '#ea580c', r: 4 }} activeDot={{ r: 6 }} />
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
                                        </div>
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </div>
                    </Tabs>
                </DialogContent>
            </Dialog>

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
                        onUpdate={onUpdate}
                    />
                )}
            </AnimatePresence>

            {/* Full History Graph Modal */}
            <Dialog open={!!showFullHistory} onOpenChange={(open) => !open && setShowFullHistory(null)}>
                <DialogContent className="w-full max-w-full sm:max-w-7xl h-[100dvh] sm:h-[85vh] p-0 overflow-hidden flex flex-col bg-background border-border shadow-2xl rounded-none sm:rounded-lg">
                    <div className="p-6 sm:p-8 border-b border-border bg-card/50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3.5 rounded-xl border border-primary/10 mt-1">
                                {showFullHistory === 'duration' ? (
                                    <BarChart2 className="text-primary" size={32} />
                                ) : (
                                    <MonitorPlay className="text-orange-400" size={32} />
                                )}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-foreground">
                                    {showFullHistory === 'duration' ? 'Çalışma Süresi' : 'İzlenen Video'}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                                    {showFullHistory === 'duration' ? 'Günlük saat bazlı performans' : 'Günlük tamamlanan video sayıları'}
                                </DialogDescription>
                            </div>
                        </div>
                        <ModalCloseButton onClick={() => setShowFullHistory(null)} className="-mr-2" />
                    </div>

                    <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                        <div className="w-full h-full min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={fullChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
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
                                            if (showFullHistory !== 'duration') return v;
                                            return v === 0 ? "0" : `${v} sa`;
                                        }}
                                        ticks={showFullHistory === 'videos' ? [0, 3, 6, 9, 12] : undefined}
                                        domain={showFullHistory === 'videos' ? [0, (max) => Math.max(12, Math.ceil(max / 3) * 3)] : [0, 'auto']}
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

                    <div className="p-4 border-t border-border bg-card/30 flex justify-center gap-12">
                        <div className="text-center">
                            <p className="text-[10px] text-zinc-300 uppercase font-bold tracking-widest mb-1">Toplam Gün</p>
                            <p className="text-xl font-mono font-bold text-foreground">{fullChartData.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-zinc-300 uppercase font-bold tracking-widest mb-1">
                                {showFullHistory === 'duration' ? 'Toplam Süre' : 'Toplam Video'}
                            </p>
                            <p className="text-xl font-mono font-bold text-primary">
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
                            <p className="text-[10px] text-zinc-300 uppercase font-bold tracking-widest mb-1">
                                {showFullHistory === 'duration' ? 'En Fazla Çalışma' : 'En Fazla Video'}
                            </p>
                            <p className="text-xl font-mono font-bold text-foreground">
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
                </DialogContent>
            </Dialog>

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
        </>
    );
}

function SessionChartModal({ group, courseName, workSessions, breakSessions, onClose, onDelete, onUpdate }) {
    const [confirmDelete, setConfirmDelete] = useState(null); // { sessionId } or null
    const [selectedItem, setSelectedItem] = useState(null); // Timeline item
    const [editingSession, setEditingSession] = useState(null); // { sessionId, type, startTime, endTime, originalSession }

    // ... helper functions ... (Assuming they are not changed, but I have to include them if I replace the whole block or just the return)
    // Actually, I can just replace the return statement if I target it correctly.
    // The previous view showed helper functions. I will stick to replacing the return statement which starts at line 814.

    const isSameDay = (d1, d2) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const formatTimeForInput = (date) => {
        if (!date) return "";
        return date.getHours().toString().padStart(2, '0') + ":" + date.getMinutes().toString().padStart(2, '0');
    };

    const handleSaveEdit = (newStartTimeStr, newEndTimeStr) => {
        if (!editingSession) return;

        const date = new Date(group.date);
        const [sH, sM] = newStartTimeStr.split(':').map(Number);
        const [eH, eM] = newEndTimeStr.split(':').map(Number);

        const newStart = new Date(date);
        newStart.setHours(sH, sM, 0, 0);

        const newEnd = new Date(date);
        newEnd.setHours(eH, eM, 0, 0);

        if (newEnd <= newStart) {
            alert("Bitiş saati başlangıç saatinden büyük olmalıdır.");
            return;
        }

        const { originalSession, type, pauseIndex } = editingSession;
        let updatedSession = { ...originalSession };

        if (type === 'work' || type === 'break') {
            updatedSession.timestamp = newStart.getTime();
            const totalPauseMs = (updatedSession.pauses || []).reduce((acc, p) => acc + (p.end - p.start), 0);
            updatedSession.duration = Math.max(0, (newEnd.getTime() - newStart.getTime() - totalPauseMs) / 1000);
        } else if (type === 'pause-interval' && pauseIndex !== undefined) {
            const newPauses = [...(updatedSession.pauses || [])];
            newPauses[pauseIndex] = { start: newStart.getTime(), end: newEnd.getTime() };
            updatedSession.pauses = newPauses;
        }

        onUpdate(originalSession.timestamp, updatedSession);
        setEditingSession(null);
        setSelectedItem(null);
    };

    const { timelineItems, startHour, endHour, dayStats } = useMemo(() => {
        const targetDate = new Date(group.date);
        const dayWork = workSessions.filter(s => isSameDay(s.timestamp, targetDate) && s.courseId === group.courseId);
        const dayBreaks = breakSessions.filter(s => isSameDay(s.timestamp, targetDate));

        let finalItems = [];

        dayWork.forEach(s => {
            const pauses = [...(s.pauses || [])].sort((a, b) => a.start - b.start);
            const totalPauseMs = pauses.reduce((acc, p) => acc + (p.end - p.start), 0);
            const sessionEndMs = s.timestamp + (s.duration * 1000) + totalPauseMs;

            let currentStart = s.timestamp;
            let segmentIndex = 1;
            const hasPauses = pauses.length > 0;

            pauses.forEach((p, pIdx) => {
                // Add work period before the pause
                if (p.start > currentStart) {
                    finalItems.push({
                        start: new Date(currentStart),
                        end: new Date(p.start),
                        type: 'work',
                        duration: (p.start - currentStart) / 1000,
                        sessionId: s.timestamp,
                        originalSession: s,
                        segmentLabel: hasPauses ? (segmentIndex === 1 ? 'Başlangıç' : 'Devam') : null
                    });
                    segmentIndex++;
                }
                // Add the pause period
                finalItems.push({
                    start: new Date(p.start),
                    end: new Date(p.end),
                    type: 'pause-interval',
                    duration: (p.end - p.start) / 1000,
                    sessionId: s.timestamp,
                    pauseIndex: pIdx,
                    originalSession: s
                });
                currentStart = p.end;
            });

            // Add remaining work period after the last pause
            if (sessionEndMs > currentStart) {
                finalItems.push({
                    start: new Date(currentStart),
                    end: new Date(sessionEndMs),
                    type: 'work',
                    duration: (sessionEndMs - currentStart) / 1000,
                    sessionId: s.timestamp,
                    originalSession: s,
                    segmentLabel: hasPauses ? (segmentIndex === 1 ? 'Başlangıç' : 'Devam') : null
                });
            }
        });

        dayBreaks.forEach(s => {
            const start = new Date(s.timestamp);
            const end = new Date(s.timestamp + (s.duration * 1000));
            finalItems.push({ start, end, type: 'break', duration: s.duration, sessionId: s.timestamp, originalSession: s });
        });

        finalItems.sort((a, b) => a.start - b.start);

        // Oturumlar arasındaki boşlukları "duraklatma" olarak doldur
        const gapItems = [];
        for (let i = 0; i < finalItems.length - 1; i++) {
            const currentItem = finalItems[i];
            const nextItem = finalItems[i + 1];

            // Eğer iki öğe arasında boşluk varsa (en az 1 dakika)
            const gapMs = nextItem.start.getTime() - currentItem.end.getTime();
            if (gapMs >= 60000) {
                gapItems.push({
                    start: new Date(currentItem.end),
                    end: new Date(nextItem.start),
                    type: 'pause-interval',
                    duration: gapMs / 1000,
                    label: 'Boşluk (Duraklatıldı)'
                });
            }
        }

        if (gapItems.length > 0) {
            finalItems = [...finalItems, ...gapItems].sort((a, b) => a.start - b.start);
        }

        let minTime = null;
        let maxTime = null;

        let workTime = 0;
        let breakTime = 0;
        let pauseTime = 0;

        finalItems.forEach(item => {
            if (!minTime || item.start < minTime) minTime = item.start;
            if (!maxTime || item.end > maxTime) maxTime = item.end;

            if (item.type === 'work') workTime += item.duration;
            else if (item.type === 'break') breakTime += item.duration;
            else if (item.type === 'pause-interval') pauseTime += item.duration;
        });

        const today = new Date();
        const viewedDate = new Date(group.date);
        const isTodayDate = isSameDay(today, viewedDate);

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
            isToday: isTodayDate,
            dayStats: {
                work: Math.round(workTime / 60),
                break: Math.round(breakTime / 60),
                pause: Math.round(pauseTime / 60)
            }
        };
    }, [group, workSessions, breakSessions]);

    return (
        <Dialog open={true} onOpenChange={(open) => {
            if (!open && !confirmDelete && !editingSession) {
                onClose();
            }
        }}>
            <DialogContent className="w-full max-w-full sm:max-w-5xl h-[100dvh] sm:h-fit sm:max-h-[85vh] overflow-hidden flex flex-col bg-background border-border p-0 gap-0 shadow-2xl rounded-none sm:rounded-lg">
                <div className="p-6 border-b border-border bg-card/90 flex justify-between items-center shrink-0 relative z-20 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3.5 rounded-xl border border-primary/10 mt-1 flex-shrink-0">
                            <ChartArea className="text-primary" size={32} />
                        </div>
                        <div>
                            <DialogTitle className="font-bold text-foreground text-lg">Günlük Zaman Çizelgesi</DialogTitle>
                            <DialogDescription className="sr-only">
                                Seçilen gün için detaylı çalışma çizelgesi ve aktiviteler.
                            </DialogDescription>
                            <h3 className="sr-only">Günlük Zaman Çizelgesi</h3>
                            <p className="text-sm text-zinc-400 font-medium">{new Date(group.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <DialogClose asChild>
                        <ModalCloseButton className="-mr-2" />
                    </DialogClose>
                </div>

                {/* Günlük Özet */}
                <div className="px-8 py-5 bg-background/50 border-b border-white/5 flex items-center justify-start gap-8 shrink-0 relative z-20">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">Toplam Çalışma</span>
                        <span className="text-sm font-mono font-bold text-zinc-300">{dayStats.work} dk</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">Toplam Mola</span>
                        <span className="text-sm font-mono font-bold text-zinc-300">{dayStats.break} dk</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">Duraklatma</span>
                        <span className="text-sm font-mono font-bold text-primary">{dayStats.pause} dk</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10">
                    <div className="p-8 overflow-x-auto overflow-y-visible custom-scrollbar relative">
                        <div className="relative min-w-[700px] h-60 pt-24">
                            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
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
                                            <span className="absolute top-4 -translate-x-1/2 text-[10px] text-zinc-400 font-mono font-bold whitespace-nowrap">
                                                {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>



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
                                        label = `Çalışma (${courseName}${item.segmentLabel ? ` - ${item.segmentLabel}` : ''})`;
                                    } else if (isBreak) {
                                        bgClass = 'bg-emerald-500/30';
                                        borderClass = 'border-emerald-500/40';
                                        shadowClass = 'shadow-none';
                                        label = 'Mola';
                                    } else if (isPause) {
                                        bgClass = 'bg-muted/50';
                                        borderClass = 'border-muted-foreground/30';
                                        label = 'Duraklatma';
                                    }

                                    return (
                                        <div
                                            key={index}
                                            className={`absolute h-12 rounded-lg border-2 ${bgClass} ${borderClass} shadow-lg ${shadowClass} transition-all duration-75 hover:scale-[1.01] hover:z-30 cursor-pointer group/block flex items-center justify-center will-change-transform ${selectedItem === index ? 'z-50 border-white/50 ring-2 ring-white/10' : ''}`}
                                            style={{
                                                left: `${startPercent}%`,
                                                width: `calc(${Math.max(durationPercent, 0.5)}% - 2px)`,
                                                top: '84px'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedItem(selectedItem === index ? null : index);
                                            }}
                                        >
                                            {durationPercent > 3 && (
                                                <div className="text-white/90">
                                                    {isWork && (() => {
                                                        const matchingKey = Object.keys(COURSE_ICONS).find(key => courseName.startsWith(key));
                                                        const CourseIcon = matchingKey ? COURSE_ICONS[matchingKey] : BookOpen;
                                                        return <CourseIcon size={14} />;
                                                    })()}
                                                    {isBreak && <Clock size={14} />}
                                                    {isPause && <Pause size={14} />}
                                                </div>
                                            )}

                                            <div
                                                className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-card border border-secondary text-xs p-3 rounded-xl shadow-2xl whitespace-nowrap z-50 transition-all duration-100 min-w-[180px] ${selectedItem === index ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                                                    }`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="font-bold mb-2 text-center text-foreground border-b border-white/10 pb-2 flex items-center justify-between gap-4">
                                                    <span>
                                                        {item.start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {item.end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        {item.originalSession && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setEditingSession({
                                                                    sessionId: item.sessionId,
                                                                    type: item.type,
                                                                    startTime: formatTimeForInput(item.start),
                                                                    endTime: formatTimeForInput(item.end),
                                                                    originalSession: item.originalSession,
                                                                    pauseIndex: item.pauseIndex
                                                                })}
                                                                className="h-7 w-7 text-primary hover:bg-primary/20"
                                                                title="Düzenle"
                                                            >
                                                                <Edit2 size={14} />
                                                            </Button>
                                                        )}
                                                        {item.sessionId && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setConfirmDelete({ sessionId: item.sessionId })}
                                                                className="h-7 w-7 text-destructive hover:bg-destructive/20"
                                                                title="Sil"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-center gap-2 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${isWork ? 'bg-indigo-400' : (isBreak ? 'bg-emerald-400' : 'bg-muted-foreground/30')}`}></div>
                                                    <span className={`${isWork ? 'text-indigo-400' : (isBreak ? 'text-emerald-400' : 'text-muted-foreground')} font-bold`}>
                                                        {label}
                                                    </span>
                                                </div>
                                                <div className="text-center text-muted-foreground mt-1 font-medium">
                                                    {Math.round(item.duration / 60)} dakika
                                                </div>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-card"></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-secondary bg-background/60 flex justify-center flex-wrap gap-x-8 gap-y-3 text-[11px] font-bold text-foreground shrink-0 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-indigo-500/40 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]"></div>
                        <span className="opacity-80">Çalışma Oturumu</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"></div>
                        <span className="opacity-80">Mola</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-muted/50 border border-muted-foreground/30 shadow-sm"></div>
                        <span className="opacity-80">Duraklatma</span>
                    </div>
                </div>
            </DialogContent>

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
                    setSelectedItem(null);
                }}
                onCancel={() => setConfirmDelete(null)}
            />

            {/* Edit Modal */}
            <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
                <DialogContent className="max-w-sm p-6 bg-card border-secondary shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                            <Edit2 size={20} className="text-primary" />
                            Süreyi Düzenle
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Çalışma veya mola süresini düzenleyin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Başlangıç Saati</label>
                            <Input
                                type="time"
                                value={editingSession?.startTime || ""}
                                onChange={(e) => setEditingSession({ ...editingSession, startTime: e.target.value })}
                                className="font-mono rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Bitiş Saati</label>
                            <Input
                                type="time"
                                value={editingSession?.endTime || ""}
                                onChange={(e) => setEditingSession({ ...editingSession, endTime: e.target.value })}
                                className="font-mono rounded-xl"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setEditingSession(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl border-secondary text-muted-foreground font-bold hover:bg-background transition-colors"
                            >
                                İptal
                            </Button>
                            <Button
                                onClick={() => handleSaveEdit(editingSession.startTime, editingSession.endTime)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                Kaydet
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog >
    );
}
