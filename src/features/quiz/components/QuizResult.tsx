/**
 * QuizResult Component
 * 
 * Displays the quiz result screen with score, performance analysis,
 * and topic-based breakdown.
 */

import { RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { SessionTopicStats } from '../hooks/useQuiz';

interface QuizResultProps {
    score: number;
    totalQuestions: number;
    sessionStats: Record<string, SessionTopicStats>;
    onClose: () => void;
    onRetry: () => void;
}

export default function QuizResult({
    score,
    totalQuestions,
    sessionStats,
    onClose,
    onRetry
}: QuizResultProps) {
    const percentage = totalQuestions > 0 ? score / totalQuestions : 0;
    const isSuccess = score > totalQuestions / 2;

    return (
        <div className="flex flex-col items-center justify-center py-10 gap-6 text-center">
            {/* Score Circle */}
            <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r="60"
                        className="stroke-muted"
                        strokeWidth="8"
                        fill="none"
                    />
                    <circle
                        cx="64"
                        cy="64"
                        r="60"
                        className={isSuccess ? "stroke-green-500" : "stroke-orange-500"}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 60}
                        strokeDashoffset={2 * Math.PI * 60 * (1 - percentage)}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-foreground">
                        {score} / {totalQuestions}
                    </span>
                </div>
            </div>

            {/* Result Message */}
            <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                    {score === totalQuestions
                        ? "Mükemmel!"
                        : isSuccess
                            ? "Güzel İş!"
                            : "Biraz Daha Çalışmalısın"}
                </h3>
                <p className="text-gray-200 font-bold">Test tamamlandı.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-4">
                <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                    Kapat
                </Button>
                <Button onClick={onRetry} className="gap-2 w-full sm:w-auto">
                    <RefreshCw size={18} />
                    Yeni Test
                </Button>
            </div>

            {/* Topic Performance Breakdown */}
            <div className="w-full mt-8 bg-muted/50 rounded-xl p-4 text-left">
                <h4 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
                    Konu Bazlı Performansın
                </h4>
                <div className="space-y-4">
                    {Object.entries(sessionStats).map(([topic, stats]) => {
                        const total = stats.correct + stats.wrong;
                        const rate = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
                        const isCritical = rate < 40;
                        return (
                            <div key={topic} className="flex flex-col gap-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-foreground font-medium">{topic}</span>
                                    <span className={rate >= 50 ? "text-green-500" : "text-orange-500"}>
                                        %{rate} Başarı
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${rate >= 50 ? "bg-green-500" : "bg-orange-500"}`}
                                        style={{ width: `${rate}%` }}
                                    />
                                </div>
                                {isCritical && (
                                    <span className="text-xs text-destructive font-bold flex items-center gap-1">
                                        ⚠️ Kritik Seviye - Tekrar Et
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {Object.keys(sessionStats).length === 0 && (
                        <p className="text-muted-foreground text-sm">Henüz veri yok.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
