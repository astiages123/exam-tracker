import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface LightboxProps {
    src: string | null;
    alt?: string;
    onClose: () => void;
}

export function Lightbox({ src, alt, onClose }: LightboxProps) {
    if (!src) return null;

    return (
        <Dialog open={!!src} onOpenChange={(open) => !open && onClose()}>
            <DialogPortal>
                {/* Custom high z-index overlay for Lightbox to appear above other modals */}
                <DialogOverlay className="z-[100] bg-black/95 backdrop-blur-xl" />
                <DialogContent className="z-[101] border-none bg-transparent shadow-none max-w-none w-screen h-screen flex items-center justify-center p-4 sm:p-10 pointer-events-none">
                    <div
                        className="relative group bg-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden pointer-events-auto flex items-center justify-center max-w-full max-h-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={src}
                            alt={alt || "Lightbox View"}
                            className="max-w-full max-h-[85vh] object-contain shadow-2xl"
                            decoding="async"
                        />
                        {/* Bottom caption pill */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl text-white/90 text-sm font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Şema Görünümü
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="fixed top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-white/70 hover:text-white pointer-events-auto focus:outline-none focus:ring-2 focus:ring-primary z-[102]"
                        title="Görseli Kapat"
                    >
                        <X size={24} />
                    </button>

                    {/* Hidden DialogClose to satisfy Radix requirements if needed, or simply handle via Overlay click which onOpenChange catches */}
                </DialogContent>
            </DialogPortal>
        </Dialog>
    );
}
