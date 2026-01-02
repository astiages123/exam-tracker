
import React, { useState, useEffect, useRef } from 'react';
import { getChunkPriorities, generateQuestionFromChunk, saveQuestionToBank } from '@services/quizService';

// Configuration
const GENERATION_INTERVAL_MS = 15000; // 15 seconds
const TARGET_QUESTIONS_PER_CHUNK = 50;
const MAX_DAILY_REQUESTS = 14000; // Gemma's limit

export const AutoQuizGenerator: React.FC = () => {
    const [isActive, setIsActive] = useState<boolean>(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<string>('Hazır');
    const [stats, setStats] = useState({ requests: 0, successes: 0, failures: 0 });

    // Refs for loop control (to avoid stale closures)
    const isActiveRef = useRef(isActive);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const requestCountRef = useRef(0);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg} `, ...prev].slice(0, 50));
    };

    // Sync ref
    useEffect(() => {
        isActiveRef.current = isActive;
        if (isActive) {
            setStatus('Çalışıyor...');
            addLog('Sistem başlatıldı.');
            runGenerationLoop();
        } else {
            setStatus('Durduruldu');
            addLog('Sistem durduruldu.');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }

        // Cleanup function for unmount
        return () => {
            isActiveRef.current = false; // Signal loop to stop
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isActive]);

    const runGenerationLoop = async () => {
        if (!isActiveRef.current) return;

        // Check daily limit safety
        if (requestCountRef.current >= MAX_DAILY_REQUESTS) {
            addLog('Günlük limite ulaşıldı. Durduruluyor.');
            setIsActive(false);
            return;
        }

        try {
            setStatus('Öncelikler analiz ediliyor...');
            // 1. Find priority chunk
            const priorities = await getChunkPriorities(null); // All lessons

            const limit: number = TARGET_QUESTIONS_PER_CHUNK;
            // @ts-ignore - chunks are typed in service
            const needyChunks = priorities.filter((p: any) => p.question_count < limit);

            if (needyChunks.length === 0) {
                addLog('Tüm konular tamamlandı! 🎉');
                setIsActive(false);
                setStatus('Tamamlandı');
                return;
            }

            // Select a random chunk from the top priority group to avoid repetition
            const highestScore = needyChunks[0].priority_score;
            // @ts-ignore
            const topCandidates = needyChunks.filter((c: any) => c.priority_score === highestScore);
            const targetChunk = topCandidates[Math.floor(Math.random() * topCandidates.length)];

            addLog(`Hedef: ${targetChunk.title} (${targetChunk.question_count}/${TARGET_QUESTIONS_PER_CHUNK})[Skor: ${targetChunk.priority_score}, Adaylar: ${topCandidates.length}]`);
            setStatus(`İşleniyor: ${targetChunk.title} `);

            // 2. Generate
            const question = await generateQuestionFromChunk(targetChunk.content, targetChunk.lesson_type);
            requestCountRef.current++;
            setStats(s => ({ ...s, requests: s.requests + 1 }));

            if (question) {
                // 3. Save
                await saveQuestionToBank(targetChunk.chunk_id, question);
                addLog(`Soru kaydedildi: ${targetChunk.title} `);
                setStats(s => ({ ...s, successes: s.successes + 1 }));
            } else {
                addLog('Üretim başarısız.');
                setStats(s => ({ ...s, failures: s.failures + 1 }));
            }

        } catch (error) {
            console.error('[AutoQuiz] Loop error:', error);
            addLog(`Hata: ${error} `);
        }

        // 4. Wait and Loop
        if (isActiveRef.current) {
            setStatus(`${GENERATION_INTERVAL_MS / 1000}sn bekleniyor...`);
            timeoutRef.current = setTimeout(runGenerationLoop, GENERATION_INTERVAL_MS);
        }
    };

    return (
        <div className="min-h-screen bg-black text-green-400 font-mono p-8">
            <div className="max-w-3xl mx-auto border border-green-800 p-6 rounded-lg bg-black/90 shadow-[0_0_20px_rgba(0,255,0,0.1)]">
                <header className="flex justify-between items-center mb-8 border-b border-green-900 pb-4">
                    <h1 className="text-2xl font-bold">Otomatik Soru Üretici v2.0</h1>
                    <div className="flex gap-4 items-center">
                        <div className={`w - 3 h - 3 rounded - full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'} `} />
                        <span>{status}</span>
                    </div>
                </header>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="border border-green-900 p-4 rounded text-center">
                        <div className="text-sm text-green-600">İstekler</div>
                        <div className="text-2xl">{stats.requests}</div>
                    </div>
                    <div className="border border-green-900 p-4 rounded text-center">
                        <div className="text-sm text-green-600">Başarılı</div>
                        <div className="text-2xl">{stats.successes}</div>
                    </div>
                    <div className="border border-green-900 p-4 rounded text-center">
                        <div className="text-sm text-green-600">Hatalar</div>
                        <div className="text-2xl text-red-500">{stats.failures}</div>
                    </div>
                </div>

                <div className="flex gap-4 mb-8">
                    {!isActive ? (
                        <button
                            onClick={() => setIsActive(true)}
                            className="bg-green-900/30 hover:bg-green-800 text-green-400 px-8 py-3 rounded border border-green-600 transition-colors flex-1"
                        >
                            SİSTEMİ BAŞLAT
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsActive(false)}
                            className="bg-red-900/30 hover:bg-red-900 text-red-400 px-8 py-3 rounded border border-red-600 transition-colors flex-1"
                        >
                            DURDUR
                        </button>
                    )}
                </div>

                <div className="bg-black border border-green-900 rounded p-4 h-96 overflow-y-auto font-mono text-sm leading-relaxed custom-scrollbar">
                    {logs.length === 0 && <span className="opacity-50">Sistem hazır...</span>}

                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 border-b border-green-900/30 pb-1 last:border-0">
                            {'>'} {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
