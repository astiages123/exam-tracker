import React, { useState, useEffect, useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trophy, BookOpen, Youtube, LogOut, Timer, BarChart2, Calendar, Check, MonitorPlay, BadgeCheck, FileText, HelpCircle } from 'lucide-react';
import ScheduleModal from './components/ScheduleModal';


import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}



// --- Data ---
import { courseData, RANKS } from './data';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login';
import PomodoroTimer from './components/PomodoroTimer';
import ReportModal from './components/ReportModal';
import RankModal from './components/RankModal';
import NotesModal from './components/NotesModal';
import StreakDisplay from './components/StreakDisplay';
import { calculateStreak } from './utils/streakUtils';
import CelebrationOverlay from './components/CelebrationOverlay';
import QuizModal from './components/QuizModal';


// --- Components ---

const ProgressBar = ({ progress, nextLevelMin, currentLevelMin }) => {
  const range = nextLevelMin - currentLevelMin;
  const currentVal = progress - currentLevelMin;
  const percentage = Math.min(100, Math.max(0, (currentVal / (range || 1)) * 100));

  return (
    <div className="w-full bg-custom-header rounded-full h-3 mt-4 overflow-hidden">
      <Motion.div
        className="h-full bg-custom-accent rounded-full relative"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5 }}
      >
      </Motion.div>
    </div>
  );
};



