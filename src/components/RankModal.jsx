import React from 'react';
import { Goal, Star, X } from 'lucide-react';
import { RANKS } from '../data';
import { cn } from '@/lib/utils';
import { RANK_ICONS } from '@/constants/styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const RankModal = ({ currentRank, onClose, totalHours = 0, completedHours = 0, sessions = [], videoHistory = [] }) => {
    const currentRankIndex = RANKS.findIndex(r => r.title === currentRank.title);

    // Calculate daily average study hours based on video duration
    const stats = React.useMemo(() => {
        const daySet = new Set();

        // Count days where work sessions occurred
        sessions.filter(s => s.type === 'work').forEach(s => {
            daySet.add(new Date(s.timestamp).toLocaleDateString());
        });

        // Count days where videos were completed
        videoHistory.forEach(h => {
            daySet.add(new Date(h.timestamp).toLocaleDateString());
        });

        const uniqueDays = daySet.size;

        return {
            avg: uniqueDays > 0 ? (completedHours / uniqueDays) : 0, // in hours
            uniqueDays
        };
    }, [sessions, videoHistory, completedHours]);

    const formatAvg = (h) => {
        const hrs = Math.floor(h);
        const mins = Math.round((h - hrs) * 60);
        if (hrs === 0) return `${mins}dk`;
        return `${hrs}sa ${mins}dk`;
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-border bg-card">
                <div className="p-6 border-b border-border flex items-start justify-between bg-card/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-xl border border-primary/10">
                            <Goal size={32} className="text-primary" />
                        </div>
                        <div>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-foreground">Unvan Yolculuğu</DialogTitle>
                                <DialogDescription className="sr-only">
                                    Kariyer basamaklarınızı ve çalışma hedeflerinize göre ulaştığınız unvanları görün.
                                </DialogDescription>
                            </DialogHeader>
                            <p className="text-muted-foreground text-sm mt-1">
                                {stats.uniqueDays > 0 ? (
                                    <>Günlük Ortalama: <span className="text-primary font-bold">{formatAvg(stats.avg)}</span></>
                                ) : (
                                    "Kariyer basamakların"
                                )}
                            </p>
                        </div>
                    </div>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted text-muted-foreground hover:text-white focus-visible:ring-0 focus-visible:ring-offset-0 outline-none">
                            <X size={24} />
                        </Button>
                    </DialogClose>
                </div>

                <ScrollArea className="flex-1 p-6 min-h-0">
                    <div className="relative flex flex-col gap-2">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-border/50 -z-10" />

                        {RANKS.map((rank, index) => {
                            const isCompleted = index < currentRankIndex;
                            const isCurrent = index === currentRankIndex;

                            // Calculate remaining days for this rank
                            let daysText = "";
                            if (!isCompleted && !isCurrent && stats.avg > 0) {
                                const targetHours = totalHours * (rank.min / 100);
                                const remainingHours = Math.max(0, targetHours - completedHours);
                                const days = Math.ceil(remainingHours / stats.avg);
                                daysText = `~${days} gün kaldı`;
                            }

                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "relative flex items-center gap-4 p-3 rounded-xl border transition-all duration-300",
                                        isCurrent
                                            ? "bg-primary/5 border-primary/30 shadow-sm"
                                            : "bg-card border-transparent hover:bg-muted/50"
                                    )}
                                >
                                    {/* Status Icon */}
                                    <div className={cn(
                                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 z-10",
                                        isCompleted ? "bg-primary text-primary-foreground border-card" :
                                            isCurrent ? "bg-card text-primary border-primary" :
                                                "bg-card text-muted-foreground/30 border-muted"
                                    )}>
                                        {(() => {
                                            const IconComponent = RANK_ICONS[rank.icon] || Star;
                                            return <IconComponent size={24} className={isCurrent ? "fill-current" : ""} />;
                                        })()}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={cn(
                                                "font-bold text-lg",
                                                isCurrent ? "text-primary" : isCompleted ? "text-foreground/80" : "text-muted-foreground"
                                            )}>
                                                {rank.title}
                                            </h3>
                                            <div className="flex flex-col items-end">
                                                <span className={cn(
                                                    "text-xs font-bold px-2 py-1 rounded-md",
                                                    isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                                )}>
                                                    %{rank.min}+
                                                </span>
                                                {daysText && (
                                                    <span className="text-[10px] font-bold text-primary/60 mt-1 uppercase tracking-wider">
                                                        {daysText}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className={cn(
                                            "text-sm",
                                            isCurrent ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {isCurrent ? "Şu an buradasınız" :
                                                isCompleted ? "Tamamlandı" :
                                                    `Bu unvana ulaşmak için %${rank.min} ilerleme gerekli`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog >
    );
};

export default RankModal;
