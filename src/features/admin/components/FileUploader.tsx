import { useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
    onUpload: (file: File) => Promise<void>;
    isLoading: boolean;
    accept?: string;
}

export function FileUploader({ onUpload, isLoading, accept = '.docx,.doc' }: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const validateFile = (file: File): boolean => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'docx' && ext !== 'doc') {
            setError('Sadece Word dosyaları (.docx, .doc) kabul edilir.');
            return false;
        }
        setError(null);
        return true;
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        try {
            await onUpload(selectedFile);
            setSelectedFile(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Yükleme hatası');
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        setError(null);
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                    "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200",
                    dragActive
                        ? "border-primary bg-emerald/10"
                        : "border-white/20 hover:border-white/40 bg-white/5",
                    isLoading && "opacity-50 pointer-events-none"
                )}
            >
                <input
                    type="file"
                    accept={accept}
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading}
                />

                <div className="flex flex-col items-center gap-3">
                    <div className={cn(
                        "p-4 rounded-2xl transition-colors",
                        dragActive ? "bg-emerald/20" : "bg-white/10"
                    )}>
                        <Upload size={32} className={cn(
                            "transition-colors",
                            dragActive ? "text-emerald" : "text-emerald/60"
                        )} />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-emerald/80">
                            Word dosyasını sürükleyip bırakın
                        </p>
                        <p className="text-sm text-emerald/50 mt-1">
                            veya dosya seçmek için tıklayın
                        </p>
                    </div>
                    <span className="text-xs text-emerald/40 bg-white/5 px-3 py-1 rounded-full">
                        .docx, .doc
                    </span>
                </div>
            </div>

            {/* Selected File */}
            {selectedFile && (
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="p-2 bg-emerald/20 rounded-lg">
                        <FileText size={20} className="text-emerald" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-emerald truncate">
                            {selectedFile.name}
                        </p>
                        <p className="text-xs text-emerald/50">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                    <button
                        onClick={clearFile}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={16} className="text-emerald/60" />
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Upload Button */}
            {selectedFile && !error && (
                <button
                    onClick={handleUpload}
                    disabled={isLoading}
                    className={cn(
                        "w-full py-3 px-4 rounded-xl font-medium transition-all",
                        "bg-linear-to-r from-primary to-primary/80",
                        "hover:opacity-90 disabled:opacity-50",
                        "text-emerald shadow-lg shadow-primary/20"
                    )}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⏳</span>
                            Dönüştürülüyor...
                        </span>
                    ) : (
                        'Markdown\'a Dönüştür'
                    )}
                </button>
            )}
        </div>
    );
}