const CategoryProgressBar = ({ percentage, colorClass }) => {
  return (
    <div className="w-full bg-custom-category/50 rounded-full h-1.5 mt-2 overflow-hidden">
      <Motion.div
        className={cn("h-full", colorClass || "bg-custom-accent")}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
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
  return `${hours}sa ${minutes}dk`;
};

const CATEGORY_STYLES = {
  'EKONOMİ': { bg: 'bg-sky-500/10 hover:bg-sky-500/20', border: 'border-sky-500/20', accent: 'text-sky-300', iconBg: 'bg-sky-500/20', barColor: 'bg-sky-300' },
  'HUKUK': { bg: 'bg-rose-500/10 hover:bg-rose-500/20', border: 'border-rose-500/20', accent: 'text-rose-300', iconBg: 'bg-rose-500/20', barColor: 'bg-rose-300' },
  'MUHASEBE - İŞLETME - MALİYE': { bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', border: 'border-emerald-500/20', accent: 'text-emerald-300', iconBg: 'bg-emerald-500/20', barColor: 'bg-emerald-300' },
  'MATEMATİK - BANKA': { bg: 'bg-violet-500/10 hover:bg-violet-500/20', border: 'border-violet-500/20', accent: 'text-violet-300', iconBg: 'bg-violet-500/20', barColor: 'bg-violet-300' },
  'DEFAULT': { bg: 'bg-custom-header', border: 'border-custom-category/30', accent: 'text-custom-accent', iconBg: 'bg-custom-accent/10', barColor: 'bg-custom-accent' }
};

export default function App() {
  const { user, logout, loading } = useAuth();

  // State: { [courseId]: completedCount }
  const [progressData, setProgressData] = useState({});
  const [sessions, setSessions] = useState([]); // [{ timestamp, duration, type, courseId }]
  const [schedule, setSchedule] = useState({}); // { "Pazartesi": [{ time: "09:00", subject: "Math" }] }
  const [activityLog, setActivityLog] = useState({}); // { "YYYY-MM-DD": true }
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
          .select('progress_data, sessions, schedule, activity_log')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setProgressData(data.progress_data || {});
          setSessions(data.sessions || []);
          setSchedule(data.schedule || {});
          setActivityLog(data.activity_log || {});
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
            updated_at: new Date()
          });

        if (error) console.error('Error saving data:', error);
      };

      // Debounce save to avoid too many writes (Reduced to 300ms for responsiveness)
      const timeoutId = setTimeout(saveData, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [user, progressData, sessions, schedule, activityLog, isDataLoaded]);

  const handleSessionComplete = (duration, type, overrideCourseId, startTime, pauses) => {
    // [MODIFIED] Now we record 'break' sessions too
    // if (type !== 'work') return;

    const newSession = {

      timestamp: startTime || Date.now(), // [MODIFIED] Use passed start time if available
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

  const handleDeleteSessions = (sessionIdsToDelete) => {
    setSessions(prev => prev.filter(s => !sessionIdsToDelete.includes(s.timestamp)));
  };

  // Helper function for local date string
  const getLocalYMD = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- Activity Tracking Logic (Refactored to Sticky Baseline + Session Integration) ---
  useEffect(() => {
    if (!isDataLoaded) return;

    // Helper to count total items
    const countItems = (data) => Object.values(data).reduce((acc, courseItems) => acc + (courseItems?.length || 0), 0);
    const currentTotal = countItems(progressData);

    // Sticky Baseline Logic
    const todayStr = getLocalYMD(new Date());
    const storageKey = `exam_tracker_baseline_${todayStr}`;

    let baseline = parseInt(localStorage.getItem(storageKey));

    if (isNaN(baseline)) {
      // First load of the day: Set baseline to current total
      baseline = currentTotal;
      localStorage.setItem(storageKey, baseline.toString());
    }

    // Calculate net points from videos
    const netProgress = Math.max(0, currentTotal - baseline);

    setActivityLog(prev => {
      const nextLog = { ...prev };
      const currentVal = nextLog[todayStr];

      // 1. Calculate Session Count for Today
      const sessionCount = sessions.reduce((acc, session) => {
        if (session.type === 'work' && getLocalYMD(new Date(session.timestamp)) === todayStr) {
          return acc + 1;
        }
        return acc;
      }, 0);

      // 2. Total Daily Activity
      const totalDailyActivity = netProgress + sessionCount;

      if (totalDailyActivity > 0) {
        if (currentVal !== totalDailyActivity) {
          nextLog[todayStr] = totalDailyActivity;
          return nextLog; // Update
        }
      } else {
        // If 0 activity, remove the day's record
        if (currentVal !== undefined) {
          delete nextLog[todayStr];
          return nextLog; // Remove
        }
      }

      // 3. Backfill / Merge from Past Sessions (preserve history)
      let hasBackfillChanges = false;
      sessions.forEach(session => {
        if (session.type === 'work') {
          const sessionDate = getLocalYMD(new Date(session.timestamp));
          // Don't overwrite today's logic above, only backfill past
          if (sessionDate !== todayStr && !nextLog[sessionDate]) {
            nextLog[sessionDate] = 1;
            hasBackfillChanges = true;
          }
        }
      });

      return hasBackfillChanges ? nextLog : prev;
    });

  }, [progressData, isDataLoaded, sessions]); // Added sessions dependency

  // Refactored Toggle Handler for specific video index with auto-complete previous and auto-uncheck subsequent
  // Logic: Clicking video N ensures 1..N are checked, and N+1..End are unchecked.
  // It effectively sets the progress "level" to N.
  // Renamed and refactored for Smart Logic
  const updateProgress = (courseId, newCompletedIds) => {
    setLastActiveCourseId(courseId);
    setProgressData(prev => {
      const course = courseData.flatMap(cat => cat.courses).find(c => c.id === courseId);

      // Celebration Check
      if (course && newCompletedIds.length === course.totalVideos) {
        const wasCompletedBefore = (prev[courseId] || []).length === course.totalVideos;
        if (!wasCompletedBefore) {
          setCelebratingCourse(course.name);
        }
      }

      return {
        ...prev,
        [courseId]: newCompletedIds
      };
    });
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
    <div className="min-h-screen bg-custom-bg text-custom-text font-sans selection:bg-custom-accent/30">
      <AnimatePresence>
        {celebratingCourse && (
          <CelebrationOverlay
            courseName={celebratingCourse}
            onComplete={() => setCelebratingCourse(null)}
          />
        )}
      </AnimatePresence>

      {/* Popover Backdrop - Closes when clicking anywhere outside the popover */}




      {showTimer && (
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
      )}

      {showReport && (
        <ReportModal
          sessions={sessions}
          courses={flatCourses}
          onClose={() => setShowReport(false)}
          onDelete={handleDeleteSessions}
        />
      )}

      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          schedule={schedule}
          setSchedule={setSchedule}
        />
      )}

      {showRankModal && (
        <RankModal
          currentRank={rankInfo}
          totalHours={totalHours}
          completedHours={completedHours}
          sessions={sessions}
          onClose={() => setShowRankModal(false)}
        />
      )}

      {activeNoteCourse && (
        <NotesModal
          courseName={activeNoteCourse.name}
          courseId={activeNoteCourse.id}
          notePath={activeNoteCourse.path}
          onClose={() => setActiveNoteCourse(null)}
        />
      )}

      {activeQuizCourse && (
        <QuizModal
          isOpen={!!activeQuizCourse}
          onClose={() => setActiveQuizCourse(null)}
          courseId={activeQuizCourse.id}
          courseName={activeQuizCourse.name}
          notePath={activeQuizCourse.path}
        />
      )}

      {/* Top Header Dashboard */}
      <header className="sticky top-0 z-40 bg-custom-bg/95 backdrop-blur-xl border-b border-custom-category shadow-lg shadow-custom-accent/5">
        <div className="max-w-6xl mx-auto px-4 py-4">

          {/* --- MOBILE LAYOUT --- */}
          <div className="md:hidden flex flex-col gap-3">

            {/* Row 1: Rank Info (Left) + Streak (Right) */}
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setShowRankModal(true)}
              >
                <div className="bg-custom-header p-2 rounded-xl border border-custom-category/50 relative group-hover:border-custom-accent/30 transition-colors shadow-sm">
                  <Trophy size={20} className="text-custom-accent" />
                </div>
                <h1 className={cn("text-xl font-bold tracking-tight text-custom-text leading-tight", rankInfo.color)}>
                  {rankInfo.title}
                </h1>
              </div>

              <StreakDisplay streak={currentStreak} />
            </div>

            {/* Row 2: Daily Focus (Left) + Actions (Right) */}
            <div className="flex items-center justify-between gap-2">

              <div className="inline-flex items-center gap-2 bg-custom-accent/5 px-3 py-2 rounded-lg border border-custom-accent/10 w-fit shrink-0">
                <Calendar size={14} className="text-custom-accent" />
                <span className="text-[10px] font-bold text-custom-accent uppercase tracking-wide truncate max-w-[100px]">
                  {dailyFocus}
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                <button
                  onClick={() => setShowTimer(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30 cursor-pointer hover:bg-custom-accent/5 transition-all active:scale-95"
                  title="Sayaç"
                >
                  <Timer size={18} />
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30 cursor-pointer hover:bg-custom-accent/5 transition-all active:scale-95"
                  title="Rapor"
                >
                  <BarChart2 size={18} />
                </button>
                <button
                  onClick={() => setShowSchedule(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30 cursor-pointer hover:bg-custom-accent/5 transition-all active:scale-95"
                  title="Program"
                >
                  <Calendar size={18} />
                </button>
                <button
                  onClick={logout}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-error border border-custom-category/30 cursor-pointer hover:bg-red-500/10 transition-all active:scale-95"
                  title="Çıkış"
                >
                  <LogOut size={18} />
                </button>
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
                <div className="bg-custom-header p-3 rounded-xl border border-custom-category/50 relative group-hover:border-custom-accent/30 box-border transition-colors">
                  <Trophy size={28} className="text-custom-accent group-hover:drop-shadow-lg" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h1
                  className={cn("text-3xl font-bold tracking-tight text-custom-text leading-tight cursor-pointer hover:opacity-80 transition-opacity", rankInfo.color)}
                  onClick={() => setShowRankModal(true)}
                >
                  {rankInfo.title}
                </h1>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 bg-custom-accent/5 px-3 py-1.5 rounded-lg border border-custom-accent/10 w-fit hover:bg-custom-accent/10 transition-colors">
                    <Calendar size={14} className="text-custom-accent" />
                    <span className="text-xs font-bold text-custom-accent uppercase tracking-wide">
                      Bugün: {dailyFocus}
                    </span>
                  </div>
                  <StreakDisplay streak={currentStreak} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTimer(!showTimer)}
                className="p-3 bg-custom-header rounded-xl text-custom-title/70 hover:text-custom-accent hover:bg-custom-header/80 transition-all hover:scale-105 shadow-lg shadow-black/10 border border-custom-category/30 cursor-pointer"
                title="Pomodoro Sayacı"
              >
                <Timer size={20} />
              </button>
              <button
                onClick={() => setShowReport(true)}
                className="p-3 bg-custom-header rounded-xl text-custom-title/70 hover:text-custom-accent hover:bg-custom-header/80 transition-all hover:scale-105 shadow-lg shadow-black/10 border border-custom-category/30 cursor-pointer"
                title="Raporları Görüntüle"
              >
                <BarChart2 size={20} />
              </button>
              <button
                onClick={() => setShowSchedule(true)}
                className="p-3 bg-custom-header rounded-xl text-custom-title/70 hover:text-custom-accent hover:bg-custom-header/80 transition-all hover:scale-105 shadow-lg shadow-black/10 border border-custom-category/30 cursor-pointer"
                title="Çalışma Programı"
              >
                <Calendar size={20} />
              </button>
              <button
                onClick={logout}
                className="p-3 bg-custom-header rounded-xl text-custom-title/70 hover:text-custom-error hover:bg-custom-header/80 transition-all hover:scale-105 shadow-lg shadow-black/10 border border-custom-category/30 cursor-pointer"
                title="Çıkış Yap"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

        </div >
      </header >

      {/* Main Content Grid */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Progress Stats (Relocated) */}
        <div className="max-w-2xl mx-auto mb-10 bg-custom-header/50 p-6 rounded-2xl border border-custom-category/30 shadow-lg shadow-black/5">
          <div className="flex justify-between items-end mb-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-custom-title/50 uppercase tracking-wider mb-1">Mevcut Hedef</span>
              <span className="text-lg font-bold text-custom-accent flex items-center gap-2">
                <Trophy size={18} />
                {nextRank.title}
              </span>
            </div>
            <span className="text-3xl font-mono font-bold text-custom-text tracking-tighter"><span className="mr-1">%</span>{totalPercentage.toFixed(1)}</span>
          </div>
          <ProgressBar
            progress={totalPercentage}
            currentLevelMin={rankInfo.min}
            nextLevelMin={nextRank.min}
          />
          <div className="flex justify-end mt-2">
            <span className="text-xs font-bold text-custom-accent/80 tracking-tight">
              % {nextRank.min} için devam et
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 mt-2 text-xs font-medium text-custom-title/60 border-t border-custom-category/20 pt-4">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Youtube size={14} className="text-red-500/70 shrink-0" />
              {completedCount} / {totalVideos} Video
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Timer size={14} className="text-custom-accent/70 shrink-0" />
              {formatHours(completedHours)} / {formatHours(totalHours)}
            </span>
          </div>
        </div>

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

            return (
              <div key={catIdx} className={cn("rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/20 group", styles.bg, styles.border)}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(catIdx)}
                  className="w-full p-6 bg-transparent transition-colors cursor-pointer block text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl transition-transform duration-300 group-hover:scale-105", styles.iconBg)}>
                        <BookOpen size={24} className={styles.accent} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={cn("font-semibold text-lg tracking-tight transition-colors", categoryPercent === 100 ? "text-amber-400" : styles.accent)}>
                            {category.category.split('(')[0]}
                          </h3>
                          {categoryPercent === 100 && <Trophy size={18} className="text-amber-400 animate-bounce" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-custom-title/80 bg-black/5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-black/5 whitespace-nowrap">
                            <Timer size={14} className={styles.accent} />
                            <span>{formatHours(categoryCompletedHours)}</span>
                            <span className="text-custom-title/30 mx-0.5">/</span>
                            <span className="opacity-60">{formatHours(categoryTotalHours)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-custom-title/80 bg-black/5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-black/5 whitespace-nowrap">
                            <MonitorPlay size={14} className={styles.accent} />
                            <span>{categoryCompletedVideos}</span>
                            <span className="text-custom-title/30 mx-0.5">/</span>
                            <span className="opacity-60">{categoryTotalVideos} Video</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={cn("bg-black/20 p-2 rounded-full transition-transform duration-300", expandedCategories.has(catIdx) ? "rotate-180" : "")}>
                      <ChevronDown size={20} className="text-custom-title/50" />
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
                                className="p-3 cursor-pointer hover:bg-white/5 transition-colors relative"
                                onClick={() => toggleCourse(course.id)}
                              >
                                <div className="flex gap-3">
                                  {/* Icon - Fixed Width */}
                                  <div className={cn("p-2 rounded-lg shrink-0 h-fit", styles.iconBg)}>
                                    <BookOpen className={styles.accent} size={20} />
                                  </div>

                                  {/* Main Content Column */}
                                  <div className="flex-1 min-w-0">
                                    {/* Header: Title + Mobile Right Elements */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <h3 className={cn("font-bold text-sm truncate", isCourseCompleted ? "text-amber-200" : "text-custom-title/80")}>
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
                                          className={`text-custom-title/50 transition-transform duration-300 ${expandedCourses.has(course.id) ? 'rotate-180' : ''}`}
                                          size={18}
                                        />
                                      </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1.5">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-custom-title/70 bg-black/5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md whitespace-nowrap">
                                          <Timer size={12} className="text-custom-title/50" />
                                          <span>{formatHours(courseCompletedHours)}</span>
                                          <span className="text-custom-title/30">/</span>
                                          <span className="opacity-70">{formatHours(course.totalHours)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-custom-title/70 bg-black/5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md whitespace-nowrap">
                                          <MonitorPlay size={12} className="text-custom-title/50" />
                                          <span className={courseProgress.completed === courseProgress.total ? "text-custom-success" : ""}>
                                            {courseProgress.completed}
                                          </span>
                                          <span className="text-custom-title/30">/</span>
                                          <span className="opacity-70">{courseProgress.total} Video</span>
                                        </div>
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
                                            alert("Henüz not bulunamadı");
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
                                            alert("Önce ders notu yüklenmelidir");
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
                                          alert("Henüz not bulunamadı");
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
                                          alert("Önce ders notu yüklenmelidir");
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
                                      className={`text-custom-title/50 transition-transform duration-300 ${expandedCourses.has(course.id) ? 'rotate-180' : ''}`}
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
                                                  ? `${styles.iconBg} ${styles.border.replace('border-', 'border-solid border-')} shadow-sm`
                                                  : 'bg-custom-bg/50 border-custom-category/40 hover:border-custom-accent/50 hover:bg-custom-header hover:shadow-md hover:-translate-y-0.5'
                                              )}
                                            >
                                              <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={cn(
                                                  "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0",
                                                  isCompleted
                                                    ? (isGap ? 'bg-amber-500/20 border-amber-500' : `${styles.accent.replace('text-', 'bg-')} ${styles.accent.replace('text-', 'border-')}`)
                                                    : 'border-custom-category/50 group-hover:border-custom-accent'
                                                )}>
                                                  {isCompleted && <Check size={14} className={isGap ? 'text-amber-500' : 'text-white'} strokeWidth={3} />}
                                                </div>
                                                <span className={cn("font-mono text-xs font-bold tracking-tight shrink-0", isCompleted ? styles.accent : 'text-custom-title/70')}>
                                                  #{video.id}
                                                </span>
                                                <span className={cn("text-sm font-medium truncate", isCompleted ? 'text-custom-text/90' : 'text-custom-title/80 group-hover:text-custom-text')}>
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
              </div>
            );
          })}
        </div >
      </main >
    </div >
  );
}
