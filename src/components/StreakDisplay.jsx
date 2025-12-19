import React from 'react';
import { Flame } from 'lucide-react';

const StreakDisplay = ({ streak }) => {
    return (
        <div
            className="flex items-center gap-1.5 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20"
            title="Mevcut Seri (Gün)"
        >
            <div
                className={streak > 0 ? "animate-pulse" : ""}
            >
                <Flame
                    size={18}
                    className={`${streak > 0 ? "text-orange-500 fill-orange-500" : "text-gray-400"} transition-colors duration-500`}
                />
            </div>
            <span className={`text-sm font-bold ${streak > 0 ? "text-orange-600" : "text-gray-500"}`}>
                {streak} Gün
            </span>
        </div>
    );
};

export default StreakDisplay;
