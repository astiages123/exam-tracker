import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Goal, BookOpen, Youtube, LogOut, Timer, BarChart2, Calendar, Check, MonitorPlay, BadgeCheck, FileText, HelpCircle, Loader2, ChartLine, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_STYLES, CATEGORY_ICONS, RANK_ICONS } from '@/constants/styles';

// --- Data ---
import { courseData, RANKS } from './data';
import { useAuth } from './context/AuthContext';
import { useNotification } from './context/NotificationContext';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login';
import StreakDisplay from './components/StreakDisplay';
import { calculateStreak } from './utils/streakUtils';

// --- Lazy-loaded Components (Code-splitting) ---
const ScheduleModal = lazy(() => import('./components/ScheduleModal'));
const PomodoroTimer = lazy(() => import('./components/PomodoroTimer'));
const ReportModal = lazy(() => import('./components/ReportModal'));
const RankModal = lazy(() => import('./components/RankModal'));
const NotesModal = lazy(() => import('./components/NotesModal'));
const CelebrationOverlay = lazy(() => import('./components/CelebrationOverlay'));
const QuizModal = lazy(() => import('./components/QuizModal'));

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// --- Loading Fallback ---
const ModalLoader = () => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm font-medium">Yükleniyor...</span>
    </div>
  </div>
);

const ProgressBar = ({ progress, nextLevelMin, currentLevelMin }) => {
  const range = nextLevelMin - currentLevelMin;
  const currentVal = progress - currentLevelMin;
  const percentage = Math.min(100, Math.max(0, (currentVal / (range || 1)) * 100));

  return (
    <div className="w-full bg-card rounded-full h-3 mt-4 overflow-hidden">
      <Motion.div
        className="h-full bg-primary rounded-full relative"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}% ` }}
        transition={{ duration: 0.5 }}
      >
      </Motion.div>
    </div>
  );
};



const CategoryProgressBar = ({ percentage, colorClass }) => {
  return (
    <div className="w-full bg-secondary/50 rounded-full h-1.5 mt-2 overflow-hidden">
      <Motion.div
        className={cn("h-full", colorClass || "bg-primary")}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}% ` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
};

