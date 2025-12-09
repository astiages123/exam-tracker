import React, { useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SCHEDULE = [
    { day: 'PAZARTESİ', time: '12:00 - 17:00', focus: 'EKONOMİ' },
    { day: 'SALI', time: '12:00 - 17:00', focus: 'HUKUK' },
    { day: 'ÇARŞAMBA', time: '12:00 - 17:00', focus: 'MUHASEBE - MALİYE' },
    { day: 'PERŞEMBE', time: '12:00 - 17:00', focus: 'EKONOMİ' },
    { day: 'CUMA', time: '12:00 - 17:00', focus: 'HUKUK' },
    { day: 'CUMARTESİ', time: '12:00 - 17:00', focus: 'YETENEK - BANKA' },
    { day: 'PAZAR', time: '-', focus: 'TATİL / YETENEK-BANKA (Cumartesi durumuna göre)' },
];

export default function ScheduleModal({ onClose }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-custom-bg border border-custom-category rounded-2xl w-full max-w-lg flex flex-col shadow-2xl cursor-default overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-custom-category flex justify-between items-center bg-custom-header">
                    <div>
                        <h2 className="text-xl font-bold text-custom-text flex items-center gap-2">
                            <Calendar className="text-custom-accent" />
                            Ders Çalışma Programı
                        </h2>
                        <p className="text-sm text-custom-title/60">Haftalık çalışma planınız</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-custom-bg/50 rounded-lg text-custom-title/50 hover:text-white hover:bg-custom-error/20 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Table */}
                <div className="p-6">
                    <div className="overflow-hidden rounded-xl border border-custom-category/30">
                        <table className="w-full text-left text-sm text-custom-title/80">
                            <thead className="bg-custom-header/50 text-xs uppercase text-custom-title/50 font-bold">
                                <tr>
                                    <th className="px-4 py-3">GÜN</th>
                                    <th className="px-4 py-3">SAAT</th>
                                    <th className="px-4 py-3">DERS GRUBU</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-custom-category/20 bg-custom-bg/30">
                                {SCHEDULE.map((item, index) => (
                                    <tr key={index} className="hover:bg-custom-category/10 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-custom-text">{item.day}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{item.time}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${item.focus === 'TATİL'
                                                ? 'bg-custom-success/20 text-custom-success'
                                                : 'bg-custom-accent/10 text-custom-accent'
                                                }`}>
                                                {item.focus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
