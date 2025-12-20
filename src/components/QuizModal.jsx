import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Brain, RefreshCw, CheckCircle, AlertCircle, Settings, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure worker is set up for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function QuizModal({ course, onClose }) {
    // Modes: 'setup' | 'quiz' | 'result' | 'settings'
    const [mode, setMode] = useState('setup');
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [pdfText, setPdfText] = useState(localStorage.getItem(`quiz_content_${course.id}`) || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Quiz State
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        localStorage.setItem(`quiz_content_${course.id}`, pdfText);
    }, [pdfText, course.id]);

    const handleSaveKey = (key) => {
        localStorage.setItem('gemini_api_key', key);
        setApiKey(key);
        setMode('setup');
    };

    const extractText = async (file) => {
        setLoading(true);
        setError(null);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + ' ';
            }

            if (!fullText.trim()) throw new Error("PDF'den metin okunamadı.");
            setPdfText(fullText);
        } catch (err) {
            console.error(err);
            setError("PDF okunurken bir hata oluştu. Lütfen geçerli bir metin tabanlı PDF yükleyin.");
        } finally {
            setLoading(false);
        }
    };

    const generateQuiz = async () => {
        if (!apiKey) {
            setMode('settings');
            return;
        }
        if (!pdfText) {
            setError("Lütfen önce bir not yükleyin.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
        Aşağıdaki metne dayanarak 5 adet çoktan seçmeli soru oluştur.
        Sorular düşündürücü ve öğretici olsun. Asla aynı soruları tekrarlama.
        
        Çıktıyı SADECE şu formatta geçerli bir JSON array olarak ver:
        [
          {
            "question": "Soru metni",
            "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
            "correctIndex": 0,
            "explanation": "Doğru cevabın açıklaması"
          }
        ]

        İşte Metin:
        ${pdfText.substring(0, 30000)} 
      `;
            // Truncate to avoid token limits if necessary, though 1.5 flash has large context.

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Clean up markdown code blocks if present
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsedQuestions = JSON.parse(text);
            if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
                throw new Error("Soru formatı geçersiz.");
            }

            setQuestions(parsedQuestions);
            setCurrentIndex(0);
            setScore(0);
            setSelectedOption(null);
            setShowExplanation(false);
            setMode('quiz');
        } catch (err) {
            console.error(err);
            setError("Yapay zeka soru üretirken hata oluştu. API anahtarınızı kontrol edin veya tekrar deneyin: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOptionClick = (index) => {
        if (selectedOption !== null) return;
        setSelectedOption(index);
        setShowExplanation(true);
        if (index === questions[currentIndex].correctIndex) {
            setScore(s => s + 1);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(c => c + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            setMode('result');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1a1b26] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                        <Brain className="text-purple-400" />
                        <h2 className="font-bold text-lg text-white/90">{course.name} - AI Quiz</h2>
                    </div>
                    <div className="flex gap-2">
                        {mode === 'setup' && (
                            <button onClick={() => setMode('settings')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <Settings size={20} className="text-white/60" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-300 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {mode === 'settings' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-white">API Ayarları</h3>
                            <p className="text-white/60 text-sm">Quiz oluşturmak için Google Gemini API anahtarına ihtiyacınız var.</p>
                            <input
                                type="text"
                                placeholder="Gemini API Key"
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-colors"
                                defaultValue={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <button
                                onClick={() => handleSaveKey(apiKey)}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                Kaydet
                            </button>
                            <button onClick={() => setMode('setup')} className="w-full text-white/50 text-sm hover:text-white mt-2">Geri Dön</button>
                        </div>
                    )}

                    {mode === 'setup' && (
                        <div className="flex flex-col items-center justify-center h-full space-y-6 text-center py-8">
                            {!pdfText ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-48 border-2 border-dashed border-white/10 hover:border-purple-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all bg-white/5 hover:bg-white/10 group"
                                >
                                    <Upload className="text-white/30 group-hover:text-purple-400 mb-3 transition-colors" size={40} />
                                    <p className="text-white/70 font-medium">Ders notu yükle (PDF)</p>
                                    <p className="text-white/30 text-xs mt-1">Yapay zeka bu notlardan soru üretecek</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 ring-2 ring-green-500/30">
                                        <CheckCircle size={32} />
                                    </div>
                                    <p className="text-green-300 font-medium mt-2">Not yüklendi ve hazır!</p>
                                    <button onClick={() => setPdfText('')} className="text-xs text-white/40 hover:text-white underline">
                                        Farklı bir not yükle
                                    </button>
                                </div>
                            )}

                            <input
                                type="file"
                                accept=".pdf"
                                ref={fileInputRef}
                                onChange={(e) => e.target.files?.[0] && extractText(e.target.files[0])}
                                className="hidden"
                            />

                            <button
                                onClick={generateQuiz}
                                disabled={!pdfText || loading}
                                className={`
                  w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg transition-all
                  ${!pdfText
                                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] shadow-lg shadow-purple-500/20 text-white'
                                    }
                `}
                            >
                                {loading ? <RefreshCw className="animate-spin" /> : <Brain />}
                                {loading ? 'Sorular Hazırlanıyor...' : 'Quiz Başlat'}
                            </button>

                            {!apiKey && (
                                <p className="text-yellow-500/80 text-xs bg-yellow-500/10 px-3 py-2 rounded-lg">
                                    ⚠️ API Kaydı gerekli. Ayarlardan ekleyebilirsiniz.
                                </p>
                            )}
                        </div>
                    )}

                    {mode === 'quiz' && questions.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex justify-between text-sm text-white/40 font-mono">
                                <span>Soru {currentIndex + 1} / {questions.length}</span>
                                <span>Skor: {score}</span>
                            </div>

                            <div className="text-xl font-medium text-white leading-relaxed">
                                {questions[currentIndex].question}
                            </div>

                            <div className="space-y-3">
                                {questions[currentIndex].options.map((opt, idx) => {
                                    let status = 'neutral';
                                    if (selectedOption !== null) {
                                        if (idx === questions[currentIndex].correctIndex) status = 'correct';
                                        else if (idx === selectedOption) status = 'wrong';
                                        else status = 'dimmed';
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={selectedOption !== null}
                                            onClick={() => handleOptionClick(idx)}
                                            className={`
                        w-full p-4 rounded-xl text-left transition-all border
                        ${status === 'neutral' ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white' : ''}
                        ${status === 'correct' ? 'bg-green-500/20 border-green-500/50 text-green-200' : ''}
                        ${status === 'wrong' ? 'bg-red-500/20 border-red-500/50 text-red-200' : ''}
                        ${status === 'dimmed' ? 'bg-black/20 border-transparent text-white/30' : ''}
                      `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border
                          ${status === 'neutral' ? 'border-white/20 text-white/50' : ''}
                          ${status === 'correct' ? 'border-green-500 bg-green-500 text-black' : ''}
                          ${status === 'wrong' ? 'border-red-500 bg-red-500 text-black' : ''}
                          ${status === 'dimmed' ? 'border-white/10 text-white/20' : ''}
                        `}>
                                                    {['A', 'B', 'C', 'D'][idx]}
                                                </span>
                                                {opt}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {showExplanation && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl"
                                >
                                    <h4 className="text-blue-400 text-sm font-bold mb-1">Açıklama</h4>
                                    <p className="text-blue-200 text-sm">{questions[currentIndex].explanation}</p>
                                </motion.div>
                            )}

                            {selectedOption !== null && (
                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={nextQuestion}
                                        className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                                    >
                                        {currentIndex === questions.length - 1 ? 'Sonuçları Gör' : 'Sonraki Soru'}
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'result' && (
                        <div className="text-center py-10 space-y-6">
                            <div className="inline-block p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-white/10">
                                <Trophy size={48} className="text-purple-400" />
                            </div>

                            <div>
                                <h3 className="text-3xl font-bold text-white mb-2">Quiz Tamamlandı!</h3>
                                <p className="text-white/60">Bu konuyu başarıyla test ettin.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="text-2xl font-bold text-white">{score} / {questions.length}</div>
                                    <div className="text-xs text-white/40 uppercase tracking-widest mt-1">Doğru</div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="text-2xl font-bold text-purple-400">
                                        %{Math.round((score / questions.length) * 100)}
                                    </div>
                                    <div className="text-xs text-white/40 uppercase tracking-widest mt-1">Başarı</div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-center pt-8">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 transition-colors"
                                >
                                    Kapat
                                </button>
                                <button
                                    onClick={generateQuiz}
                                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                >
                                    <RefreshCw size={18} />
                                    Yeni Sorular
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </motion.div>
        </div>
    );
}

function Trophy({ className, size }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}
