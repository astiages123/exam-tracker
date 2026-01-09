import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModalCloseButton from '@/components/ui/ModalCloseButton';
import { BarChart2, Clock, MonitorPlay, Brain } from 'lucide-react';
import { useReportData } from '@/features/reports/hooks/useReportData';
import DurationChart from '@/features/reports/components/DurationChart';
import VideoChart from '@/features/reports/components/VideoChart';
import { getSessionStats, QuizSession, getLessonStatistics, LessonStatistics } from '@/features/analytics/services/analyticsService';
import { StudySession, VideoHistoryItem, UserProgressData, Course } from '@/types';
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const FullHistoryModal = lazy(() => import('@/features/reports/components/FullHistoryModal'));

interface CourseStatsModalProps {
    courseId: string;
    courseName: string;
    lessonType: string;
    sessions: StudySession[];
    videoHistory: VideoHistoryItem[];
    progressData: UserProgressData;
    courses: Course[];
    onClose: () => void;
}

export default function CourseStatsModal({
    courseId,
    courseName,
    lessonType,
    sessions,
    videoHistory,
    progressData,
    courses,
    onClose
}: CourseStatsModalProps) {
    const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
    const [srsStats, setSrsStats] = useState<LessonStatistics | null>(null);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);
    const [showFullHistory, setShowFullHistory] = useState<'duration' | 'videos' | null>(null);

    // Filter data for this course
    const courseSessions = useMemo(() =>
        sessions.filter(s => s.courseId === courseId),
        [sessions, courseId]
    );

    const courseVideoHistory = useMemo(() =>
        videoHistory.filter(h => h.courseId === courseId),
        [videoHistory, courseId]
    );

    // Use existing hook for charts
    const {
        fullChartData,
        stats
    } = useReportData({
        sessions: courseSessions,
        courses,
        videoHistory: courseVideoHistory,
        progressData,
        isMobile: false // We handle slicing ourselves
    });

    // Handle "5 points" requirement: Take last 5 points of activity
    // And ensure no days without data are shown (handled by fullChartData)
    const displayData = useMemo(() => {
        return fullChartData.slice(-5);
    }, [fullChartData]);

    // Fetch quiz stats and SRS stats
    useEffect(() => {
        async function fetchQuizStats() {
            setIsLoadingQuiz(true);
            try {
                // Fetch stats in parallel
                const [sessionsData, srsData] = await Promise.all([
                    getSessionStats(lessonType, 50),
                    getLessonStatistics(lessonType)
                ]);

                setQuizSessions(sessionsData);
                setSrsStats(srsData);
            } catch (err) {
                console.error("Failed to load quiz stats", err);
            } finally {
                setIsLoadingQuiz(false);
            }
        }
        fetchQuizStats();
    }, [lessonType]);

    // Prepare quiz chart data (last 5 sessions)
    const quizChartData = useMemo(() => {
        return quizSessions.slice(0, 5).reverse().map((session, idx) => {
            const total = session.correct_count + session.incorrect_count;
            const percentage = total > 0 ? Math.round((session.correct_count / total) * 100) : 0;
            return {
                id: idx + 1,
                date: new Date(session.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                score: percentage,
                correct: session.correct_count,
                incorrect: session.incorrect_count
            };
        });
    }, [quizSessions]);

    // Calculate quiz averages
    const quizStats = useMemo(() => {
        if (quizSessions.length === 0) return { avgScore: 0, totalQuizzes: 0, totalCorrect: 0 };
        const totalQuizzes = quizSessions.length;
        const totalSafe = quizSessions.reduce((acc, s) => acc + s.correct_count + s.incorrect_count, 0);
        const totalCorrect = quizSessions.reduce((acc, s) => acc + s.correct_count, 0);
        const globalAvg = totalSafe > 0 ? Math.round((totalCorrect / totalSafe) * 100) : 0;
        return { avgScore: globalAvg, totalQuizzes, totalCorrect, totalIncorrect: totalSafe - totalCorrect };
    }, [quizSessions]);

    return (
        <>
            <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-none text-foreground bg-linear-to-b from-zinc-900 to-zinc-950 focus:outline-none shadow-2xl">
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-white/5 bg-white/2 flex justify-between items-center shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-3">
                                <div className="bg-emerald/20 p-2 rounded-lg text-emerald shadow-[0_0_15px_-3px_var(--color-primary)]">
                                    <BarChart2 size={22} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-emerald tracking-tight">{courseName.split('(')[0]} Analizi</span>
                                    <span className="text-[10px] font-medium text-emerald/70 uppercase tracking-widest mt-0.5">Performans İstatistikleri</span>
                                </div>
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Ders bazlı çalışma verileri
                            </DialogDescription>
                        </DialogHeader>
                        <DialogClose asChild>
                            <ModalCloseButton />
                        </DialogClose>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Card className="bg-white/3 border-white/5 shadow-none overflow-hidden group">
                                    <CardContent className="p-4 flex items-center gap-4 relative">
                                        <div className="bg-purple-500/10 p-2.5 rounded-xl text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-purple-300/50 font-bold mb-0.5">Süre</p>
                                            <h4 className="text-xl font-bold text-emerald tracking-tight">
                                                {stats.totalHours}<span className="text-sm font-medium text-emerald/70 ml-0.5 whitespace-nowrap">s {stats.remainingMins}dk</span>
                                            </h4>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/3 border-white/5 shadow-none overflow-hidden group">
                                    <CardContent className="p-4 flex items-center gap-4 relative">
                                        <div className="bg-orange-500/10 p-2.5 rounded-xl text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
                                            <MonitorPlay size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-orange-300/50 font-bold mb-0.5">Video</p>
                                            <h4 className="text-xl font-bold text-emerald tracking-tight">
                                                {courseVideoHistory.length}
                                            </h4>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/3 border-white/5 shadow-none overflow-hidden group">
                                    <CardContent className="p-4 flex items-center gap-4 relative">
                                        <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                            <Brain size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-emerald-300/50 font-bold mb-0.5">Başarı</p>
                                            <h4 className="text-xl font-bold text-emerald tracking-tight">
                                                %{quizStats.avgScore}
                                            </h4>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Tabs defaultValue="study" className="w-full">
                                <TabsList className="w-full justify-start bg-black/40 p-1 rounded-xl mb-4 border border-white/5">
                                    <TabsTrigger value="study" className="flex-1 gap-2 text-xs font-bold data-[state=active]:bg-white/10 data-[state=active]:text-emerald">
                                        Çalışma Süresi
                                    </TabsTrigger>
                                    <TabsTrigger value="video" className="flex-1 gap-2 text-xs font-bold data-[state=active]:bg-white/10 data-[state=active]:text-emerald">
                                        Video İlerlemesi
                                    </TabsTrigger>
                                    <TabsTrigger value="quiz" className="flex-1 gap-2 text-xs font-bold data-[state=active]:bg-white/10 data-[state=active]:text-emerald">
                                        Quiz İstatistikleri
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="study" className="mt-0 outline-none">
                                    {displayData.length > 0 ? (
                                        <DurationChart
                                            data={displayData}
                                            onShowFullHistory={() => setShowFullHistory('duration')}
                                            className="h-[220px]"
                                        />
                                    ) : (
                                        <div className="h-[220px] flex items-center justify-center text-muted-foreground bg-white/2 rounded-2xl border border-white/5 text-sm uppercase tracking-widest font-bold">
                                            Veri Bulunmuyor
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="video" className="mt-0 outline-none">
                                    {displayData.length > 0 ? (
                                        <VideoChart
                                            data={displayData}
                                            onShowFullHistory={() => setShowFullHistory('videos')}
                                            className="h-[220px]"
                                        />
                                    ) : (
                                        <div className="h-[220px] flex items-center justify-center text-muted-foreground bg-white/2 rounded-2xl border border-white/5 text-sm uppercase tracking-widest font-bold">
                                            Veri Bulunmuyor
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="quiz" className="mt-0 outline-none">
                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Quiz Performance Stats */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                <div className="text-xl font-light text-emerald">{quizStats.totalCorrect}</div>
                                                <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Doğru</div>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                <div className="text-xl font-light text-emerald">{quizStats.totalIncorrect || 0}</div>
                                                <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold">Yanlış</div>
                                            </div>
                                        </div>

                                        {/* SRS Stats */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                <div className="text-xl font-light text-emerald">{srsStats?.learnedCount || 0}</div>
                                                <div className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">Öğrenildi</div>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                <div className="text-xl font-light text-emerald">{srsStats?.reviewCount || 0}</div>
                                                <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Tekrar</div>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                <div className="text-xl font-light text-emerald">{srsStats?.criticalCount || 0}</div>
                                                <div className="text-[10px] uppercase tracking-wider text-rose-400 font-bold">Kritik</div>
                                            </div>
                                        </div>

                                        <Card className="border-white/5 bg-white/2 shadow-none overflow-hidden">
                                            <CardContent className="p-4 sm:p-6">
                                                {isLoadingQuiz ? (
                                                    <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                                                        Yükleniyor...
                                                    </div>
                                                ) : quizChartData.length > 0 ? (
                                                    <div className="h-[220px]">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <h3 className="text-xs font-bold text-emerald uppercase tracking-wider flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                                Son Quiz Sonuçları
                                                            </h3>
                                                        </div>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={quizChartData}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickMargin={8} />
                                                                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} ticks={[0, 50, 100]} />
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                                                    cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 4 }}
                                                                />
                                                                <Bar dataKey="score" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Başarı Oranı" barSize={35} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                ) : (
                                                    <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground/40 text-sm uppercase tracking-widest font-bold">
                                                        Kayıt Yok
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Full History Overlay */}
            <Suspense fallback={null}>
                {showFullHistory && (
                    <FullHistoryModal
                        isOpen={!!showFullHistory}
                        type={showFullHistory}
                        data={fullChartData}
                        onClose={() => setShowFullHistory(null)}
                    />
                )}
            </Suspense>
        </>
    );
}
