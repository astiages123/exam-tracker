import React, { useEffect, useState } from 'react';
import { ExternalLink, FileQuestion, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import ModalCloseButton from "@/components/ui/ModalCloseButton";
import { Button } from "@/components/ui/button";
import { Lightbox } from "@/components/ui/lightbox";

interface NotesModalProps {
    courseName: string;
    notePath: string; // e.g. /content/ekonomi_1.html
    onClose: () => void;
    icon?: React.ElementType;
}

export default function NotesModal({ courseName, notePath, onClose, icon: Icon }: NotesModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Check if the note exists and is not the SPA fallback
    const checkNote = async () => {
        setLoading(true);
        setError(false);
        try {
            const response = await fetch(notePath, { cache: 'no-store' }); // Disable cache to see updates
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

    useEffect(() => {
        if (notePath) {
            checkNote();
        } else {
            setError(true);
            setLoading(false);
        }
    }, [notePath]);

    const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
        try {
            // @ts-ignore
            const iframeDocument = e.target.contentDocument || e.target.contentWindow.document;

            if (!iframeDocument.querySelector('meta[name="viewport"]')) {
                const meta = iframeDocument.createElement('meta');
                meta.name = 'viewport';
                meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                iframeDocument.head.appendChild(meta);
            }

            const style = iframeDocument.createElement('style');
            style.innerHTML = `
                ::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background-color: rgba(94, 234, 212, 0.2);
                    border-radius: 9999px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(94, 234, 212, 0.4);
                    border: 2px solid transparent;
                }
                * {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(94, 234, 212, 0.2) transparent;
                }
                body {
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                }
            `;
            iframeDocument.head.appendChild(style);
            iframeDocument.body.style.overflowX = 'hidden';
            const links = iframeDocument.querySelectorAll('a');
            links.forEach((link: HTMLAnchorElement) => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });

            // Optimize images and setup Lightbox
            const images = iframeDocument.querySelectorAll('img');
            images.forEach((img: HTMLImageElement) => {
                // Image Optimization
                img.setAttribute('loading', 'lazy');
                img.setAttribute('decoding', 'async');

                // Lightbox setup
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Send to parent state
                    setLightboxImage(img.src);
                }, { capture: true });
            });

        } catch (err) {
            console.warn('Cross-origin restriction or style injection failed', err);
        }
        setLoading(false);
    };

    return (
        <>
            {/* Main Note Modal */}
            <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
                <DialogContent
                    className={cn(
                        "flex flex-col p-0 gap-0 border-border bg-card overflow-hidden transition-all duration-300",
                        isFullscreen
                            ? "w-screen h-dvh max-w-none rounded-none border-none"
                            : "w-full h-dvh sm:h-[95vh] sm:max-w-7xl sm:rounded-lg max-w-[100vw]"
                    )}
                    onInteractOutside={(e) => {
                        // Prevent closing when interacting with lightbox if it were somehow sharing events,
                        // though separate DialogPortal handles this better now.
                        // Keeping safety check just in case.
                        if (lightboxImage) {
                            e.preventDefault();
                        }
                    }}
                >
                    <div className="flex items-center p-3 sm:px-6 sm:py-4 border-b border-border bg-card/50 shrink-0 gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between w-full">
                                <DialogHeader className="text-left space-y-0 p-0">
                                    <DialogTitle className="text-base sm:text-xl font-bold text-foreground leading-tight wrap-break-word pr-1 flex items-center gap-2">
                                        {Icon && <Icon size={24} className="text-primary shrink-0" />}
                                        <span className="text-subcourse">{courseName}</span>
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        {courseName} ders notları ve içeriği.
                                    </DialogDescription>
                                </DialogHeader>

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

                    <div className="flex-1 bg-background/30 relative flex items-center justify-center overflow-hidden">
                        {!loading && !error && (
                            <iframe
                                src={notePath}
                                className="w-full h-full border-0 bg-transparent rounded-b-lg"
                                title={`${courseName} Notes`}
                                loading="lazy"
                                onLoad={handleIframeLoad}
                            />
                        )}
                        {loading && !error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-primary bg-background/80 z-10">
                                <Loader2 className="animate-spin" size={48} />
                                <p className="text-lg font-medium text-foreground">Notlar yükleniyor...</p>
                            </div>
                        )}
                        {error && (
                            <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-6 py-12 animate-in fade-in zoom-in duration-500 text-center shrink-0">
                                <div className="w-full space-y-8">
                                    <div className="text-center space-y-4">
                                        <div className="relative inline-flex">
                                            <div className="w-20 h-20 bg-muted/50 text-muted-foreground rounded-3xl flex items-center justify-center relative z-10 border border-border shadow-inner">
                                                <FileQuestion size={40} strokeWidth={1.5} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-3xl font-bold tracking-tight text-foreground">Ders Notu Hazır Değil</h3>
                                            <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
                                                Bu ders için içerik henüz eklenmemiş. Lütfen daha sonra tekrar kontrol edin.
                                            </p>
                                        </div>
                                        <div className="pt-4">
                                            <Button
                                                onClick={onClose}
                                                variant="outline"
                                                className="rounded-xl px-8 py-6 h-auto font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                            >
                                                Kapat
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Lightbox
                src={lightboxImage}
                onClose={() => setLightboxImage(null)}
            />
        </>
    );
}
