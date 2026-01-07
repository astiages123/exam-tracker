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
        <header className="fixed top-4 left-0 right-0 z-50 px-4">
            <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-primary/5 p-3">

                {/* --- MOBILE LAYOUT --- */}
                <div className="md:hidden flex flex-col gap-2.5">
                    <div className="flex items-center justify-between px-1.5">
                        <button
                            className="flex items-center gap-2.5 cursor-pointer group text-left appearance-none"
                            onClick={() => modals.setShowRankModal(true)}
                            type="button"
                        >
                            <div className="bg-primary/10 p-1.5 rounded-xl border border-primary/10 relative group-hover:border-primary/30 transition-colors">
                                {(() => {
                                    const Icon = RANK_ICONS[rankInfo.icon] || Goal;
                                    return <Icon size={20} className="text-primary" />;
                                })()}
                            </div>
                            <span className={cn("text-sm font-bold font tracking-tight text-primary", rankInfo.color)}>
                                {rankInfo.title}
                            </span>
                        </button>

                        <StreakDisplay streak={currentStreak} />
                    </div>

                    <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
                        <div className="inline-flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1.5 rounded-full border border-border/50">
                            <Calendar size={13} className="text-foreground/70" />
                            <span className="text-[10px] font-medium text-foreground/80 uppercase tracking-wide truncate max-w-[110px]">
                                {dailyFocus}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            {[
                                { icon: Timer, action: () => modals.setShowTimer(true), label: "Timer" },
                                { icon: ChartLine, action: () => modals.setShowReport(true), label: "Report" },
                                { icon: CalendarDays, action: () => modals.setShowSchedule(true), label: "Schedule" },
                            ].map((btn, i) => (
                                <Button
                                    key={i}
                                    variant="ghost"
                                    size="icon"
                                    onClick={btn.action}
                                    className="h-9 w-9 text-foreground/70 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                >
                                    <btn.icon size={18} />
                                </Button>
                            ))}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={logout}
                                className="h-9 w-9 text-foreground/70 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                            >
                                <LogOut size={18} />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center justify-between px-3">
                    <div className="flex items-center gap-5">
                        <button
                            className="flex items-center gap-3.5 group cursor-pointer appearance-none hover:opacity-80 transition-opacity"
                            onClick={() => modals.setShowRankModal(true)}
                            type="button"
                        >
                            <div className="bg-primary/5 p-2 rounded-xl group-hover:bg-primary/10 transition-colors">
                                {(() => {
                                    const Icon = RANK_ICONS[rankInfo.icon] || Goal;
                                    return <Icon size={26} className="text-primary" />;
                                })()}
                            </div>
                            <span className={cn("text-lg font-bold font-rank tracking-normal text-primary leading-none", rankInfo.color)}>
                                {rankInfo.title}
                            </span>
                        </button>

                        <div className="h-6 w-px bg-border/60" />

                        <div className="flex items-center gap-3.5">
                            <StreakDisplay streak={currentStreak} />
                            <div className="inline-flex items-center gap-2 bg-secondary/30 px-3.5 py-1.5 rounded-full border border-border/40 hover:bg-secondary/50 transition-colors">
                                <Calendar size={15} className="text-foreground/60" />
                                <span className="text-sm font-medium text-foreground/80">
                                    {dailyFocus}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {[
                            { icon: Timer, action: () => modals.setShowTimer(!modals.showTimer), label: "Odak" },
                            { icon: ChartLine, action: () => modals.setShowReport(true), label: "Raporlar" },
                            { icon: CalendarDays, action: () => modals.setShowSchedule(true), label: "Program" },
                        ].map((btn, i) => (
                            <Button
                                key={i}
                                variant="ghost"
                                size="default"
                                onClick={btn.action}
                                className="h-10 px-4 text-foreground/70 hover:text-primary hover:bg-primary/5 hover:scale-105 transition-all rounded-full gap-2"
                            >
                                <btn.icon size={20} />
                                <span className="sr-only lg:not-sr-only lg:text-sm lg:font-medium">{btn.label}</span>
                            </Button>
                        ))}

                        <div className="w-px h-5 bg-border/60 mx-1.5" />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={logout}
                            className="h-10 w-10 text-foreground/60 hover:text-red-500 hover:bg-red-500/10 hover:scale-105 transition-all rounded-full"
                            title="Log Out"
                        >
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>

            </div>
        </header>
    );
}
