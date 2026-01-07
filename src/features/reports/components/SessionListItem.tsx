import React from 'react';
import { BookOpen, Trash2, Calendar, Clock, Tag } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COURSE_ICONS } from '@/constants/styles';
import type { GroupedSession } from '../hooks/useReportData';
import { formatHours } from '@/utils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SessionListItemProps {
    group: GroupedSession;
    courseName: string;
    categoryName: string;
    isMobile: boolean;
    onSelect: () => void;
    onDelete: () => void;
    index: number;
}

const SessionListItem = React.memo(({
    group,
    courseName,
    categoryName,
    isMobile,
    onSelect,
    onDelete,
    index
}: SessionListItemProps) => {
    const matchingKey = Object.keys(COURSE_ICONS).find(key => courseName.startsWith(key));
    const CourseIcon = matchingKey ? COURSE_ICONS[matchingKey as keyof typeof COURSE_ICONS] : BookOpen;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group/item relative"
        >

            <Card
                className={cn(
                    "relative overflow-hidden cursor-pointer transition-all duration-300",
                    "bg-zinc-800/40 border-border/50",
                    "hover:bg-zinc-800/60 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30",
                    "hover:-translate-y-0.5 active:scale-[0.995]",
                    "rounded-2xl border"
                )}
                onClick={onSelect}
            >


                <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className={cn(
                            "p-2 sm:p-2.5 rounded-xl shrink-0 transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-3",
                            "bg-linear-to-br from-primary/20 via-primary/10 to-transparent text-primary shadow-inner border border-primary/10"
                        )}>
                            <CourseIcon size={isMobile ? 18 : 20} strokeWidth={2.5} />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="font-bold text-zinc-100 text-xs sm:text-sm w-full max-w-[500px] truncate leading-tight tracking-tight group-hover/item:text-white transition-colors">
                                {courseName}
                            </h4>
                            <div className="flex items-center flex-wrap gap-2.5 text-xs font-medium">
                                <div className="flex items-center gap-1.5 shrink-0 bg-zinc-800/50 text-zinc-400 px-2 py-0.5 rounded-lg border border-white/5">
                                    <Calendar size={11} className="text-primary/70" />
                                    {new Date(group.date).toLocaleDateString('tr-TR', {
                                        day: 'numeric',
                                        month: 'short',
                                        weekday: 'short'
                                    })}
                                </div>
                                {categoryName && (
                                    <div className="flex items-center gap-1.5 shrink-0 bg-primary/10 text-primary/90 px-2.5 py-0.5 rounded-lg border border-primary/20 shadow-sm">
                                        <Tag size={10} className="text-primary/70" />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                                            {categoryName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0 pl-12 sm:pl-0">
                        <div className="sm:text-right flex items-center sm:block gap-2">
                            <span className="text-[10px] font-black text-primary-foreground uppercase tracking-widest sm:hidden">
                                SÜRE
                            </span>
                            <div className="flex items-center justify-end gap-1.5 text-primary">
                                <Clock size={14} className="opacity-90 hidden sm:inline-block" />
                                <span className="font-sans font-bold text-base sm:text-medium tracking-normal bg-linear-to-br from-primary to-primary-foreground bg-clip-text">
                                    {formatHours(group.totalDuration / 3600)}
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className={cn(
                                "h-8 w-8 shrink-0 rounded-lg transition-all duration-300",
                                "text-accent hover:text-destructive hover:bg-destructive/10 hover:rotate-12",
                                "opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                            )}
                            title="Kaydı Sil"
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
});


SessionListItem.displayName = 'SessionListItem';
export default SessionListItem;

