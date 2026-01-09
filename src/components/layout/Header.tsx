import { useState, useRef, useEffect } from 'react';
import { Timer, ChartLine, CalendarDays, LogOut, Calendar, Goal, Zap, User, Shield, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RANK_ICONS } from '@/constants/styles';
import { Button } from '@/components/ui/button';
import StreakDisplay from '@/components/shared/StreakDisplay';
import type { Rank } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuItems = [
        {
            label: 'AutoQuiz',
            icon: Brain,
            href: '/autoquiz',
            description: 'AI Destekli Soru Üretici',
            color: 'text-purple-400',
            bg: 'hover:bg-purple-500/10'
        },
        {
            label: 'Admin Panel',
            icon: Shield,
            href: '/admin',
            description: 'Sistem Yönetimi',
            color: 'text-blue-400',
            bg: 'hover:bg-blue-500/10'
        },
        {
            label: 'Çıkış Yap',
            icon: LogOut,
            onClick: logout,
            description: 'Oturumu Sonlandır',
            color: 'text-red-400',
            bg: 'hover:bg-red-500/10'
        },
    ];

    return (
        <header className="relative z-50 px-4 sm:px-6 lg:px-8 pt-5">
            <div className="relative max-w-7xl mx-auto">
                {/* Glassmorphism Background Container */}
                <div className="absolute inset-0 glass-card glass-card-hover rounded-xl overflow-hidden transition-all duration-300 bg-sky-400/8 hover:bg-sky-900/30 hover:ring-1 hover:ring-white/10 border border-sky-500/20 backdrop-blur-xl shadow-2xl shadow-black/20" />

                <div className="relative px-4 sm:px-6">
                    <div className="flex items-center justify-between h-20">

                        {/* Left: Rank & Progress */}
                        <div className="flex items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all group"
                                onClick={() => modals.setShowRankModal(true)}
                            >
                                <div className="bg-emerald/10 p-2 rounded-xl border border-primary/20 shadow-inner group-hover:bg-emerald/20 transition-colors">
                                    {(() => {
                                        const Icon = RANK_ICONS[rankInfo.icon] || Goal;
                                        return <Icon size={24} className="text-emerald" />;
                                    })()}
                                </div>
                                <div className="flex flex-col items-start leading-none gap-1">
                                    <span className="text-[10px] font-bold text-emerald/70 uppercase tracking-widest">Mevcut Seviye</span>
                                    <span className={cn("text-base font-black tracking-tight leading-none", rankInfo.color)}>
                                        {rankInfo.title}
                                    </span>
                                </div>
                            </motion.button>

                            <div className="hidden lg:flex h-10 w-px bg-white/10 mx-2" />

                            <div className="hidden lg:flex items-center gap-4">
                                <StreakDisplay streak={currentStreak} />
                                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-secondary/30 border border-white/5">
                                    <Calendar size={16} className="text-emerald/70" />
                                    <div className="flex flex-col leading-none gap-1">
                                        <span className="text-[9px] font-bold text-emerald/65 uppercase tracking-tighter">Günün Odağı</span>
                                        <span className="text-sm font-bold text-emerald leading-none">{dailyFocus}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Navigation Actions */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                                {[
                                    { icon: Timer, action: () => modals.setShowTimer(!modals.showTimer), label: "Kronometre", shortcut: "T" },
                                    { icon: ChartLine, action: () => modals.setShowReport(true), label: "İstatistik", shortcut: "S" },
                                    { icon: CalendarDays, action: () => modals.setShowSchedule(true), label: "Program", shortcut: "P" },
                                ].map((btn, i) => (
                                    <motion.div key={i} whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                                        <Button
                                            variant="ghost"
                                            size="default"
                                            onClick={btn.action}
                                            className={cn(
                                                "h-11 px-4 text-emerald/90 hover:text-emerald hover:bg-emerald/10 rounded-xl transition-all gap-2 relative group",
                                                btn.icon === Timer && modals.showTimer && "text-emerald bg-emerald/10"
                                            )}
                                        >
                                            <btn.icon size={20} />
                                            <span className="hidden md:inline-block text-sm font-bold tracking-tight">{btn.label}</span>
                                            {/* Activity Indicator (Example for Timer) */}
                                            {btn.icon === Timer && modals.showTimer && (
                                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald rounded-full animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
                                            )}
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

                            {/* User Avatar & Dropdown */}
                            <div className="relative" ref={menuRef}>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className={cn(
                                        "flex items-center justify-center h-11 w-11 rounded-xl border transition-all duration-300",
                                        isMenuOpen
                                            ? "bg-emerald/20 border-primary/40 text-emerald shadow-[0_0_20px_rgba(var(--color-primary),0.2)]"
                                            : "bg-white/5 border-white/10 text-emerald/70 hover:text-emerald hover:bg-white/10 hover:border-white/20"
                                    )}
                                >
                                    <User size={22} />
                                </motion.button>

                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute right-0 mt-3 w-64 origin-top-right z-60"
                                        >
                                            <div className="relative glass-card bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-2">
                                                {/* User Info Header */}
                                                <div className="px-3 py-3 border-b border-white/5 mb-1 bg-white/3 rounded-xl">
                                                    <span className="text-[10px] font-bold text-emerald/65 uppercase tracking-widest block mb-0.5">Oturum Açık</span>
                                                    <span className="text-sm font-bold text-emerald truncate block">Kullanıcı Paneli</span>
                                                </div>

                                                <div className="space-y-0.5">
                                                    {menuItems.map((item, i) => {
                                                        const Icon = item.icon;
                                                        const Component = item.href ? 'a' : 'button';
                                                        return (
                                                            <Component
                                                                key={i}
                                                                href={item.href}
                                                                onClick={(e) => {
                                                                    if (item.onClick) {
                                                                        e.preventDefault();
                                                                        item.onClick();
                                                                        setIsMenuOpen(false);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 group/item text-left appearance-none",
                                                                    item.bg
                                                                )}
                                                            >
                                                                <div className={cn("p-2 rounded-lg bg-white/5 border border-white/5 transition-colors group-hover/item:border-white/10", item.color)}>
                                                                    <Icon size={18} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-emerald group-hover/item:text-emerald transition-colors leading-none mb-1">
                                                                        {item.label}
                                                                    </span>
                                                                    <span className="text-[11px] text-emerald/70 font-medium leading-none">
                                                                        {item.description}
                                                                    </span>
                                                                </div>
                                                            </Component>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Secondary Row - Streak & Focus */}
                    <div className="md:hidden flex items-center justify-between py-2 border-t border-white/5">
                        <StreakDisplay streak={currentStreak} />
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/20">
                            <Zap size={14} className="text-accent" />
                            <span className="text-xs font-bold text-accent/90">{dailyFocus}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
