import React from 'react';
import { Flame } from 'lucide-react';

const StreakDisplay = ({ streak }) => {
    return (
        <div
            className="flex items-center gap-1.5 bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/30 shadow-sm"
            title="Mevcut Seri (Gün)"
        >
            <div
                className={streak > 0 ? "animate-pulse" : ""}
            >
                <Flame
                    size={18}
                    className={`${streak > 0 ? "text-orange-400 fill-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]" : "text-muted-foreground"} transition-colors duration-500`}
                />
            </div>
            <span className={`text-sm font-bold ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`}>
                {streak} Gün
            </span>
        </div>
    );
};

export default StreakDisplay;
