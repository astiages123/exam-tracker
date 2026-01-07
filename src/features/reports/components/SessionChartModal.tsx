/**
 * SessionChartModal Component
 * 
 * A modal displaying a detailed daily timeline chart for work sessions,
 * breaks, and pause intervals.
 */

import React from 'react';
import { Clock, BookOpen, Trash2, Edit2, Save, ChartArea, Pause } from 'lucide-react';
import { COURSE_ICONS } from '@/constants/styles';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Modal } from '@/components/ui/modal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmModal from '@/components/ui/ConfirmModal';
import ModalCloseButton from '@/components/ui/ModalCloseButton';
import { StudySession } from '@/types';
import { useSessionChart } from '../hooks/useSessionChart';

interface SessionChartModalProps {
    group: {
        date: string;
        courseId: string | null;
    };
    courseName?: string;
    workSessions: StudySession[];
    breakSessions: StudySession[];
    onClose: () => void;
    onDelete: (timestamps: number[]) => void;
    onUpdate: (oldTimestamp: number, updatedSession: StudySession) => void;
    isMobile: boolean;
}

const SessionChartModal: React.FC<SessionChartModalProps> = ({
    group,
    courseName = '',
    workSessions,
    breakSessions,
    onClose,
    onDelete,
    onUpdate,
    isMobile
}) => {
    const {
        timelineItems,
        startHour,
        endHour,
        dayStats,
        confirmDelete,
        setConfirmDelete,
        selectedItem,
        setSelectedItem,
        editingSession,
        setEditingSession,
        handleSaveEdit,
        formatTimeForInput
    } = useSessionChart({
        group,
        workSessions,
        breakSessions,
        isMobile,
        onUpdate
    });

    return (
        <Dialog open={true} onOpenChange={(open) => {
            if (!open && !confirmDelete && !editingSession) {
                onClose();
            }
        }}>
            <DialogContent
                className="w-full max-w-full sm:max-w-5xl h-dvh sm:h-fit sm:max-h-[85vh] overflow-hidden flex flex-col bg-background border-border p-0 gap-0 shadow-2xl rounded-none sm:rounded-lg"
            >
                <div className="p-6 border-b border-border bg-card/90 flex justify-between items-center shrink-0 relative z-20">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2.5 sm:p-3.5 rounded-xl border border-primary/10 mt-1 shrink-0">
                            <ChartArea className="text-primary" size={isMobile ? 24 : 32} />
                        </div>
                        <div>
                            <DialogTitle className="font-bold text-foreground text-lg">Günlük Zaman Çizelgesi</DialogTitle>
                            <DialogDescription className="sr-only">
                                Seçilen gün için detaylı çalışma çizelgesi ve aktiviteler.
                            </DialogDescription>
                            <h3 className="sr-only">Günlük Zaman Çizelgesi</h3>
                            <p className="text-sm text-zinc-400 font-medium">{new Date(group.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <DialogClose asChild>
                        <ModalCloseButton className="-mr-2" />
                    </DialogClose>
                </div>

                {/* Day Summary */}
                <div className="px-4 sm:px-8 py-4 sm:py-5 bg-background/50 border-b border-white/5 flex items-center justify-start gap-4 sm:gap-8 shrink-0 relative z-20 overflow-x-auto no-scrollbar">
                    <div className="flex flex-col shrink-0">
                        <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">Toplam Çalışma</span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-zinc-300">{dayStats.work}dk</span>
                    </div>
                    <div className="flex flex-col shrink-0">
                        <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">Toplam Mola</span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-zinc-300">{dayStats.break}dk</span>
                    </div>
                    <div className="flex flex-col shrink-0">
                        <span className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">Duraklatma</span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-primary">{dayStats.pause}dk</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10">
                    <div className="p-4 sm:p-8 overflow-x-auto overflow-y-visible custom-scrollbar relative">
                        <div className={`relative ${isMobile ? 'min-w-[600px] h-48 pt-16' : 'min-w-[700px] h-60 pt-24'}`}>
                            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                {Array.from({ length: (endHour - startHour) * 2 + 1 }).map((_, i) => {
                                    const totalMinutes = (startHour * 60) + (i * 30);
                                    const hour = Math.floor(totalMinutes / 60);
                                    const minute = totalMinutes % 60;
                                    const leftPercent = (i / ((endHour - startHour) * 2)) * 100;
                                    return (
                                        <div
                                            key={i}
                                            className={`absolute top-0 bottom-0 border-l ${minute === 30 ? 'border-white/5' : 'border-white/10'} flex flex-col justify-end pb-0`}
                                            style={{ left: `${leftPercent}%` }}
                                        >
                                            <span className={`absolute ${isMobile ? 'top-1' : 'top-4'} -translate-x-1/2 text-[10px] text-zinc-400 font-mono font-bold whitespace-nowrap`}>
                                                {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="absolute top-0 bottom-0 left-0 right-0">
                                {timelineItems.map((item, index) => {
                                    const itemStartHour = item.start.getHours() + (item.start.getMinutes() / 60);
                                    const itemEndHour = item.end.getHours() + (item.end.getMinutes() / 60);
                                    const startPercent = ((itemStartHour - startHour) / (endHour - startHour)) * 100;
                                    const durationPercent = ((itemEndHour - itemStartHour) / (endHour - startHour)) * 100;

                                    const isWork = item.type === 'work';
                                    const isBreak = item.type === 'break';
                                    const isPause = item.type === 'pause-interval';

                                    let bgClass = 'bg-white/5';
                                    let borderClass = 'border-white/5';
                                    let shadowClass = 'shadow-none';
                                    let label = 'Boş Zaman';

                                    if (isWork) {
                                        bgClass = 'bg-indigo-500/30';
                                        borderClass = 'border-indigo-500/40';
                                        shadowClass = 'shadow-none';
                                        label = `Çalışma (${courseName}${item.segmentLabel ? ` - ${item.segmentLabel}` : ''})`;
                                    } else if (isBreak) {
                                        bgClass = 'bg-emerald-500/30';
                                        borderClass = 'border-emerald-500/40';
                                        shadowClass = 'shadow-none';
                                        label = 'Mola';
                                    } else if (isPause) {
                                        bgClass = 'bg-muted/50';
                                        borderClass = 'border-muted-foreground/30';
                                        label = 'Duraklatma';
                                    }

                                    return (
                                        <div
                                            key={index}
                                            className={`absolute ${isMobile ? 'h-9' : 'h-12'} rounded-lg border-2 ${bgClass} ${borderClass} shadow-lg ${shadowClass} transition-all duration-75 hover:scale-[1.01] hover:z-30 cursor-pointer group/block flex items-center justify-center will-change-transform ${selectedItem === index ? 'z-50 border-white/50 ring-2 ring-white/10' : ''}`}
                                            style={{
                                                left: `${startPercent}%`,
                                                width: `calc(${Math.max(durationPercent, 0.5)}% - 2px)`,
                                                top: isMobile ? '50px' : '84px'
                                            }}
                                            onMouseEnter={() => setSelectedItem(index)}
                                            onMouseLeave={() => setSelectedItem(null)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {durationPercent > 3 && (
                                                <div className="text-white/90">
                                                    {isWork && (() => {
                                                        const matchingKey = Object.keys(COURSE_ICONS).find(key => courseName.startsWith(key));
                                                        const CourseIcon = matchingKey ? COURSE_ICONS[matchingKey as keyof typeof COURSE_ICONS] : BookOpen;
                                                        return <CourseIcon size={14} />;
                                                    })()}
                                                    {isBreak && <Clock size={14} />}
                                                    {isPause && <Pause size={14} />}
                                                </div>
                                            )}

                                            <div
                                                className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 transition-all duration-100 min-w-[180px] ${selectedItem === index ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="bg-card border border-secondary text-xs p-3 rounded-xl shadow-2xl whitespace-nowrap relative">
                                                    <div className="font-bold mb-2 text-center text-foreground border-b border-white/10 pb-2 flex items-center justify-between gap-4">
                                                        <span>
                                                            {item.start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {item.end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {item.originalSession && item.type !== 'pause-interval' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => item.originalSession && setEditingSession({
                                                                        sessionId: item.sessionId!,
                                                                        type: item.type,
                                                                        startTime: formatTimeForInput(item.start),
                                                                        endTime: formatTimeForInput(item.end),
                                                                        originalSession: item.originalSession,
                                                                        pauseIndex: item.pauseIndex
                                                                    })}
                                                                    className="h-7 w-7 text-primary hover:bg-primary/20"
                                                                    title="Düzenle"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </Button>
                                                            )}
                                                            {/* Separate check for pause interval editing if supported */}
                                                            {item.type === 'pause-interval' && item.originalSession && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => item.originalSession && setEditingSession({
                                                                        sessionId: item.sessionId!,
                                                                        type: item.type,
                                                                        startTime: formatTimeForInput(item.start),
                                                                        endTime: formatTimeForInput(item.end),
                                                                        originalSession: item.originalSession,
                                                                        pauseIndex: item.pauseIndex
                                                                    })}
                                                                    className="h-7 w-7 text-primary hover:bg-primary/20"
                                                                    title="Düzenle"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </Button>
                                                            )}

                                                            {item.sessionId && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => item.sessionId && setConfirmDelete({ sessionId: item.sessionId })}
                                                                    className="h-7 w-7 text-destructive hover:bg-destructive/20"
                                                                    title="Sil"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-2 mt-1">
                                                        <div className={`w-2 h-2 rounded-full ${isWork ? 'bg-indigo-400' : (isBreak ? 'bg-emerald-400' : 'bg-muted-foreground/30')}`}></div>
                                                        <span className={`${isWork ? 'text-subcourse' : (isBreak ? 'text-emerald-400' : 'text-muted-foreground')} font-bold`}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                    <div className="text-center text-muted-foreground mt-1 font-medium">
                                                        {Math.round(item.duration / 60)}dk
                                                    </div>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-card"></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-secondary bg-background/60 flex justify-center flex-wrap gap-x-8 gap-y-3 text-[11px] font-bold text-foreground shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-indigo-500/40 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]"></div>
                        <span className="opacity-80">Çalışma Oturumu</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/40 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"></div>
                        <span className="opacity-80">Mola</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-muted/50 border border-muted-foreground/30 shadow-sm"></div>
                        <span className="opacity-80">Duraklatma</span>
                    </div>
                </div>
            </DialogContent>

            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Kaydı Sil"
                message="Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmText="Evet, Sil"
                cancelText="İptal"
                onConfirm={() => {
                    if (onDelete && confirmDelete?.sessionId) {
                        onDelete([confirmDelete.sessionId]);
                        onClose();
                    }
                    setConfirmDelete(null);
                    setSelectedItem(null);
                }}
                onCancel={() => setConfirmDelete(null)}
            />

            {/* Edit Modal */}
            <Modal
                open={!!editingSession}
                onOpenChange={(open) => !open && setEditingSession(null)}
                className="max-w-sm"
                title={
                    <div className="flex items-center gap-2">
                        <Edit2 size={20} className="text-primary" />
                        Süreyi Düzenle
                    </div>
                }
                description="Çalışma veya mola süresini düzenleyin."
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Başlangıç Saati</label>
                        <Input
                            type="time"
                            value={editingSession?.startTime || ""}
                            onChange={(e) => editingSession && setEditingSession({ ...editingSession, startTime: e.target.value })}
                            className="font-mono rounded-xl"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Bitiş Saati</label>
                        <Input
                            type="time"
                            value={editingSession?.endTime || ""}
                            onChange={(e) => editingSession && setEditingSession({ ...editingSession, endTime: e.target.value })}
                            className="font-mono rounded-xl"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditingSession(null)}
                            className="flex-1 px-4 py-2.5 rounded-xl border-secondary text-muted-foreground font-bold hover:bg-background transition-colors"
                        >
                            İptal
                        </Button>
                        {editingSession && (
                            <Button
                                onClick={() => handleSaveEdit(editingSession.startTime, editingSession.endTime)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                Kaydet
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
        </Dialog>
    );
}

export default SessionChartModal;
