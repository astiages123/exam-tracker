import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle, Circle, Trophy, Star, TrendingUp, BookOpen, Youtube } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Data ---
import { courseData, RANKS } from './data';


// --- Components ---

const ProgressBar = ({ progress, nextLevelMin, currentLevelMin }) => {
  const range = nextLevelMin - currentLevelMin;
  const currentVal = progress - currentLevelMin;
  const percentage = Math.min(100, Math.max(0, (currentVal / (range || 1)) * 100));

  return (
    <div className="w-full bg-slate-800 rounded-full h-4 mt-2 overflow-hidden border border-slate-700 shadow-inner">
      <motion.div
        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 relative"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
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
          className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-8 text-center max-w-sm w-full shadow-[0_0_50px_-12px_rgba(16,185,129,0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-block mb-4"
          >
            <Trophy size={80} className="text-yellow-400 mx-auto drop-shadow-lg" />
          </motion.div>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">TERFİ!</h2>
          <p className="text-slate-400 mb-6 font-medium">Yeni Ünvanınız:</p>
          <div className="text-2xl font-bold text-white mb-8 border-y border-emerald-500/30 py-4 bg-emerald-500/10 rounded-lg">
            {title}
          </div>
          <button
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30 cursor-pointer"
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
    <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
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
  // State: { [courseId]: completedCount }
  const [progressData, setProgressData] = useState(() => {
    const saved = localStorage.getItem('courseProgress');
    return saved ? JSON.parse(saved) : {};
  });

  // Changed to Set for independent expansion
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [rankInfo, setRankInfo] = useState(RANKS[0]);
  const [totalPercentage, setTotalPercentage] = useState(0);

  // Calculate total videos and hours
  const totalVideos = courseData.reduce((acc, cat) =>
    acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalVideos, 0), 0);

  const totalHours = courseData.reduce((acc, cat) =>
    acc + cat.courses.reduce((cAcc, course) => cAcc + course.totalHours, 0), 0);

  // Calculate completed hours
  const calculateCompletedHours = () => {
    let completed = 0;
    Object.keys(progressData).forEach(courseId => {
      const course = courseData.flatMap(cat => cat.courses).find(c => c.id === courseId);
      if (course) {
        const completedCount = progressData[courseId].length;
        if (completedCount > 0) {
          completed += (completedCount / course.totalVideos) * course.totalHours;
        }
      }
    });
    return completed;
  };
  const completedHours = calculateCompletedHours();

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

  useEffect(() => {
    const completedTotal = Object.values(progressData).reduce((acc, val) => {
      if (Array.isArray(val)) return acc + val.length;
      return acc; // Safety for old data format if any exists, though we refactored.
    }, 0);

    // Safety check: ensure totalVideos > 0
    const percent = totalVideos > 0 ? (completedTotal / totalVideos) * 100 : 0;
    setTotalPercentage(percent);

    let currentRank = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (Math.floor(percent) >= RANKS[i].min) {
        currentRank = RANKS[i];
        break;
      }
    }

    if (currentRank.title !== rankInfo.title) {
      const oldIndex = RANKS.findIndex(r => r.title === rankInfo.title);
      const newIndex = RANKS.findIndex(r => r.title === currentRank.title);

      if (newIndex > oldIndex && completedTotal > 0) {
        setNewTitle(currentRank.title);
        setShowLevelUp(true);
      }
      setRankInfo(currentRank);
    }
  }, [progressData]);

  useEffect(() => {
    localStorage.setItem('courseProgress', JSON.stringify(progressData));
  }, [progressData]);

  // Refactored Toggle Handler for specific video index with auto-complete previous and auto-uncheck subsequent
  const handleVideoToggle = (courseId, videoIndex) => {
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
  const getCompletedCount = () => {
    let count = 0;
    Object.values(progressData).forEach(arr => {
      if (Array.isArray(arr)) count += arr.length;
    });
    return count;
  };

  const nextRankIndex = RANKS.findIndex(r => r.title === rankInfo.title) + 1;
  const nextRank = RANKS[nextRankIndex] || { min: 100, title: "Zirve" };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-emerald-500/30">
      {showLevelUp && <LevelUpModal title={newTitle} onClose={() => setShowLevelUp(false)} />}

      {/* Top Header Dashboard */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-emerald-500/20 shadow-lg shadow-emerald-500/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Badge */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                <div className="bg-slate-800 p-3 rounded-xl border border-emerald-500/30 relative">
                  <Trophy size={32} className="text-emerald-400" />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Mevcut Rütbe</p>
                <h1 className={cn("text-xl md:text-2xl font-black tracking-tight glitch-effect", rankInfo.color)}>
                  {rankInfo.title}
                </h1>
              </div>
            </div>

            {/* Progress Stats */}
            <div className="flex-1 max-w-xl w-full">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-mono text-slate-400">Hedef: <span className="text-emerald-400 font-bold">{nextRank.title}</span></span>
                <span className="text-2xl font-mono font-bold text-white tracking-tighter">%{totalPercentage.toFixed(1)}</span>
              </div>
              <ProgressBar
                progress={totalPercentage}
                currentLevelMin={rankInfo.min}
                nextLevelMin={nextRank.min}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                  {getCompletedCount()} / {totalVideos} Video • Toplam: {formatHours(totalHours)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Sonraki Seviye: %{nextRank.min}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 items-start">
          {courseData.map((category, catIdx) => {
            const categoryTotalHours = category.courses.reduce((acc, c) => acc + c.totalHours, 0);
            const categoryTotalVideos = category.courses.reduce((acc, c) => acc + c.totalVideos, 0);
            const categoryCompletedVideos = category.courses.reduce((acc, c) => acc + (progressData[c.id] || []).length, 0);

            const categoryPercent = categoryTotalVideos > 0 ? Math.round((categoryCompletedVideos / categoryTotalVideos) * 100) : 0; // Better to use video count for percent now since we shifted focus

            return (
              <div key={catIdx} className="bg-slate-800/40 rounded-3xl border border-slate-700/50 overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 group">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(catIdx)}
                  className="w-full p-6 bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer block text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-500/10 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <BookOpen size={24} className="text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-emerald-300 transition-colors">{category.category.split('(')[0]}</h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Toplam: {formatHours(categoryTotalHours)} • {categoryCompletedVideos} / {categoryTotalVideos} Video
                        </p>
                      </div>
                    </div>
                    <div className={cn("bg-slate-900 p-2 rounded-full transition-transform duration-300", expandedCategories.has(catIdx) ? "rotate-180" : "")}>
                      <ChevronDown size={20} className="text-slate-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <CategoryProgressBar percentage={categoryPercent} />
                    <span className="text-xs font-bold text-emerald-400 min-w-[3rem] text-right">%{categoryPercent}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategories.has(catIdx) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-700/50 bg-slate-900/30"
                    >
                      <div className="p-4 space-y-4">
                        {category.courses.map(course => {
                          const courseCompleted = (progressData[course.id] || []).length;
                          const coursePercent = Math.round((courseCompleted / course.totalVideos) * 100);
                          const courseCompletedHrs = (courseCompleted / course.totalVideos) * course.totalHours;

                          return (
                            <div key={course.id} className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700/30 hover:border-slate-600 transition-colors">
                              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700/50">
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-slate-200">{course.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                                    Toplam: {formatHours(course.totalHours)} • {courseCompleted} / {course.totalVideos} Video
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={course.playlistUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    title="YouTube Oynatma Listesi"
                                  >
                                    <Youtube size={20} />
                                  </a>
                                  <span className={cn(
                                    "text-xs font-bold px-2.5 py-1 rounded-lg min-w-[3rem] text-center",
                                    coursePercent === 100 ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
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
                                        "flex items-center gap-3 p-2.5 rounded-xl transition-all group text-left border cursor-pointer relative overflow-hidden",
                                        isDone
                                          ? "bg-emerald-500/10 border-emerald-500/20"
                                          : "bg-slate-800/50 border-transparent hover:bg-slate-800 hover:border-slate-600"
                                      )}
                                    >
                                      <div className="shrink-0 relative z-10">
                                        {isDone ? (
                                          <CheckCircle size={18} className="text-emerald-500 fill-emerald-500/20" />
                                        ) : (
                                          <Circle size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                                        )}
                                      </div>
                                      <span className={cn("text-xs font-medium z-10 relative transition-all duration-300", isDone ? "text-slate-500 line-through opacity-70" : "text-slate-300 group-hover:text-white")}>
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
      </main>
    </div>
  );
}
