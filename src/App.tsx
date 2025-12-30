import { Suspense, lazy, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import courseDataJson from './data/courses.json';
import { CourseCategory } from './types';
import { supabase } from './lib/supabaseClient';

const courseData = courseDataJson as unknown as CourseCategory[];
import Login from './components/Login';

import Header from '@/components/layout/Header';
import ProgressCard from '@/components/layout/ProgressCard';
import CategoryList from '@/components/course/CategoryList';

import { useAppController } from '@/hooks/useAppController';

// --- Lazy-loaded Components ---
const ScheduleModal = lazy(() => import('./components/ScheduleModal'));
const PomodoroTimer = lazy(() => import('./components/PomodoroTimer'));
const ReportModal = lazy(() => import('./components/ReportModal'));
const RankModal = lazy(() => import('./components/RankModal'));
const NotesModal = lazy(() => import('./components/NotesModal'));
const CelebrationOverlay = lazy(() => import('./components/CelebrationOverlay'));
const QuizModal = lazy(() => import('./components/QuizModal'));

const ModalLoader = () => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm font-medium">Yükleniyor...</span>
    </div>
  </div>
);

export default function App() {
  const {
    auth,
    userData,
    stats,
    modals,
    ui,
    handlers,
  } = useAppController();

  const flatCourses = useMemo(() => courseData.flatMap(cat => cat.courses), []);

  const {
    loading,
    user
  } = auth;

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

  if (loading) return <ModalLoader />;

  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <div className="bg-destructive/10 p-6 rounded-2xl border border-destructive/20 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Veritabanı Bağlantı Hatası</h2>
          <p className="text-muted-foreground mb-4">
            Supabase bağlantısı kurulamadı. Lütfen <code className="bg-black/20 px-1.5 py-0.5 rounded text-sm">.env</code> dosyasındaki API anahtarlarını kontrol edin.
          </p>
          <div className="text-xs text-muted-foreground/50 font-mono bg-black/5 p-2 rounded">
            VITE_SUPABASE_URL<br />
            VITE_SUPABASE_ANON_KEY
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const activeCourse = lastActiveCourseId ? flatCourses.find(c => c.id === lastActiveCourseId) : null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
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
        logout={auth.logout}
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
    </div >
  );
}
