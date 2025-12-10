import React, { useEffect, useState } from 'react';
import { X, Calendar, Plus, Trash2, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];

export default function ScheduleModal({ onClose, schedule = {}, setSchedule }) {
    // Local state for editing before saving (optional, but good for UX. For simplicity, we can edit directly or use a local copy)
    // Using direct updates for simplicity as per requirement.

    const [openDay, setOpenDay] = useState(null); // Which day accordion is open
    const [newItem, setNewItem] = useState({ time: '', subject: '' }); // Temp state for new entry

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const toggleDay = (day) => {
        setOpenDay(openDay === day ? null : day);
        setNewItem({ time: '', subject: '' }); // Reset input when changing days
    };

    const handleAddItem = (day) => {
        if (!newItem.time || !newItem.subject) return;

        setSchedule(prev => {
            const daySchedule = prev[day] || [];
            return {
                ...prev,
                [day]: [...daySchedule, { ...newItem }]
            };
        });
        setNewItem({ time: '', subject: '' });
    };

    const handleDeleteItem = (day, index) => {
        setSchedule(prev => {
            const daySchedule = prev[day] || [];
            const newDaySchedule = daySchedule.filter((_, i) => i !== index);
            return {
                ...prev,
                [day]: newDaySchedule
            };
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-custom-bg border border-custom-category rounded-2xl w-full max-w-xl flex flex-col shadow-2xl cursor-default overflow-hidden max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-custom-category flex justify-between items-center bg-custom-header sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-custom-text flex items-center gap-2">
                            <Calendar className="text-custom-accent" />
                            Ders Çalışma Programı
                        </h2>
                        <p className="text-sm text-custom-title/60">Programınızı düzenleyin</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-custom-bg/50 rounded-lg text-custom-title/50 hover:text-white hover:bg-custom-error/20 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable List of Days */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-3">
                        {DAYS.map((day) => {
                            const dayItems = schedule[day] || [];
                            const isOpen = openDay === day;

                            return (
                                <div key={day} className="border border-custom-category/30 rounded-xl overflow-hidden bg-custom-header/30">
                                    <button
                                        onClick={() => toggleDay(day)}
                                        className="w-full flex justify-between items-center p-4 hover:bg-custom-header/50 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`font-bold ${dayItems.length > 0 ? 'text-custom-text' : 'text-custom-title/50'}`}>
                                                {day}
                                            </span>
                                            {dayItems.length > 0 && (
                                                <span className="text-xs bg-custom-accent/10 text-custom-accent px-2 py-0.5 rounded-md font-medium">
                                                    {dayItems.length} Ders
                                                </span>
                                            )}
                                        </div>
                                        {isOpen ? <ChevronUp size={18} className="text-custom-title/50" /> : <ChevronDown size={18} className="text-custom-title/50" />}
                                    </button>

                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-custom-category/20 bg-custom-bg/20"
                                            >
                                                <div className="p-4 space-y-3">
                                                    {/* Existing Items */}
                                                    {dayItems.length === 0 ? (
                                                        <p className="text-sm text-custom-title/40 italic text-center py-2">Henüz ders eklenmemiş</p>
                                                    ) : (
                                                        dayItems.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-custom-bg p-3 rounded-lg border border-custom-category/20">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-mono text-custom-accent">{item.time}</span>
                                                                    <span className="font-medium text-custom-title">{item.subject}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteItem(day, idx)}
                                                                    className="p-1.5 text-custom-title/40 hover:text-custom-error hover:bg-custom-error/10 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}

                                                    {/* Add New Item Inputs */}
                                                    <div className="flex gap-2 pt-2 mt-2 border-t border-custom-category/20">
                                                        <input
                                                            type="text"
                                                            placeholder="Saat (örn: 09:00 - 12:00)"
                                                            value={newItem.time}
                                                            onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                                                            className="flex-1 bg-custom-bg border border-custom-category/30 rounded-lg px-3 py-2 text-sm text-custom-text placeholder-custom-title/30 focus:outline-none focus:border-custom-accent/50"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Ders (örn: Matematik)"
                                                            value={newItem.subject}
                                                            onChange={(e) => setNewItem({ ...newItem, subject: e.target.value })}
                                                            className="flex-1 bg-custom-bg border border-custom-category/30 rounded-lg px-3 py-2 text-sm text-custom-text placeholder-custom-title/30 focus:outline-none focus:border-custom-accent/50"
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem(day)}
                                                        />
                                                        <button
                                                            onClick={() => handleAddItem(day)}
                                                            disabled={!newItem.time || !newItem.subject}
                                                            className="bg-custom-accent hover:bg-custom-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                                                        >
                                                            <Plus size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="p-4 bg-custom-header border-t border-custom-category text-center">
                    <p className="text-xs text-custom-title/40">Değişiklikler otomatik olarak kaydedilir.</p>
                </div>
            </motion.div>
        </div>
    );
}
