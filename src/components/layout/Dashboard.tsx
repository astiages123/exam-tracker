import { Suspense, lazy, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import courseDataJson from '@/features/course/data/courses.json';
import { CourseCategory } from '@/types';
import Header from '@/components/layout/Header';
import RankCard from '@/components/layout/RankCard';
import StatsCard from '@/components/layout/StatsCard';
import CategoryList from '@/features/course/components/CategoryList';
import { useAppController } from '@/hooks/useAppController';

const courseData = courseDataJson as unknown as CourseCategory[];

// --- Lazy-loaded Components ---
const ScheduleModal = lazy(() => import('@/features/schedule/components/ScheduleModal'));
const PomodoroTimer = lazy(() => import('@/features/pomodoro/components/PomodoroTimer'));
const ReportModal = lazy(() => import('@/features/reports/components/ReportModal'));
const RankModal = lazy(() => import('@/features/ranks/components/RankModal'));
const NotesModal = lazy(() => import('@/features/notes/components/NotesModal'));
const QuizContainer = lazy(() => import('@/features/quiz/components/QuizContainer'));
const CelebrationOverlay = lazy(() => import('@/components/shared/CelebrationOverlay'));
const RankCelebrationOverlay = lazy(() => import('@/components/shared/RankCelebrationOverlay'));
const CourseStatsModal = lazy(() => import('@/features/reports/components/CourseStatsModal'));




const ModalLoader = () => (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-emerald" />
            <span className="text-sm font-medium">Yükleniyor...</span>
        </div>
    </div>
);

type DashboardProps = {
    logout: () => Promise<void>;
};

export default function Dashboard({ logout }: DashboardProps) {
    const {
        userData,
        stats,
        modals,
        ui,
        handlers,
    } = useAppController();

    const flatCourses = useMemo(() => courseData.flatMap(cat => cat.courses), []);

    const {
        progressData,
        sessions,
        videoHistory,
        schedule,
        lastActiveCourseId
    } = userData;

    const {
        totalPercentage,
        rankInfo,
        nextRank,
        completedHours,
        completedCount,
        totalVideos,
        totalHours,
        currentStreak,
        dailyFocus
    } = stats;

    const {
        expandedCategories,
        expandedCourses
    } = ui;

    const activeCourse = lastActiveCourseId ? flatCourses.find(c => c.id === lastActiveCourseId) : null;

    return (
        <>
            <AnimatePresence>
                {modals.celebratingCourse && (
                    <Suspense fallback={null}>
                        <CelebrationOverlay
                            courseName={modals.celebratingCourse}
                            onComplete={modals.closeCelebration}
                        />
                    </Suspense>
                )}
                {modals.celebratingRank && (
                    <Suspense fallback={null}>
                        <RankCelebrationOverlay
                            rank={modals.celebratingRank}
                            onComplete={modals.closeRankCelebration}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            {modals.showTimer && (
                <Suspense fallback={<ModalLoader />}>
                    <PomodoroTimer
                        initialCourse={activeCourse}
                        courses={flatCourses}
                        sessionsCount={sessions.filter(s => s.type === 'work' && new Date(s.timestamp).toDateString() === new Date().toDateString()).length}
                        onSessionComplete={handlers.handleSessionComplete}
                        onClose={modals.closeTimer}
                        onZenModeChange={modals.setIsZenMode}
                    />
                </Suspense>
            )}

            {modals.showReport && (
                <Suspense fallback={<ModalLoader />}>
                    <ReportModal
                        sessions={sessions}
                        courses={flatCourses}
                        onClose={modals.closeReport}
                        onDelete={handlers.handleDeleteSessions}
                        onUpdate={handlers.handleUpdateSession}
                        videoHistory={videoHistory}
                        progressData={progressData}
                        initialHistoryType={modals.reportHistoryType}
                        totalVideos={totalVideos}
                        totalHours={totalHours}
                        completedHours={completedHours}
                        completedCount={completedCount}
                    />
                </Suspense>
            )}

            {modals.showSchedule && (
                <Suspense fallback={<ModalLoader />}>
                    <ScheduleModal
                        onClose={modals.closeSchedule}
                        schedule={schedule}
                        setSchedule={handlers.updateSchedule}
                    />
                </Suspense>
            )}

            {modals.showRankModal && (
                <Suspense fallback={<ModalLoader />}>
                    <RankModal
                        currentRank={rankInfo}
                        totalHours={totalHours}
                        completedHours={completedHours}
                        sessions={sessions}
                        videoHistory={videoHistory}
                        onClose={modals.closeRankModal}
                    />
                </Suspense>
            )}

            {modals.activeNoteCourse && (
                <Suspense fallback={<ModalLoader />}>
                    <NotesModal
                        courseName={modals.activeNoteCourse.name}
                        notePath={modals.activeNoteCourse.path}
                        icon={modals.activeNoteCourse.icon}
                        onClose={modals.closeNotes}
                    />
                </Suspense>
            )}

            {modals.showQuiz && modals.quizCourseId && (
                <Suspense fallback={<ModalLoader />}>
                    <QuizContainer
                        courseId={modals.quizCourseId}
                        courseName={flatCourses.find(c => c.id === modals.quizCourseId)?.name || 'Quiz'}
                        lessonType={flatCourses.find(c => c.id === modals.quizCourseId)?.lessonType || flatCourses.find(c => c.id === modals.quizCourseId)?.name || 'Genel'}
                        onClose={modals.closeQuiz}
                    />
                </Suspense>
            )}

            {modals.showStats && modals.statsCourseId && (
                <Suspense fallback={<ModalLoader />}>
                    <CourseStatsModal
                        courseId={modals.statsCourseId}
                        courseName={flatCourses.find(c => c.id === modals.statsCourseId)?.name || 'Ders'}
                        lessonType={flatCourses.find(c => c.id === modals.statsCourseId)?.lessonType || flatCourses.find(c => c.id === modals.statsCourseId)?.name || 'Genel'}
                        sessions={sessions}
                        videoHistory={videoHistory}
                        progressData={progressData}
                        courses={flatCourses}
                        onClose={modals.closeStats}
                    />
                </Suspense>
            )}


            {/* Top Header Dashboard */}
            <div className={cn("transition-all duration-700", modals.isZenMode ? "opacity-0 pointer-events-none translate-y-[-20px]" : "opacity-100")}>
                <Header
                    rankInfo={rankInfo}
                    dailyFocus={dailyFocus}
                    currentStreak={currentStreak}
                    modals={modals}
                    logout={logout}
                />
            </div>

            {/* Main Content Grid */}
            <main className={cn(
                "max-w-7xl mx-auto p-4 pt-8 sm:p-6 sm:pt-10 md:p-8 md:pt-10 transition-all duration-700",
                "grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min",
                modals.isZenMode ? "opacity-0 pointer-events-none scale-[0.98] blur-xl" : "opacity-100 scale-100 blur-0"
            )}>
                {/* 1. Rank Card (Left, Wider) */}
                <div className="md:col-span-2">
                    <RankCard
                        rankInfo={rankInfo}
                        nextRank={nextRank}
                        totalPercentage={totalPercentage}
                        sessions={sessions}
                        completedHours={completedHours}
                        totalHours={totalHours}
                        dailyFocus={dailyFocus}
                        currentStreak={currentStreak}
                    />
                </div>

                {/* 2. Stats Card (Right, Narrower) */}
                <div className="md:col-span-1">
                    <StatsCard
                        completedHours={completedHours}
                        completedCount={completedCount}
                        totalVideos={totalVideos}
                        totalHours={totalHours}
                        totalPercentage={totalPercentage}
                        onCompletedClick={() => modals.openReportWithHistory('videos')}
                        onDurationClick={() => modals.openReportWithHistory('duration')}
                    />
                </div>

                {/* 3. Category Items (Flow into the grid) */}
                <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CategoryList
                        courseData={courseData}
                        progressData={progressData}
                        expandedCategories={expandedCategories}
                        expandedCourses={expandedCourses}
                        handlers={handlers}
                        modals={modals}
                    />
                </div>
            </main>

            {/* Zen Mode Background Deepening */}
            {modals.isZenMode && (
                <div className="fixed inset-0 bg-background/60 z-40 animate-in fade-in duration-1000" />
            )}


        </>
    );
}
