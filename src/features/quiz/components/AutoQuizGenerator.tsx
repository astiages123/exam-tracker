
import React, { useState, useEffect, useRef } from 'react';
import { getChunkPriorities } from '../services/quizService';
import { processStockpileItem, StockpileStats } from '../services/stockpileService';
import { STOCKPILE_DELAY_MS } from '../config/stockpileConfig';

// Types
interface ChunkPriority {
    chunk_id: string;
    title: string;
    lesson_type: string;
    content: string;
    question_count: number;
    priority_score: number;
}

const MAX_DAILY_REQUESTS = 14000;

export const AutoQuizGenerator: React.FC = () => {
    const [isActive, setIsActive] = useState<boolean>(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<string>('Hazır');
    const [stats, setStats] = useState<StockpileStats>({
        totalGenerated: 0,
        validatedCount: 0,
        rejectedCount: 0,
        currentLesson: '-'
    });

    // Refs for loop control
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
            addLog('Stockpile Motoru başlatıldı (Dual Model).');
            runGenerationLoop();
        } else {
            setStatus('Durduruldu');
            addLog('Motor durduruldu.');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }

        return () => {
            isActiveRef.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isActive]);

    const runGenerationLoop = async () => {
        if (!isActiveRef.current) return;

        if (requestCountRef.current >= MAX_DAILY_REQUESTS) {
            addLog('Günlük API limitine ulaşıldı.');
            setIsActive(false);
            return;
        }

        try {
            setStatus('Hedefler analiz ediliyor...');

            // 1. Get Priorities
            // Note: getChunkPriorities currently returns chunks sorted by lack of questions using 'questions_bank' count.
            // Be mindful that 'questions_bank' now contains unvalidated ones too. 
            // We might want to filter verified only in the SQL query later, but for now raw count is okay.
            const priorities = await getChunkPriorities(null) as ChunkPriority[];

            // Filter chunks that haven't met the target (defined in CONFIG or default 50)
            // Using a default of 50 per chunk as a micro-target, while global config tracks lesson totals.
            // For now, let's stick to the heuristic: Priority Score is mainly driven by "question_count".
            // So we just pick the neediest one.

            const needyChunks = priorities.filter(p => {
                // You can add logic here to check against STOCKPILE_CONFIG total for the lesson if we had that data handy.
                // For now, simple chunk-level heuristic: < 50 questions per chunk.
                return p.question_count < 50;
            });

            if (needyChunks.length === 0) {
                addLog('Tüm mikro-hedefler tamamlandı.');
                setIsActive(false);
                // In a real stockpile system, we would sleep for a long time and check again.
                return;
            }

            // Pick a chunk
            const highestScore = needyChunks[0].priority_score;
            const topCandidates = needyChunks.filter((c) => c.priority_score === highestScore);
            const targetChunk = topCandidates[Math.floor(Math.random() * topCandidates.length)];

            // Status Update
            setStats(s => ({ ...s, currentLesson: targetChunk.lesson_type }));
            setStatus(`İşleniyor: ${targetChunk.title} (${targetChunk.lesson_type})`);

            // 2. Process (Generate + Validate)
            const result = await processStockpileItem(
                targetChunk.chunk_id,
                targetChunk.content,
                targetChunk.lesson_type
            );

            requestCountRef.current++;

            // 3. Log Results
            if (result.success) {
                setStats(s => ({
                    ...s,
                    totalGenerated: s.totalGenerated + 1,
                    validatedCount: s.validatedCount + (result.validated ? 1 : 0),
                    rejectedCount: s.rejectedCount + (result.validated ? 0 : 1)
                }));

                if (result.validated) {
                    addLog(`[ONAYLANDI] ${targetChunk.title} - Soru bankaya eklendi.`);
                } else {
                    addLog(`[RED] ${targetChunk.title} - Denetçiden dönmedi.`);
                }
            } else {
                addLog(`[HATA] Üretim başarısız: ${targetChunk.title}`);
            }

        } catch (error) {
            console.error('[Stockpile] Loop error:', error);
            addLog(`Kritik Hata: ${error}`);
        }

        // 4. Rate Limit Delay
        if (isActiveRef.current) {
            setStatus('Soğutma (Delay)...');
            timeoutRef.current = setTimeout(runGenerationLoop, STOCKPILE_DELAY_MS);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-emerald-400 font-mono p-8">
            <div className="max-w-4xl mx-auto border border-emerald-900/50 p-6 rounded-xl bg-neutral-900/80 shadow-[0_0_30px_rgba(16,185,129,0.15)]">

                {/* Header */}
                <header className="flex justify-between items-center mb-8 border-b border-emerald-900/50 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold bg-linear-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            Stockpile Engine v3.0
                        </h1>
                        <p className="text-xs text-emerald-600 mt-1">Dual AI: Worker (Llama-8b) + Validator (Llama-70b)</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isActive ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400 animate-pulse' : 'bg-red-900/30 border-red-500 text-red-400'
                            }`}>
                            {status}
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-black/40 border border-emerald-900/30 p-4 rounded-lg text-center relative overflow-hidden group">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Toplam Üretim</div>
                        <div className="text-3xl font-light text-emerald">{stats.totalGenerated}</div>
                        <div className="absolute bottom-0 left-0 h-1 bg-blue-500 w-full opacity-20"></div>
                    </div>

                    <div className="bg-black/40 border border-emerald-900/30 p-4 rounded-lg text-center relative overflow-hidden">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Onaylanan</div>
                        <div className="text-3xl font-light text-emerald-400">{stats.validatedCount}</div>
                        <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-full opacity-50"></div>
                    </div>

                    <div className="bg-black/40 border border-emerald-900/30 p-4 rounded-lg text-center relative overflow-hidden">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Reddedilen</div>
                        <div className="text-3xl font-light text-rose-400">{stats.rejectedCount}</div>
                        <div className="absolute bottom-0 left-0 h-1 bg-rose-500 w-full opacity-50"></div>
                    </div>

                    <div className="bg-black/40 border border-emerald-900/30 p-4 rounded-lg text-center relative overflow-hidden">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Aktif Ders</div>
                        <div className="text-sm font-medium text-amber-400 truncate mt-2" title={stats.currentLesson}>
                            {stats.currentLesson}
                        </div>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="flex gap-4 mb-8">
                    {!isActive ? (
                        <button
                            onClick={() => setIsActive(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20 flex-1 flex items-center justify-center gap-2"
                        >
                            <span>▶</span> MOTORU BAŞLAT
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsActive(false)}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-rose-900/20 flex-1 flex items-center justify-center gap-2"
                        >
                            <span>⏹</span> DURDUR
                        </button>
                    )}
                </div>

                {/* Terminal Log */}
                <div className="bg-neutral-950 border border-emerald-900/30 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs leading-relaxed shadow-inner">
                    {logs.length === 0 && <span className="text-emerald-800 italic">Sistem beklemede...</span>}

                    {logs.map((log, i) => {
                        const isError = log.includes('[HATA]') || log.includes('[RED]');
                        const isSuccess = log.includes('[ONAYLANDI]');

                        return (
                            <div key={i} className={`mb-1 pb-1 border-b border-white/5 last:border-0 ${isError ? 'text-rose-400' : isSuccess ? 'text-emerald-300' : 'text-emerald-600'
                                }`}>
                                <span className="opacity-50 mr-2">{'>'}</span>{log}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
