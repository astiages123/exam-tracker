import React from 'react';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

const StreakDisplay = ({ streak }) => {
    return (
        <div
            className="flex items-center gap-1.5 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20"
            title="Mevcut Seri (Gün)"
        >
            <motion.div
                animate={streak > 0 ? { scale: [1, 1.2, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
            >
                <Flame
                    size={18}
                    className={`${streak > 0 ? "text-orange-500 fill-orange-500" : "text-gray-400"} transition-colors duration-500`}
                />
            </motion.div>
            <span className={`text-sm font-bold ${streak > 0 ? "text-orange-600" : "text-gray-500"}`}>
                {streak} Gün
            </span>
        </div>
    );
};

export default StreakDisplay;
