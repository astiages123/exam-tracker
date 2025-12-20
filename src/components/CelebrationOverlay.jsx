import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle2 } from 'lucide-react';
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

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onComplete}
            />

            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                className="relative bg-custom-header border border-custom-accent/30 p-8 rounded-3xl shadow-2xl shadow-custom-accent/20 max-w-sm w-full text-center overflow-hidden"
            >
                {/* Animated Background Glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-custom-accent/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-custom-accent/20 rounded-full blur-3xl animate-pulse delay-700" />

                <div className="relative">
                    <motion.div
                        initial={{ rotate: -20, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", damping: 12, delay: 0.2 }}
                        className="w-20 h-20 bg-custom-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-custom-accent/20"
                    >
                        <Trophy size={40} className="text-custom-accent" />
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-2xl font-bold text-custom-text mb-2"
                    >
                        Harika İş!
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-custom-title/70 mb-6"
                    >
                        <span className="font-bold text-custom-accent">"{courseName}"</span> konusunu tamamen bitirdin. Bir adım daha yaklaştın!
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="flex items-center justify-center gap-2 text-custom-success font-bold text-sm bg-custom-success/10 py-2 px-4 rounded-xl border border-custom-success/20 inline-flex"
                    >
                        <CheckCircle2 size={18} />
                        Konu Tamamlandı
                    </motion.div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onComplete}
                        className="mt-8 w-full bg-custom-accent text-custom-bg font-bold py-3 rounded-xl shadow-lg shadow-custom-accent/20 hover:shadow-custom-accent/40 transition-all"
                    >
                        Devam Et
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default CelebrationOverlay;
