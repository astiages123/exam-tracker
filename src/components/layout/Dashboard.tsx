import { Suspense, lazy, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import courseDataJson from '@/features/course/data/courses.json';
import { CourseCategory } from '@/types';
import Header from '@/components/layout/Header';
import ProgressCard from '@/components/layout/ProgressCard';
import CategoryList from '@/features/course/components/CategoryList';
import { useAppController } from '@/hooks/useAppController';

const courseData = courseDataJson as unknown as CourseCategory[];

// --- Lazy-loaded Components ---
const ScheduleModal = lazy(() => import('@/features/schedule/components/ScheduleModal'));
const PomodoroTimer = lazy(() => import('@/features/pomodoro/components/PomodoroTimer'));
const ReportModal = lazy(() => import('@/features/reports/components/ReportModal'));
const RankModal = lazy(() => import('@/features/ranks/components/RankModal'));
const NotesModal = lazy(() => import('@/features/notes/components/NotesModal'));
const CelebrationOverlay = lazy(() => import('@/components/shared/CelebrationOverlay'));
const QuizModal = lazy(() => import('@/features/quiz/components/QuizModal'));

const ModalLoader = () => (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            </AnimatePresence>

            {modals.showTimer && (
                <Suspense fallback={<ModalLoader />}>
                    <PomodoroTimer
                        initialCourse={activeCourse}
                        courses={flatCourses}
                        sessionsCount={sessions.filter(s => s.type === 'work' && new Date(s.timestamp).toDateString() === new Date().toDateString()).length}
                        onSessionComplete={handlers.handleSessionComplete}
                        onClose={modals.closeTimer}
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

            {modals.activeQuizCourse && (
                <Suspense fallback={<ModalLoader />}>
                    <QuizModal
                        isOpen={!!modals.activeQuizCourse}
                        onClose={modals.closeQuiz}
                        courseId={modals.activeQuizCourse.id}
                        courseName={modals.activeQuizCourse.name}
                        notePath={modals.activeQuizCourse.path}
                    />
                </Suspense>
            )}

            {/* Top Header Dashboard */}
            <Header
                rankInfo={rankInfo}
                dailyFocus={dailyFocus}
                currentStreak={currentStreak}
                modals={modals}
                logout={logout}
            />

            {/* Main Content Grid */}
            <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
                {/* Progress Stats */}
                <ProgressCard
                    totalPercentage={totalPercentage}
                    rankInfo={rankInfo}
                    nextRank={nextRank}
                    completedHours={completedHours}
                    completedCount={completedCount}
                    totalVideos={totalVideos}
                    totalHours={totalHours}
                    onCompletedClick={() => modals.openReportWithHistory('videos')}
                    onDurationClick={() => modals.openReportWithHistory('duration')}
                />

                <CategoryList
                    courseData={courseData}
                    progressData={progressData}
                    expandedCategories={expandedCategories}
                    expandedCourses={expandedCourses}
                    handlers={handlers}
                    modals={modals}
                />
            </main >
        </>
    );
}
