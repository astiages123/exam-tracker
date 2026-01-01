import React from 'react';
import { Goal, Star, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { RANKS } from '@/features/ranks/constants/ranks';
import { cn } from '@/lib/utils';
import { formatHours } from '@/utils/formatter';
import { RANK_ICONS } from '@/constants/styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Rank, StudySession, VideoHistoryItem } from '@/types';

interface RankModalProps {
    currentRank: Rank;
    onClose: () => void;
    totalHours?: number;
    completedHours?: number;
    sessions?: StudySession[];
    videoHistory?: VideoHistoryItem[];
}

const RankModal = ({
    currentRank,
    onClose,
    totalHours = 0,
    completedHours = 0,
    sessions = [],
    videoHistory = []
}: RankModalProps) => {
    const currentRankIndex = RANKS.findIndex(r => r.title === currentRank.title);

    // Calculate daily average study hours based on video duration
    const stats = React.useMemo(() => {
        const daySet = new Set<string>();

        // Count days where work sessions occurred
        sessions.filter(s => s.type === 'work').forEach(s => {
            if (s.timestamp) {
                daySet.add(new Date(s.timestamp).toLocaleDateString());
            }
        });

        // Count days where videos were completed
        videoHistory.forEach(h => {
            if (h.timestamp) {
                daySet.add(new Date(h.timestamp).toLocaleDateString());
            }
        });

        const uniqueDays = daySet.size;

        return {
            avg: uniqueDays > 0 ? (completedHours / uniqueDays) : 0, // in hours
            uniqueDays
        };
    }, [sessions, videoHistory, completedHours]);



    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] sm:w-full max-w-3xl h-[85vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border bg-background shadow-xl">
                {/* Header */}
                <div className="relative p-3 sm:p-4 border-b border-border bg-card/30 overflow-hidden">

                    <div className="relative flex items-center gap-4">
                        <div className="p-2 sm:p-3 rounded-xl bg-secondary border border-border shrink-0">
                            <Goal className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between w-full">
                                <DialogHeader>
                                    <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground leading-tight flex items-center gap-2">
                                        Unvan Yolculuğu
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Kariyer basamaklarınızı ve çalışma hedeflerinize göre ulaştığınız unvanları görün.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogClose asChild>
                                    <ModalCloseButton className="-mr-2" />
                                </DialogClose>
                            </div>
                            {stats.uniqueDays > 0 && (
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
                                        <Clock size={12} />
                                        <span className="font-semibold">Günlük Ort:</span>
                                        <span className="font-bold">{formatHours(stats.avg)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-lg border border-accent/20">
                                        <TrendingUp size={12} />
                                        <span className="font-bold">{stats.uniqueDays} gün</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1 px-3 sm:px-6 py-2 min-h-0">
                    <div className="relative flex flex-col gap-2 pt-4 pb-6">
                        {/* Gradient Timeline Line */}


                        {RANKS.map((rank, index) => {
                            const isCompleted = index < currentRankIndex;
                            const isCurrent = index === currentRankIndex;

                            // Calculate remaining days for this rank
                            let daysText = "";
                            if (!isCompleted && !isCurrent && stats.avg > 0) {
                                const targetHours = totalHours * (rank.min / 100);
                                const remainingHours = Math.max(0, targetHours - completedHours);
                                const days = Math.ceil(remainingHours / stats.avg);
                                daysText = `~${days} gün`;
                            }

                            const IconComponent = RANK_ICONS[rank.icon as keyof typeof RANK_ICONS] || Star;

                            return (
                                <div key={index} className="flex items-center gap-3 sm:gap-5 group">
                                    <div className="flex flex-col items-center shrink-0 w-[44px] sm:w-[56px] relative">
                                        <div className={cn(
                                            "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 z-10 transition-all",
                                            isCompleted
                                                ? "bg-accent text-accent-foreground border-accent"
                                                : isCurrent
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-muted text-muted-foreground border-border"
                                        )}>
                                            {isCompleted ? (
                                                <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />
                                            ) : (
                                                <IconComponent size={20} className="sm:w-6 sm:h-6" />
                                            )}
                                        </div>
                                        {/* Line Segment - Absolute positioned to not affect centering */}
                                        {index < RANKS.length - 1 && (
                                            <div className={cn(
                                                "absolute top-1/2 left-1/2 -translate-x-1/2 w-[2px] sm:w-[2.5px] -z-10",
                                                "h-[calc(100%+0.5rem)]", // Extension to reach the next icon center
                                                isCompleted ? "bg-accent/40" : "bg-muted"
                                            )} />
                                        )}
                                    </div>

                                    {/* Right Side: Content Card */}
                                    <div
                                        className={cn(
                                            "flex-1 relative flex flex-col justify-center gap-1 p-3 sm:p-4 rounded-xl border transition-all",
                                            isCurrent
                                                ? "bg-primary/5 border-primary/30"
                                                : isCompleted
                                                    ? "bg-card border-border"
                                                    : "bg-muted/30 border-border/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className={cn(
                                                    "font-bold text-sm sm:text-lg tracking-tight leading-none truncate",
                                                    isCurrent ? "text-primary" : isCompleted ? "text-foreground font-medium" : "text-muted-foreground font-medium"
                                                )}>
                                                    {rank.title}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    {isCurrent ? (
                                                        <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-primary">
                                                            Şu an buradasınız
                                                        </span>
                                                    ) : isCompleted ? (
                                                        <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-accent">
                                                            <CheckCircle2 size={12} />
                                                            Tamamlandı
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                                                            %{rank.min} ile açılır
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={cn(
                                                    "text-xs sm:text-sm font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border",
                                                    isCurrent
                                                        ? "bg-primary/20 text-primary border-primary/30"
                                                        : isCompleted
                                                            ? "bg-accent/20 text-accent border-accent/30"
                                                            : "bg-muted/50 text-muted-foreground border-border/50"
                                                )}>
                                                    %{rank.min}+
                                                </span>
                                                {daysText && (
                                                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded-md">
                                                        {daysText}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default RankModal;

