import { motion as Motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    progress: number;
    nextLevelMin: number;
    currentLevelMin: number;
    heightClass?: string;
}

export const ProgressBar = ({ progress, nextLevelMin, currentLevelMin, heightClass }: ProgressBarProps) => {
    const range = nextLevelMin - currentLevelMin;
    const currentVal = progress - currentLevelMin;
    const percentage = Math.min(100, Math.max(0, (currentVal / (range || 1)) * 100));

    return (
        <div className={cn("w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative", heightClass || "h-3")}>
            <Motion.div
                className="h-full bg-primary rounded-full relative shadow-[0_0_8px_rgba(var(--primary),0.2)]"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.15 }}
            >
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent h-[40%]" />
            </Motion.div>
        </div>
    );
};

interface CategoryProgressBarProps {
    percentage: number;
    colorClass?: string;
}

export const CategoryProgressBar = ({ percentage, colorClass }: CategoryProgressBarProps) => {
    return (
        <div className="w-full bg-black/40 rounded-full h-2 mt-2 overflow-hidden border border-white/5 relative">
            <Motion.div
                className={cn("h-full relative", colorClass || "bg-primary")}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                {/* Subtle sheen effect */}
                <div className="absolute inset-0 bg-white/10 -translate-y-1/2 h-[50%]" />
            </Motion.div>
        </div>
    );
};
