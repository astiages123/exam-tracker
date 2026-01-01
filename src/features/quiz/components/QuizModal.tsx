/**
 * QuizModal Component
 * 
 * Main quiz modal with question bank and performance tracking.
 * 
 * Refactored: Logic moved to useQuiz hook,
 * UI split into QuizQuestion, QuizResult, and QuizStats components.
 */

import { useState } from 'react';
import { RefreshCw, AlertCircle, HelpCircle, FileText, TrendingUp, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Feature components and hooks
import { useQuiz } from '@/features/quiz/hooks/useQuiz';
import QuizQuestion from '@/features/quiz/components/QuizQuestion';
import QuizResult from '@/features/quiz/components/QuizResult';
import QuizStats from '@/features/quiz/components/QuizStats';

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseName: string;
    notePath?: string;
}

export default function QuizModal({ isOpen, onClose, courseId, courseName, notePath }: QuizModalProps) {
    const [activeTab, setActiveTab] = useState('quiz');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [state, actions] = useQuiz({
        isOpen,
        courseId,
        courseName,
        notePath
    });

    const {
        questions,
        currentIndex,
        loading,
        error,
        score,
        showResult,
        isGenerating,
        isAutoGenerating,
        answers,
        isSubmitted,
        userStats,
        sessionStats
    } = state;

    const {
        handleOptionSelect,
        handleSubmitAnswer,
        handleNextQuestion,
        handleRetry,
        handleGenerateMock,
        getDifficultyStars
    } = actions;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={cn(
                    "flex flex-col p-0 gap-0 border-border bg-card overflow-hidden transition-all duration-300 focus-visible:outline-none",
                    isFullscreen
                        ? "w-screen h-[100dvh] max-w-none rounded-none border-none"
                        : "w-full max-w-full sm:max-w-5xl h-[100dvh] sm:h-[92vh] sm:rounded-lg"
                )}
            >
                {/* Header */}
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
                                <p className="text-sm text-subcourse flex items-center gap-2 mt-0.5">
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
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="h-10 w-10 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors [&_svg]:size-6 hidden sm:flex"
                                title={isFullscreen ? "Küçült" : "Tam Ekran"}
                            >
                                {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                            </Button>
                            <DialogClose asChild>
                                <ModalCloseButton className="-mr-2" />
                            </DialogClose>
                        </div>
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

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {/* Quiz Tab */}
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
                                        {(error.includes("Soru Üret") || error.includes("boş")) && (
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
                                        )}
                                    </div>
                                ) : showResult ? (
                                    <QuizResult
                                        score={score}
                                        totalQuestions={questions.length}
                                        sessionStats={sessionStats}
                                        onClose={onClose}
                                        onRetry={handleRetry}
                                    />
                                ) : questions.length > 0 ? (
                                    <QuizQuestion
                                        question={questions[currentIndex]}
                                        questionIndex={currentIndex}
                                        totalQuestions={questions.length}
                                        selectedAnswer={answers[currentIndex]}
                                        isSubmitted={isSubmitted}
                                        onOptionSelect={handleOptionSelect}
                                        getDifficultyStars={getDifficultyStars}
                                    />
                                ) : null}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Stats Tab */}
                    <div className={cn("h-full w-full", activeTab === 'stats' ? 'block' : 'hidden')}>
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                <QuizStats
                                    userStats={userStats}
                                    onSwitchToQuiz={() => setActiveTab('quiz')}
                                />
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Footer Actions */}
                {activeTab === 'quiz' && !showResult && !loading && !error && questions.length > 0 && (
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
                )}
            </DialogContent>
        </Dialog>
    );
}
