import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVideoDuration } from '@/utils/formatter';
import type { Video } from '@/features/course/types';

interface VideoItemProps {
    video: Video;
    courseId: string;
    index: number;
    isCompleted: boolean;
    onToggle: (e: React.MouseEvent, courseId: string, videoId: number) => void;
}

const VideoItem = React.memo(({ video, courseId, index, isCompleted, onToggle }: VideoItemProps) => {
    return (
        <div
            role="button"
            aria-label={`${video.title} - ${isCompleted ? 'Tamamlandı' : 'Tamamlanmadı'}`}
            aria-pressed={isCompleted}
            tabIndex={0}
            onClick={(e) => onToggle(e, courseId, video.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(e as any, courseId, video.id);
                }
            }}
            className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-150 group/video relative overflow-hidden border mb-2 outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
}, (prevProps, nextProps) => {
    return (
        prevProps.isCompleted === nextProps.isCompleted &&
        prevProps.video.id === nextProps.video.id &&
        prevProps.index === nextProps.index &&
        prevProps.courseId === nextProps.courseId
        // onToggle is stable now due to ref pattern
    );
});

export default VideoItem;

