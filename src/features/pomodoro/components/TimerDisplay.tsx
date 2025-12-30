import { Play, Pause, CircleCheckBig, Coffee, BookOpen } from 'lucide-react';
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import { COURSE_ICONS } from '@/constants/styles';

interface TimerDisplayProps {
    mode: 'work' | 'break';
    selectedCourseName: string | undefined;
    timeText: string;
    isOvertime: boolean;
    isActive: boolean;
    sessionsCount: number;
    onToggleTimer: () => void;
    onStartBreak: () => void;
    onFinishSession: () => void;
    onSkipBreak: () => void;
    onCancel: () => void;
}

export default function TimerDisplay({
    mode,
    selectedCourseName,
    timeText,
    isOvertime,
    isActive,
    sessionsCount,
    onToggleTimer,
    onStartBreak,
    onFinishSession,
    onSkipBreak,
    onCancel
}: TimerDisplayProps) {
    return (
        <div className="fixed bottom-6 left-6 z-50 bg-card border border-white/5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl p-8 w-80 animate-in slide-in-from-bottom-12 fade-in duration-200 overflow-hidden">
            {/* Background decoration */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 transition-colors duration-100 ${mode === 'work' ? 'bg-primary' : 'bg-emerald-400'}`} />

            {/* Close Button */}
            <div className="absolute top-6 right-6 z-20">
                <ModalCloseButton onClick={onCancel} className="hover:bg-white/10 hover:text-destructive" title="İptal Et" />
            </div>

            {/* Header: Mode and Course */}
            <div className="flex flex-col items-center mb-6 w-full z-10 relative">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 transition-colors border ${mode === 'work'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                    }`}>
                    {mode === 'work' ? 'ODAK MODU' : 'DİNLENME MODU'}
                </span>

                <h4 className="text-center text-sm font-medium text-subcourse px-8 leading-snug line-clamp-2 mt-2">
                    {selectedCourseName}
                </h4>
                {(() => {
                    const matchingKey = Object.keys(COURSE_ICONS).find(key => selectedCourseName?.startsWith(key));
                    const CourseIcon = matchingKey ? COURSE_ICONS[matchingKey as keyof typeof COURSE_ICONS] : BookOpen;
                    return (
                        <div className="mt-2 text-primary opacity-60">
                            <CourseIcon size={20} />
                        </div>
                    );
                })()}
            </div>

            {/* Timer Display */}
            <div className="flex flex-col items-center mb-8 relative">
                <div className={`text-6xl font-mono font-bold tracking-tighter mb-2 transition-all duration-100 ${isOvertime ? 'text-destructive scale-110' : 'text-foreground'}`}>
                    {timeText}
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/5 mt-2">
                    <span className="text-[11px] font-extrabold text-primary uppercase tracking-[0.15em]">
                        OTURUM #{sessionsCount + 1}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3 relative">
                {/* Main Control: Start/Stop */}
                <button
                    onClick={onToggleTimer}
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

                {/* Secondary Controls */}
                <div className="grid grid-cols-2 gap-3">
                    {mode === 'work' ? (
                        <>
                            <button
                                onClick={onStartBreak}
                                className="py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-all flex flex-col items-center gap-1 border border-primary/10"
                            >
                                <Coffee size={16} />
                                MOLA VER
                            </button>
                            <button
                                onClick={onFinishSession}
                                className="py-3 rounded-xl bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 text-[11px] font-bold transition-all flex flex-col items-center gap-1 border border-emerald-400/10"
                            >
                                <CircleCheckBig size={16} />
                                BİTİR
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onSkipBreak}
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
