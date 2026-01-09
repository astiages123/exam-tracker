/**
 * Admin API Client
 * API çağrıları için wrapper fonksiyonları
 */

const API_BASE = 'http://localhost:3001/api';

export interface InputFile {
    name: string;
    hasMarkdown: boolean;
    mediaCount: number;
}

export interface ConvertResult {
    success: boolean;
    message: string;
    outputFolder: string;
    markdownFile: string;
    stats: {
        imagesConverted: number;
        cwebpAvailable: boolean;
    };
}

export interface HealthStatus {
    status: string;
    dependencies: {
        pandoc: boolean;
        cwebp: boolean;
    };
}

/**
 * Sunucu sağlık durumunu kontrol eder
 */
export async function checkHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Sunucu bağlantısı başarısız');
    return res.json();
}

/**
 * Word dosyasını Markdown'a dönüştürür
 */
export async function convertDocx(file: File): Promise<ConvertResult> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/convert-docx`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        let errorMsg = 'Dönüşüm başarısız';
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            errorMsg = error.error || errorMsg;
        } else {
            errorMsg = `Sunucu hatası (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMsg);
    }

    return res.json();
}

/**
 * npm run content:build çalıştırır
 */
export async function runContentBuild(): Promise<{ success: boolean; output: string }> {
    const res = await fetch(`${API_BASE}/content-build`, {
        method: 'POST'
    });

    if (!res.ok) {
        let errorMsg = 'Content build başarısız';
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            errorMsg = error.error || errorMsg;
        } else {
            errorMsg = `Sunucu hatası (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMsg);
    }

    return res.json();
}

/**
 * npm run process:seed çalıştırır
 */
export async function runSeedDb(): Promise<{ success: boolean; output: string }> {
    const res = await fetch(`${API_BASE}/seed-db`, {
        method: 'POST'
    });

    if (!res.ok) {
        let errorMsg = 'Seed başarısız';
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            errorMsg = error.error || errorMsg;
        } else {
            errorMsg = `Sunucu hatası (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMsg);
    }

    return res.json();
}

/**
 * Input dosyalarını listeler
 */
export async function getInputFiles(): Promise<InputFile[]> {
    const res = await fetch(`${API_BASE}/input-files`);
    if (!res.ok) throw new Error('Dosya listesi alınamadı');
    const data = await res.json();
    return data.files;
}
/**
 * Kursu siler
 */
export async function deleteCourse(name: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/delete-course/${name}`, {
        method: 'DELETE'
    });

    if (!res.ok) {
        let errorMsg = 'Silme işlemi başarısız';
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            errorMsg = error.error || errorMsg;
        } else {
            errorMsg = `Sunucu hatası (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMsg);
    }

    return res.json();
}
