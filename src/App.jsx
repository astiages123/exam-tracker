import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle, Circle, Trophy, BookOpen, Youtube, LogOut, Timer, BarChart2, Calendar } from 'lucide-react';
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

const CategoryProgressBar = ({ percentage }) => {
  return (
    <div className="w-full bg-custom-category/50 rounded-full h-1.5 mt-2 overflow-hidden">
      <motion.div
        className="h-full bg-custom-accent"
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

export default function App() {
  const { user, logout, loading } = useAuth();

  // State: { [courseId]: completedCount }
  const [progressData, setProgressData] = useState({});
  const [sessions, setSessions] = useState([]); // [{ timestamp, duration, type, courseId }]
  const [schedule, setSchedule] = useState({}); // { "Pazartesi": [{ time: "09:00", subject: "Math" }] }
  const [lastActiveCourseId, setLastActiveCourseId] = useState(null); // Track last interacted course

  const [showTimer, setShowTimer] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Daily Focus Logic
  // Daily Focus Logic
  const getDailyFocus = () => {
    const days = ['PAZAR', 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ'];
    const now = new Date();
    const todayIndex = now.getDay();
    const today = days[todayIndex];

    // Sunday Logic: Check if Saturday (yesterday) has any sessions
    if (todayIndex === 0) { // 0 is Sunday
      // Get Saturday's range (yesterday)
      const saturday = new Date(now);
      saturday.setDate(now.getDate() - 1);
      saturday.setHours(0, 0, 0, 0);
      const startOfSat = saturday.getTime();
      const endOfSat = startOfSat + (24 * 60 * 60 * 1000);

      const workedOnSaturday = sessions.some(s => s.timestamp >= startOfSat && s.timestamp < endOfSat);

      return workedOnSaturday ? 'TATİL' : 'YETENEK - BANKA';
    }

    // Dynamic focus from schedule if available
    if (schedule[today] && schedule[today].length > 0) {
      return schedule[today][0].subject.toUpperCase();
    }

    const defaultSchedule = {
      'PAZARTESİ': 'EKONOMİ',
      'SALI': 'HUKUK',
      'ÇARŞAMBA': 'MUHASEBE - MALİYE',
      'PERŞEMBE': 'EKONOMİ',
      'CUMA': 'HUKUK',
      'CUMARTESİ': 'YETENEK - BANKA',
    };
    return defaultSchedule[today] || 'BELİRSİZ';
  };
  const dailyFocus = getDailyFocus();

  // Initialize data when user changes
  useEffect(() => {
    async function loadData() {
      if (user) {
        const { data, error } = await supabase
          .from('user_progress')
          .select('progress_data, sessions, schedule')
          .eq('user_id', user.id)
          .single();

        if (data) {
          if (data.progress_data) setProgressData(data.progress_data);
          if (data.sessions) setSessions(data.sessions);
          if (data.schedule) setSchedule(data.schedule);
        } else if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error loading data:', error);
        }
      }
    }
    loadData();
  }, [user]);

  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Calculate total videos and hours
  const totalVideos = courseData.reduce((acc, cat) =>
    acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalVideos, 0), 0);

  const totalHours = courseData.reduce((acc, cat) =>
    acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalHours, 0), 0);

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



  // Level Up Check


  useEffect(() => {
    if (user) {
      const saveData = async () => {
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            progress_data: progressData,
            sessions: sessions,
            schedule: schedule,
            updated_at: new Date()
          });

        if (error) console.error('Error saving data:', error);
      };

      // Debounce save to avoid too many requests
      const timer = setTimeout(saveData, 2000);
      return () => clearTimeout(timer);
    }
  }, [progressData, sessions, schedule, user]);

  const handleSessionComplete = (duration, type, overrideCourseId) => {
    const newSession = {
      timestamp: Date.now(),
      duration,
      type,
      courseId: type === 'work' ? (overrideCourseId || lastActiveCourseId) : null
    };
    setSessions(prev => [...prev, newSession]);
  };

  const handleDeleteSessions = (sessionIdsToDelete) => {
    setSessions(prev => prev.filter(s => !sessionIdsToDelete.includes(s.timestamp)));
  };


  // Refactored Toggle Handler for specific video index with auto-complete previous and auto-uncheck subsequent
  const handleVideoToggle = (courseId, videoIndex) => {
    setLastActiveCourseId(courseId); // Update active context
    setProgressData(prev => {
      const courseProgress = prev[courseId] || []; // Array of indices
      let newCourseProgress;

      if (courseProgress.includes(videoIndex)) {
        // Uncheck this one AND all subsequent ones
        newCourseProgress = courseProgress.filter(i => i < videoIndex);
      } else {
        // Check this one AND all previous ones (logic from checking)
        const newSet = new Set(courseProgress);
        for (let i = 1; i <= videoIndex; i++) {
          newSet.add(i);
        }
        newCourseProgress = Array.from(newSet);
      }
      return {
        ...prev,
        [courseId]: newCourseProgress
      };
    });
  };

  // Re-calculate stats with new data structure
  // const getCompletedCount = () ... removed as now derived

  const toggleCategory = (index) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
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
          sessionsCount={sessions.length}
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

      {/* Top Header Dashboard */}
      <header className="sticky top-0 z-40 bg-custom-bg/95 backdrop-blur-xl border-b border-custom-category shadow-lg shadow-custom-accent/5">
        <div className="max-w-6xl mx-auto px-4 py-4">

          {/* --- MOBILE LAYOUT --- */}
          <div className="md:hidden flex flex-col gap-4">
            {/* Row 1: Title (Full Width) */}
            <div className="w-full border-b border-custom-category/20 pb-3">
              <h1 className={cn("text-2xl font-bold tracking-tight text-custom-text leading-tight", rankInfo.color)}>
                {rankInfo.title}
              </h1>
            </div>

            {/* Row 2: Icon | Badge | Buttons */}
            <div className="flex items-center justify-between">

              {/* Left: Icon & Badge */}
              <div className="flex items-center gap-3">
                <div className="relative">
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
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTimer(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30"
                >
                  <Timer size={18} />
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30"
                >
                  <BarChart2 size={18} />
                </button>
                <button
                  onClick={() => setShowSchedule(true)}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-accent border border-custom-category/30"
                >
                  <Calendar size={18} />
                </button>
                <button
                  onClick={logout}
                  className="p-2 bg-custom-header rounded-lg text-custom-title/70 hover:text-custom-error border border-custom-category/30"
                >
                  <LogOut size={18} />
                </button>
              </div>

            </div>
          </div>


          {/* --- DESKTOP LAYOUT --- */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="bg-custom-header p-3 rounded-xl border border-custom-category/50 relative">
                  <Trophy size={28} className="text-custom-accent" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h1 className={cn("text-3xl font-bold tracking-tight text-custom-text leading-tight", rankInfo.color)}>
                  {rankInfo.title}
                </h1>
                <div className="inline-flex items-center gap-2 bg-custom-accent/5 px-3 py-1.5 rounded-lg border border-custom-accent/10 w-fit hover:bg-custom-accent/10 transition-colors">
                  <Calendar size={14} className="text-custom-accent" />
                  <span className="text-xs font-bold text-custom-accent uppercase tracking-wide">
                    Bugün: {dailyFocus}
                  </span>
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

        </div>
      </header>

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

            const categoryPercent = categoryTotalVideos > 0 ? Math.round((categoryCompletedVideos / categoryTotalVideos) * 100) : 0; // Better to use video count for percent now since we shifted focus

            return (
              <div key={catIdx} className="bg-custom-header rounded-2xl border border-custom-category/30 overflow-hidden hover:border-custom-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-custom-accent/5 group">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(catIdx)}
                  className="w-full p-6 bg-custom-header hover:bg-custom-header/80 transition-colors cursor-pointer block text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className="bg-custom-accent/10 p-3 rounded-xl group-hover:scale-105 transition-transform duration-300">
                        <BookOpen size={24} className="text-custom-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-custom-text text-lg tracking-tight group-hover:text-custom-accent transition-colors">{category.category.split('(')[0]}</h3>
                        <p className="text-xs text-custom-title/60 font-medium mt-1">
                          Toplam: {formatHours(categoryTotalHours)} • {categoryCompletedVideos} / {categoryTotalVideos} Video
                        </p>
                      </div>
                    </div>
                    <div className={cn("bg-custom-bg p-2 rounded-full transition-transform duration-300", expandedCategories.has(catIdx) ? "rotate-180" : "")}>
                      <ChevronDown size={20} className="text-custom-title/50" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <CategoryProgressBar percentage={categoryPercent} />
                    <span className="text-xs font-bold text-custom-accent min-w-[3rem] text-right">%{categoryPercent}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategories.has(catIdx) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-custom-category/30 bg-custom-bg/30"
                    >
                      <div className="p-4 space-y-4">
                        {category.courses.map(course => {
                          const courseCompleted = (progressData[course.id] || []).length;
                          const coursePercent = Math.round((courseCompleted / course.totalVideos) * 100);

                          return (
                            <div key={course.id} className="bg-custom-header/50 rounded-xl p-4 border border-custom-category/30 hover:border-custom-category/60 transition-colors">
                              <div className="flex justify-between items-center mb-4 pb-3 border-b border-custom-category/30">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm text-custom-title">{course.name}</span>
                                  <span className="text-[10px] text-custom-title/60 font-medium mt-1">
                                    Toplam: {formatHours(course.totalHours)} • {courseCompleted} / {course.totalVideos} Video
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={course.playlistUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-500 bg-red-100 hover:bg-red-600 hover:text-white transition-colors p-2 rounded-full cursor-pointer shadow-sm hover:shadow-red-500/30"
                                    title="YouTube Oynatma Listesi"
                                  >
                                    <Youtube size={20} />
                                  </a>
                                  <span className={cn(
                                    "text-xs font-bold px-2.5 py-1 rounded-lg min-w-[3rem] text-center",
                                    coursePercent === 100 ? "bg-custom-accent/20 text-custom-accent" : "bg-custom-bg text-custom-title/60"
                                  )}>
                                    %{coursePercent}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {Array.from({ length: course.totalVideos }).map((_, vIdx) => {
                                  const videoNum = vIdx + 1;
                                  const isDone = (progressData[course.id] || []).includes(videoNum);

                                  return (
                                    <button
                                      key={videoNum}
                                      onClick={() => handleVideoToggle(course.id, videoNum)}
                                      className={cn(
                                        "flex items-center gap-3 p-2.5 rounded-lg transition-all group text-left border cursor-pointer relative overflow-hidden",
                                        isDone
                                          ? "bg-custom-accent/10 border-custom-accent/20"
                                          : "bg-custom-bg/50 border-transparent hover:bg-custom-bg hover:border-custom-category/50"
                                      )}
                                    >
                                      <div className="shrink-0 relative z-10">
                                        {isDone ? (
                                          <CheckCircle size={18} className="text-custom-accent fill-custom-accent/20" />
                                        ) : (
                                          <Circle size={18} className="text-custom-category group-hover:text-custom-accent transition-colors" />
                                        )}
                                      </div>
                                      <span className={cn("text-xs font-medium z-10 relative transition-all duration-300", isDone ? "text-custom-title/50 line-through opacity-70" : "text-custom-title/80 group-hover:text-custom-text")}>
                                        Ders {videoNum}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </main >
    </div >
  );
}