// Helper to format hours into "Xsa Ydk"
const formatHours = (decimalHours) => {
  if (!decimalHours) return "0sa 0dk";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}sa ${minutes} dk`;
};

export default function App() {
  const { user, logout, loading } = useAuth();
  const { showToast } = useNotification(); // [NEW] Use notification hook

  // State: { [courseId]: completedCount }
  const [progressData, setProgressData] = useState({});
  const [sessions, setSessions] = useState([]); // [{ timestamp, duration, type, courseId }]
  const [schedule, setSchedule] = useState({}); // { "Pazartesi": [{ time: "09:00", subject: "Math" }] }
  const [activityLog, setActivityLog] = useState({}); // { "YYYY-MM-DD": true }
  const [videoHistory, setVideoHistory] = useState([]); // [NEW] [{ videoId: string, timestamp: string, courseId: string }]
  const [lastActiveCourseId, setLastActiveCourseId] = useState(null); // Track last interacted course
  const [isDataLoaded, setIsDataLoaded] = useState(false); // [FIX] Prevent autosave race condition

  // Accordion States
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedCourses, setExpandedCourses] = useState(new Set()); // [NEW] Track expanded courses

  const [showTimer, setShowTimer] = useState(() => localStorage.getItem('pomo_isVisible') === 'true');

  useEffect(() => {
    localStorage.setItem('pomo_isVisible', showTimer);
  }, [showTimer]);

  const [showReport, setShowReport] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);

  const [celebratingCourse, setCelebratingCourse] = useState(null);
  const [activeNoteCourse, setActiveNoteCourse] = useState(null); // { name, path }
  const [activeQuizCourse, setActiveQuizCourse] = useState(null); // { name, path, id }


  // Daily Focus Logic

  const getDailyFocus = () => {
    const now = new Date();
    const dayIndex = now.getDay();

    const dayKeys = [
      'CUMARTESİ / PAZAR', // 0: Sunday
      'PAZARTESİ',         // 1
      'SALI',              // 2
      'ÇARŞAMBA',          // 3
      'PERŞEMBE',          // 4
      'CUMA',              // 5
      'CUMARTESİ / PAZAR'  // 6: Saturday
    ];

    const todayKey = dayKeys[dayIndex];

    // Dynamic focus from schedule if available
    if (schedule[todayKey] && schedule[todayKey].length > 0) {
      return schedule[todayKey][0].subject.toUpperCase();
    }

    const defaultSchedule = {
      'PAZARTESİ': 'EKONOMİ',
      'SALI': 'HUKUK',
      'ÇARŞAMBA': 'MUHASEBE - İŞLETME - MALİYE',
      'PERŞEMBE': 'EKONOMİ',
      'CUMA': 'HUKUK',
      'CUMARTESİ / PAZAR': 'MATEMATİK - BANKA',
    };
    return defaultSchedule[todayKey] || 'BELİRSİZ';
  };
  const dailyFocus = getDailyFocus();

  // Initialize data when user changes
  useEffect(() => {

    // Reset state immediately to prevent data leakage from previous user
    setIsDataLoaded(false);
    setProgressData({});
    setSessions([]);
    setSchedule({});
    setActivityLog({});

    async function loadData() {
      if (user) {
        const { data, error } = await supabase
          .from('user_progress')
          .select('progress_data, sessions, schedule, activity_log, video_history') // [NEW] Fetch video_history
          .eq('user_id', user.id)
          .single();

        if (data) {
          setProgressData(data.progress_data || {});
          setSessions(data.sessions || []);
          setSchedule(data.schedule || {});

          // Normalize activity_log keys (remove spaces from previous bug)
          const rawLog = data.activity_log || {};
          const normalizedLog = {};
          Object.keys(rawLog).forEach(key => {
            const cleanKey = key.replace(/\s+/g, ''); // "2025 -12 -25 " -> "2025-12-25"
            normalizedLog[cleanKey] = rawLog[key];
          });
          setActivityLog(normalizedLog);

          setVideoHistory(data.video_history || []); // [NEW] Set history
        } else if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error loading data:', error);
        }
        setIsDataLoaded(true); // [FIX] Enable autosave only after load
      }
    }
    loadData();
  }, [user]);




  // Calculate total videos and hours
  const totalVideos = useMemo(() => courseData.reduce((acc, cat) =>
    acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalVideos, 0), 0), []);

  const totalHours = useMemo(() => courseData.reduce((acc, cat) =>
    acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalHours, 0), 0), []);

  // Calculate stats using derived state (useMemo) based on DURATION for percentage
  const { totalPercentage, rankInfo, nextRank, completedHours, completedCount } = useMemo(() => {
    let totalCompletedMinutes = 0;
    let totalCompletedVideos = 0;

    // Iterate all courses to sum up activity
    courseData.forEach(category => {
      category.courses.forEach(course => {
        const completedIds = progressData[course.id] || [];
        totalCompletedVideos += completedIds.length;

        // Sum duration of completed videos
        // We need to look up the video object to get its durationMinutes
        const courseVideos = course.videos || []; // Ensure videos exist
        completedIds.forEach(vidId => {
          const video = courseVideos.find(v => v.id === vidId);
          // If video data isn't fully populated yet (e.g. fallback), handle gracefully
          if (video && video.durationMinutes) {
            totalCompletedMinutes += video.durationMinutes;
          } else {
            // Fallback if individual video duration is missing: average duration
            const avgDuration = (course.totalHours * 60) / course.totalVideos;
            totalCompletedMinutes += avgDuration;
          }
        });
      });
    });

    const completedHrs = totalCompletedMinutes / 60;

    // Percentage based on TIME
    const percent = totalHours > 0 ? (completedHrs / totalHours) * 100 : 0;

    let currentRank = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (Math.floor(percent) >= RANKS[i].min) {
        currentRank = RANKS[i];
        break;
      }
    }

    const nextRankIndex = RANKS.findIndex(r => r.title === currentRank.title) + 1;
    const nextR = RANKS[nextRankIndex] || { min: 100, title: "Zirve" };

    return {
      totalPercentage: percent,
      rankInfo: currentRank,
      nextRank: nextR,
      completedHours: completedHrs,
      completedCount: totalCompletedVideos
    };
  }, [progressData, totalHours]);

  const currentStreak = useMemo(() => calculateStreak(activityLog), [activityLog]);





  useEffect(() => {
    if (user && isDataLoaded) {
      const saveData = async () => {
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            progress_data: progressData,
            sessions: sessions,
            schedule: schedule,
            activity_log: activityLog,
            video_history: videoHistory, // [NEW] Save history
            updated_at: new Date()
          });

        if (error) console.error('Error saving data:', error);
      };

      // Debounce save to avoid too many writes (Reduced to 300ms for responsiveness)
      const timeoutId = setTimeout(saveData, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [user, progressData, sessions, schedule, activityLog, videoHistory, isDataLoaded]); // [NEW] Added videoHistory dep

  const handleSessionComplete = (duration, type, overrideCourseId, startTime, pauses) => {
    // [MODIFIED] Now we record 'break' sessions too
    // if (type !== 'work') return;

    const newSession = {
      timestamp: startTime || new Date().setSeconds(0, 0), // [MODIFIED] Use passed start time if available
      duration,
      type,
      courseId: overrideCourseId || lastActiveCourseId,
      pauses: pauses || [] // [NEW] Store pauses
    };
    setSessions(prev => [...prev, newSession]);

    // [FIX] Immediately mark today as active
    const todayStr = getLocalYMD(new Date());
    setActivityLog(prev => ({
      ...prev,
      [todayStr]: (prev[todayStr] || 0) + 1
    }));
  };

  const handleUpdateSession = (oldTimestamp, updatedSession) => {
    setSessions(prev => prev.map(s => s.timestamp === oldTimestamp ? updatedSession : s));
  };

  const handleDeleteSessions = (sessionIdsToDelete) => {
    setSessions(prev => prev.filter(s => !sessionIdsToDelete.includes(s.timestamp)));
  };

  // Helper function for local date string (Standardized to YYYY-MM-DD)
  const getLocalYMD = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- Activity Tracking Logic (Robust Daily Activity) ---
  useEffect(() => {
    if (!isDataLoaded) return;

    const todayStr = getLocalYMD(new Date());

    setActivityLog(prev => {
      const nextLog = { ...prev };

      // 1. Session-based Video Progress (Current Session)
      const countItems = (data) => Object.values(data).reduce((acc, items) => acc + (items?.length || 0), 0);
      const currentTotal = countItems(progressData);
      const storageKey = `exam_tracker_baseline_${todayStr}`;
      let baseline = parseInt(localStorage.getItem(storageKey));

      if (isNaN(baseline)) {
        baseline = currentTotal;
        localStorage.setItem(storageKey, baseline.toString());
      }
      const netProgress = Math.max(0, currentTotal - baseline);

      // 2. Video History Check (All Day - must be currently in progressData)
      const hasVideoToday = videoHistory.some(h => {
        const isToday = getLocalYMD(new Date(h.timestamp)) === todayStr;
        return isToday && (progressData[h.courseId] || []).includes(h.videoId);
      });

      // 3. Work Sessions Check (All Day)
      const hasWorkSessionToday = sessions.some(s =>
        s.type === 'work' && getLocalYMD(new Date(s.timestamp)) === todayStr
      );

      // 4. Determine Active State
      const isCurrentlyActive = netProgress > 0 || hasVideoToday || hasWorkSessionToday;

      if (isCurrentlyActive) {
        // If we found ANY activity today, ensure today is marked active (Clean key only)
        const newVal = Math.max(1, netProgress + (hasWorkSessionToday ? 1 : 0));
        if (nextLog[todayStr] !== newVal) {
          nextLog[todayStr] = newVal;
          return nextLog;
        }
      } else {
        // [UNDO LOGIC] If no activity, we must remove ALL possible keys for today 
        // (including legacy malformed ones with spaces)
        let changed = false;
        Object.keys(nextLog).forEach(key => {
          if (key.replace(/\s+/g, '') === todayStr) {
            delete nextLog[key];
            changed = true;
          }
        });
        if (changed) return nextLog;
      }

      // Backfill past sessions (Safety merge)
      let hasBackfillChanges = false;
      sessions.forEach(session => {
        if (session.type === 'work') {
          const sessionDate = getLocalYMD(new Date(session.timestamp));
          if (!nextLog[sessionDate]) {
            nextLog[sessionDate] = 1;
            hasBackfillChanges = true;
          }
        }
      });

      return hasBackfillChanges ? nextLog : prev;
    });

  }, [progressData, isDataLoaded, sessions, videoHistory]); // Added videoHistory dependency

  // Refactored Toggle Handler for specific video index with auto-complete previous and auto-uncheck subsequent
  // Logic: Clicking video N ensures 1..N are checked, and N+1..End are unchecked.
  // It effectively sets the progress "level" to N.
  // Renamed and refactored for Smart Logic
  // [MODIFIED] Now also handles videoHistory updates
  const updateProgress = (courseId, newCompletedIds) => {
    setLastActiveCourseId(courseId);

    // Get old state from current closure (consistent with how newCompletedIds is dervied)
    const oldCompletedIds = progressData[courseId] || [];

    // 1. Find newly added videos
    const addedIds = newCompletedIds.filter(id => !oldCompletedIds.includes(id));

    // 2. Find removed videos
    const removedIds = oldCompletedIds.filter(id => !newCompletedIds.includes(id));

    // --- History Logic ---
    if (addedIds.length > 0 || removedIds.length > 0) {
      setVideoHistory(prevHistory => {
        let updatedHistory = [...prevHistory];

        // Add new records ONLY if they don't already exist in history
        addedIds.forEach(vidId => {
          const alreadyExists = updatedHistory.some(h => h.courseId === courseId && h.videoId === vidId);
          if (!alreadyExists) {
            updatedHistory.push({
              videoId: vidId,
              courseId: courseId,
              timestamp: new Date().toISOString()
            });
          }
        });

        // Remove records for un-checked videos
        if (removedIds.length > 0) {
          updatedHistory = updatedHistory.filter(h =>
            !(h.courseId === courseId && removedIds.includes(h.videoId))
          );
        }

        return updatedHistory;
      });
    }

    // --- Progress Logic ---
    setProgressData(prev => {
      if (newCompletedIds.length === 0) {
        const newState = { ...prev };
        delete newState[courseId];
        return newState;
      }
      return {
        ...prev,
        [courseId]: newCompletedIds
      };
    });

    // --- Celebration Logic ---
    const course = courseData.flatMap(cat => cat.courses).find(c => c.id === courseId);
    if (course && newCompletedIds.length === course.totalVideos) {
      const wasCompletedBefore = oldCompletedIds.length === course.totalVideos;
      if (!wasCompletedBefore) {
        setCelebratingCourse(course.name);
      }
    }
  };

  const handleVideoClick = (e, courseId, videoId) => {
    // e.stopPropagation(); // Handled in render

    // [NEW] Ctrl + Click (or Cmd + Click) -> Single Toggle
    if (e.ctrlKey || e.metaKey) {
      const currentCompleted = progressData[courseId] || [];
      const isCompleted = currentCompleted.includes(videoId);

      if (isCompleted) {
        updateProgress(courseId, currentCompleted.filter(id => id !== videoId));
      } else {
        updateProgress(courseId, [...currentCompleted, videoId]);
      }
      return;
    }

    const currentCompleted = progressData[courseId] || [];
    const isCompleted = currentCompleted.includes(videoId);

    // Find video index
    const course = courseData.flatMap(cat => cat.courses).find(c => c.id === courseId);
    const videos = course?.videos || [];
    const index = videos.findIndex(v => v.id === videoId);

    if (index === -1) return;

    // If already completed: Uncheck "Forward Chain"
    // Remove the clicked video AND any immediately following completed videos (contiguous chain).
    // Stop removing when a gap or uncompleted video is found.
    // This preserves isolated videos further down the list (e.g., clicking 1 clears 1-5 but keeps 10).
    if (isCompleted) {
      let chainEndIndex = index;
      // Find the end of the contiguous chain starting at 'index'
      while (chainEndIndex < videos.length - 1) {
        const nextVideoId = videos[chainEndIndex + 1].id;
        if (currentCompleted.includes(nextVideoId)) {
          chainEndIndex++;
        } else {
          break;
        }
      }

      // Remove everything from index to chainEndIndex (inclusive)
      const newIds = currentCompleted.filter(cId => {
        const cIndex = videos.findIndex(v => v.id === cId);
        return cIndex < index || cIndex > chainEndIndex;
      });

      updateProgress(courseId, newIds);
      return;
    }

    // Smart Fill Logic: Always fill up to this video (Left Click default)
    const newIds = [...currentCompleted];

    // Fill from 0 to index if not present
    for (let i = 0; i <= index; i++) {
      const vId = videos[i].id;
      if (!newIds.includes(vId)) {
        newIds.push(vId);
      }
    }
    updateProgress(courseId, newIds);
  };



  // Re-calculate stats with new data structure


  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleCourse = (courseId) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };



  if (loading) return null; // Or a loading spinner
  if (!user) return <Login />;

  const flatCourses = courseData.flatMap(cat => cat.courses);
  const activeCourse = lastActiveCourseId ? flatCourses.find(c => c.id === lastActiveCourseId) : null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <AnimatePresence>
        {celebratingCourse && (
          <Suspense fallback={null}>
            <CelebrationOverlay
              courseName={celebratingCourse}
              onComplete={() => setCelebratingCourse(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Popover Backdrop - Closes when clicking anywhere outside the popover */}




      {showTimer && (
        <Suspense fallback={<ModalLoader />}>
          <PomodoroTimer
            initialCourse={activeCourse}
            courses={flatCourses}
            sessionsCount={sessions.filter(s => s.type === 'work' && getLocalYMD(new Date(s.timestamp)) === getLocalYMD(new Date())).length}
            // [NEW] Calculate total break duration for today in minutes
            totalBreakDuration={Math.round(sessions
              .filter(s => s.type === 'break' && getLocalYMD(new Date(s.timestamp)) === getLocalYMD(new Date()))
              .reduce((acc, s) => acc + (s.duration || 0), 0) / 60)}
            onSessionComplete={handleSessionComplete}
            onClose={() => setShowTimer(false)}
          />
        </Suspense>
      )}

      {showReport && (
        <Suspense fallback={<ModalLoader />}>
          <ReportModal
            sessions={sessions}
            courses={flatCourses}
            onClose={() => setShowReport(false)}
            onDelete={handleDeleteSessions}
            onUpdate={handleUpdateSession}
            videoHistory={videoHistory}
            progressData={progressData}
          />
        </Suspense>
      )}

      {showSchedule && (
        <Suspense fallback={<ModalLoader />}>
          <ScheduleModal
            onClose={() => setShowSchedule(false)}
            schedule={schedule}
            setSchedule={setSchedule}
          />
        </Suspense>
      )}

      {showRankModal && (
        <Suspense fallback={<ModalLoader />}>
          <RankModal
            currentRank={rankInfo}
            totalHours={totalHours}
            completedHours={completedHours}
            sessions={sessions}
            onClose={() => setShowRankModal(false)}
          />
        </Suspense>
      )}

      {activeNoteCourse && (
        <Suspense fallback={<ModalLoader />}>
          <NotesModal
            courseName={activeNoteCourse.name}
            courseId={activeNoteCourse.id}
            notePath={activeNoteCourse.path}
            onClose={() => setActiveNoteCourse(null)}
          />
        </Suspense>
      )}

      {activeQuizCourse && (
        <Suspense fallback={<ModalLoader />}>
          <QuizModal
            isOpen={!!activeQuizCourse}
            onClose={() => setActiveQuizCourse(null)}
            courseId={activeQuizCourse.id}
            courseName={activeQuizCourse.name}
            notePath={activeQuizCourse.path}
          />
        </Suspense>
      )}

      {/* Top Header Dashboard */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-secondary shadow-lg shadow-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-4">

          {/* --- MOBILE LAYOUT --- */}
          <div className="md:hidden flex flex-col gap-3">

            {/* Row 1: Rank Info (Left) + Streak (Right) */}
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setShowRankModal(true)}
              >
                <div className="bg-card p-2 rounded-xl border border-secondary/50 relative group-hover:border-primary/30 transition-colors shadow-sm">
                  {(() => {
                    const Icon = RANK_ICONS[rankInfo.icon] || Goal;
                    return <Icon size={20} className="text-primary" />;
                  })()}
                </div>
                <h1 className={cn("text-xl font-bold tracking-tight text-foreground leading-tight", rankInfo.color)}>
                  {rankInfo.title}
                </h1>
              </div>

              <StreakDisplay streak={currentStreak} />
            </div>

            {/* Row 2: Daily Focus (Left) + Actions (Right) */}
            <div className="flex items-center justify-between gap-2">

              <div className="inline-flex items-center gap-2 bg-primary/5 px-3 py-2 rounded-lg border border-primary/10 w-fit shrink-0">
                <Calendar size={14} className="text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide truncate max-w-[100px]">
                  {dailyFocus}
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowTimer(true)}
                  className="bg-card text-muted-foreground hover:text-primary border-border/30 hover:bg-primary/10 transition-all active:scale-95"
                  title="Sayaç"
                >
                  <Timer size={18} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowReport(true)}
                  className="bg-card text-muted-foreground hover:text-primary border-border/30 hover:bg-primary/10 transition-all active:scale-95"
                  title="Rapor"
                >
                  <ChartLine size={18} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSchedule(true)}
                  className="bg-card text-muted-foreground hover:text-primary border-border/30 hover:bg-primary/10 transition-all active:scale-95"
                  title="Program"
                >
                  <CalendarDays size={18} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={logout}
                  className="bg-card text-muted-foreground hover:text-destructive border-border/30 hover:bg-red-500/10 transition-all active:scale-95"
                  title="Çıkış"
                >
                  <LogOut size={18} />
                </Button>
              </div>

            </div>
          </div>


          {/* --- DESKTOP LAYOUT --- */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div
                className="relative cursor-pointer hover:scale-105 transition-transform group"
                onClick={() => setShowRankModal(true)}
              >
                <div className="bg-card p-3 rounded-xl border border-secondary/50 relative group-hover:border-primary/30 box-border transition-colors">
                  {(() => {
                    const Icon = RANK_ICONS[rankInfo.icon] || Goal;
                    return <Icon size={28} className="text-primary group-hover:drop-shadow-lg" />;
                  })()}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h1
                  className={cn("text-3xl font-bold tracking-tight text-foreground leading-tight cursor-pointer hover:opacity-80 transition-opacity", rankInfo.color)}
                  onClick={() => setShowRankModal(true)}
                >
                  {rankInfo.title}
                </h1>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 w-fit hover:bg-primary/10 transition-colors">
                    <Calendar size={14} className="text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">
                      Bugün: {dailyFocus}
                    </span>
                  </div>
                  <StreakDisplay streak={currentStreak} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowTimer(!showTimer)}
                className="h-[46px] w-[46px] bg-card text-muted-foreground hover:text-primary hover:bg-card/80 transition-all hover:scale-105 shadow-lg border-border/30 [&_svg]:size-5"
                title="Pomodoro Sayacı"
              >
                <Timer size={20} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowReport(true)}
                className="h-[46px] w-[46px] bg-card text-muted-foreground hover:text-primary hover:bg-card/80 transition-all hover:scale-105 shadow-lg border-border/30 [&_svg]:size-5"
                title="Raporları Görüntüle"
              >
                <ChartLine size={20} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSchedule(true)}
                className="h-[46px] w-[46px] bg-card text-muted-foreground hover:text-primary hover:bg-card/80 transition-all hover:scale-105 shadow-lg border-border/30 [&_svg]:size-5"
                title="Çalışma Programı"
              >
                <CalendarDays size={20} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={logout}
                className="h-[46px] w-[46px] bg-card text-muted-foreground hover:text-destructive hover:bg-card/80 transition-all hover:scale-105 shadow-lg border-border/30 [&_svg]:size-5"
                title="Çıkış Yap"
              >
                <LogOut size={20} />
              </Button>
            </div>
          </div>

        </div >
      </header >

      {/* Main Content Grid */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Progress Stats (Relocated) */}
        <Card className="max-w-2xl mx-auto mb-10 bg-card/50 border-border/30 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-end mb-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Mevcut Hedef</span>
                <span className="text-lg font-bold text-primary flex items-center gap-2">
                  {(() => {
                    const Icon = RANK_ICONS[nextRank.icon] || Goal;
                    return <Icon size={18} />;
                  })()}
                  {nextRank.title}
                </span>
              </div>
              <span className="text-3xl font-mono font-bold text-foreground tracking-tighter"><span className="mr-1">%</span>{totalPercentage.toFixed(1)}</span>
            </div>
            <ProgressBar
              progress={totalPercentage}
              currentLevelMin={rankInfo.min}
              nextLevelMin={nextRank.min}
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs font-bold text-primary/80 tracking-tight">
                % {nextRank.min} için devam et
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 mt-2 text-[11px] font-medium border-t border-white/5 pt-4">
              <span className="flex items-center gap-1.5 whitespace-nowrap text-zinc-400">
                <Youtube size={14} className="shrink-0 text-red-500" />
                <span className="text-zinc-200">{completedCount}</span>
                <span className="mx-0.5 text-zinc-400">/</span>
                <span className="text-zinc-400">{totalVideos} Video</span>
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap text-zinc-400">
                <Timer size={14} className="shrink-0 text-emerald-500" />
                <span className="text-zinc-200">{formatHours(completedHours)}</span>
                <span className="mx-0.5 text-zinc-400">/</span>
                <span className="text-zinc-400">{formatHours(totalHours)}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 items-start">
          {courseData.map((category, catIdx) => {
            const categoryTotalHours = category.courses.reduce((acc, c) => acc + c.totalHours, 0);
            const categoryTotalVideos = category.courses.reduce((acc, c) => acc + c.totalVideos, 0);
            const categoryCompletedVideos = category.courses.reduce((acc, c) => acc + (progressData[c.id] || []).length, 0);

            // Calculate Category Completed Hours
            const categoryCompletedHours = category.courses.reduce((acc, c) => {
              const completedIds = progressData[c.id] || [];
              const cVideos = c.videos || [];
              const dur = completedIds.reduce((dAcc, vidId) => {
                const v = cVideos.find(video => video.id === vidId);
                return dAcc + (v ? v.durationMinutes : (c.totalHours * 60 / (c.totalVideos || 1)));
              }, 0);
              return acc + (dur / 60);
            }, 0);

            const categoryPercent = categoryTotalHours > 0 ? Math.round((categoryCompletedHours / categoryTotalHours) * 100) : 0;

            const categoryNameRaw = category.category.split('(')[0].replace(/^\d+\.\s*/, '').trim();
            const styles = CATEGORY_STYLES[categoryNameRaw] || CATEGORY_STYLES['DEFAULT'];
            const IconComponent = CATEGORY_ICONS[categoryNameRaw] || CATEGORY_ICONS['DEFAULT'];

            return (
              <Card key={catIdx} className={cn("overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/20 group", styles.bg, styles.border)}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(catIdx)}
                  className="w-full p-6 bg-transparent transition-colors cursor-pointer block text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl transition-transform duration-300 group-hover:scale-105", styles.iconBg)}>
                        <IconComponent size={24} className={styles.accent} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={cn("font-semibold text-lg tracking-tight transition-colors", categoryPercent === 100 ? "text-amber-400" : styles.accent)}>
                            {category.category.split('(')[0]}
                          </h3>
                          {categoryPercent === 100 && <BadgeCheck size={18} className="text-amber-400 animate-bounce" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold bg-black/10 px-2 py-1 rounded-lg whitespace-nowrap text-zinc-400">
                            <Timer size={14} className={styles.accent} />
                            <span className="text-zinc-400">{formatHours(categoryCompletedHours)}</span>
                            <span className="mx-0.5 text-zinc-400">/</span>
                            <span className="text-zinc-400">{formatHours(categoryTotalHours)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold bg-black/10 px-2 py-1 rounded-lg whitespace-nowrap text-zinc-400">
                            <MonitorPlay size={14} className={styles.accent} />
                            <span className="text-zinc-400">{categoryCompletedVideos}</span>
                            <span className="mx-0.5 text-zinc-400">/</span>
                            <span className="text-zinc-400">{categoryTotalVideos} Video</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={cn("bg-black/20 p-2 rounded-full transition-transform duration-300", expandedCategories.has(catIdx) ? "rotate-180" : "")}>
                      <ChevronDown size={20} className="text-muted-foreground/50" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <CategoryProgressBar percentage={categoryPercent} colorClass={styles.barColor} />
                    <span className={cn("text-xs font-bold min-w-[3rem] text-right", styles.accent)}>%{categoryPercent}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategories.has(catIdx) && (
                    <Motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={cn("border-t bg-black/10", styles.border)}
                    >
                      <div className="p-4 space-y-4">
                        {category.courses.map(course => {
                          const completedIds = progressData[course.id] || [];
                          const courseCompletedCount = completedIds.length;

                          const courseVideos = course.videos || [];
                          const courseCompletedMinutes = completedIds.reduce((acc, vidId) => {
                            const v = courseVideos.find(video => video.id === vidId);
                            return acc + (v ? v.durationMinutes : 0);
                          }, 0);
                          const courseCompletedHours = courseCompletedMinutes / 60;

                          const coursePercent = course.totalHours > 0 ? Math.round((courseCompletedHours / course.totalHours) * 100) : 0;

                          const courseProgress = {
                            completed: courseCompletedCount,
                            total: course.totalVideos,
                            percentage: coursePercent,
                            completedVideos: completedIds
                          };

                          const isCourseCompleted = courseProgress.completed === courseProgress.total && courseProgress.total > 0;

                          return (
                            <div
                              key={course.id}
                              className={cn(
                                "border rounded-xl overflow-hidden shadow-lg shadow-black/20 transition-all duration-300",
                                isCourseCompleted
                                  ? "border-amber-400/40 bg-amber-400/5 shadow-amber-400/10"
                                  : styles.border,
                                isCourseCompleted ? "" : styles.bg
                              )}
                            >
                              <div
                                className="p-4 cursor-pointer hover:bg-white/5 transition-colors relative"
                                onClick={() => toggleCourse(course.id)}
                              >
                                <div className="flex gap-3">
                                  {/* Icon - Fixed Width */}
                                  <div className={cn("p-2 rounded-lg shrink-0 h-fit", styles.iconBg)}>
                                    <IconComponent className={styles.accent} size={20} />
                                  </div>

                                  {/* Main Content Column */}
                                  <div className="flex-1 min-w-0">
                                    {/* Header: Title + Mobile Right Elements */}
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <h3 className={cn("font-bold text-sm truncate", isCourseCompleted ? "text-amber-200" : "text-zinc-300")}>
                                          {course.name}
                                        </h3>
                                        {isCourseCompleted && (
                                          <BadgeCheck size={16} className="text-amber-400 shrink-0" />
                                        )}
                                      </div>

                                      {/* Mobile: Percent + Chevron (Top Right) */}
                                      <div className="flex sm:hidden items-center gap-2 shrink-0">
                                        <div className="px-2 py-1 rounded-lg bg-zinc-800/80 backdrop-blur-sm border border-white/5 shadow-inner">
                                          <span className={cn("text-xs font-bold tracking-tight", isCourseCompleted ? "text-amber-400" : styles.accent)}>
                                            %{Math.round(courseProgress.percentage)}
                                          </span>
                                        </div>
                                        <ChevronDown
                                          className={`text-muted-foreground/50 transition-transform duration-300 ${expandedCourses.has(course.id) ? 'rotate-180' : ''} `}
                                          size={18}
                                        />
                                      </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex flex-wrap items-center gap-2 my-1.5">
                                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold bg-black/10 px-1.5 py-1 rounded-md whitespace-nowrap text-zinc-400">
                                        <Timer size={12} className="text-zinc-400" />
                                        <span className="text-zinc-400">{formatHours(courseCompletedHours)}</span>
                                        <span className="mx-0.5 text-zinc-400">/</span>
                                        <span className="text-zinc-400">{formatHours(course.totalHours)}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold bg-black/10 px-1.5 py-1 rounded-md whitespace-nowrap text-zinc-400">
                                        <MonitorPlay size={12} className="text-zinc-400" />
                                        <span className={cn("text-zinc-400", courseProgress.completed === courseProgress.total ? "text-emerald-400" : "")}>
                                          {courseProgress.completed}
                                        </span>
                                        <span className="mx-0.5 text-zinc-400">/</span>
                                        <span className="text-zinc-400">{courseProgress.total} Video</span>
                                      </div>
                                    </div>

                                    {/* Mobile: Actions Row (Left Aligned, Under Video Count) */}
                                    <div className="flex sm:hidden items-center gap-2 mt-3">
                                      {course.playlistUrl && (
                                        <a
                                          href={course.playlistUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center hover:bg-rose-200 transition-all hover:scale-105 shadow-sm group/yt"
                                          title="Oynatma Listesine Git"
                                        >
                                          <Youtube size={16} className="text-red-600 group-hover/yt:text-red-700" strokeWidth={2} />
                                        </a>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (course.notePath) {
                                            setActiveNoteCourse({ name: course.name, path: course.notePath, id: course.id });
                                          } else {
                                            showToast("Henüz not bulunamadı", 'error');
                                          }
                                        }}
                                        className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition-all hover:scale-105 shadow-sm group/note"
                                        title="Ders Notları"
                                      >
                                        <FileText size={16} className="text-emerald-600 group-hover/note:text-emerald-700" strokeWidth={2} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (course.notePath) {
                                            setActiveQuizCourse({ name: course.name, path: course.notePath, id: course.id });
                                          } else {
                                            showToast("Önce ders notu yüklenmelidir", 'warning');
                                          }
                                        }}
                                        className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center hover:bg-purple-200 transition-all hover:scale-105 shadow-sm group/quiz"
                                        title="Soru Çöz"
                                      >
                                        <HelpCircle size={16} className="text-purple-600 group-hover/quiz:text-purple-700" strokeWidth={2} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Desktop: Right Elements (Actions + Percent + Chevron) */}
                                  <div className="hidden sm:flex items-center justify-end gap-3 shrink-0 ml-auto self-center">
                                    {course.playlistUrl && (
                                      <a
                                        href={course.playlistUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center hover:bg-rose-200 transition-all hover:scale-105 shadow-sm group/yt"
                                        title="Oynatma Listesine Git"
                                      >
                                        <Youtube size={20} className="text-red-600 group-hover/yt:text-red-700" strokeWidth={2} />
                                      </a>
                                    )}

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (course.notePath) {
                                          setActiveNoteCourse({ name: course.name, path: course.notePath, id: course.id });
                                        } else {
                                          showToast("Henüz not bulunamadı", 'error');
                                        }
                                      }}
                                      className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition-all hover:scale-105 shadow-sm group/note"
                                      title="Ders Notları"
                                    >
                                      <FileText size={20} className="text-emerald-600 group-hover/note:text-emerald-700" strokeWidth={2} />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (course.notePath) {
                                          setActiveQuizCourse({ name: course.name, path: course.notePath, id: course.id });
                                        } else {
                                          showToast("Önce ders notu yüklenmelidir", 'warning');
                                        }
                                      }}
                                      className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center hover:bg-purple-200 transition-all hover:scale-105 shadow-sm group/quiz"
                                      title="Soru Çöz"
                                    >
                                      <HelpCircle size={20} className="text-purple-600 group-hover/quiz:text-purple-700" strokeWidth={2} />
                                    </button>

                                    <div className="px-3 py-1.5 rounded-lg bg-zinc-800/80 backdrop-blur-sm border border-white/5 shadow-inner">
                                      <span className={cn("text-sm font-bold tracking-tight", isCourseCompleted ? "text-amber-400" : styles.accent)}>
                                        %{Math.round(courseProgress.percentage)}
                                      </span>
                                    </div>

                                    <ChevronDown
                                      className={`text-muted-foreground/50 transition-transform duration-300 ${expandedCourses.has(course.id) ? 'rotate-180' : ''} `}
                                      size={18}
                                    />
                                  </div>
                                </div>
                              </div>

                              <AnimatePresence>
                                {expandedCourses.has(course.id) && (
                                  <Motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                  >
                                    <div className={cn("p-4 border-t bg-black/20", styles.border)}>
                                      <div className="flex flex-col gap-2">
                                        {courseVideos.map((video) => {
                                          const isCompleted = courseProgress.completedVideos.includes(video.id);
                                          const isGap = isCompleted &&
                                            (() => {
                                              const vIndex = courseVideos.findIndex(v => v.id === video.id);
                                              if (vIndex <= 0) return false;
                                              const prevId = courseVideos[vIndex - 1].id;
                                              return !courseProgress.completedVideos.includes(prevId);
                                            })();

                                          return (
                                            <div
                                              key={video.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleVideoClick(e, course.id, video.id);
                                              }}

                                              className={cn(
                                                "group relative p-3 rounded-lg border border-dashed transition-all duration-300 flex items-center justify-between cursor-pointer",
                                                isCompleted
                                                  ? `${styles.iconBg} ${styles.border.replace('border-', 'border-solid border-')} shadow - sm`
                                                  : 'bg-background/50 border-input hover:border-accent hover:bg-card hover:shadow-md hover:-translate-y-0.5'
                                              )}
                                            >
                                              <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={cn(
                                                  "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0",
                                                  isCompleted
                                                    ? (isGap ? 'bg-amber-500/20 border-amber-500' : `${styles.accent.replace('text-', 'bg-')} ${styles.accent.replace('text-', 'border-')} `)
                                                    : 'border-muted-foreground/50 group-hover:border-accent'
                                                )}>
                                                  {isCompleted && <Check size={14} className={isGap ? 'text-amber-500' : 'text-white'} strokeWidth={3} />}
                                                </div>
                                                <span className={cn("font-mono text-xs font-bold tracking-tight shrink-0", isCompleted ? styles.accent : 'text-muted-foreground')}>
                                                  #{video.id}
                                                </span>
                                                <span className={cn("text-sm font-medium truncate", isCompleted ? 'text-foreground/90' : 'text-foreground/75 group-hover:text-foreground')}>
                                                  {video.title}
                                                </span>
                                              </div>

                                              <span className={cn("text-xs font-mono font-medium ml-2 px-2 py-1 rounded-md bg-black/10 shrink-0", styles.accent)}>
                                                {video.duration}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </Motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div >
      </main >
    </div >
  );
}
