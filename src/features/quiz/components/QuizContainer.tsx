import React, { useState } from 'react';
import { useQuiz } from '@/hooks/useQuiz';
import QuizModal from './QuizModal';
import { Database, RefreshCcw, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLessonStockpileStatus } from '@/features/quiz/hooks/useStockpileStatus';
import { getFillStatusColor, getFillStatusLabel } from '@/features/quiz/services/stockpileStatusService';

interface QuizContainerProps {
    courseId: string;
    courseName: string;
    lessonType: string;
    onClose: () => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({
    courseId,
    courseName,
    lessonType,
    onClose
}) => {
    // Selection Mode State
    const [hasStarted, setHasStarted] = useState(false);

    // Real-time stockpile status from database
    const { status: stockpileStatus, loading: isLoadingStats } = useLessonStockpileStatus(lessonType);

    const {
        questions,
        isLoading,
        isGenerating,
        generationProgress,
        error,
        generateQuestions,
        loadExistingQuestions,
        submitAnswer,
        completeQuiz,
        startNextSession,
        hasNextSession
    } = useQuiz(courseId, lessonType); // We don't auto-start anymore

    // Stats are now fetched via useLessonStockpileStatus hook

    // Handle Start Handlers
    const handleStartExisting = () => {
        setHasStarted(true);
        loadExistingQuestions();
    };

    const handleStartGeneration = () => {
        setHasStarted(true);
        generateQuestions();
    };

    // 1. Loading State (Global)
    if (isLoading || isGenerating || (isLoadingStats && !hasStarted)) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-2xl border border-gray-800">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin"></div>
                    </div>

                    <div className="text-center">
                        <h3 className="text-white font-medium mb-1">
                            {isGenerating ? 'Sorular Hazırlanıyor' : (isLoadingStats ? 'İstatistikler Yükleniyor' : 'Quiz Başlatılıyor')}
                        </h3>
                        <p className="text-sm text-gray-400">
                            {isGenerating
                                ? 'Yapay zeka soruları senin için oluşturuyor...'
                                : (isLoadingStats ? 'Veriler güncelleniyor...' : 'Soru bankasından sorular getiriliyor...')}
                        </p>
                    </div>

                    {isGenerating && generationProgress.total > 0 && (
                        <div className="w-full max-w-[200px] space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>İlerleme</span>
                                <span>{Math.round((generationProgress.current / generationProgress.total) * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-center text-gray-600">
                                {generationProgress.current} / {generationProgress.total} soru üretildi
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Error State
    if (error) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-2xl border border-red-500/30 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Quiz Başlatılamadı</h3>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors font-medium border border-gray-700"
                    >
                        Kapat
                    </button>
                    <button
                        onClick={() => {
                            // If it was a generation error, maybe offer to try existing questions?
                            // For now just close or maybe reset. Here we just close.
                        }}
                        className="mt-2 text-sm text-gray-500 hover:text-gray-400"
                    >

                    </button>
                </div>
            </div>
        );
    }

    // 3. Selection View (Default before starting)
    if (!hasStarted) {
        const target = stockpileStatus?.target_count || 100;
        const current = stockpileStatus?.current_count || 0;
        const verified = stockpileStatus?.verified_count || 0;
        const progress = stockpileStatus?.fill_percentage || 0;
        const statusColor = getFillStatusColor(progress);
        const statusLabel = getFillStatusLabel(progress);

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-md overflow-hidden shadow-2xl relative">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">{lessonType}</h2>
                            <p className="text-xs text-white/50 mt-1">Quiz Seçenekleri</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Stockpile Stats - Real-time from Database */}
                        <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-white/5">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/90 flex items-center gap-2">
                                    <Database size={14} style={{ color: statusColor }} />
                                    Soru Bankası
                                </span>
                                <span className="font-mono font-bold" style={{ color: statusColor }}>
                                    {current} <span className="text-white/70 font-normal">/</span> {target}
                                </span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all duration-1000"
                                    style={{
                                        width: `${Math.min(progress, 100)}%`,
                                        background: `linear-gradient(to right, ${statusColor}, ${statusColor}dd)`
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/70 font-medium flex items-center gap-1">
                                    {progress >= 100 ? (
                                        <><CheckCircle2 size={10} className="text-emerald-500" /> {statusLabel}</>
                                    ) : progress < 25 ? (
                                        <><AlertCircle size={10} className="text-red-500" /> {statusLabel}</>
                                    ) : (
                                        statusLabel
                                    )}
                                </span>
                                <span style={{ color: statusColor }} className="font-medium">
                                    %{progress.toFixed(1)} • {verified} doğrulanmış
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleStartExisting}
                                disabled={current === 0}
                                className="w-full p-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium flex items-center justify-center gap-3 group"
                            >
                                <Play size={20} className={current > 0 ? "fill-white" : ""} />
                                <div className="text-left">
                                    <div className="leading-none mb-1">Mevcut Sorularla Başla</div>
                                    <div className="text-[11px] opacity-90 font-normal">Soru bankasından rastgele quiz</div>
                                </div>
                            </button>

                            <button
                                onClick={handleStartGeneration}
                                className="w-full p-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-medium flex items-center justify-center gap-3 border border-white/10 hover:border-white/20 group"
                            >
                                <RefreshCcw size={20} className="text-purple-400 group-hover:rotate-12 transition-transform" />
                                <div className="text-left">
                                    <div className="leading-none mb-1">Yeni Soru Üret</div>
                                    <div className="text-[11px] opacity-90 font-normal">Yapay zeka ile yeni sorular oluştur</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 4. Active Quiz View
    return (
        <QuizModal
            isOpen={true}
            onClose={onClose}
            questions={questions}
            onQuizComplete={completeQuiz}
            onAnswerSubmit={submitAnswer}
            hasNextSession={hasNextSession}
            onNextSession={startNextSession}
            title={`${courseName} - ${lessonType}`}
        />
    );
};

export default QuizContainer;
