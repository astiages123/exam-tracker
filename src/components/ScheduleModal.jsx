
import React, { useEffect, useState } from 'react';
import { X, Calendar, Plus, Trash2, ChevronDown, Save, Edit2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const DAYS = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];

const SUBJECT_STYLES = {
    'EKONOMİ': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', badge: 'bg-blue-500/20' },
    'HUKUK': { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', badge: 'bg-rose-500/20' },
    'MUHASEBE - MALİYE': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', badge: 'bg-emerald-500/20' },
    'YETENEK - BANKA': { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/20', badge: 'bg-violet-500/20' },
    'DEFAULT': { bg: 'bg-custom-header', text: 'text-custom-text', border: 'border-custom-category/20', badge: 'bg-custom-category/20' }
};

const SUBJECT_OPTIONS = [
    "EKONOMİ",
    "HUKUK",
    "MUHASEBE - MALİYE",
    "YETENEK - BANKA"
];

export default function ScheduleModal({ onClose, schedule = {}, setSchedule }) {
    // Local state for editing before saving
    const [localSchedule, setLocalSchedule] = useState({});

    // Mode state
    const [isEditing, setIsEditing] = useState(false);

    // Temp state for new entries, KEYED BY DAY to avoid mirroring
    const [newItems, setNewItems] = useState({});

    // Initialize local state when modal opens
    useEffect(() => {
        if (schedule) {
            setLocalSchedule(JSON.parse(JSON.stringify(schedule)));
            setIsEditing(false); // Start in view mode
            setNewItems({}); // Reset inputs
        }
    }, [schedule]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleNewItemChange = (day, field, value) => {
        setNewItems(prev => ({
            ...prev,
            [day]: {
                ...(prev[day] || { time: '', subject: 'EKONOMİ' }),
                [field]: value
            }
        }));
    };

    const handleAddItem = (day) => {
        const item = newItems[day] || { time: '', subject: 'EKONOMİ' };
        if (!item.time || !item.subject) return;

        setLocalSchedule(prev => {
            const daySchedule = prev[day] || [];
            return {
                ...prev,
                [day]: [...daySchedule, { ...item }]
            };
        });

        // Reset only this day's input, keeping default subject
        setNewItems(prev => ({
            ...prev,
            [day]: { time: '', subject: 'EKONOMİ' }
        }));
    };

    const handleDeleteItem = (day, index) => {
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
        setLocalSchedule(JSON.parse(JSON.stringify(schedule)));
        setIsEditing(false);
        setNewItems({});
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-pointer"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-[#0F1115] border border-white/5 rounded-3xl w-full max-w-5xl flex flex-col shadow-2xl shadow-black/50 cursor-default overflow-hidden max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#13161C] sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-custom-accent/10 p-3 rounded-xl">
                            <Calendar className="text-custom-accent" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                {isEditing ? "Programı Düzenle" : "Haftalık Çalışma Programı"}
                            </h2>
                            <p className="text-sm text-gray-400">
                                {isEditing ? "Değişiklikleri kaydetmeyi unutmayın" : "Ders programınızın genel bakışı"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Grid Layout */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0F1115]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {DAYS.map((day) => {
                            const dayItems = localSchedule[day] || [];
                            const currentNewItem = newItems[day] || { time: '', subject: 'EKONOMİ' };

                            return (
                                <div key={day} className="flex flex-col bg-[#13161C] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors h-full">
                                    {/* Day Header */}
                                    <div className="p-3 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
                                        <span className="font-bold text-gray-200 text-sm tracking-wide">
                                            {day}
                                        </span>
                                        {dayItems.length > 0 && (
                                            <span className="text-[10px] font-bold bg-custom-accent/10 text-custom-accent px-2 py-0.5 rounded-full">
                                                {dayItems.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Items List */}
                                    <div className="p-2 flex-1 space-y-2 min-h-[120px]">
                                        {dayItems.length === 0 && !isEditing ? (
                                            <div className="h-full flex items-center justify-center text-gray-600 text-xs italic">
                                                Boş Gün
                                            </div>
                                        ) : (
                                            dayItems.map((item, idx) => {
                                                const styles = SUBJECT_STYLES[item.subject] || SUBJECT_STYLES['DEFAULT'];
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "relative flex items-center gap-3 p-2.5 rounded-xl border transition-all group",
                                                            styles.bg,
                                                            styles.border
                                                        )}
                                                    >
                                                        <div className={cn("text-xs font-mono font-bold px-1.5 py-0.5 rounded-md", styles.badge, styles.text)}>
                                                            {item.time}
                                                        </div>
                                                        <span className={cn("text-xs font-semibold truncate flex-1", styles.text)}>
                                                            {item.subject}
                                                        </span>

                                                        {isEditing && (
                                                            <button
                                                                onClick={() => handleDeleteItem(day, idx)}
                                                                className="absolute -right-1 -top-1 bg-red-500/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                                                                title="Sil"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Add Input - Fixed at bottom of card */}
                                    {isEditing && (
                                        <div className="p-2 border-t border-white/5 bg-white/[0.02]">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Clock size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                                                        <input
                                                            type="text"
                                                            placeholder="09:00"
                                                            value={currentNewItem.time}
                                                            onChange={(e) => handleNewItemChange(day, 'time', e.target.value)}
                                                            className="w-full bg-[#0F1115] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-custom-accent/50 focus:bg-[#13161C] transition-all"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddItem(day)}
                                                        disabled={!currentNewItem.time || !currentNewItem.subject}
                                                        className="bg-custom-accent hover:bg-custom-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white p-1.5 rounded-lg transition-colors shadow-lg shadow-custom-accent/20"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        value={currentNewItem.subject}
                                                        onChange={(e) => handleNewItemChange(day, 'subject', e.target.value)}
                                                        className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-medium text-gray-300 focus:outline-none focus:border-custom-accent/50 appearance-none cursor-pointer hover:bg-[#13161C] transition-colors"
                                                    >
                                                        {SUBJECT_OPTIONS.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/5 bg-[#13161C] flex justify-end gap-3 sticky bottom-0 z-10">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleCancelEdit}
                                className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2.5 bg-custom-accent hover:bg-custom-accent/90 text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-custom-accent/20 text-sm font-bold"
                            >
                                <Save size={18} />
                                Kaydet
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20 text-sm font-bold"
                        >
                            <Edit2 size={16} />
                            Düzenle
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
