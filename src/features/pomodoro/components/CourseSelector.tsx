import { ChevronDown, Check, Timer, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import { COURSE_ICONS } from '@/constants/styles';
import type { Course } from '@/types';

interface CourseSelectorProps {
    courses: Course[];
    selectedCourseId: string;
    isDropdownOpen: boolean;
    onCourseSelect: (courseId: string) => void;
    onDropdownToggle: (open: boolean) => void;
    onStartSession: () => void;
    onClose: () => void;
}

export default function CourseSelector({
    courses,
    selectedCourseId,
    isDropdownOpen,
    onCourseSelect,
    onDropdownToggle,
    onStartSession,
    onClose
}: CourseSelectorProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-100 cursor-pointer"
            onClick={onClose}
        >
            <div
                className="bg-card border border-secondary rounded-2xl shadow-2xl w-full max-w-md p-8 relative cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative flex items-center justify-start gap-3 mb-6">
                    <div className="bg-primary/10 p-2 rounded-xl border border-primary/10 shrink-0">
                        <Timer className="text-primary" size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Çalışmaya Başla</h3>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <ModalCloseButton onClick={onClose} />
                    </div>
                </div>

                <div className="flex flex-col gap-3 relative">
                    <label className="text-sm text-muted-foreground font-bold ml-1">
                        Hangi derse çalışacaksın?
                    </label>

                    {/* Custom Dropdown Trigger */}
                    <div
                        onClick={() => onDropdownToggle(!isDropdownOpen)}
                        className={`w-full p-4 bg-background border ${isDropdownOpen ? 'border-primary ring-1 ring-primary/20' : 'border-secondary'} rounded-xl text-foreground text-base flex justify-between items-center cursor-pointer transition-all hover:bg-card`}
                    >
                        <span className={selectedCourseId ? "text-foreground" : "text-muted-foreground"}>
                            {selectedCourseId ? courses.find(c => c.id === selectedCourseId)?.name : "Ders Seçiniz"}
                        </span>
                        <ChevronDown
                            size={20}
                            className={`text-muted-foreground transition-transform duration-100 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`}
                        />
                    </div>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {isDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="absolute top-[85px] left-0 right-0 max-h-64 overflow-y-auto custom-scrollbar bg-card border border-secondary rounded-xl shadow-2xl z-20 flex flex-col p-1"
                            >
                                {courses.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => {
                                            onCourseSelect(course.id);
                                            onDropdownToggle(false);
                                        }}
                                        className={`p-3 text-left rounded-lg text-sm font-medium transition-colors flex items-center gap-3 group ${selectedCourseId === course.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-background hover:text-foreground'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {(() => {
                                                const matchingKey = Object.keys(COURSE_ICONS).find(key => course.name.startsWith(key));
                                                const CourseIcon = matchingKey ? COURSE_ICONS[matchingKey as keyof typeof COURSE_ICONS] : BookOpen;
                                                return <CourseIcon size={16} className={selectedCourseId === course.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} />;
                                            })()}
                                            <span className="truncate text-subcourse">{course.name}</span>
                                        </div>
                                        {selectedCourseId === course.id && (
                                            <Check size={18} className="text-primary shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-background/50 text-muted-foreground hover:text-foreground rounded-xl font-medium border border-secondary/30 hover:bg-secondary/20 transition-all cursor-pointer text-sm"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onStartSession}
                        disabled={!selectedCourseId}
                        className="flex-2 py-3 bg-[#059669] text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg cursor-pointer"
                    >
                        Başlat
                    </button>
                </div>
            </div>
        </div>
    );
}
