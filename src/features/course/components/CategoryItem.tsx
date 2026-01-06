import React, { useMemo } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ChevronDown, MonitorPlay, BadgeCheck, Timer, FileText, Brain, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_STYLES, CATEGORY_ICONS, COURSE_ICONS } from '@/constants/styles';
import { formatHours } from '@/utils/formatter';
import type { Course, CourseCategory, UserProgressData } from '@/types';
import { CategoryProgressBar } from '@/components/stats/ProgressBars';
import VideoItem from '@/features/course/components/VideoItem';

interface CategoryItemProps {
    category: CourseCategory;
    catIdx: number;
    progressData: UserProgressData;
    isExpanded: boolean;
    expandedCourses: Set<string>;
    handlers: {
        toggleCategory: (categoryId: string) => void;
        toggleCourse: (courseId: string) => void;
        handleVideoClick: (e: React.MouseEvent, courseId: string, videoId: number) => void;
    };
    modals: {
        openNotes: (course: Course) => void;
        openQuiz: (course: Course) => void;
        openStats: (course: Course) => void;
    };
}


const CategoryItem = React.memo(({
    category,
    catIdx,
    progressData,
    isExpanded,
    expandedCourses,
    handlers,
    modals
}: CategoryItemProps) => {
    // Memoize calculations used in render
    const {
        categoryTotalHours,
        categoryTotalVideos,
        categoryCompletedVideos,
        categoryCompletedHours,
        categoryPercent
    } = useMemo(() => {
        const totalHours = category.courses.reduce((acc, c) => acc + c.totalHours, 0);
        const totalVideos = category.courses.reduce((acc, c) => acc + c.totalVideos, 0);
        const completedVideos = category.courses.reduce((acc, c) => acc + (progressData[c.id] || []).length, 0);

        const completedHours = category.courses.reduce((acc, c) => {
            const completedIds = progressData[c.id] || [];
            const cVideos = c.videos || [];
            const dur = completedIds.reduce((dAcc, vidId) => {
                const v = cVideos.find(video => video.id === vidId);
                return dAcc + (v ? v.durationMinutes : (c.totalHours * 60 / (c.totalVideos || 1)));
            }, 0);
            return acc + (dur / 60);
        }, 0);

        const percent = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

        return {
            categoryTotalHours: totalHours,
            categoryTotalVideos: totalVideos,
            categoryCompletedVideos: completedVideos,
            categoryCompletedHours: completedHours,
            categoryPercent: percent
        };
    }, [category, progressData]);

    const categoryNameRaw = category.category.split('(')[0].replace(/^\d+\.\s*/, '').trim();
    const styles = CATEGORY_STYLES[categoryNameRaw] || CATEGORY_STYLES['DEFAULT'];
    const IconComponent = CATEGORY_ICONS[categoryNameRaw] || CATEGORY_ICONS['DEFAULT'];

    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIdx * 0.1 }}
            className="relative group"
        >
            <div className={cn(
                "relative glass-card glass-card-hover rounded-[1.5rem] overflow-hidden transition-all duration-300",
                styles.bg,
                isExpanded ? "ring-2 ring-white/10" : "hover:ring-1 hover:ring-white/10",
                categoryPercent === 100 ? "border-primary/30 shadow-[0_0_20px_-5px_var(--color-primary)]" : styles.border
            )}>
                {/* Category Header */}
                <button
                    onClick={() => handlers.toggleCategory(String(catIdx))}
                    aria-expanded={isExpanded}
                    aria-label={`${category.category} kategorisini ${isExpanded ? 'kapat' : 'aç'}. İlerleme: %${categoryPercent}`}
                    className="w-full p-5 sm:p-6 bg-transparent cursor-pointer block text-left outline-none"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg",
                                styles.iconBg
                            )}>
                                <IconComponent size={24} className={styles.accent} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className={cn(
                                        "font-bold text-lg tracking-tight transition-colors",
                                        categoryPercent === 100 ? "text-amber-400 text-glow" : styles.accent
                                    )}>
                                        {category.category.split('(')[0]}
                                    </h3>
                                    {categoryPercent === 100 && <BadgeCheck size={18} className="text-amber-400 animate-pulse" />}
                                </div>
                                <div className="flex gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/5">
                                        <Timer size={15} className={styles.darkAccent} />
                                        <span className="text-[12px] font-bold text-white/70">
                                            {formatHours(categoryCompletedHours)}
                                            <span className="mx-1 text-white/40">/</span>
                                            <span className="opacity-70">{formatHours(categoryTotalHours)}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/5">
                                        <MonitorPlay size={15} className={styles.darkAccent} />
                                        <span className="text-[12px] font-bold text-white/70">
                                            {categoryCompletedVideos}
                                            <span className="mx-1 text-white/40">/</span>
                                            <span className="opacity-70">{categoryTotalVideos}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={cn(
                            "p-1.5 rounded-xl bg-white/[0.03] border border-white/5 transition-transform duration-300",
                            isExpanded ? "rotate-180 bg-white/[0.08]" : ""
                        )}>
                            <ChevronDown size={20} className="text-white/40" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[12px] font-bold">
                            <span className="text-white/60 uppercase tracking-wider">İlerleme</span>
                            <span className={cn("text-base", styles.accent)}>%{categoryPercent}</span>
                        </div>
                        <CategoryProgressBar percentage={categoryPercent} colorClass={cn(styles.barColor, "shadow-[0_0_10px_rgba(0,0,0,0.5)]")} />
                    </div>
                </button>

                <AnimatePresence>
                    {isExpanded && (
                        <Motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="bg-black/40 border-t border-white/5"
                        >
                            <div className="p-5 sm:p-6 space-y-4">
                                {category.courses.map(course => {
                                    const completedIds = progressData[course.id] || [];
                                    const courseCompletedCount = completedIds.length;
                                    const courseVideos = course.videos || [];
                                    const courseCompletedMinutes = completedIds.reduce((acc, vidId) => {
                                        const v = courseVideos.find(video => video.id === vidId);
                                        return acc + (v ? v.durationMinutes : 0);
                                    }, 0);
                                    const courseCompletedHours = courseCompletedMinutes / 60;
                                    const coursePercent = course.totalHours > 0 ? Math.round((courseCompletedHours / course.totalHours) * 100) : 0;
                                    const isCourseCompleted = courseCompletedCount === course.totalVideos && course.totalVideos > 0;
                                    const isCourseExpanded = expandedCourses.has(course.id);

                                    return (
                                        <div
                                            key={course.id}
                                            className={cn(
                                                "rounded-2xl border transition-all duration-300 group/course shadow-lg shadow-black/20",
                                                isCourseCompleted
                                                    ? "bg-amber-400/[0.05] border-amber-400/40"
                                                    : "bg-black/40 border-white/20 hover:border-white/30"
                                            )}
                                        >
                                            <div
                                                className="p-3.5 sm:p-4 cursor-pointer relative"
                                                onClick={() => handlers.toggleCourse(course.id)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handlers.toggleCourse(course.id);
                                                    }
                                                }}
                                                aria-expanded={isCourseExpanded}
                                                aria-label={`${course.name} detaylarını ${isCourseExpanded ? 'gizle' : 'göster'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Compact Icon */}
                                                    <div className={cn(
                                                        "p-3 rounded-xl shrink-0 transition-transform group-hover/course:scale-105 hidden xs:flex",
                                                        styles.iconBg
                                                    )}>
                                                        {(() => {
                                                            const matchingKey = Object.keys(COURSE_ICONS).find(key => course.name.startsWith(key));
                                                            const CourseIcon = matchingKey ? COURSE_ICONS[matchingKey] : IconComponent;
                                                            return <CourseIcon className={cn(isCourseCompleted ? "text-amber-400" : styles.accent)} size={20} />;
                                                        })()}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className={cn(
                                                                "font-bold text-[15px] sm:text-[16px] truncate capitalize tracking-tight",
                                                                isCourseCompleted ? "text-amber-400" : "text-white/75"
                                                            )}>
                                                                {course.name.split(' - ')[0].replace(/\s*\(AÖF\)\s*/g, '')}
                                                            </h4>
                                                            <span className={cn(
                                                                "text-[12px] font-black px-1.5 py-0.5 rounded-md bg-black/40 border border-white/10 shrink-0",
                                                                isCourseCompleted ? "text-amber-400" : styles.accent
                                                            )}>
                                                                %{coursePercent}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold shrink-0">
                                                                <Timer size={13} className={cn(isCourseCompleted ? "text-amber-400" : styles.accent)} />
                                                                <span className="text-white/75">{formatHours(courseCompletedHours)}</span>
                                                                <span className="text-white/30">/</span>
                                                                <span className="text-white/50">{formatHours(course.totalHours)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold shrink-0">
                                                                <MonitorPlay size={13} className={cn(isCourseCompleted ? "text-amber-400" : styles.accent)} />
                                                                <span className="text-white/75">{courseCompletedCount}</span>
                                                                <span className="text-white/30">/</span>
                                                                <span className="text-white/50">{course.totalVideos}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                                                        <div className="hidden sm:flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                                                            {course.playlistUrl && (
                                                                <a
                                                                    href={course.playlistUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path><path d="m10 15 5-3-5-3z"></path></svg>
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => modals.openNotes(course)}
                                                                className="p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                                                title="Notlara Bak"
                                                            >
                                                                <FileText size={18} className="text-emerald-500" />
                                                            </button>
                                                            <button
                                                                onClick={() => modals.openQuiz(course)}
                                                                className="p-2 rounded-lg hover:bg-purple-500/10 transition-colors"
                                                                title="Quiz Başlat"
                                                            >
                                                                <Brain size={18} className="text-purple-500" />
                                                            </button>
                                                            <button
                                                                onClick={() => modals.openStats(course)}
                                                                className="p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                                                                title="İstatistikler"
                                                            >
                                                                <BarChart2 size={18} className="text-blue-500" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => handlers.toggleCourse(course.id)}
                                                            className={cn(
                                                                "p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/20",
                                                                isCourseExpanded ? "rotate-180 bg-white/10" : ""
                                                            )}
                                                        >
                                                            <ChevronDown size={16} className="text-white/60" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isCourseExpanded && (
                                                    <Motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-white/5 bg-black/40"
                                                    >
                                                        <div className="p-3 space-y-1">
                                                            {courseVideos.map((video, vIdx) => (
                                                                <VideoItem
                                                                    key={video.id}
                                                                    video={video}
                                                                    courseId={course.id}
                                                                    index={vIdx}
                                                                    isCompleted={completedIds.includes(video.id)}
                                                                    onToggle={handlers.handleVideoClick}
                                                                />
                                                            ))}
                                                        </div>
                                                    </Motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Motion.div>
    );
});

export default CategoryItem;
