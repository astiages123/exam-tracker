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
        <div className={cn("w-full bg-black/60 rounded-full overflow-hidden border border-white/10 relative shadow-inner", heightClass || "h-3")}>
            <Motion.div
                className="h-full bg-linear-to-r from-primary/80 via-primary to-primary/90 rounded-full relative shadow-[0_0_15px_var(--color-primary)]"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
            >
                {/* Dynamic Sheen Effect */}
                <Motion.div
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent w-1/2 -skew-x-12"
                    animate={{
                        left: ['-100%', '200%']
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 0.5
                    }}
                />

                {/* Glossy Top Overlay */}
                <div className="absolute inset-x-0 top-0 h-[35%] bg-white/20 rounded-t-full" />
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
                className={cn("h-full relative", colorClass || "bg-emerald")}
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
