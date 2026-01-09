import { useState, useEffect } from 'react';
import {
    Settings,
    FileText,
    Database,
    Play,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Loader2,
    Trash2,
    FolderOpen,
    Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileUploader } from './FileUploader';
import {
    checkHealth,
    convertDocx,
    runContentBuild,
    runSeedDb,
    getInputFiles,
    deleteCourse,
    type InputFile,
    type HealthStatus
} from '../api/adminApi';
import ConfirmModal from '@/components/ui/ConfirmModal';

type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

interface Operation {
    status: OperationStatus;
    message: string;
}

export default function AdminDashboard() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
    const [deletingName, setDeletingName] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; name: string | null }>({
        isOpen: false,
        name: null
    });
    const [uploadOp, setUploadOp] = useState<Operation>({ status: 'idle', message: '' });
    const [buildOp, setBuildOp] = useState<Operation>({ status: 'idle', message: '' });
    const [seedOp, setSeedOp] = useState<Operation>({ status: 'idle', message: '' });

    // Check server health on mount
    useEffect(() => {
        checkHealth()
            .then(setHealth)
            .catch(() => setHealth(null));

        refreshFiles();
    }, []);

    const refreshFiles = async () => {
        try {
            const files = await getInputFiles();
            setInputFiles(files);
        } catch (e) {
            console.error('Failed to get input files:', e);
        }
    };

    const handleUpload = async (file: File) => {
        setUploadOp({ status: 'loading', message: 'Dönüştürülüyor...' });
        try {
            // 1. Convert Word to Markdown
            const result = await convertDocx(file);
            setUploadOp({
                status: 'loading',
                message: `✓ Word dönüştürüldü. Pipeline başlatılıyor...`
            });

            // 2. Run Content Build
            setBuildOp({ status: 'loading', message: 'JSON üretiliyor...' });
            await runContentBuild();
            setBuildOp({ status: 'success', message: '✓ Content build tamamlandı' });

            // 3. Run Seed DB
            setSeedOp({ status: 'loading', message: 'Veritabanı güncelleniyor...' });
            await runSeedDb();
            setSeedOp({ status: 'success', message: '✓ Veritabanı güncellendi' });

            setUploadOp({
                status: 'success',
                message: `✓ İşlem tamam: ${result.message}`
            });

            refreshFiles();
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Bir hata oluştu';
            setUploadOp({ status: 'error', message: errorMsg });
            console.error('Pipeline error:', e);
        }
    };

    const handleContentBuild = async () => {
        setBuildOp({ status: 'loading', message: 'Content build çalışıyor...' });
        try {
            await runContentBuild();
            setBuildOp({ status: 'success', message: '✓ Content build tamamlandı' });
        } catch (e) {
            setBuildOp({
                status: 'error',
                message: e instanceof Error ? e.message : 'Build hatası'
            });
        }
    };

    const handleSeedDb = async () => {
        setSeedOp({ status: 'loading', message: 'Veritabanı güncelleniyor...' });
        try {
            await runSeedDb();
            setSeedOp({ status: 'success', message: '✓ Veritabanı güncellendi' });
        } catch (e) {
            setSeedOp({
                status: 'error',
                message: e instanceof Error ? e.message : 'Seed hatası'
            });
        }
    };

    const handleDeleteCourse = (name: string) => {
        setConfirmModal({ isOpen: true, name });
    };

    const confirmDelete = async () => {
        const name = confirmModal.name;
        if (!name) return;

        setConfirmModal({ isOpen: false, name: null });
        setDeletingName(name);
        try {
            await deleteCourse(name);
            await refreshFiles();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Silme hatası');
        } finally {
            setDeletingName(null);
        }
    };

    const StatusIcon = ({ status }: { status: OperationStatus }) => {
        switch (status) {
            case 'loading': return <Loader2 size={16} className="animate-spin text-emerald" />;
            case 'success': return <CheckCircle size={16} className="text-green-400" />;
            case 'error': return <AlertCircle size={16} className="text-red-400" />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-linear-to-br from-primary/20 to-primary/10 border border-primary/20">
                        <Settings size={28} className="text-emerald" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-emerald">Admin Dashboard</h1>
                        <p className="text-sm text-emerald/85">İçerik yönetimi ve pipeline kontrolü</p>
                    </div>
                </div>

                {/* Server Status */}
                <div className={cn(
                    "p-4 rounded-xl border flex items-center gap-3",
                    health
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-red-500/10 border-red-500/20"
                )}>
                    {health ? (
                        <>
                            <CheckCircle size={20} className="text-green-400" />
                            <div className="flex-1">
                                <span className="text-sm text-emerald">Sunucu bağlantısı aktif</span>
                                <div className="flex gap-4 mt-1">
                                    <span className="text-xs text-emerald/75">
                                        pandoc: {health.dependencies.pandoc ? '✓' : '✗'}
                                    </span>
                                    <span className="text-xs text-emerald/75">
                                        cwebp: {health.dependencies.cwebp ? '✓' : '✗'}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <AlertCircle size={20} className="text-red-400" />
                            <span className="text-sm text-emerald">
                                Sunucu bağlantısı yok.
                                <code className="ml-2 text-xs bg-black/20 px-2 py-0.5 rounded">
                                    npm run server
                                </code>
                            </span>
                        </>
                    )}
                </div>

                {/* File Uploader */}
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                    <h2 className="text-lg font-semibold text-emerald mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-emerald" />
                        Word → Markdown Dönüştürücü
                    </h2>
                    <FileUploader
                        onUpload={handleUpload}
                        isLoading={uploadOp.status === 'loading'}
                    />
                    {uploadOp.status !== 'idle' && (
                        <div className={cn(
                            "mt-4 p-3 rounded-xl flex items-center gap-2 text-sm",
                            uploadOp.status === 'success' && "bg-green-500/10 text-green-400",
                            uploadOp.status === 'error' && "bg-red-500/10 text-red-400",
                            uploadOp.status === 'loading' && "bg-emerald/10 text-emerald"
                        )}>
                            <StatusIcon status={uploadOp.status} />
                            {uploadOp.message}
                        </div>
                    )}
                </div>

                {/* Input Files */}
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-emerald flex items-center gap-2">
                            <FolderOpen size={20} className="text-emerald" />
                            Mevcut Dersler
                        </h2>
                        <button
                            onClick={refreshFiles}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <RefreshCw size={16} className="text-emerald/85" />
                        </button>
                    </div>
                    {inputFiles.length === 0 ? (
                        <p className="text-sm text-emerald/75 text-center py-4">
                            Henüz ders dosyası yok
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            {inputFiles.map((file) => (
                                <div
                                    key={file.name}
                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl group"
                                >
                                    <FileText size={18} className="text-emerald/85" />
                                    <span className="flex-1 text-sm text-emerald truncate">
                                        {file.name}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        {file.hasMarkdown && (
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                                .md
                                            </span>
                                        )}
                                        {file.mediaCount > 0 && (
                                            <span className="text-xs text-emerald/75 flex items-center gap-1">
                                                <ImageIcon size={12} />
                                                {file.mediaCount}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteCourse(file.name)}
                                            disabled={deletingName === file.name}
                                            className="p-1.5 text-emerald/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                            title="Dersi Sil"
                                        >
                                            {deletingName === file.name ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pipeline Actions */}
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Content Build */}
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                        <h3 className="font-semibold text-emerald mb-2 flex items-center gap-2">
                            <Play size={18} className="text-emerald" />
                            Content Build
                        </h3>
                        <p className="text-sm text-emerald/75 mb-4">
                            Markdown dosyalarını JSON'a dönüştür
                        </p>
                        <button
                            onClick={handleContentBuild}
                            disabled={buildOp.status === 'loading' || !health}
                            className={cn(
                                "w-full py-2.5 px-4 rounded-xl font-medium transition-all",
                                "bg-linear-to-r from-blue-500 to-blue-600",
                                "hover:opacity-90 disabled:opacity-50",
                                "text-emerald shadow-lg shadow-blue-500/20"
                            )}
                        >
                            {buildOp.status === 'loading' ? 'Çalışıyor...' : 'Content Build'}
                        </button>
                        {buildOp.status !== 'idle' && (
                            <div className={cn(
                                "mt-3 p-2 rounded-lg flex items-center gap-2 text-xs",
                                buildOp.status === 'success' && "bg-green-500/10 text-green-400",
                                buildOp.status === 'error' && "bg-red-500/10 text-red-400",
                                buildOp.status === 'loading' && "bg-blue-500/10 text-blue-400"
                            )}>
                                <StatusIcon status={buildOp.status} />
                                {buildOp.message}
                            </div>
                        )}
                    </div>

                    {/* Seed Database */}
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                        <h3 className="font-semibold text-emerald mb-2 flex items-center gap-2">
                            <Database size={18} className="text-emerald" />
                            Seed Database
                        </h3>
                        <p className="text-sm text-emerald/75 mb-4">
                            JSON verilerini veritabanına yükle
                        </p>
                        <button
                            onClick={handleSeedDb}
                            disabled={seedOp.status === 'loading' || !health}
                            className={cn(
                                "w-full py-2.5 px-4 rounded-xl font-medium transition-all",
                                "bg-linear-to-r from-purple-500 to-purple-600",
                                "hover:opacity-90 disabled:opacity-50",
                                "text-emerald shadow-lg shadow-purple-500/20"
                            )}
                        >
                            {seedOp.status === 'loading' ? 'Çalışıyor...' : 'Seed Database'}
                        </button>
                        {seedOp.status !== 'idle' && (
                            <div className={cn(
                                "mt-3 p-2 rounded-lg flex items-center gap-2 text-xs",
                                seedOp.status === 'success' && "bg-green-500/10 text-green-400",
                                seedOp.status === 'error' && "bg-red-500/10 text-red-400",
                                seedOp.status === 'loading' && "bg-purple-500/10 text-purple-400"
                            )}>
                                <StatusIcon status={seedOp.status} />
                                {seedOp.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-emerald/65 pt-4">
                    Admin Dashboard v1.0 • Express Server @ localhost:3001
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title="Dersi Sil"
                message={`${confirmModal.name} dersini ve tüm dosyalarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmModal({ isOpen: false, name: null })}
                confirmText="Dersi Sil"
                cancelText="Vazgeç"
                variant="destructive"
            />
        </div>
    );
}
