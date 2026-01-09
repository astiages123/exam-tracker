import React from 'react';
import { PartyPopper, CheckCircle2 } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Rank } from '@/types';
import { RANK_ICONS } from '@/constants/styles';

interface RankCelebrationOverlayProps {
    rank: Rank;
    onComplete: () => void;
}

const RankCelebrationOverlay = ({ rank, onComplete }: RankCelebrationOverlayProps) => {
    const Icon = RANK_ICONS[rank.icon] || PartyPopper;

    React.useEffect(() => {
        // Fire initial confetti
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
            });
        }, 250);

        // Initial big burst
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 9999,
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        });

        // Auto close after 6 seconds
        const timer = setTimeout(() => {
            onComplete();
        }, 6000);

        // Modal scroll lock
        document.body.style.overflow = 'hidden';

        // Keyboard support for Escape
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onComplete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onComplete}
            />

            <div
                className="relative bg-card border border-primary/30 p-8 rounded-3xl shadow-2xl shadow-primary/20 max-w-md w-full text-center overflow-hidden"
            >
                {/* Animated Background Glow */}
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald/20 rounded-full blur-3xl animate-pulse delay-700" />

                <div className="relative">
                    <div
                        className="w-24 h-24 bg-emerald/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.3)] animate-in zoom-in duration-500"
                    >
                        <Icon size={48} className="text-emerald drop-shadow-md" />
                    </div>

                    <div className="space-y-2 mb-6">
                        <h2 className="text-3xl font-black text-foreground tracking-tight">
                            TEBRİKLER!
                        </h2>
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                            {rank.title}
                        </h3>
                    </div>

                    <p className="text-muted-foreground mb-8 text-lg font-medium">
                        Yeni bir seviyeye ulaştın! Çalışmaya devam et ve zirveye tırman.
                    </p>

                    <div
                        className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-400/10 py-2.5 px-6 rounded-xl border border-emerald-400/20 inline-flex mb-8"
                    >
                        <CheckCircle2 size={18} />
                        Rütbe Yükseldi
                    </div>

                    <Button
                        onClick={onComplete}
                        className="w-full py-6 text-lg rounded-2xl shadow-xl shadow-primary/25 font-bold hover:scale-[1.02] transition-transform"
                        size="lg"
                    >
                        Harika!
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default RankCelebrationOverlay;
