import { Flame } from 'lucide-react';
// eslint-disable-next-line
import { motion } from 'framer-motion';

interface StreakDisplayProps {
    streak: number;
}

const StreakDisplay = ({ streak }: StreakDisplayProps) => {
    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                    filter: [
                        "drop-shadow(0 0 2px rgba(249,115,22,0.4))",
                        "drop-shadow(0 0 8px rgba(249,115,22,0.8))",
                        "drop-shadow(0 0 2px rgba(249,115,22,0.4))"
                    ]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" />
            </motion.div>
            <span className="text-sm font-bold text-orange-400 tracking-tight">
                {streak} Gün
            </span>
        </div>
    );
};

export default StreakDisplay;
