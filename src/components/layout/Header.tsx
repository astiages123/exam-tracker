import { Timer, ChartLine, CalendarDays, LogOut, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RANK_ICONS } from '@/constants/styles';
import { Goal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StreakDisplay from '@/components/shared/StreakDisplay';
import type { Rank } from '@/types';

interface HeaderProps {
    rankInfo: Rank;
    dailyFocus: string;
    currentStreak: number;
    modals: {
        setShowRankModal: (show: boolean) => void;
        setShowTimer: (show: boolean) => void;
        setShowReport: (show: boolean) => void;
        setShowSchedule: (show: boolean) => void;
        showTimer: boolean;
    };
    logout: () => Promise<void>;
}

export default function Header({ rankInfo, dailyFocus, currentStreak, modals, logout }: HeaderProps) {
    return (
        <header className="sticky top-0 z-40 bg-background border-b border-secondary shadow-lg shadow-primary/5">
            <div className="max-w-6xl mx-auto px-4 py-4">

                {/* --- MOBILE LAYOUT --- */}
                <div className="md:hidden flex flex-col gap-3">

                    {/* Row 1: Rank Info (Left) + Streak (Right) */}
                    <div className="flex items-center justify-between">
                        <button
                            className="flex items-center gap-3 cursor-pointer group text-left appearance-none"
                            onClick={() => modals.setShowRankModal(true)}
                            type="button"
                        >
                            <div className="bg-card p-2 rounded-xl border border-secondary/50 relative group-hover:border-primary/30 transition-colors shadow-sm">
                                {(() => {
                                    const Icon = RANK_ICONS[rankInfo.icon] || Goal;
                                    return <Icon size={20} className="text-primary" />;
                                })()}
                            </div>
                            <h1 className={cn("text-xl font-bold font-rank tracking-tight text-primary leading-tight", rankInfo.color)}>
                                {rankInfo.title}
                            </h1>
                        </button>

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

                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => modals.setShowTimer(true)}
                                className="bg-secondary/80 text-primary/80 hover:text-primary border-border/50 hover:bg-secondary transition-all active:scale-95"
                                title="Sayaç"
                            >
                                <Timer size={18} />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => modals.setShowReport(true)}
                                className="bg-secondary/80 text-primary/80 hover:text-primary border-border/50 hover:bg-secondary transition-all active:scale-95"
                                title="Rapor"
                            >
                                <ChartLine size={18} />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => modals.setShowSchedule(true)}
                                className="bg-secondary/80 text-primary/80 hover:text-primary border-border/50 hover:bg-secondary transition-all active:scale-95"
                                title="Program"
                            >
                                <CalendarDays size={18} />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={logout}
                                className="bg-secondary/80 text-red-400/80 hover:text-red-400 border-border/50 hover:bg-red-500/10 transition-all active:scale-95"
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
                        <button
                            className="relative cursor-pointer hover:scale-105 transition-transform group appearance-none"
                            onClick={() => modals.setShowRankModal(true)}
                            title="Rütbe detaylarını gör"
                            type="button"
                        >
                            <div className="bg-card p-5 rounded-xl border border-secondary/50 relative group-hover:border-primary/30 box-border transition-colors">
                                {(() => {
                                    const Icon = RANK_ICONS[rankInfo.icon] || Goal;
                                    return <Icon size={30} className="text-primary group-hover:drop-shadow-lg" />;
                                })()}
                            </div>
                        </button>
                        <div className="flex flex-col gap-2">
                            <button
                                className={cn("text-3xl font-bold font-rank tracking-wider text-primary leading-tight cursor-pointer hover:opacity-80 transition-opacity text-left appearance-none", rankInfo.color)}
                                onClick={() => modals.setShowRankModal(true)}
                                type="button"
                            >
                                {rankInfo.title}
                            </button>
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
                            onClick={() => modals.setShowTimer(!modals.showTimer)}
                            className="h-[46px] w-[46px] bg-secondary/80 text-primary/80 hover:text-primary hover:bg-secondary transition-all hover:scale-105 shadow-lg border-border/50 [&_svg]:size-5"
                            title="Pomodoro Sayacı"
                        >
                            <Timer size={20} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => modals.setShowReport(true)}
                            className="h-[46px] w-[46px] bg-secondary/80 text-primary/80 hover:text-primary hover:bg-secondary transition-all hover:scale-105 shadow-lg border-border/50 [&_svg]:size-5"
                            title="Raporları Görüntüle"
                        >
                            <ChartLine size={20} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => modals.setShowSchedule(true)}
                            className="h-[46px] w-[46px] bg-secondary/80 text-primary/80 hover:text-primary hover:bg-secondary transition-all hover:scale-105 shadow-lg border-border/50 [&_svg]:size-5"
                            title="Çalışma Programı"
                        >
                            <CalendarDays size={20} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={logout}
                            className="h-[46px] w-[46px] bg-secondary/80 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all hover:scale-105 shadow-lg border-border/50 [&_svg]:size-5"
                            title="Çıkış Yap"
                        >
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>

            </div >
        </header >
    );
}
