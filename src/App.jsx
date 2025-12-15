import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trophy, BookOpen, Youtube, LogOut, Timer, BarChart2, Calendar, Check } from 'lucide-react';
import ScheduleModal from './components/ScheduleModal';


import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Hook to track previous value
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// --- Data ---
import { courseData, RANKS } from './data';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login';
import PomodoroTimer from './components/PomodoroTimer';
import ReportModal from './components/ReportModal';
import RankModal from './components/RankModal';
import StreakDisplay from './components/StreakDisplay';
import { calculateStreak, logActivity, removeActivity, getLocalYMD } from './utils/streakUtils';

// --- Components ---

const ProgressBar = ({ progress, nextLevelMin, currentLevelMin }) => {
  const range = nextLevelMin - currentLevelMin;
  const currentVal = progress - currentLevelMin;
  const percentage = Math.min(100, Math.max(0, (currentVal / (range || 1)) * 100));

  return (
    <div className="w-full bg-custom-header rounded-full h-3 mt-4 overflow-hidden">
      <motion.div
        className="h-full bg-custom-accent rounded-full relative"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5 }}
      >
      </motion.div>
    </div>
  );
};

const LevelUpModal = ({ title, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-pointer"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, y: 50, rotateX: 90 }}
          animate={{ scale: 1, y: 0, rotateX: 0 }}
          exit={{ scale: 0.5, y: 50, rotateX: 90 }}
          className="bg-custom-header border border-custom-category rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl shadow-custom-accent/10"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-block mb-4"
          >
            <Trophy size={80} className="text-yellow-400 mx-auto drop-shadow-md" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">TERFİ!</h2>
          <p className="text-custom-title/70 mb-6 font-medium">Yeni Ünvanınız:</p>
          <div className="text-xl font-medium text-custom-text mb-8 border-y border-custom-category py-4 bg-custom-bg/30 rounded-lg">
            {title}
          </div>
          <button
            onClick={onClose}
            className="w-full bg-custom-accent hover:bg-custom-accent/90 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-custom-accent/20 cursor-pointer"
          >
            MÜKEMMEL
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const CategoryProgressBar = ({ percentage, colorClass }) => {
  return (
    <div className="w-full bg-custom-category/50 rounded-full h-1.5 mt-2 overflow-hidden">
      <motion.div
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
  'MUHASEBE-MALİYE': { bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', border: 'border-emerald-500/20', accent: 'text-emerald-300', iconBg: 'bg-emerald-500/20', barColor: 'bg-emerald-300' },
  'YETENEK-BANKA': { bg: 'bg-violet-500/10 hover:bg-violet-500/20', border: 'border-violet-500/20', accent: 'text-violet-300', iconBg: 'bg-violet-500/20', barColor: 'bg-violet-300' },
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

  const [showTimer, setShowTimer] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);

  // Daily Focus Logic
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
      'ÇARŞAMBA': 'MUHASEBE - MALİYE',
      'PERŞEMBE': 'EKONOMİ',
      'CUMA': 'HUKUK',
      'CUMARTESİ / PAZAR': 'YETENEK - BANKA',
    };
    return defaultSchedule[todayKey] || 'BELİRSİZ';
  };
  const dailyFocus = getDailyFocus();

  // Initialize data when user changes
  useEffect(() => {
    // Reset state immediately to prevent data leakage from previous user
    setProgressData({});
    setSessions([]);
    setSchedule({});
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


  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Calculate total videos and hours
  const totalVideos = useMemo(() => courseData.reduce((acc, cat) =>
    acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalVideos, 0), 0), []);

  const totalHours = useMemo(() => courseData.reduce((acc, cat) =>
    acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalHours, 0), 0), []);

  // Calculate stats using derived state (useMemo) to avoid useEffect cascading
  const { totalPercentage, rankInfo, nextRank, completedHours, completedCount } = useMemo(() => {
    const completedTotal = Object.values(progressData).reduce((acc, val) => {
      if (Array.isArray(val)) return acc + val.length;
      return acc;
    }, 0);

    const percent = totalVideos > 0 ? (completedTotal / totalVideos) * 100 : 0;

    let currentRank = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (Math.floor(percent) >= RANKS[i].min) {
        currentRank = RANKS[i];
        break;
      }
    }

    const nextRankIndex = RANKS.findIndex(r => r.title === currentRank.title) + 1;
    const nextR = RANKS[nextRankIndex] || { min: 100, title: "Zirve" };

    // Hours
    let hours = 0;
    Object.keys(progressData).forEach(courseId => {
      const course = courseData.flatMap(cat => cat.courses).find(c => c.id === courseId);
      if (course) {
        const cCount = progressData[courseId].length;
        if (cCount > 0) {
          hours += (cCount / course.totalVideos) * course.totalHours;
        }
      }
    });

    return {
      totalPercentage: percent,
      rankInfo: currentRank,
      nextRank: nextR,
      completedHours: hours,
      completedCount: completedTotal
    };
  }, [progressData, totalVideos]);

  const currentStreak = useMemo(() => calculateStreak(activityLog), [activityLog]);



  // Level Up Check


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

  const handleSessionComplete = (duration, type, overrideCourseId) => {
    if (type !== 'work') return; // Don't record break sessions

    const newSession = {
      timestamp: Date.now(),
      duration,
      type,
      courseId: overrideCourseId || lastActiveCourseId
    };
    setSessions(prev => [...prev, newSession]);
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

  // --- Activity Tracking Logic (Refactored to Sticky Baseline) ---
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
      // The user verified rule: "If NOT exists: Save current video counts"
      baseline = currentTotal;
      localStorage.setItem(storageKey, baseline.toString());
      // Also cleanup old keys from yesterday to keep storage clean? Optional.
    }

    // NOTE: We do NOT update baseline if it exists. It is sticky (immutable downwards).

    // Calculate net points
    // Rule: Points = Max(0, Current_Count - Daily_Baseline)
    const netProgress = Math.max(0, currentTotal - baseline);

    setActivityLog(prev => {
      const currentVal = prev[todayStr];

      if (netProgress > 0) {
        if (currentVal !== netProgress) {
          return { ...prev, [todayStr]: netProgress };
        }
      } else {
        // If 0, remove the day's record (so streak assumes 0 activity)
        if (currentVal !== undefined) {
          const next = { ...prev };
          delete next[todayStr];
          return next;
        }
      }
      return prev;
    });

  }, [progressData, isDataLoaded]);

  // Refactored Toggle Handler for specific video index with auto-complete previous and auto-uncheck subsequent
  // Logic: Clicking video N ensures 1..N are checked, and N+1..End are unchecked.
  // It effectively sets the progress "level" to N.
  const handleVideoToggle = (courseId, videoIndex) => {
    setLastActiveCourseId(courseId); // Update active context

    setProgressData(prev => {
      // Create a set of 1..videoIndex
      const newSet = new Set();
      for (let i = 1; i <= videoIndex; i++) {
        newSet.add(i);
      }

      return {
        ...prev,
        [courseId]: Array.from(newSet)
      };
    });
  };

  // Re-calculate stats with new data structure
  // const getCompletedCount = () ... removed as now derived

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
      {showLevelUp && <LevelUpModal title={newTitle} onClose={() => setShowLevelUp(false)} />}

      {showTimer && (
        <PomodoroTimer
          initialCourse={activeCourse}
          courses={flatCourses}
          sessionsCount={sessions.filter(s => s.type === 'work').length}
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
          onClose={() => setShowRankModal(false)}
        />
      )}

      {/* Top Header Dashboard */}
      <header className="sticky top-0 z-40 bg-custom-bg/95 backdrop-blur-xl border-b border-custom-category shadow-lg shadow-custom-accent/5">
        <div className="max-w-6xl mx-auto px-4 py-4">

          {/* --- MOBILE LAYOUT --- */}
          <div className="md:hidden flex flex-col gap-4">
            {/* Row 1: Title (Full Width) */}
            <div
              className="w-full border-b border-custom-category/20 pb-3 cursor-pointer hover:bg-custom-header/50 transition-colors rounded-lg px-2 -mx-2"
              onClick={() => setShowRankModal(true)}
            >
              <h1 className={cn("text-2xl font-bold tracking-tight text-custom-text leading-tight", rankInfo.color)}>
                {rankInfo.title}
              </h1>
            </div>

            {/* Row 2: Icon | Badge | Buttons */}
            <div className="flex items-center justify-between">

              {/* Left: Icon & Badge */}
              <div className="flex items-center gap-3">
                <div
                  className="relative cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setShowRankModal(true)}
                >
                  <div className="bg-custom-header p-2.5 rounded-xl border border-custom-category/50 relative">
                    <Trophy size={24} className="text-custom-accent" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 bg-custom-accent/5 px-3 py-1.5 rounded-lg border border-custom-accent/10 w-fit">
                  <Calendar size={14} className="text-custom-accent" />
                  <span className="text-[10px] font-bold text-custom-accent uppercase tracking-wide">
                    {dailyFocus}
                  </span>
                </div>

                <StreakDisplay streak={currentStreak} />
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTimer(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30 cursor-pointer"
                >
                  <Timer size={18} />
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30 cursor-pointer"
                >
                  <BarChart2 size={18} />
                </button>
                <button
                  onClick={() => setShowSchedule(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30 cursor-pointer"
                >
                  <Calendar size={18} />
                </button>
                <button
                  onClick={logout}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-error border border-custom-category/30 cursor-pointer"
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
            <span className="text-3xl font-mono font-bold text-custom-text tracking-tighter">%{totalPercentage.toFixed(1)}</span>
          </div>
          <ProgressBar
            progress={totalPercentage}
            currentLevelMin={rankInfo.min}
            nextLevelMin={nextRank.min}
          />
          <div className="flex justify-between mt-3 text-xs font-medium text-custom-title/60 border-t border-custom-category/20 pt-3">
            <span className="flex items-center gap-1.5">
              <Youtube size={14} className="text-red-500/70" />
              {completedCount} / {totalVideos} Video
            </span>
            <span className="flex items-center gap-1.5">
              <Timer size={14} className="text-custom-accent/70" />
              {formatHours(totalHours)} İzleme
            </span>
            <span>% {nextRank.min} için devam et</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 items-start">
          {courseData.map((category, catIdx) => {
            const categoryTotalHours = category.courses.reduce((acc, c) => acc + c.totalHours, 0);
            const categoryTotalVideos = category.courses.reduce((acc, c) => acc + c.totalVideos, 0);
            const categoryCompletedVideos = category.courses.reduce((acc, c) => acc + (progressData[c.id] || []).length, 0);

            const categoryPercent = categoryTotalVideos > 0 ? Math.round((categoryCompletedVideos / categoryTotalVideos) * 100) : 0;

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
                        <h3 className={cn("font-semibold text-lg tracking-tight transition-colors", styles.accent)}>{category.category.split('(')[0]}</h3>
                        <p className="text-xs text-custom-title/60 font-medium mt-1">
                          Toplam: {formatHours(categoryTotalHours)} • {categoryCompletedVideos} / {categoryTotalVideos} Video
                        </p>
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
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={cn("border-t bg-black/10", styles.border)}
                    >
                      <div className="p-4 space-y-4">
                        {category.courses.map(course => {
                          const courseCompleted = (progressData[course.id] || []).length;
                          const coursePercent = Math.round((courseCompleted / course.totalVideos) * 100);
                          const courseProgress = {
                            completed: courseCompleted,
                            total: course.totalVideos,
                            percentage: coursePercent,
                            completedVideos: progressData[course.id] || []
                          };

                          return (
                            <div key={course.id} className={cn("border rounded-xl overflow-hidden shadow-lg shadow-black/20", styles.bg, styles.border)}>
                              <div
                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={() => toggleCourse(course.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn("p-2 rounded-lg", styles.iconBg)}>
                                    <BookOpen className={styles.accent} size={20} />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-sm text-custom-title/80">{course.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-custom-title/60 font-medium tracking-wide">
                                        Toplam: {formatHours(course.totalHours)} • {courseProgress.completed}/{courseProgress.total} Video
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
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

                                  <div className="px-3 py-1.5 rounded-lg bg-zinc-800/80 backdrop-blur-sm border border-white/5 shadow-inner">
                                    <span className={cn("text-sm font-bold tracking-tight", styles.accent)}>
                                      %{Math.round(courseProgress.percentage)}
                                    </span>
                                  </div>

                                  <ChevronDown
                                    className={`text-custom-title/50 transition-transform duration-300 ${expandedCourses.has(course.id) ? 'rotate-180' : ''}`}
                                    size={18}
                                  />
                                </div>
                              </div>

                              <AnimatePresence>
                                {expandedCourses.has(course.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                  >
                                    <div className={cn("p-4 border-t bg-black/20", styles.border)}>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                                        {Array.from({ length: course.totalVideos }, (_, i) => i + 1).map((videoNum) => {
                                          const isCompleted = courseProgress.completedVideos.includes(videoNum);
                                          return (
                                            <div
                                              key={videoNum}
                                              onClick={() => handleVideoToggle(course.id, videoNum)}
                                              className={cn(
                                                "group relative p-2 rounded-lg border border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer",
                                                isCompleted
                                                  ? `${styles.iconBg} ${styles.border.replace('border-', 'border-solid border-')} shadow-sm`
                                                  : 'bg-custom-bg/50 border-custom-category/40 hover:border-custom-accent/50 hover:bg-custom-header hover:shadow-md hover:-translate-y-0.5'
                                              )}
                                            >
                                              <span className={cn("font-mono text-xs font-bold tracking-tight", isCompleted ? styles.accent : 'text-custom-title/70 group-hover:text-custom-text')}>
                                                #{videoNum}
                                              </span>
                                              <div className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300",
                                                isCompleted
                                                  ? `${styles.accent.replace('text-', 'bg-')} ${styles.accent.replace('text-', 'border-')}`
                                                  : 'border-custom-category/50 group-hover:border-custom-accent'
                                              )}>
                                                {isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
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
