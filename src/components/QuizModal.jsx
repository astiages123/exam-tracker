import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, ChevronRight, RefreshCw, AlertCircle, HelpCircle, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generateQuestions, fetchNoteContent } from '../lib/ai';

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

    useEffect(() => {
        if (isOpen && courseId) {
            initializeQuiz();
            // Scroll lock
            document.body.style.overflow = 'hidden';
        } else {
            // Reset state when closed
            setQuestions([]);
            setCurrentIndex(0);
            setScore(0);
            setShowResult(false);
            setAnswers({});
            setIsSubmitted(false);
            setSessionStats({});
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, courseId]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const initializeQuiz = async () => {
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
    };

    const fetchUserStats = async () => {
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
    };

    const fetchSmartQuestions = async (weakTopicsList) => {
        setError(null);
        try {
            // Strategy: 
            // 1. Fetch questions for weak topics (aim for 6)
            // 2. Fetch general questions (aim for 4 or remainder)

            let selectedQuestions = [];

            // A. Fetch Weak Topic Questions
            if (weakTopicsList.length > 0) {
                const { data: weakData, error: weakError } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('course_id', courseId)
                    .in('topic', weakTopicsList)
                    .limit(30); // Fetch a pool to shuffle

                if (!weakError && weakData) {
                    const shuffledWeak = shuffleArray(weakData).slice(0, 6); // Take up to 6
                    selectedQuestions = [...shuffledWeak];
                }
            }

            // B. Fetch General Questions (exclude already selected IDs if possible, or just standard fetch)
            // Simple approach: Fetch pool of random questions for course
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

            // Filter out duplicates if any
            const existingIds = new Set(selectedQuestions.map(q => q.id));
            const availableGeneral = allData.filter(q => !existingIds.has(q.id));
            const neededCount = 20 - selectedQuestions.length;

            const shuffledGeneral = shuffleArray(availableGeneral).slice(0, neededCount);
            selectedQuestions = [...selectedQuestions, ...shuffledGeneral];

            // Final shuffle for the user
            setQuestions(shuffleArray(selectedQuestions));

        } catch (err) {
            console.error(err);
            setError("Sorular yüklenirken bir hata oluştu: " + err.message);
        }
    };

    const shuffleArray = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

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
            // Find note path from courseID logic (Need to pass notePath or find it)
            // Simplified: we'll try to guess or use the one if available context. 
            // Better approach: Pass notePath prop to QuizModal as well.
            // For now, let's assume standard path or fetch from window prop if needed, 
            // BUT correct way is updating App.jsx to pass `notePath` to QuizModal.

            // Temporary Hack: construct path dynamically or rely on passed prop
            // We need notePath passed to QuizModal. Check App.jsx

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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-5xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92vh] cursor-default"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex flex-col bg-gray-900/50 border-b border-gray-800">
                        <div className="flex items-center justify-between p-6 pb-2">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <HelpCircle className="w-6 h-6 text-purple-500" />
                                    Soru Bankası
                                </h2>
                                <p className="text-sm text-gray-400 flex items-center gap-2">
                                    {courseName}
                                    {isAutoGenerating && (
                                        <span className="flex items-center gap-1 text-xs text-purple-400 animate-pulse">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                            Yeni sorular hazırlanıyor...
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex space-x-1 px-6 pb-4">
                            <button
                                onClick={() => setActiveTab('quiz')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'quiz' ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                                <FileText size={16} />
                                Test Çöz
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stats' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                                <TrendingUp size={16} />
                                Başarı Analizi
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {activeTab === 'stats' ? (
                            <div className="space-y-6 p-2">
                                {userStats.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
                                        <TrendingUp size={48} className="mb-4 opacity-20" />
                                        <p>Henüz bu ders için yeterli veri oluşmadı.</p>
                                        <button
                                            onClick={() => setActiveTab('quiz')}
                                            className="mt-4 text-purple-400 hover:text-purple-300 font-semibold"
                                        >
                                            Hemen Test Çöz
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {userStats.sort((a, b) => a.success_rate - b.success_rate).map((stat) => {
                                            const isCritical = stat.success_rate < 40;
                                            return (
                                                <div key={stat.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-bold text-white text-lg">{stat.topic}</h4>
                                                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                                <span>Son: {new Date(stat.last_attempt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`text-xl font-bold font-mono ${stat.success_rate >= 70 ? 'text-green-400' : stat.success_rate >= 40 ? 'text-orange-400' : 'text-red-400'}`}>
                                                            %{stat.success_rate}
                                                        </div>
                                                    </div>

                                                    <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden mb-3">
                                                        <div
                                                            className={`h-full ${stat.success_rate >= 70 ? 'bg-green-500' : stat.success_rate >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                                                            style={{ width: `${stat.success_rate}%` }}
                                                        />
                                                    </div>

                                                    <div className="flex justify-between items-center text-sm">
                                                        <div className="flex gap-4">
                                                            <span className="text-green-400">✓ {stat.correct_count} Doğru</span>
                                                            <span className="text-red-400">✗ {stat.wrong_count} Yanlış</span>
                                                        </div>
                                                        {isCritical && (
                                                            <span className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-500/10 px-2 py-1 rounded">
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
                        ) : (
                            <>
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                                        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                        <p className="text-gray-400">Sorular hazırlanıyor...</p>
                                    </div>
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                                        <AlertCircle className="w-12 h-12 text-red-500" />
                                        <p className="text-red-400 max-w-md">{error}</p>
                                        {error.includes("Soru Üret") || error.includes("boş") ? (
                                            <button
                                                onClick={handleGenerateMock}
                                                disabled={isGenerating}
                                                className="mt-4 px-6 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 transition-colors flex items-center gap-2"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Üretiliyor...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw size={18} />
                                                        Yapay Zeka ile Soru Üret
                                                    </>
                                                )}
                                            </button>
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
                                                    className="stroke-gray-800"
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
                                                <span className="text-3xl font-bold text-white">{score} / {questions.length}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">
                                                {score === questions.length ? "Mükemmel!" : score >= questions.length / 2 ? "Güzel İş!" : "Biraz Daha Çalışmalısın"}
                                            </h3>
                                            <p className="text-gray-400">Test tamamlandı.</p>
                                        </div>
                                        <div className="flex gap-4 w-full justify-center">
                                            <button
                                                onClick={onClose}
                                                className="px-6 py-3 rounded-xl bg-gray-800 text-white hover:bg-gray-700 font-medium transition-colors"
                                            >
                                                Kapat
                                            </button>
                                            <button
                                                onClick={handleRetry}
                                                className="px-6 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-medium flex items-center gap-2 transition-colors"
                                            >
                                                <RefreshCw size={18} />
                                                Yeni Test
                                            </button>
                                        </div>

                                        {/* Detailed Analysis Section */}
                                        <div className="w-full mt-8 bg-gray-800/50 rounded-xl p-4 text-left">
                                            <h4 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">Konu Bazlı Performansın</h4>
                                            <div className="space-y-4">
                                                {Object.entries(sessionStats).map(([topic, stats]) => {
                                                    const total = stats.correct + stats.wrong;
                                                    const rate = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
                                                    const isCritical = rate < 40;
                                                    return (
                                                        <div key={topic} className="flex flex-col gap-1">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-300 font-medium">{topic}</span>
                                                                <span className={rate >= 50 ? "text-green-400" : "text-orange-400"}>%{rate} Başarı</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${rate >= 50 ? "bg-green-500" : "bg-orange-500"}`}
                                                                    style={{ width: `${rate}%` }}
                                                                />
                                                            </div>
                                                            {isCritical && (
                                                                <span className="text-xs text-red-400 font-bold flex items-center gap-1">
                                                                    ⚠️ Kritik Seviye - Tekrar Et
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {Object.keys(sessionStats).length === 0 && (
                                                    <p className="text-gray-500 text-sm">Henüz veri yok.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : questions.length > 0 ? (
                                    <div className="space-y-6">
                                        {/* Progress Bar */}
                                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all duration-300 ease-out"
                                                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                                            />
                                        </div>

                                        <div className="flex justify-between items-center text-sm text-gray-500">
                                            <span>Soru {currentIndex + 1} / {questions.length}</span>
                                            <span>Zorluk: {Array(questions[currentIndex].difficulty_level).fill('⭐').join('')}</span>
                                        </div>

                                        <motion.div
                                            key={currentIndex}
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            className="space-y-6"
                                        >
                                            <h3 className="text-lg font-medium text-white leading-relaxed">
                                                {questions[currentIndex].question_text}
                                            </h3>

                                            <div className="space-y-3">
                                                {questions[currentIndex].options.map((option, idx) => {
                                                    const isSelected = answers[currentIndex] === idx;
                                                    const isCorrect = idx === questions[currentIndex].correct_option_index;

                                                    let buttonClass = "w-full p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between group ";

                                                    if (isSubmitted) {
                                                        if (isCorrect) {
                                                            buttonClass += "bg-green-500/10 border-green-500 text-green-100";
                                                        } else if (isSelected) {
                                                            buttonClass += "bg-red-500/10 border-red-500 text-red-100";
                                                        } else {
                                                            buttonClass += "bg-gray-800/50 border-gray-800/50 text-gray-500 opacity-50";
                                                        }
                                                    } else {
                                                        if (isSelected) {
                                                            buttonClass += "bg-purple-500/10 border-purple-500 text-purple-100";
                                                        } else {
                                                            buttonClass += "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-750";
                                                        }
                                                    }

                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleOptionSelect(idx)}
                                                            disabled={isSubmitted}
                                                            className={buttonClass}
                                                        >
                                                            <span className="flex-1 text-[15px]">{option}</span>
                                                            {isSubmitted && isCorrect && <CheckCircle className="text-green-500" size={20} />}
                                                            {isSubmitted && isSelected && !isCorrect && <XCircle className="text-red-500" size={20} />}
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
                                                        className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-blue-200 text-sm"
                                                    >
                                                        <strong>Açıklama:</strong> {questions[currentIndex].explanation}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>

                    {/* Footer Actions - ONLY for Quiz Tab */}
                    {activeTab === 'quiz' && !showResult && !loading && !error && (
                        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
                            {!isSubmitted ? (
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={answers[currentIndex] === undefined}
                                    className="px-6 py-2 rounded-lg bg-white text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                                >
                                    Yanıtla
                                </button>
                            ) : (
                                <button
                                    onClick={handleNextQuestion}
                                    disabled={currentIndex === questions.length - 1 && isAutoGenerating}
                                    className="px-6 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {currentIndex === questions.length - 1
                                        ? (isAutoGenerating ? 'Yeni Sorular Üretiliyor...' : 'Sonucu Gör')
                                        : 'Sonraki Soru'}
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
