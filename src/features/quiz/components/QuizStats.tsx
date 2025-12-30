/**
 * QuizStats Component
 * 
 * Displays user statistics for a course - past performance on topics.
 */

import { TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserStatistic } from '../hooks/useQuiz';

interface QuizStatsProps {
    userStats: UserStatistic[];
    onSwitchToQuiz: () => void;
}

export default function QuizStats({ userStats, onSwitchToQuiz }: QuizStatsProps) {
    if (userStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <TrendingUp size={48} className="mb-4 opacity-20" />
                <p>Henüz bu ders için yeterli veri oluşmadı.</p>
                <Button
                    variant="link"
                    onClick={onSwitchToQuiz}
                    className="mt-4"
                >
                    Hemen Test Çöz
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {userStats.sort((a, b) => a.success_rate - b.success_rate).map((stat) => {
                const isCritical = stat.success_rate < 40;
                return (
                    <div
                        key={stat.id}
                        className="bg-card rounded-xl p-4 border border-border hover:border-border/80 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-foreground text-lg">{stat.topic}</h4>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span>Son: {new Date(stat.last_attempt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className={cn(
                                "text-xl font-bold font-mono",
                                stat.success_rate >= 70
                                    ? "text-green-500"
                                    : stat.success_rate >= 40
                                        ? "text-orange-500"
                                        : "text-destructive"
                            )}>
                                %{stat.success_rate}
                            </div>
                        </div>

                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                            <div
                                className={cn(
                                    "h-full",
                                    stat.success_rate >= 70
                                        ? "bg-green-500"
                                        : stat.success_rate >= 40
                                            ? "bg-orange-500"
                                            : "bg-destructive"
                                )}
                                style={{ width: `${stat.success_rate}%` }}
                            />
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <div className="flex gap-4">
                                <span className="text-green-500">✓ {stat.correct_count} Doğru</span>
                                <span className="text-destructive">✗ {stat.wrong_count} Yanlış</span>
                            </div>
                            {isCritical && (
                                <span className="flex items-center gap-1 text-destructive text-xs font-bold bg-destructive/10 px-2 py-1 rounded">
                                    <AlertCircle size={12} />
                                    Kritik
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
