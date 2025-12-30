import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVideoDuration } from '@/utils';
import type { Video } from '@/types';

interface VideoItemProps {
    video: Video;
    index: number;
    isCompleted: boolean;
    onClick: (e: React.MouseEvent) => void;
}

export default function VideoItem({ video, index, isCompleted, onClick }: VideoItemProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-150 group/video relative overflow-hidden border mb-2",
                isCompleted
                    ? "bg-gradient-to-r from-primary/15 to-accent/10 border-primary/30 shadow-[0_0_20px_-5px] shadow-primary/20"
                    : "bg-card/50 border-border/40 border-dashed hover:bg-card hover:border-primary/40 hover:shadow-[0_0_25px_-8px] hover:shadow-primary/30"
            )}
        >
            {/* Checkbox with micro-animation */}
            <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 border-2",
                isCompleted
                    ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/40"
                    : "border-muted-foreground/30 group-hover/video:border-primary/60 group-hover/video:scale-105 bg-transparent"
            )}>
                {isCompleted && <Check size={14} strokeWidth={3} className="animate-[pulse_0.3s_ease-out]" />}
            </div>

            {/* Index */}
            <span className={cn(
                "text-sm font-bold w-6 transition-colors font-mono",
                isCompleted ? "text-primary" : "text-muted-foreground group-hover/video:text-foreground"
            )}>
                #{index + 1}
            </span>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <span className={cn(
                    "text-[14px] leading-[20px] font-medium block truncate transition-colors",
                    isCompleted ? "text-foreground" : "text-foreground/80 group-hover/video:text-foreground"
                )}>
                    {video.title}
                </span>
            </div>

            {/* Duration Badge */}
            <div
                className={cn(
                    "flex items-center justify-center h-7 px-2.5 rounded-lg text-[12px] leading-[16px] font-semibold shrink-0 border font-mono transition-all",
                    isCompleted
                        ? "bg-primary/20 border-primary/30 text-primary"
                        : "bg-muted/50 border-border/50 text-accent group-hover/video:bg-accent/10 group-hover/video:border-accent/40"
                )}
            >
                {formatVideoDuration(video.durationMinutes)}
            </div>
        </div>
    );
}

