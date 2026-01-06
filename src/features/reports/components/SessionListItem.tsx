import React from 'react';
import { BookOpen, Trash2, Calendar } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COURSE_ICONS } from '@/constants/styles';
import type { GroupedSession } from '../hooks/useReportData';
import { formatHours } from '@/utils';

interface SessionListItemProps {
    group: GroupedSession;
    courseName: string;
    categoryName: string;
    isMobile: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

const SessionListItem = React.memo(({
    group,
    courseName,
    categoryName,
    isMobile,
    onSelect,
    onDelete
}: SessionListItemProps) => {
    const matchingKey = Object.keys(COURSE_ICONS).find(key => courseName.startsWith(key));
    const CourseIcon = matchingKey ? COURSE_ICONS[matchingKey as keyof typeof COURSE_ICONS] : BookOpen;

    return (
        <Card
            className="relative cursor-pointer hover:bg-card/80 transition-all border-border/50 shadow-md group bg-card hover:shadow-lg hover:border-primary/20"
            onClick={onSelect}
        >
            <CardContent className="p-3 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-primary/15 text-primary shrink-0 shadow-sm">
                        <CourseIcon size={isMobile ? 24 : 32} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-subcourse text-sm sm:text-base w-full sm:max-w-[450px] truncate leading-tight">
                            {courseName}
                        </h4>
                        <div className="flex items-center flex-wrap gap-2 text-[11px] sm:text-xs text-foreground/70 font-medium mt-1">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Calendar size={12} className="text-primary/70" />
                                {new Date(group.date).toLocaleDateString('tr-TR')}
                            </div>
                            {categoryName && (
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-primary/10 border-primary/20 text-primary whitespace-nowrap">
                                    {categoryName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-border/30 sm:border-t-0">
                    <div className="sm:text-right">
                        <span className="font-mono font-bold text-primary text-base sm:text-lg">
                            {formatHours(group.totalDuration / 3600)}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 shrink-0"
                        title="Kaydı Sil"
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
});

SessionListItem.displayName = 'SessionListItem';
export default SessionListItem;
