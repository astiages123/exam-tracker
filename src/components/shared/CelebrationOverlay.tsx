import React from 'react';
import { PartyPopper, CheckCircle2 } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';

interface CelebrationOverlayProps {
    courseName: string;
    onComplete: () => void;
}

const CelebrationOverlay = ({ courseName, onComplete }: CelebrationOverlayProps) => {
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
                className="relative bg-card border border-primary/30 p-8 rounded-3xl shadow-2xl shadow-primary/20 max-w-sm w-full text-center overflow-hidden"
            >
                {/* Animated Background Glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald/20 rounded-full blur-3xl animate-pulse delay-700" />

                <div className="relative">
                    <div
                        className="w-20 h-20 bg-emerald/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20"
                    >
                        <PartyPopper size={40} className="text-emerald" />
                    </div>

                    <h2
                        className="text-2xl font-bold text-foreground mb-2"
                    >
                        Harika İş!
                    </h2>

                    <p
                        className="text-muted-foreground mb-6"
                    >
                        <span className="font-bold text-subcourse">"{courseName}"</span> konusunu tamamen bitirdin. Bir adım daha yaklaştın!
                    </p>

                    <div
                        className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-400/10 py-2 px-4 rounded-xl border border-emerald-400/20 inline-flex"
                    >
                        <CheckCircle2 size={18} />
                        Konu Tamamlandı
                    </div>

                    <Button
                        onClick={onComplete}
                        className="mt-8 w-full py-3 rounded-xl shadow-lg shadow-primary/20 font-bold"
                        size="lg"
                    >
                        Devam Et
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CelebrationOverlay;
