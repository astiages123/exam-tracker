import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, ChevronDown, Check, LogOut, CheckCircle } from 'lucide-react';

// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion';
import { playNotificationSound, initAudio } from '../utils/sound';
import { requestNotificationPermission, sendNotification } from '../utils/notification';

const WORK_DURATION = 50 * 60;
const BREAK_DURATION = 10 * 60;

const STORAGE_KEYS = {
    END_TIME: 'pomo_endTime',
    START_TIME: 'pomo_startTime', // NEW: for count-up
    IS_ACTIVE: 'pomo_isActive',
    MODE: 'pomo_mode',
    TIME_LEFT: 'pomo_timeLeft', // Used as "elapsed" for work, "remaining" for break
    COURSE_ID: 'pomo_courseId',
    VIEW: 'pomo_view',
    NOTIFIED_50: 'pomo_notified50', // To track if we notified at 50m
    NOTIFIED_10: 'pomo_notified10'  // To track if we notified at 10m (break)
};

export default function PomodoroTimer({ initialCourse, courses, sessionsCount, onSessionComplete, onClose }) {
    // Initialize state from localStorage if available, else defaults
    const [view, setView] = useState(() => localStorage.getItem(STORAGE_KEYS.VIEW) || 'selection');
    const [selectedCourseId, setSelectedCourseId] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.COURSE_ID);
        return (saved && saved !== 'null') ? saved : (initialCourse ? initialCourse.id : '');
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEYS.MODE) || 'work');
    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.TIME_LEFT);
        return saved ? parseInt(saved, 10) : 0;
    });
    const [isActive, setIsActive] = useState(() => localStorage.getItem(STORAGE_KEYS.IS_ACTIVE) === 'true');

    // Refs
    // endTimeRef removed
    const startTimeRef = useRef(null); // Used for both Work and Break (Count-up)
    const notified50MinRef = useRef(false); // Track 50m notification (work)
    const notified10MinRef = useRef(false); // Track 10m notification (break)

    const timerRef = useRef(null);
    const completeRef = useRef();


    // --- Persistence & Restoration Logic ---

    // 1. Restore Timer State on Mount
    useEffect(() => {
        // savedEndTime removed
        const savedStartTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
        const savedIsActive = localStorage.getItem(STORAGE_KEYS.IS_ACTIVE) === 'true';
        const savedMode = localStorage.getItem(STORAGE_KEYS.MODE) || 'work';
        const savedNotified50 = localStorage.getItem(STORAGE_KEYS.NOTIFIED_50) === 'true';

        if (savedIsActive) {
            // const now = Date.now(); // Removed unused variable

            if (savedStartTime) {
                // RESTORE COUNT-UP (for both Work and Break)
                const start = parseInt(savedStartTime, 10);
                startTimeRef.current = start;

                if (savedMode === 'work') {
                    notified50MinRef.current = savedNotified50;
                } else {
                    notified10MinRef.current = localStorage.getItem(STORAGE_KEYS.NOTIFIED_10) === 'true';
                }

                // const elapsed = Math.floor((now - start) / 1000);
                // setTimeLeft(elapsed); // Removed to avoid synchronous update warning; interval will update this shortly.
            }
        }
    }, []);

    // 2. Save State Changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.VIEW, view);
        localStorage.setItem(STORAGE_KEYS.MODE, mode);
        localStorage.setItem(STORAGE_KEYS.COURSE_ID, selectedCourseId || '');
        localStorage.setItem(STORAGE_KEYS.IS_ACTIVE, isActive);
        localStorage.setItem(STORAGE_KEYS.TIME_LEFT, timeLeft);

        if (isActive) {
            if (startTimeRef.current) {
                localStorage.setItem(STORAGE_KEYS.START_TIME, startTimeRef.current);
                if (mode === 'work') {
                    localStorage.setItem(STORAGE_KEYS.NOTIFIED_50, notified50MinRef.current);
                } else {
                    localStorage.setItem(STORAGE_KEYS.NOTIFIED_10, notified10MinRef.current);
                }
            }
        } else {
            localStorage.removeItem(STORAGE_KEYS.START_TIME);
            localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);
            localStorage.removeItem(STORAGE_KEYS.NOTIFIED_10);
        }
    }, [view, mode, selectedCourseId, isActive, timeLeft]);


    useEffect(() => {
        // If we have an initial course, pre-select it ONLY if we are in selection mode 
        // and haven't already selected something (or maybe always if user just opened it from clicking a course?)
        // The previous logic was: if initialCourse changes, update selection.
        if (initialCourse && view === 'selection') {
            // eslint-disable-next-line
            setSelectedCourseId(initialCourse.id);
        }
    }, [initialCourse, view]);

    useEffect(() => {
        if (view === 'selection') {
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') onClose();
            };

            // Modal scroll lock
            document.body.style.overflow = 'hidden';

            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                document.body.style.overflow = 'unset';
            };
        }
    }, [view, onClose]);

    const handleStartSession = async () => {
        if (!selectedCourseId) return;

        await requestNotificationPermission();

        initAudio();
        setView('timer');

        // WORK MODE: Count UP
        // If we are starting fresh work mode
        setMode('work');
        // If there was previous elapsed time in timeLeft (from pause), subtract it from now to get "original" start time
        // But usually handleStartSession is for FRESH start or from selection.
        // Let's assume fresh start from Selection view implies 0 start.
        const now = Date.now();
        startTimeRef.current = now;
        notified50MinRef.current = false;
        notified10MinRef.current = false;

        setTimeLeft(0); // working leads to increasing time
        setIsActive(true);
    };

    // Define completion logic
    const selectedCourseName = courses?.find(c => c.id === selectedCourseId)?.name;
    useEffect(() => {
        completeRef.current = () => {
            setIsActive(false);
            clearInterval(timerRef.current);
            playNotificationSound();

            localStorage.removeItem(STORAGE_KEYS.END_TIME);
            localStorage.removeItem(STORAGE_KEYS.START_TIME);
            localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);
            localStorage.removeItem(STORAGE_KEYS.NOTIFIED_10);

            if (mode === 'work') {
                // This path might be called if we enforce a hard limit, but user wants infinite.
                // We'll keep it for robustness, but "Work" doesn't auto-stop anymore.
                // If it DOES auto-stop (e.g. max limit?), logic is here.
                // For now, Work only stops manually. Logic moved to handleFinishEarly (now just "Finish")
            } else {
                // Break ending logic moved to handleSkipBreak
            }
        };
    }, [mode, selectedCourseName, selectedCourseId, onSessionComplete, timeLeft]);

    // handleTimerComplete removed

    useEffect(() => {
        if (isActive) {
            // RECOVERY LOGIC
            // RECOVERY LOGIC - Unified for Count-Up
            if (!startTimeRef.current) {
                const savedStartTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
                // If we have timeLeft (elapsed), construct start time: now - elapsed
                startTimeRef.current = savedStartTime ? parseInt(savedStartTime, 10) : Date.now() - (timeLeft * 1000);
            }

            timerRef.current = setInterval(() => {
                const now = Date.now();

                // BOTH MODES ARE NOW COUNT-UP
                const elapsed = Math.floor((now - startTimeRef.current) / 1000);
                setTimeLeft(elapsed);

                if (mode === 'work') {
                    if (elapsed >= WORK_DURATION && !notified50MinRef.current) {
                        playNotificationSound();
                        sendNotification("50 Dakika Doldu!", {
                            body: "Çalışma süren 50 dakikayı geçti. Devam edebilir veya molaya çıkabilirsin.",
                            tag: 'pomodoro-50min'
                        });
                        notified50MinRef.current = true;
                    }
                } else {
                    if (elapsed >= BREAK_DURATION && !notified10MinRef.current) {
                        playNotificationSound();
                        sendNotification("10 Dakika Doldu!", {
                            body: "Mola süren 10 dakikayı geçti. Çalışmaya geri dönebilir veya dinlenmeye devam edebilirsin.",
                            tag: 'pomodoro-10min'
                        });
                        notified10MinRef.current = true;
                    }
                }
            }, 100);
        } else {
            clearInterval(timerRef.current);
            // Only reset refs if we are truly resetting/done? 
            // No, keeping them allows resume.
            // But if we toggle off, we want to clear interval.
            // For count-up resume: new start = now - prev_elapsed. 
            // This is handled in toggleTimer.
        }

        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft, mode]);

    const toggleTimer = () => {
        if (isActive) {
            setIsActive(false);
            // timeLeft is current elapsed (work) or remaining (break)
        } else {
            initAudio();
            const now = Date.now();
            // Resume Count Up (Both modes)
            // startTime = now - elapsed
            startTimeRef.current = now - (timeLeft * 1000);
            setIsActive(true);
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        const defaultTime = 0; // Both reset to 0
        setTimeLeft(defaultTime);

        localStorage.setItem(STORAGE_KEYS.TIME_LEFT, defaultTime);
        localStorage.removeItem(STORAGE_KEYS.START_TIME);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_10);

        startTimeRef.current = null;
        notified50MinRef.current = false;
        notified10MinRef.current = false;
    };

    const handleEndSession = () => {
        setIsActive(false);
        clearInterval(timerRef.current);

        // Clear all session specific storage
        localStorage.removeItem(STORAGE_KEYS.END_TIME);
        localStorage.removeItem(STORAGE_KEYS.START_TIME);
        localStorage.removeItem(STORAGE_KEYS.IS_ACTIVE);
        localStorage.removeItem(STORAGE_KEYS.MODE);
        localStorage.removeItem(STORAGE_KEYS.TIME_LEFT);
        localStorage.removeItem(STORAGE_KEYS.COURSE_ID);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_10);

        // Reset local state
        setMode('work');
        setTimeLeft(0); // Works starts at 0
        setSelectedCourseId(initialCourse ? initialCourse.id : '');
        setView('selection');
    };

    const handleSkipBreak = () => {
        if (mode === 'break') {
            setIsActive(false);
            clearInterval(timerRef.current);

            const breakElapsedTime = timeLeft;
            onSessionComplete(breakElapsedTime, 'break', null);

            setMode('work');
            setTimeLeft(0);
            startTimeRef.current = Date.now(); // Start new work session immediately
            notified50MinRef.current = false;
            setIsActive(true); // Automatically start new work session
            playNotificationSound();
        }
    };

    const handleFinishEarly = () => {
        if (mode !== 'work') return;

        setIsActive(false);
        clearInterval(timerRef.current);
        playNotificationSound();

        // Clear timer specific storage
        localStorage.removeItem(STORAGE_KEYS.START_TIME);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);

        // Calculate actual duration
        // For count-up, timeLeft IS the elapsed time
        const elapsedTime = timeLeft; // In seconds

        sendNotification("Oturum Kaydedildi", {
            body: `${selectedCourseName || 'Ders'} çalışması ${Math.floor(elapsedTime / 60)} dk olarak kaydedildi. Mola zamanı!`,
            tag: 'pomodoro-early-complete'
        });

        onSessionComplete(elapsedTime, 'work', selectedCourseId);
        setMode('break');
        setTimeLeft(0);
        startTimeRef.current = Date.now(); // Start break timer (count up from 0)
        notified10MinRef.current = false;
        setIsActive(true); // Automatically start break timer
    };

    const getDisplayState = () => {
        const target = mode === 'work' ? WORK_DURATION : BREAK_DURATION;
        const remaining = target - timeLeft;
        const isOvertime = remaining < 0;
        const absSeconds = Math.abs(remaining);

        const mins = Math.floor(absSeconds / 60);
        const secs = absSeconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        return { text: isOvertime ? `+${timeStr}` : timeStr, isOvertime };
    };

    const { text: timeText, isOvertime } = getDisplayState();



    if (view === 'selection') {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-pointer"
                onClick={onClose}
            >
                <div
                    className="bg-custom-header border border-custom-category rounded-2xl shadow-2xl w-full max-w-md p-8 relative cursor-default"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-custom-title/40 hover:text-custom-error transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>

                    <h3 className="text-2xl font-bold text-custom-text text-center mb-6">Çalışmaya Başla</h3>

                    <div className="flex flex-col gap-3 relative">
                        <label className="text-sm text-custom-title/60 font-medium ml-1">Hangi derse çalışacaksın?</label>

                        {/* Custom Dropdown Trigger */}
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full p-4 bg-custom-bg border ${isDropdownOpen ? 'border-custom-accent ring-1 ring-custom-accent/20' : 'border-custom-category'} rounded-xl text-custom-text text-base flex justify-between items-center cursor-pointer transition-all hover:bg-custom-header`}
                        >
                            <span className={selectedCourseId ? "text-custom-text" : "text-custom-title/40"}>
                                {selectedCourseId ? courses.find(c => c.id === selectedCourseId)?.name : "Ders Seçiniz"}
                            </span>
                            <ChevronDown
                                size={20}
                                className={`text-custom-title/50 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-custom-accent' : ''}`}
                            />
                        </div>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-[85px] left-0 right-0 max-h-64 overflow-y-auto custom-scrollbar bg-custom-header border border-custom-category rounded-xl shadow-2xl z-20 flex flex-col p-1"
                                >
                                    {courses.map(course => (
                                        <button
                                            key={course.id}
                                            onClick={() => {
                                                setSelectedCourseId(course.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`p-3 text-left rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${selectedCourseId === course.id
                                                ? 'bg-custom-accent/10 text-custom-accent'
                                                : 'text-custom-title/80 hover:bg-custom-bg hover:text-custom-text'
                                                }`}
                                        >
                                            {course.name}
                                            {selectedCourseId === course.id && (
                                                <Check size={16} className="text-custom-accent" />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-custom-bg/50 text-custom-title hover:text-custom-text rounded-xl font-medium border border-custom-category/30 hover:bg-custom-category/20 transition-all cursor-pointer"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleStartSession}
                            disabled={!selectedCourseId}
                            className="flex-[2] py-3 bg-custom-accent text-white rounded-xl font-bold shadow-lg shadow-custom-accent/20 hover:bg-custom-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg cursor-pointer"
                        >
                            Başlat
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-custom-header border border-custom-category rounded-2xl shadow-2xl shadow-black/50 p-6 w-80 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <button
                onClick={onClose}
                className="absolute top-2 right-2 text-custom-title/40 hover:text-custom-error transition-colors cursor-pointer"
            >
                <X size={18} />
            </button>

            <div className="flex flex-col items-center">
                <div className={`text-xs font-bold uppercase tracking-widest mb-2 px-3 py-1 rounded-full ${mode === 'work' ? 'bg-custom-accent/10 text-custom-accent' : 'bg-custom-success/10 text-custom-success'}`}>
                    {mode === 'work' ? 'Çalışma Modu' : 'Mola Zamanı'}
                </div>

                <div className={`text-5xl font-mono font-bold mb-4 tracking-tighter ${isOvertime ? 'text-custom-warning animate-pulse' : 'text-custom-text'}`}>
                    {timeText}
                </div>

                <div className="text-sm text-custom-title/70 mb-2 text-center truncate w-full px-2">
                    <span className="opacity-50 block text-[10px] uppercase tracking-wide">Şu an çalışılıyor:</span>
                    <span className="font-medium text-custom-text">{selectedCourseName}</span>
                </div>

                <div className="mb-6 px-3 py-1 bg-custom-bg/50 rounded-lg border border-custom-category/20 text-[10px] text-custom-title/50">
                    Oturum Sayısı: <span className="text-custom-text font-bold">{sessionsCount || 0}</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTimer}
                        className={`p-4 rounded-xl text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${isActive ? 'bg-custom-warning hover:bg-custom-warning/90' : 'bg-custom-accent hover:bg-custom-accent/90'} cursor-pointer`}
                    >
                        {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>

                    <button
                        onClick={resetTimer}
                        className="p-4 rounded-xl bg-custom-bg border border-custom-category/30 text-custom-title/70 hover:text-custom-text hover:bg-custom-category/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                        <RotateCcw size={24} />
                    </button>

                    <button
                        onClick={handleEndSession}
                        className="p-4 rounded-xl bg-custom-bg border border-custom-category/30 text-custom-error/70 hover:text-custom-error hover:bg-custom-error/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        title="Oturumu Bitir / Yeni Ders"
                    >
                        <LogOut size={24} />
                    </button>

                    {mode === 'work' && (
                        <button
                            onClick={handleFinishEarly}
                            className="p-4 rounded-xl bg-custom-bg border border-custom-category/30 text-custom-success/70 hover:text-custom-success hover:bg-custom-success/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Şimdi Bitir (Hemen Kaydet)"
                        >
                            <CheckCircle size={24} />
                        </button>
                    )}
                </div>

                {mode === 'break' && (
                    <button
                        onClick={handleSkipBreak}
                        className="mt-4 px-6 py-2 bg-custom-bg/50 hover:bg-custom-accent/20 text-custom-title/60 hover:text-custom-accent border border-custom-category/30 rounded-lg text-sm font-medium transition-all group flex items-center gap-2 cursor-pointer"
                    >
                        <span>Molayı Bitir ve Çalış</span>
                        <Play size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>
        </div>
    );
}
