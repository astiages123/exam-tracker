/**
 * ReportModal Component
 * 
 * Main report modal displaying session statistics, session list,
 * and chart visualization.
 * 
 * Refactored: Logic moved to useReportData hook,
 * UI split into multiple sub-components.
 */

import React, { useState, useEffect } from 'react';
import { Clock, ChartNoAxesCombined, BarChart2, List, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import ConfirmModal from '@/components/ui/ConfirmModal';
import ModalCloseButton from '@/components/ui/ModalCloseButton';
import SessionChartModal from '@/features/reports/components/SessionChartModal';

// Feature components
import { useReportData, type GroupedSession } from '@/features/reports/hooks/useReportData';
import SessionListItem from '@/features/reports/components/SessionListItem';
import ReportStats from '@/features/reports/components/ReportStats';
const DurationChart = React.lazy(() => import('@/features/reports/components/DurationChart'));
const VideoChart = React.lazy(() => import('@/features/reports/components/VideoChart'));
const FullHistoryModal = React.lazy(() => import('@/features/reports/components/FullHistoryModal'));

import type { StudySession, Course, VideoHistoryItem, UserProgressData } from '@/types';

interface ReportModalProps {
    sessions?: StudySession[];
    onClose: () => void;
    courses?: Course[];
    onDelete: (timestamps: number[]) => void;
    onUpdate: (oldTimestamp: number, updatedSession: StudySession) => void;
    videoHistory?: VideoHistoryItem[];
    progressData?: UserProgressData;
    initialHistoryType?: 'duration' | 'videos' | null;
    totalVideos?: number;
    totalHours?: number;
    completedHours?: number;
    completedCount?: number;
}

export default function ReportModal({
    sessions = [],
    onClose,
    courses = [],
    onDelete,
    onUpdate,
    videoHistory = [],
    progressData = {},
    initialHistoryType = null,
    totalVideos = 0,
    totalHours = 0,
    completedHours = 0,
    completedCount = 0
}: ReportModalProps) {
    const [selectedGroup, setSelectedGroup] = useState<GroupedSession | null>(null);
    const [showFullHistory, setShowFullHistory] = useState<'duration' | 'videos' | null>(null);
    const [activeTab, setActiveTab] = useState<string>(initialHistoryType ? 'graph' : 'list');
    const [confirmDelete, setConfirmDelete] = useState<{ sessionIds: number[] } | null>(null);

    // Handle initial sub-modal opening with a small delay for stable mounting
    useEffect(() => {
        if (initialHistoryType) {
            const timer = setTimeout(() => {
                setShowFullHistory(initialHistoryType);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [initialHistoryType]);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive check
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Track sub-modal state for proper close handling
    const subModalActiveRef = React.useRef(false);
    useEffect(() => {
        const isAnySubModalOpen = selectedGroup || showFullHistory || confirmDelete;
        if (isAnySubModalOpen) {
            subModalActiveRef.current = true;
        } else {
            const timer = setTimeout(() => {
                subModalActiveRef.current = false;
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedGroup, showFullHistory, confirmDelete]);

    // Get all data from hook
    const {
        getCourseCategory,
        getCourseName,
        workSessions,
        breakSessions,
        aggregatedSessions,
        stats,
        chartData,
        fullChartData
    } = useReportData({
        sessions,
        courses,
        videoHistory,
        progressData,
        isMobile
    });

    // Work Report Logic
    const workReport = React.useMemo(() => {
        // Calculate dates - using current date dynamically
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        const endDate = new Date('2026-05-31T23:59:59');
        const remainingTime = endDate.getTime() - today.getTime();
        const remainingDays = Math.max(1, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));

        const daySet = new Set<string>();
        let userTotalStudySeconds = 0;

        // Count days where work sessions occurred and sum duration
        sessions.filter(s => s.type === 'work').forEach(s => {
            if (s.timestamp) {
                daySet.add(new Date(s.timestamp).toLocaleDateString());
            }
            userTotalStudySeconds += s.duration || 0;
        });

        // Count days where videos were completed
        videoHistory.forEach(h => {
            if (h.timestamp) {
                daySet.add(new Date(h.timestamp).toLocaleDateString());
            }
        });

        const uniqueDays = daySet.size;

        // Metrics
        const currentStudyHours = userTotalStudySeconds / 3600;
        const currentStudyAvg = uniqueDays > 0 ? (currentStudyHours / uniqueDays) : 0;

        // Ideal Study Avg: Remaining Video Hours / Remaining Days
        const remainingVideoHours = Math.max(0, totalHours - completedHours);
        const idealStudyAvg = remainingVideoHours / remainingDays;

        // Video Metrics
        const actualCompletedCount = completedCount || videoHistory.length;

        const currentVideoAvg = uniqueDays > 0 ? (actualCompletedCount / uniqueDays) : 0;

        // Ideal Video Avg: Remaining Videos / Remaining Days
        const remainingVideos = Math.max(0, totalVideos - actualCompletedCount);
        const idealVideoAvg = remainingVideos / remainingDays;

        return {
            study: {
                current: currentStudyAvg,
                ideal: idealStudyAvg
            },
            video: {
                current: currentVideoAvg,
                ideal: idealVideoAvg
            },
        };
    }, [sessions, videoHistory, completedHours, totalHours, totalVideos, completedCount]);


    return (
        <>
            <Dialog open={true} onOpenChange={(open) => {
                if (!open && !subModalActiveRef.current) {
                    onClose();
                }
            }}>
                <DialogContent
                    className={cn(
                        "flex flex-col p-0 gap-0 bg-background border-border shadow-2xl overflow-hidden focus-visible:outline-none transition-all duration-300",
                        "w-full max-w-full sm:max-w-7xl h-dvh sm:h-[90vh] sm:rounded-lg"
                    )}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
                        {/* Header */}
                        <div className="p-4 sm:p-8 border-b border-border flex justify-between items-center bg-card/50">
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald/10 p-2.5 sm:p-3.5 rounded-xl border border-primary/10 mt-1">
                                    <ChartNoAxesCombined className="text-emerald" size={isMobile ? 28 : 40} />
                                </div>
                                <div className="flex flex-col">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-bold text-foreground">
                                            Çalışma Raporu
                                        </DialogTitle>
                                        <DialogDescription className="sr-only">
                                            Detaylı çalışma raporu ve istatistikler.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <TabsList className="mt-2 bg-white/5 w-full sm:w-auto grid grid-cols-2 sm:flex">
                                        <TabsTrigger value="list" className="gap-2">
                                            <List size={14} /> <span>Oturumlar</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="graph" className="gap-2">
                                            <BarChart2 size={14} /> <span>Çalışma Grafiği</span>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">

                                <DialogClose asChild>
                                    <ModalCloseButton className="-mr-2" />
                                </DialogClose>
                            </div>
                        </div>




                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            <ScrollArea className="h-full w-full">
                                <div className="p-4 sm:p-8 w-full flex flex-col gap-8">
                                    <TabsContent value="list" className="mt-0 focus-visible:ring-0">
                                        {activeTab === 'list' && (
                                            <div className="flex flex-col gap-8">
                                                {/* Total Stats Section */}
                                                <ReportStats {...stats} />


                                                {aggregatedSessions.length === 0 ? (
                                                    <div className="text-center py-12 text-muted-foreground/40">
                                                        <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                                        <p>Henüz kayıtlı bir çalışma oturumu bulunmuyor.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {aggregatedSessions.map((group, index) => (
                                                            <SessionListItem
                                                                key={group.key}
                                                                group={group}
                                                                courseName={getCourseName(group.courseId)}
                                                                categoryName={getCourseCategory(group.courseId)}
                                                                isMobile={isMobile}
                                                                onSelect={() => setSelectedGroup(group)}
                                                                onDelete={() => setConfirmDelete({ sessionIds: group.sessionIds })}
                                                                index={index}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="graph" className="mt-0 focus-visible:ring-0">
                                        {activeTab === 'graph' && (
                                            <div className="flex flex-col gap-4 sm:gap-6">
                                                {/* Work Report Section */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="relative p-4 bg-card rounded-2xl border border-border/50 transition-all duration-300">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="p-2 rounded-lg bg-emerald/10 text-emerald border border-primary/10">
                                                                <Clock size={18} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Günlük Çalışma</span>
                                                                <span className="text-sm font-semibold text-foreground/90">Ortalaması</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-end justify-between">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-xl font-black text-emerald tracking-tight">
                                                                        {(() => {
                                                                            const hours = Math.floor(workReport.study.current);
                                                                            const mins = Math.round((workReport.study.current - hours) * 60);
                                                                            return hours > 0 ? `${hours}sa ${mins}dk` : `${mins}dk`;
                                                                        })()}
                                                                    </span>
                                                                    <span className="text-xs font-medium text-foreground">/gün</span>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <span className="block text-[9px] font-bold text-foreground uppercase tracking-widest leading-tight mb-1">Hedef</span>
                                                                <span className="text-base font-bold text-foreground">
                                                                    {(() => {
                                                                        const hours = Math.floor(workReport.study.ideal);
                                                                        const mins = Math.round((workReport.study.ideal - hours) * 60);
                                                                        return hours > 0 ? `${hours}sa ${mins}dk` : `${mins}dk`;
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="relative p-4 bg-card rounded-2xl border border-border/50 transition-all duration-300">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="p-2 rounded-lg bg-emerald/10 text-emerald border border-primary/10">
                                                                <CheckCircle2 size={18} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Video Tamamlama</span>
                                                                <span className="text-sm font-semibold text-foreground/90">Ortalaması</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-end justify-between">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-xl font-black text-emerald tracking-tight">
                                                                        {Math.round(workReport.video.current)}
                                                                    </span>
                                                                    <span className="text-xs font-medium text-foreground">video/gün</span>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <span className="block text-[9px] font-bold text-foreground uppercase tracking-widest leading-tight mb-1">Hedef</span>
                                                                <span className="text-base font-bold text-foreground">
                                                                    {Math.round(workReport.video.ideal)} video
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <React.Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground">Grafik yükleniyor...</div>}>
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                                        <DurationChart
                                                            data={chartData}
                                                            onShowFullHistory={() => setShowFullHistory('duration')}
                                                            className="h-[220px] sm:h-[240px]"
                                                        />
                                                        <VideoChart
                                                            data={chartData}
                                                            onShowFullHistory={() => setShowFullHistory('videos')}
                                                            className="h-[220px] sm:h-[240px]"
                                                        />
                                                    </div>
                                                </React.Suspense>
                                            </div>
                                        )}
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </div>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Sub-Modal for Session Details */}
            <AnimatePresence>
                {selectedGroup && (
                    <SessionChartModal
                        group={{
                            date: new Date(selectedGroup.date).toISOString(),
                            courseId: selectedGroup.courseId
                        }}
                        courseName={getCourseName(selectedGroup.courseId)}
                        workSessions={workSessions}
                        breakSessions={breakSessions}
                        onClose={() => setSelectedGroup(null)}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                        isMobile={isMobile}
                    />
                )}
            </AnimatePresence>

            {/* Full History Modal */}
            <React.Suspense fallback={null}>
                <FullHistoryModal
                    isOpen={!!showFullHistory}
                    type={showFullHistory}
                    data={fullChartData}
                    onClose={() => setShowFullHistory(null)}
                />
            </React.Suspense>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Kaydı Sil"
                message="Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmText="Evet, Sil"
                cancelText="İptal"
                onConfirm={() => {
                    if (onDelete && confirmDelete?.sessionIds) {
                        onDelete(confirmDelete.sessionIds);
                    }
                    setConfirmDelete(null);
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </>
    );
}
