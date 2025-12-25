import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, ChevronDown, Check, CircleCheckBig, Coffee } from 'lucide-react';

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
    NOTIFIED_10: 'pomo_notified10',  // To track if we notified at 10m (break)
    // [NEW] Pause Tracking Keys
    ORIGINAL_START_TIME: 'pomo_originalStartTime', // Wall-clock start time
    PAUSES: 'pomo_pauses',                         // Array of {start, end}
    PAUSE_START_TIME: 'pomo_pauseStartTime'        // To track "current" pause start if refreshing while paused
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
    const startTimeRef = useRef(null); // Effective start time (shifted by pauses to calc net duration)
    const originalStartTimeRef = useRef(null); // [NEW] Actual wall-clock start time
    const pausesRef = useRef([]);              // [NEW] Store pause intervals
    const pauseStartRef = useRef(null);        // [NEW] store current pause start time

    const notified50MinRef = useRef(false); // Track 50m notification (work)
    const notified10MinRef = useRef(false); // Track 10m notification (break)

    const timerRef = useRef(null);
    const completeRef = useRef();


    // --- Persistence & Restoration Logic ---

    // 1. Restore Timer State on Mount
    useEffect(() => {
        // savedEndTime removed
        const savedStartTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
        const savedOriginalStart = localStorage.getItem(STORAGE_KEYS.ORIGINAL_START_TIME);
        const savedPauses = localStorage.getItem(STORAGE_KEYS.PAUSES);
        const savedPauseStart = localStorage.getItem(STORAGE_KEYS.PAUSE_START_TIME);

        const savedIsActive = localStorage.getItem(STORAGE_KEYS.IS_ACTIVE) === 'true';
        const savedMode = localStorage.getItem(STORAGE_KEYS.MODE) || 'work';
        const savedNotified50 = localStorage.getItem(STORAGE_KEYS.NOTIFIED_50) === 'true';

        // Restore generic refs
        if (savedOriginalStart) originalStartTimeRef.current = parseInt(savedOriginalStart, 10);
        if (savedPauses) pausesRef.current = JSON.parse(savedPauses);
        if (savedPauseStart) pauseStartRef.current = parseInt(savedPauseStart, 10);

        if (savedIsActive) {


            if (savedStartTime) {
                // RESTORE COUNT-UP (for both Work and Break)
                const start = parseInt(savedStartTime, 10);
                startTimeRef.current = start;

                if (savedMode === 'work') {
                    notified50MinRef.current = savedNotified50;
                } else {
                    notified10MinRef.current = localStorage.getItem(STORAGE_KEYS.NOTIFIED_10) === 'true';
                }

            }
        }
    }, [selectedCourseId]); // Added selectedCourseId to dependencies to ensure it re-runs when needed, or keep empty if it's only for mount. Actually keep it as [] if it was intended for mount.

    // 2. Save State Changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.VIEW, view);
        localStorage.setItem(STORAGE_KEYS.MODE, mode);
        localStorage.setItem(STORAGE_KEYS.COURSE_ID, selectedCourseId || '');
        localStorage.setItem(STORAGE_KEYS.IS_ACTIVE, isActive);
        localStorage.setItem(STORAGE_KEYS.TIME_LEFT, timeLeft);

        if (originalStartTimeRef.current) {
            localStorage.setItem(STORAGE_KEYS.ORIGINAL_START_TIME, originalStartTimeRef.current);
        }
        localStorage.setItem(STORAGE_KEYS.PAUSES, JSON.stringify(pausesRef.current));

        if (pauseStartRef.current) {
            localStorage.setItem(STORAGE_KEYS.PAUSE_START_TIME, pauseStartRef.current);
        } else {
            localStorage.removeItem(STORAGE_KEYS.PAUSE_START_TIME);
        }

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
        setMode('work');

        // Reset state but DO NOT START automatically
        setTimeLeft(0);
        setIsActive(false);

        // Reset refs
        startTimeRef.current = null;
        originalStartTimeRef.current = null;
        pausesRef.current = [];
        pauseStartRef.current = null;

        notified50MinRef.current = false;
        notified10MinRef.current = false;
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

            // [NEW] Clear pause storage on complete
            localStorage.removeItem(STORAGE_KEYS.ORIGINAL_START_TIME);
            localStorage.removeItem(STORAGE_KEYS.PAUSES);
            localStorage.removeItem(STORAGE_KEYS.PAUSE_START_TIME);

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
        const now = Date.now();
        if (isActive) {
            // PAUSING
            setIsActive(false);
            pauseStartRef.current = now; // [NEW] Start pause
            // timeLeft is current elapsed (work) or remaining (break)
        } else {
            // RESUMING
            initAudio();

            // [NEW] Set original start if first time
            if (!originalStartTimeRef.current) {
                originalStartTimeRef.current = now;
            }

            // Resume Count Up (Both modes)
            // startTime = now - elapsed
            startTimeRef.current = now - (timeLeft * 1000);

            // [NEW] End pause
            if (pauseStartRef.current) {
                pausesRef.current.push({ start: pauseStartRef.current, end: now });
                pauseStartRef.current = null;
            }
            setIsActive(true);
        }
    };



    const clearSessionData = () => {
        // Clear all session specific storage
        localStorage.removeItem(STORAGE_KEYS.END_TIME);
        localStorage.removeItem(STORAGE_KEYS.START_TIME);
        localStorage.removeItem(STORAGE_KEYS.IS_ACTIVE);
        localStorage.removeItem(STORAGE_KEYS.MODE);
        localStorage.removeItem(STORAGE_KEYS.TIME_LEFT);
        localStorage.removeItem(STORAGE_KEYS.VIEW); // Ensure we seek selection on next open
        localStorage.removeItem(STORAGE_KEYS.COURSE_ID);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_10);

        // Clear pause storage
        localStorage.removeItem(STORAGE_KEYS.ORIGINAL_START_TIME);
        localStorage.removeItem(STORAGE_KEYS.PAUSES);
        localStorage.removeItem(STORAGE_KEYS.PAUSE_START_TIME);
    };

    const handleEndSession = () => {
        setIsActive(false);
        clearInterval(timerRef.current);
        clearSessionData();

        // Reset local state
        setMode('work');
        setTimeLeft(0); // Works starts at 0
        setSelectedCourseId(initialCourse ? initialCourse.id : '');
        setView('selection');
    };

    const handleCancel = () => {
        setIsActive(false);
        clearInterval(timerRef.current);
        clearSessionData();
        onClose();
    };

    const handleSkipBreak = () => {
        if (mode === 'break') {
            setIsActive(false);
            clearInterval(timerRef.current);

            const breakElapsedTime = timeLeft;
            // [MODIFIED] Pass start time and pauses for break if needed (ignoring mostly, but keeping signature clean)
            // Ideally we'd track break pauses too but let's stick to Work focus for now or just pass what we have
            onSessionComplete(breakElapsedTime, 'break', null, originalStartTimeRef.current, pausesRef.current);

            setMode('work');
            setTimeLeft(0);
            const now = Date.now();
            startTimeRef.current = now; // Start new work session immediately
            originalStartTimeRef.current = now; // [NEW]
            pausesRef.current = [];             // [NEW]
            pauseStartRef.current = null;       // [NEW]

            notified50MinRef.current = false;
            setIsActive(true); // Automatically start new work session
            playNotificationSound();
        }
    };

    const handleStartBreak = () => {
        setIsActive(false);
        clearInterval(timerRef.current);
        playNotificationSound();

        // Clear timer specific storage
        localStorage.removeItem(STORAGE_KEYS.START_TIME);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);

        // Calculate actual duration
        const elapsedTime = timeLeft; // In seconds

        sendNotification("Oturum Kaydedildi", {
            body: `${selectedCourseName || 'Ders'} çalışması ${Math.floor(elapsedTime / 60)} dk olarak kaydedildi. Mola başlıyor!`,
            tag: 'pomodoro-complete'
        });

        // Pass originalStartTime and pauses
        onSessionComplete(elapsedTime, 'work', selectedCourseId, originalStartTimeRef.current, pausesRef.current);

        // Start Break
        setMode('break');
        setTimeLeft(0);

        const now = Date.now();
        startTimeRef.current = now;
        originalStartTimeRef.current = now;
        pausesRef.current = [];
        pauseStartRef.current = null;

        notified10MinRef.current = false;
        setIsActive(true); // Automatically start break
    };

    const handleFinishSession = () => {
        setIsActive(false);
        clearInterval(timerRef.current);
        playNotificationSound();

        // Clear timer specific storage
        localStorage.removeItem(STORAGE_KEYS.START_TIME);
        localStorage.removeItem(STORAGE_KEYS.NOTIFIED_50);

        // Calculate actual duration
        const elapsedTime = timeLeft; // In seconds

        sendNotification("Oturum Kaydedildi", {
            body: `${selectedCourseName || 'Ders'} çalışması ${Math.floor(elapsedTime / 60)} dk olarak kaydedildi.`,
            tag: 'pomodoro-complete'
        });

        // Pass originalStartTime and pauses
        onSessionComplete(elapsedTime, 'work', selectedCourseId, originalStartTimeRef.current, pausesRef.current);

        // Redirect to Selection (Home)
        handleEndSession();
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
                    className="bg-card border border-secondary rounded-2xl shadow-2xl w-full max-w-md p-8 relative cursor-default"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>

                    <h3 className="text-2xl font-bold text-foreground text-center mb-6">Çalışmaya Başla</h3>

                    <div className="flex flex-col gap-3 relative">
                        <label className="text-sm text-muted-foreground font-bold ml-1">Hangi derse çalışacaksın?</label>

                        {/* Custom Dropdown Trigger */}
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full p-4 bg-background border ${isDropdownOpen ? 'border-primary ring-1 ring-primary/20' : 'border-secondary'} rounded-xl text-foreground text-base flex justify-between items-center cursor-pointer transition-all hover:bg-card`}
                        >
                            <span className={selectedCourseId ? "text-foreground" : "text-muted-foreground"}>
                                {selectedCourseId ? courses.find(c => c.id === selectedCourseId)?.name : "Ders Seçiniz"}
                            </span>
                            <ChevronDown
                                size={20}
                                className={`text-muted-foreground transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`}
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
                                    className="absolute top-[85px] left-0 right-0 max-h-64 overflow-y-auto custom-scrollbar bg-card border border-secondary rounded-xl shadow-2xl z-20 flex flex-col p-1"
                                >
                                    {courses.map(course => (
                                        <button
                                            key={course.id}
                                            onClick={() => {
                                                setSelectedCourseId(course.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`p-3 text-left rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${selectedCourseId === course.id
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                                }`}
                                        >
                                            {course.name}
                                            {selectedCourseId === course.id && (
                                                <Check size={16} className="text-primary" />
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
                            className="flex-1 py-3 bg-background/50 text-muted-foreground hover:text-foreground rounded-xl font-medium border border-secondary/30 hover:bg-secondary/20 transition-all cursor-pointer"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleStartSession}
                            disabled={!selectedCourseId}
                            className="flex-[2] py-3 bg-[#059669] text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg cursor-pointer"
                        >
                            Başlat
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 left-6 z-50 bg-card border border-white/5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl p-8 w-80 animate-in slide-in-from-bottom-12 fade-in duration-500 overflow-hidden">
            {/* Arka plan süslemesi */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 transition-colors duration-700 ${mode === 'work' ? 'bg-primary' : 'bg-emerald-400'}`} />

            {/* Kapatma Butonu - Absolute konumlama */}
            <button
                onClick={handleCancel}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-destructive transition-all z-20"
                title="İptal Et"
            >
                <X size={20} />
            </button>

            {/* Üst Bilgi: Mod ve Ders - Ortalanmış */}
            <div className="flex flex-col items-center mb-6 w-full z-10 relative">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 transition-colors border ${mode === 'work'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                    }`}>
                    {mode === 'work' ? 'ODAK MODU' : 'DİNLENME MODU'}
                </span>

                <h4 className="text-center text-sm font-medium text-foreground/90 px-8 leading-snug line-clamp-2">
                    {selectedCourseName}
                </h4>
            </div>

            {/* Orta Kısım: Zamanlayıcı */}
            <div className="flex flex-col items-center mb-8 relative">
                <div className={`text-6xl font-mono font-bold tracking-tighter mb-2 transition-all duration-300 ${isOvertime ? 'text-destructive scale-110' : 'text-foreground'}`}>
                    {timeText}
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/5 mt-2">
                    <span className="text-[11px] font-extrabold text-primary uppercase tracking-[0.15em]">
                        OTURUM #{(sessionsCount || 0) + 1}
                    </span>
                </div>
            </div>

            {/* Alt Kısım: Kontroller */}
            <div className="flex flex-col gap-3 relative">
                {/* Ana Kontrol: Başlat/Durdur */}
                <button
                    onClick={toggleTimer}
                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm transition-all active:scale-[0.98] shadow-lg ${isActive
                        ? 'bg-[#1e293b] border border-white/10 text-white hover:bg-[#334155]'
                        : (mode === 'work'
                            ? 'bg-[#10b981] text-[#042f2e] shadow-[#10b981]/20 hover:bg-[#34d399]'
                            : 'bg-[#22c55e] text-[#052e16] shadow-[#22c55e]/20 hover:bg-[#4ade80]')
                        }`}
                >
                    {isActive ? (
                        <><Pause size={20} fill="currentColor" /> DURDUR</>
                    ) : (
                        <><Play size={20} fill="currentColor" /> DEVAM ET</>
                    )}
                </button>

                {/* İkincil Kontroller */}
                <div className="grid grid-cols-2 gap-3">
                    {mode === 'work' ? (
                        <>
                            <button
                                onClick={handleStartBreak}
                                className="py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-all flex flex-col items-center gap-1 border border-primary/10"
                            >
                                <Coffee size={16} />
                                MOLA VER
                            </button>
                            <button
                                onClick={handleFinishSession}
                                className="py-3 rounded-xl bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 text-[11px] font-bold transition-all flex flex-col items-center gap-1 border border-emerald-400/10"
                            >
                                <CircleCheckBig size={16} />
                                BİTİR
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleSkipBreak}
                            className="col-span-2 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-all flex items-center justify-center gap-2 border border-primary/10"
                        >
                            <Play size={16} />
                            MOLAYI BİTİR VE ÇALIŞMAYA DÖN
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
