
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    progress: number;
    nextLevelMin: number;
    currentLevelMin: number;
}

export const ProgressBar = ({ progress, nextLevelMin, currentLevelMin }: ProgressBarProps) => {
    const range = nextLevelMin - currentLevelMin;
    const currentVal = progress - currentLevelMin;
    const percentage = Math.min(100, Math.max(0, (currentVal / (range || 1)) * 100));

    return (
        <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/5 relative">
            <div
                className="h-full bg-primary rounded-full relative shadow-[0_0_8px_rgba(var(--primary),0.2)] transition-[width] duration-300 ease-out"
                style={{ width: `${percentage}%` }}
            >
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-[40%]" />
            </div>
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
            <div
                className={cn("h-full relative transition-[width] duration-700 ease-out", colorClass || "bg-primary")}
                style={{ width: `${percentage}%` }}
            >
                {/* Subtle sheen effect */}
                <div className="absolute inset-0 bg-white/10 -translate-y-1/2 h-[50%]" />
            </div>
        </div>
    );
};
