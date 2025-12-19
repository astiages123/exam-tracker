
import React, { useMemo, useEffect } from 'react';
import { X, Clock, Calendar, BookOpen, Trash2 } from 'lucide-react';
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion';

export default function ReportModal({ sessions = [], onClose, courses = [], onDelete }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Helper to find course name
    const getCourseName = (courseId) => {
        if (!courseId) return 'Genel Çalışma';
        if (!Array.isArray(courses)) return 'Bilinmeyen Ders';
        const found = courses.find(c => c.id === courseId);
        return found ? found.name : 'Bilinmeyen Ders';
    };

    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const workSessions = safeSessions.filter(s => s && s.type === 'work');

    // Aggregate sessions by Date and Course
    const aggregatedSessions = useMemo(() => {
        const groups = {};

        workSessions.forEach(session => {
            // Safety check for timestamp
            if (!session.timestamp) return;

            const dateKey = new Date(session.timestamp).toLocaleDateString();
            const key = `${dateKey}_${session.courseId}`;

            if (!groups[key]) {
                groups[key] = {
                    key,
                    date: session.timestamp,
                    courseId: session.courseId,
                    totalDuration: 0,
                    sessionIds: []
                };
            }
            groups[key].totalDuration += (session.duration || 0);
            groups[key].sessionIds.push(session.timestamp);
        });

        return Object.values(groups).sort((a, b) => b.date - a.date);
    }, [workSessions]);

    const totalMinutes = workSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = Math.round(totalMinutes % 60);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-custom-bg border border-custom-category rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-custom-category flex justify-between items-center bg-custom-header rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-custom-text flex items-center gap-2">
                            <BookOpen className="text-custom-accent" />
                            Çalışma Raporu
                        </h2>
                        <p className="text-sm text-custom-title/60">Kaydedilen oturum detayları</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-custom-bg/50 rounded-lg text-custom-title/50 hover:text-white hover:bg-custom-error/20 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stats */}
                <div className="p-6 grid grid-cols-2 gap-4 border-b border-custom-category bg-custom-bg/50">
                    <div className="bg-custom-header p-4 rounded-xl border border-custom-category/30">
                        <span className="text-xs text-custom-title/50 uppercase tracking-wider font-bold">Toplam Çalışma</span>
                        <div className="text-2xl font-mono font-bold text-custom-text mt-1">
                            {totalHours}sa {remainingMins}dk
                        </div>
                    </div>
                    <div className="bg-custom-header p-4 rounded-xl border border-custom-category/30">
                        <span className="text-xs text-custom-title/50 uppercase tracking-wider font-bold">Oturum Sayısı</span>
                        <div className="text-2xl font-mono font-bold text-custom-text mt-1">
                            {workSessions.length}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {aggregatedSessions.length === 0 ? (
                        <div className="text-center py-12 text-custom-title/40">
                            <Clock size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Henüz kayıtlı bir çalışma oturumu bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {aggregatedSessions.map((group) => (
                                <div key={group.key} className="flex items-center justify-between p-4 bg-custom-header/40 rounded-xl border border-custom-category/20 hover:border-custom-category/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-full bg-custom-accent/10 text-custom-accent">
                                            <BookOpen size={16} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-custom-text text-sm">
                                                {getCourseName(group.courseId)}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-custom-title/50 mt-1">
                                                <Calendar size={12} />
                                                {new Date(group.date).toLocaleDateString('tr-TR')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className="font-mono font-bold text-custom-text">{Math.round(group.totalDuration / 60)}</span>
                                            <span className="text-xs text-custom-title/50 ml-1">dk</span>
                                        </div>

                                        <button
                                            onClick={() => onDelete && onDelete(group.sessionIds)}
                                            className="p-2 text-custom-title/30 hover:text-custom-error hover:bg-custom-error/10 rounded-lg transition-colors cursor-pointer"
                                            title="Kaydı Sil"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
