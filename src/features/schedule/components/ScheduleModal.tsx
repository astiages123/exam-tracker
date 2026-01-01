import { useEffect, useState } from 'react';
import { Plus, Save, Edit2, Clock, Trash2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAYS, SUBJECT_STYLES, SUBJECT_OPTIONS } from '@/constants/styles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeeklySchedule, ScheduleItem } from '@/types';

interface ScheduleModalProps {
    onClose: () => void;
    schedule: WeeklySchedule;
    setSchedule: (schedule: WeeklySchedule) => void;
}

interface NewItemsState {
    [key: string]: {
        time: string;
        subject: string;
    };
}

export default function ScheduleModal({ onClose, schedule, setSchedule }: ScheduleModalProps) {
    // Local state for editing before saving
    const [localSchedule, setLocalSchedule] = useState<WeeklySchedule>({});

    // Mode state
    const [isEditing, setIsEditing] = useState(false);

    // Temp state for new entries, KEYED BY DAY
    const [newItems, setNewItems] = useState<NewItemsState>({});


    // Initialize local state when modal opens
    useEffect(() => {
        if (schedule) {
            setLocalSchedule(JSON.parse(JSON.stringify(schedule)));
            setIsEditing(false); // Start in view mode
            setNewItems({}); // Reset inputs
        }
    }, [schedule]);

    const handleNewItemChange = (day: string, field: 'time' | 'subject', value: string) => {
        setNewItems(prev => ({
            ...prev,
            [day]: {
                ...(prev[day] || { time: '', subject: 'EKONOMİ' }),
                [field]: value
            }
        }));
    };

    const handleAddItem = (day: string) => {
        const item = newItems[day] || { time: '', subject: 'EKONOMİ' };
        if (!item.time || !item.subject) return;

        setLocalSchedule(prev => {
            const daySchedule = prev[day] || [];
            return {
                ...prev,
                [day]: [...daySchedule, { ...item } as ScheduleItem]
            };
        });

        // Reset only this day's input, keeping default subject
        setNewItems(prev => ({
            ...prev,
            [day]: { time: '', subject: 'EKONOMİ' }
        }));
    };

    const handleDeleteItem = (day: string, index: number) => {
        setLocalSchedule(prev => {
            const daySchedule = prev[day] || [];
            const newDaySchedule = daySchedule.filter((_, i) => i !== index);
            return {
                ...prev,
                [day]: newDaySchedule
            };
        });
    };

    const handleSave = () => {
        setSchedule(localSchedule);
        setIsEditing(false); // Switch back to view mode
        onClose();
    };

    const handleCancelEdit = () => {
        // Revert changes
        setLocalSchedule(JSON.parse(JSON.stringify(schedule || {})));
        setIsEditing(false);
        setNewItems({});
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={cn(
                    "flex flex-col p-0 gap-0 bg-card border-border overflow-hidden transition-all duration-300 focus-visible:outline-none",
                    "w-full max-w-full sm:max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-lg"
                )}
            >
                <div className="p-4 sm:p-6 border-b border-border bg-card/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3.5 rounded-xl border border-primary/10 mt-1">
                            <CalendarDays className="text-primary" size={32} />
                        </div>
                        <div>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-foreground">
                                    {isEditing ? "Programı Düzenle" : "Haftalık Çalışma Programı"}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                                    {isEditing ? "Değişiklikleri kaydetmeyi unutmayın" : "Ders programınızın genel bakışı"}
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">

                        <DialogClose asChild>
                            <ModalCloseButton className="-mr-2" />
                        </DialogClose>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-background/50 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DAYS.map((day) => {
                            const dayItems = localSchedule[day] || [];
                            const currentNewItem = newItems[day] || { time: '', subject: 'EKONOMİ' };

                            return (
                                <div key={day} className="flex flex-col bg-card border border-border rounded-xl overfloy-hidden hover:border-primary/20 transition-colors h-full shadow-sm">
                                    {/* Day Header */}
                                    <div className="p-3 bg-muted/30 border-b border-border flex justify-between items-center rounded-t-xl">
                                        <span className="font-bold text-foreground text-sm tracking-wide">
                                            {day}
                                        </span>
                                        {dayItems.length > 0 && (
                                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                {dayItems.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Items List */}
                                    <div className="p-2 flex-1 space-y-2 min-h-[120px]">
                                        {dayItems.length === 0 && !isEditing ? (
                                            <div className="h-full flex items-center justify-center text-muted-foreground font-bold text-xs italic">
                                                Boş Gün
                                            </div>
                                        ) : (
                                            dayItems.map((item, idx) => {
                                                const styles = SUBJECT_STYLES[item.subject as keyof typeof SUBJECT_STYLES] || SUBJECT_STYLES['DEFAULT'];
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "relative flex items-center gap-3 p-2.5 rounded-lg border transition-all group",
                                                            styles.bg,
                                                            styles.border
                                                        )}
                                                    >
                                                        <div className={cn("text-xs font-mono font-bold px-1.5 py-0.5 rounded", styles.badge, styles.text)}>
                                                            {item.time}
                                                        </div>
                                                        <span className={cn("text-xs font-semibold break-words flex-1", styles.text)}>
                                                            {item.subject}
                                                        </span>

                                                        {isEditing && (
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                onClick={() => handleDeleteItem(day, idx)}
                                                                className="absolute -right-1 -top-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                                                title="Sil"
                                                            >
                                                                <Trash2 size={10} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Add Input */}
                                    {isEditing && (
                                        <div className="p-2 border-t border-border bg-muted/10 rounded-b-xl">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Clock size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                        <Input
                                                            type="text"
                                                            placeholder="09:00"
                                                            value={currentNewItem.time}
                                                            onChange={(e) => handleNewItemChange(day, 'time', e.target.value)}
                                                            className="h-8 pl-6 text-xs bg-background border-input"
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={() => handleAddItem(day)}
                                                        disabled={!currentNewItem.time || !currentNewItem.subject}
                                                        size="icon"
                                                        className="h-8 w-8"
                                                    >
                                                        <Plus size={14} />
                                                    </Button>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        value={currentNewItem.subject}
                                                        onChange={(e) => handleNewItemChange(day, 'subject', e.target.value)}
                                                        className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-[10px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer hover:bg-accent transition-colors h-8"
                                                    >
                                                        {SUBJECT_OPTIONS.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                    {/*  ChevronDown for select */}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-border bg-card flex justify-end gap-3 sticky bottom-0 z-10">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" onClick={handleCancelEdit}>
                                Vazgeç
                            </Button>
                            <Button onClick={handleSave} className="gap-2">
                                <Save size={18} />
                                Kaydet
                            </Button>
                        </>
                    ) : (
                        <Button variant="secondary" onClick={() => setIsEditing(true)} className="gap-2">
                            <Edit2 size={16} />
                            Düzenle
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
