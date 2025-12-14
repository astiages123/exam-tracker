
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playNotificationSound, initAudio } from '../utils/sound';

const WORK_TIME = 50 * 60;
const BREAK_TIME = 10 * 60;

export default function PomodoroTimer({ initialCourse, courses, sessionsCount, onSessionComplete, onClose }) {
    const [view, setView] = useState('selection'); // 'selection' | 'timer'
    const [selectedCourseId, setSelectedCourseId] = useState(initialCourse ? initialCourse.id : '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // [NEW] Dropdown state

    const [timeLeft, setTimeLeft] = useState(WORK_TIME);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('work'); // 'work' | 'break'

    const endTimeRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        // If we have an initial course, pre-select it but still show selection screen for confirmation/change
        if (initialCourse) {
            setSelectedCourseId(initialCourse.id);
        }
    }, [initialCourse]);

    useEffect(() => {
        if (view === 'selection') {
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [view, onClose]);

    const handleStartSession = () => {
        if (!selectedCourseId) return;
        initAudio();
        setView('timer');
        // Set target time based on CURRENT timeLeft (which is full duration initially)
        endTimeRef.current = Date.now() + timeLeft * 1000;
        setIsActive(true);
    };

    useEffect(() => {
        if (isActive) {
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const remaining = Math.ceil((endTimeRef.current - now) / 1000);

                if (remaining <= 0) {
                    // Prevent negative or zero sticking
                    setTimeLeft(0);
                    handleTimerComplete();
                } else {
                    setTimeLeft(remaining);
                }
            }, 100); // Check every 100ms to be accurate
        } else {
            clearInterval(timerRef.current);
        }

        return () => clearInterval(timerRef.current);
    }, [isActive]); // removed timeLeft dependency to avoid re-interval

    // We need handleTimerComplete to be accessible in the effect
    // But if we put it in dependency, effect re-runs. 
    // We can use a ref for the latest handleTimerComplete or just rely on state closures if careful.
    // Actually, simply invoking it works if the closure captures the *latest* render scope? 
    // No, setInterval closure is stale.
    // The safest classic way:
    // Check remaining inside. If 0, Call a ref-stored callback or just trigger completion logic.

    // Let's use a Mutable Ref for the callback to ensure the interval calls the FRESH function
    const completeRef = useRef();
    completeRef.current = () => {
        setIsActive(false);
        clearInterval(timerRef.current);
        playNotificationSound();

        if (mode === 'work') {
            onSessionComplete(WORK_TIME, 'work', selectedCourseId);
            setMode('break');
            setTimeLeft(BREAK_TIME);
        } else {
            onSessionComplete(BREAK_TIME, 'break', null);
            setMode('work');
            setTimeLeft(WORK_TIME);
        }
    };

    // Now the effect just calls completeRef.current()
    const handleTimerComplete = () => {
        if (completeRef.current) completeRef.current();
    };

    const toggleTimer = () => {
        if (isActive) {
            // Pausing: isActive becomes false. timeLeft remains as 'remaining'.
            setIsActive(false);
        } else {
            // Resuming: Set new target based on current timeLeft
            endTimeRef.current = Date.now() + timeLeft * 1000;
            setIsActive(true);
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
    };

    const handleSkipBreak = () => {
        if (mode === 'break') {
            setIsActive(false);
            clearInterval(timerRef.current);
            // Log the break session as completed
            onSessionComplete(BREAK_TIME, 'break', null);

            // Switch to work mode
            setMode('work');
            setTimeLeft(WORK_TIME);
            playNotificationSound();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `;
    };

    const selectedCourseName = courses?.find(c => c.id === selectedCourseId)?.name;

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

                <div className="text-5xl font-mono font-bold text-custom-text mb-4 tracking-tighter">
                    {formatTime(timeLeft)}
                </div>

                <div className="text-sm text-custom-title/70 mb-2 text-center truncate w-full px-2">
                    <span className="opacity-50 block text-[10px] uppercase tracking-wide">Şu an çalışılıyor:</span>
                    <span className="font-medium text-custom-text">{selectedCourseName}</span>
                </div>

                <div className="mb-6 px-3 py-1 bg-custom-bg/50 rounded-lg border border-custom-category/20 text-[10px] text-custom-title/50">
                    Tamamlanan Oturum: <span className="text-custom-text font-bold">{sessionsCount}</span>
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
