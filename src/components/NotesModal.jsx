import React, { useEffect, useState } from 'react';
import { ExternalLink, FileQuestion, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import { Button } from "@/components/ui/button";


export default function NotesModal({ courseName, notePath, onClose, icon: Icon }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);


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
            } catch {
                console.error('Note check failed');
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

    // 1. Iframe load handler ekleyin
    const handleIframeLoad = (e) => {
        try {
            const iframeDocument = e.target.contentDocument || e.target.contentWindow.document;
            // Viewport meta tag kontrolü ve enjeksiyonu
            if (!iframeDocument.querySelector('meta[name="viewport"]')) {
                const meta = iframeDocument.createElement('meta');
                meta.name = 'viewport';
                meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                iframeDocument.head.appendChild(meta);
            }
            // İsteğe bağlı: Iframe body'sine overflow kontrolü
            iframeDocument.body.style.overflowX = 'hidden';
        } catch {
            // Cross-origin restriction - normal in production
        }
        setLoading(false);
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            {/* max-h düzeltildi, padding kaldırıldı */}
            <DialogContent className="w-full h-[100dvh] sm:h-[85vh] sm:max-w-7xl flex flex-col p-0 gap-0 border-border bg-card overflow-hidden max-w-[100vw]">

                {/* Header: items-start ile üstten hizalama */}
                <div className="flex flex-row items-center px-3 py-3 sm:px-6 sm:py-4 border-b border-border bg-card/50 shrink-0 gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between w-full">
                            <DialogHeader className="text-left">
                                <DialogTitle className="text-base sm:text-xl font-bold text-foreground leading-tight break-words pr-1 flex items-center gap-2">
                                    {Icon && <Icon size={24} className="text-primary shrink-0" />}
                                    <span>{courseName}</span>
                                </DialogTitle>
                            </DialogHeader>

                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    className="h-10 w-10 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors [&_svg]:size-6"
                                >
                                    <a href={notePath} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink size={24} />
                                    </a>
                                </Button>
                                <DialogClose asChild>
                                    <ModalCloseButton className="-mr-1" />
                                </DialogClose>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-muted/20 relative flex items-center justify-center overflow-hidden">
                    {/* ... Loading ve Error state'leri aynı kalabilir ... */}
                    {!loading && !error && (
                        <iframe
                            src={notePath}
                            className="w-full h-full border-0 bg-white"
                            title={`${courseName} Notes`}
                            loading="lazy"
                            onLoad={handleIframeLoad} // <--- ÖNEMLİ: Load handler eklendi
                        />
                    )}
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-primary bg-background/80 z-10">
                            <Loader2 className="animate-spin" size={48} />
                            <p className="text-lg font-medium text-foreground">Notlar yükleniyor...</p>
                        </div>
                    )}
                    {error && (
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
                            <Button onClick={onClose} className="px-8">
                                Geri Dön
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
