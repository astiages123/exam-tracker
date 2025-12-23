import React from 'react';
import { PartyPopper, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const CelebrationOverlay = ({ courseName, onComplete }) => {
    React.useEffect(() => {
        // Fire initial confetti
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

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

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
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
                className="relative bg-custom-header border border-custom-accent/30 p-8 rounded-3xl shadow-2xl shadow-custom-accent/20 max-w-sm w-full text-center overflow-hidden"
            >
                {/* Animated Background Glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-custom-accent/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-custom-accent/20 rounded-full blur-3xl animate-pulse delay-700" />

                <div className="relative">
                    <div
                        className="w-20 h-20 bg-custom-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-custom-accent/20"
                    >
                        <PartyPopper size={40} className="text-custom-accent" />
                    </div>

                    <h2
                        className="text-2xl font-bold text-custom-text mb-2"
                    >
                        Harika İş!
                    </h2>

                    <p
                        className="text-custom-title/70 mb-6"
                    >
                        <span className="font-bold text-custom-accent">"{courseName}"</span> konusunu tamamen bitirdin. Bir adım daha yaklaştın!
                    </p>

                    <div
                        className="flex items-center justify-center gap-2 text-custom-success font-bold text-sm bg-custom-success/10 py-2 px-4 rounded-xl border border-custom-success/20 inline-flex"
                    >
                        <CheckCircle2 size={18} />
                        Konu Tamamlandı
                    </div>

                    <button
                        onClick={onComplete}
                        className="mt-8 w-full bg-custom-accent text-custom-bg font-bold py-3 rounded-xl shadow-lg shadow-custom-accent/20 hover:shadow-custom-accent/40 transition-all hover:scale-105 active:scale-95"
                    >
                        Devam Et
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CelebrationOverlay;
