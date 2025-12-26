import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, XCircle, ChevronRight, RefreshCw, AlertCircle, HelpCircle, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generateQuestions, fetchNoteContent } from '../lib/ai';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function QuizModal({ isOpen, onClose, courseId, courseName, notePath }) {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false); // Background generation state
    const [activeTab, setActiveTab] = useState('quiz'); // 'quiz' | 'stats'

    // State to track answers: { [questionIndex]: selectedOptionIndex }
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false); // Validates current question
    const [userStats, setUserStats] = useState([]); // User's past performance stats
    const [sessionStats, setSessionStats] = useState({}); // Tracking current session stats: { topicName: { correct: 0, wrong: 0 } }

    const shuffleArray = React.useCallback((array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }, []);

    const fetchUserStats = React.useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_statistics')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', courseId);

        if (error) {
            console.error("Error fetching stats:", error);
            return [];
        }
        return data || [];
    }, [courseId]);

    const fetchSmartQuestions = React.useCallback(async (weakTopicsList) => {
        setError(null);
        try {
            let selectedQuestions = [];

            if (weakTopicsList.length > 0) {
                const { data: weakData, error: weakError } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('course_id', courseId)
                    .in('topic', weakTopicsList)
                    .limit(30);

                if (!weakError && weakData) {
                    const shuffledWeak = shuffleArray(weakData).slice(0, 6);
                    selectedQuestions = [...shuffledWeak];
                }
            }

            const { data: allData, error: allError } = await supabase
                .from('questions')
                .select('*')
                .eq('course_id', courseId)
                .limit(50);

            if (allError) throw allError;

            if (!allData || allData.length === 0) {
                setError("Soru havuzu boş. 'Soru Üret' butonuna basarak yapay zekaya soru hazırlatabilirsiniz.");
                return;
            }

            const existingIds = new Set(selectedQuestions.map(q => q.id));
            const availableGeneral = allData.filter(q => !existingIds.has(q.id));
            const neededCount = 20 - selectedQuestions.length;

            const shuffledGeneral = shuffleArray(availableGeneral).slice(0, neededCount);
            selectedQuestions = [...selectedQuestions, ...shuffledGeneral];

            setQuestions(shuffleArray(selectedQuestions));

        } catch (err) {
            console.error(err);
            setError("Sorular yüklenirken bir hata oluştu: " + err.message);
        }
    }, [courseId, shuffleArray]);

    const initializeQuiz = React.useCallback(async () => {
        setLoading(true);
        try {
            const stats = await fetchUserStats();
            // Determine weak topics (success rate < 50% or simply bottom 3)
            // Sort by success_rate ascending
            const weak = stats
                .sort((a, b) => a.success_rate - b.success_rate)
                .slice(0, 3)
                .map(s => s.topic);


            setUserStats(stats);

            await fetchSmartQuestions(weak);
        } catch (err) {
            console.error("Quiz Initialization Error", err);
            setError("Quiz başlatılırken hata oluştu: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchUserStats, fetchSmartQuestions]);

    useEffect(() => {
        if (isOpen && courseId) {
            initializeQuiz();
        } else {
            // Reset state when closed
            setQuestions([]);
            setCurrentIndex(0);
            setScore(0);
            setShowResult(false);
            setAnswers({});
            setIsSubmitted(false);
            setSessionStats({});
        }
    }, [isOpen, courseId, initializeQuiz]);

    const handleOptionSelect = (optionIndex) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));
    };

    const handleSubmitAnswer = () => {
        if (answers[currentIndex] === undefined) return;

        const currentQuestion = questions[currentIndex];
        const isCorrect = answers[currentIndex] === currentQuestion.correct_option_index;

        // Update Session Stats
        const topic = currentQuestion.topic || "Genel";
        setSessionStats(prev => {
            const currentTopicStats = prev[topic] || { correct: 0, wrong: 0 };
            return {
                ...prev,
                [topic]: {
                    correct: currentTopicStats.correct + (isCorrect ? 1 : 0),
                    wrong: currentTopicStats.wrong + (isCorrect ? 0 : 1)
                }
            };
        });

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        setIsSubmitted(true);
    };

    const saveResultsToDb = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Iterate over sessionStats and upsert
        // Since we don't have a single bulk update for stats that increments, we iterate
        // A better backend approach would be an RPC function `increment_stats`

        // For this V1, we will fetch current stats for these topics and update manually or use UPSERT if we had absolute values
        // To be safe + simple: We already fetched 'userStats' at start. 
        // But stats might have changed if multiple tabs or outdated.
        // Let's rely on calculating new totals.

        const updates = Object.entries(sessionStats).map(async ([topic, stats]) => {
            // Find existing stat to get base numbers
            const { data: existingData } = await supabase
                .from('user_statistics')
                .select('*')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .eq('topic', topic)
                .single();

            const currentCorrect = existingData ? existingData.correct_count : 0;
            const currentWrong = existingData ? existingData.wrong_count : 0;

            const newCorrect = currentCorrect + stats.correct;
            const newWrong = currentWrong + stats.wrong;

            return supabase
                .from('user_statistics')
                .upsert({
                    user_id: user.id,
                    course_id: courseId,
                    topic: topic,
                    correct_count: newCorrect,
                    wrong_count: newWrong,
                    last_attempt: new Date().toISOString()
                }, { onConflict: 'user_id,course_id,topic' });
        });

        await Promise.all(updates);
    };

    const triggerAutoGenerate = async () => {
        if (isAutoGenerating || !notePath) return;
        setIsAutoGenerating(true);
        console.log("Auto-generating 50 more questions in background...");
        try {
            const rawText = await fetchNoteContent(notePath);
            if (!rawText || rawText.length < 100) return;

            const weak = userStats
                .sort((a, b) => a.success_rate - b.success_rate)
                .slice(0, 3)
                .map(s => s.topic);

            const newQuestions = await generateQuestions(courseId, courseName, rawText, questions.length, weak);

            if (newQuestions && newQuestions.length > 0) {
                setQuestions(prev => [...prev, ...newQuestions]);
                console.log(`Successfully added ${newQuestions.length} auto-generated questions.`);
            }
        } catch (err) {
            console.error("Auto generation background error:", err);
        } finally {
            setIsAutoGenerating(false);
        }
    };

    const handleNextQuestion = () => {
        // Auto-generate if 10 questions left
        const remaining = questions.length - (currentIndex + 1);
        if (remaining <= 10 && !isAutoGenerating) {
            triggerAutoGenerate();
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsSubmitted(false);
        } else {
            setShowResult(true);
            saveResultsToDb();
        }
    };

    const handleRetry = () => {
        setScore(0);
        setCurrentIndex(0);
        setShowResult(false);
        setAnswers({});
        setIsSubmitted(false);

        initializeQuiz();
    };

    const handleGenerateMock = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            if (!notePath) {
                throw new Error("Not dosyası yolu bulunamadı.");
            }

            const rawText = await fetchNoteContent(notePath);
            if (!rawText || rawText.length < 100) {
                throw new Error("Ders notu içeriği okunamadı veya çok kısa.");
            }

            await generateQuestions(courseId, courseName, rawText, questions.length);

            // Refresh
            initializeQuiz();

        } catch (err) {
            console.error(err);
            setError("Üretim Hatası: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-full max-w-full sm:max-w-5xl h-[100dvh] sm:h-[92vh] flex flex-col p-0 gap-0 border-border bg-card overflow-hidden rounded-none sm:rounded-lg focus-visible:outline-none">
                <div className="flex flex-col border-b border-border bg-card/50">
                    <div className="flex items-center justify-between p-4 sm:p-6 pb-2">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-xl border border-primary/10 mt-1">
                                <HelpCircle className="text-primary" size={32} />
                            </div>
                            <div className="flex flex-col">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold text-foreground">
                                        Soru Bankası
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Soru bankası ve başarı analizi.
                                    </DialogDescription>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                                    {courseName}
                                    {isAutoGenerating && (
                                        <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                                            <div className="w-2 h-2 bg-primary rounded-full" />
                                            Yeni sorular hazırlanıyor...
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <DialogClose asChild>
                            <ModalCloseButton className="-mr-2" />
                        </DialogClose>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pb-0 w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                            <TabsTrigger value="quiz" className="flex items-center gap-2">
                                <FileText size={16} />
                                Test Çöz
                            </TabsTrigger>
                            <TabsTrigger value="stats" className="flex items-center gap-2">
                                <TrendingUp size={16} />
                                Başarı Analizi
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {/* Since TabsContent unmounts hidden content by default, we use it to switch views. 
                        However, we want to maintain state. TabsContent wraps children. 
                    */}
                    <div className={cn("h-full w-full", activeTab === 'quiz' ? 'block' : 'hidden')}>
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <p className="text-muted-foreground">Sorular hazırlanıyor...</p>
                                    </div>
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                                        <AlertCircle className="w-12 h-12 text-destructive" />
                                        <p className="text-destructive max-w-md">{error}</p>
                                        {error.includes("Soru Üret") || error.includes("boş") ? (
                                            <Button
                                                onClick={handleGenerateMock}
                                                disabled={isGenerating}
                                                className="mt-4"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                        Üretiliyor...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="mr-2 h-4 w-4" />
                                                        Yapay Zeka ile Soru Üret
                                                    </>
                                                )}
                                            </Button>
                                        ) : null}
                                    </div>
                                ) : showResult ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-6 text-center">
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
                                                    className={score > questions.length / 2 ? "stroke-green-500" : "stroke-orange-500"}
                                                    strokeWidth="8"
                                                    fill="none"
                                                    strokeDasharray={2 * Math.PI * 60}
                                                    strokeDashoffset={2 * Math.PI * 60 * (1 - score / questions.length)}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                <span className="text-3xl font-bold text-foreground">{score} / {questions.length}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-foreground mb-2">
                                                {score === questions.length ? "Mükemmel!" : score >= questions.length / 2 ? "Güzel İş!" : "Biraz Daha Çalışmalısın"}
                                            </h3>
                                            <p className="text-gray-200 font-bold">Test tamamlandı.</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-4">
                                            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                                                Kapat
                                            </Button>
                                            <Button onClick={handleRetry} className="gap-2 w-full sm:w-auto">
                                                <RefreshCw size={18} />
                                                Yeni Test
                                            </Button>
                                        </div>

                                        {/* Detailed Analysis */}
                                        <div className="w-full mt-8 bg-muted/50 rounded-xl p-4 text-left">
                                            <h4 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">Konu Bazlı Performansın</h4>
                                            <div className="space-y-4">
                                                {Object.entries(sessionStats).map(([topic, stats]) => {
                                                    const total = stats.correct + stats.wrong;
                                                    const rate = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
                                                    const isCritical = rate < 40;
                                                    return (
                                                        <div key={topic} className="flex flex-col gap-1">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-foreground font-medium">{topic}</span>
                                                                <span className={rate >= 50 ? "text-green-500" : "text-orange-500"}>%{rate} Başarı</span>
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
                                ) : questions.length > 0 ? (
                                    <div className="space-y-6">
                                        {/* Progress Bar */}
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-300 ease-out"
                                                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                                            />
                                        </div>

                                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                                            <span>Soru {currentIndex + 1} / {questions.length}</span>
                                            <span>Zorluk: {Array(questions[currentIndex].difficulty_level).fill('⭐').join('')}</span>
                                        </div>

                                        <div className="space-y-6">
                                            <h3 className="text-lg font-medium text-foreground leading-relaxed">
                                                {questions[currentIndex].question_text}
                                            </h3>

                                            <div className="space-y-3">
                                                {questions[currentIndex].options.map((option, idx) => {
                                                    const isSelected = answers[currentIndex] === idx;
                                                    const isCorrect = idx === questions[currentIndex].correct_option_index;

                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleOptionSelect(idx)}
                                                            disabled={isSubmitted}
                                                            className={cn(
                                                                "w-full p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between group",
                                                                isSubmitted
                                                                    ? isCorrect
                                                                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                                                        : isSelected
                                                                            ? "bg-rose-500/10 border-rose-500 text-rose-500"
                                                                            : "bg-muted/20 border-transparent text-muted-foreground opacity-40"
                                                                    : isSelected
                                                                        ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(4,178,166,0.2)] scale-[1.02]"
                                                                        : "bg-card/40 border-primary/40 hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_10px_rgba(4,178,166,0.1)] transition-all"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <span className={cn(
                                                                    "flex items-center justify-center w-7 h-7 rounded-lg border text-xs font-bold shrink-0 transition-colors",
                                                                    isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border group-hover:border-primary/50"
                                                                )}>
                                                                    {String.fromCharCode(65 + idx)}
                                                                </span>
                                                                <span className="text-[15px]">{option}</span>
                                                            </div>
                                                            {isSubmitted && isCorrect && <CheckCircle className="text-green-500" size={20} />}
                                                            {isSubmitted && isSelected && !isCorrect && <XCircle className="text-destructive" size={20} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Explanation Area */}
                                            <AnimatePresence>
                                                {isSubmitted && questions[currentIndex].explanation && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-blue-700 dark:text-blue-300 text-sm"
                                                    >
                                                        <strong>Açıklama:</strong> {questions[currentIndex].explanation}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className={cn("h-full w-full", activeTab === 'stats' ? 'block' : 'hidden')}>
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                {userStats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                                        <TrendingUp size={48} className="mb-4 opacity-20" />
                                        <p>Henüz bu ders için yeterli veri oluşmadı.</p>
                                        <Button
                                            variant="link"
                                            onClick={() => setActiveTab('quiz')}
                                            className="mt-4"
                                        >
                                            Hemen Test Çöz
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {userStats.sort((a, b) => a.success_rate - b.success_rate).map((stat) => {
                                            const isCritical = stat.success_rate < 40;
                                            return (
                                                <div key={stat.id} className="bg-card rounded-xl p-4 border border-border hover:border-border/80 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-bold text-foreground text-lg">{stat.topic}</h4>
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                                <span>Son: {new Date(stat.last_attempt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "text-xl font-bold font-mono",
                                                            stat.success_rate >= 70 ? "text-green-500" : stat.success_rate >= 40 ? "text-orange-500" : "text-destructive"
                                                        )}>
                                                            %{stat.success_rate}
                                                        </div>
                                                    </div>

                                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                                                        <div
                                                            className={cn(
                                                                "h-full",
                                                                stat.success_rate >= 70 ? "bg-green-500" : stat.success_rate >= 40 ? "bg-orange-500" : "bg-destructive"
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
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Footer Actions - ONLY for Quiz Tab */}
                {
                    activeTab === 'quiz' && !showResult && !loading && !error && (
                        <div className="p-4 border-t border-border bg-card/50 flex justify-end">
                            {!isSubmitted ? (
                                <Button
                                    onClick={handleSubmitAnswer}
                                    disabled={answers[currentIndex] === undefined}
                                >
                                    Yanıtla
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleNextQuestion}
                                    disabled={currentIndex === questions.length - 1 && isAutoGenerating}
                                    className="gap-2"
                                >
                                    {currentIndex === questions.length - 1
                                        ? (isAutoGenerating ? 'Yeni Sorular Üretiliyor...' : 'Sonucu Gör')
                                        : 'Sonraki Soru'}
                                    <ChevronRight size={18} />
                                </Button>
                            )}
                        </div>
                    )
                }
            </DialogContent >
        </Dialog >
    );
}
