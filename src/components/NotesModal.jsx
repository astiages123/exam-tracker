import React, { useEffect, useState } from 'react';
import { X, ExternalLink, FileQuestion, Loader2, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QuizModal from './QuizModal';

export default function NotesModal({ courseName, notePath, onClose, courseId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);

    // Check if the note exists and is not the SPA fallback
    useEffect(() => {
        const checkNote = async () => {
            setLoading(true);
            setError(false);
            try {
                const response = await fetch(notePath);
                const text = await response.text();

                // If the response contains 'id="root"', it's most likely the SPA fallback index.html
                // indicating the specific note file doesn't exist.
                if (text.includes('id="root"') || !response.ok) {
                    setError(true);
                } else {
                    setError(false);
                }
            } catch (err) {
                console.error('Note check failed:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (notePath) {
            checkNote();
        } else {
            setError(true);
            setLoading(false);
        }
    }, [notePath]);

    return (
        <>
            <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-7xl h-[85vh] flex flex-col p-0 gap-0 border-border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-foreground truncate max-w-[500px]">
                                {courseName} - Ders Notları
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Ders notlarını görüntüleyin ve çalışma materyallerinize erişin.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="default"
                                onClick={() => setShowQuiz(true)}
                                className="text-muted-foreground font-bold hover:text-purple-400 hover:bg-purple-400/10 gap-2 h-11 px-4"
                            >
                                <HelpCircle size={24} />
                                <span className="hidden sm:inline">Soru Çöz</span>
                            </Button>
                            <div className="w-px h-6 bg-border mx-1" />
                            <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-11 w-11"
                            >
                                <a
                                    href={notePath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Yeni sekmede aç"
                                >
                                    <ExternalLink size={24} />
                                </a>
                            </Button>
                            <div className="w-px h-6 bg-border mx-1" />
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted text-muted-foreground hover:text-white">
                                    <X size={24} />
                                </Button>
                            </DialogClose>
                        </div>
                    </div>

                    <div className="flex-1 bg-muted/20 relative flex items-center justify-center overflow-hidden">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4 text-primary">
                                <Loader2 className="animate-spin" size={48} />
                                <p className="text-lg font-medium text-foreground">Notlar yükleniyor...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-6 text-center px-6">
                                <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center shadow-inner">
                                    <FileQuestion size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-foreground">Not Henüz Eklenmedi</h3>
                                    <p className="text-muted-foreground max-w-md">
                                        Bu ders için hazırlanan notlar henüz sisteme yüklenmemiş veya güncelleniyor olabilir.
                                        Lütfen daha sonra tekrar kontrol edin.
                                    </p>
                                </div>
                                <Button
                                    onClick={onClose}
                                    className="px-8"
                                >
                                    Geri Dön
                                </Button>
                            </div>
                        ) : (
                            <iframe
                                src={notePath}
                                className="w-full h-full border-0 bg-white"
                                title={`${courseName} Notes`}
                                loading="lazy"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <QuizModal
                isOpen={showQuiz}
                onClose={() => setShowQuiz(false)}
                courseId={courseId}
                courseName={courseName}
                notePath={notePath}
            />
        </>
    );
}
