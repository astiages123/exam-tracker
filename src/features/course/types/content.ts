/**
 * Content Types - İçerik Blok Tipleri
 * ====================================
 * Bu dosya, içerik pipeline'ından gelen verilerin tiplerini tanımlar.
 * Frontend bu tipleri kullanarak içeriği render eder.
 */

// =====================================================
// BLOCK TYPES
// =====================================================

/**
 * Desteklenen içerik blok tipleri
 */
export type BlockType =
    | 'paragraph'      // Normal paragraf
    | 'heading'        // Başlık (h1-h6)
    | 'example'        // Örnek kartı
    | 'question'       // Soru kartı
    | 'solution'       // Çözüm kartı
    | 'table'          // Tablo
    | 'math'           // LaTeX formül (display)
    | 'math-inline'    // LaTeX formül (inline)
    | 'image'          // Görsel
    | 'list'           // Liste (ul/ol)
    | 'blockquote'     // Alıntı bloğu
    | 'raw-html';      // Ham HTML (fallback)

/**
 * Tek bir içerik bloğu
 */
export interface ContentBlock {
    /** Benzersiz blok ID'si */
    id: string;

    /** Blok tipi */
    type: BlockType;

    /** İçerik (HTML veya düz metin) */
    content: string;

    /** Başlık seviyesi (sadece 'heading' tipi için) */
    level?: 1 | 2 | 3 | 4 | 5 | 6;

    /** Alt bloklar (örnek/soru kartları için) */
    children?: ContentBlock[];

    /** Ek meta veriler */
    metadata?: {
        title?: string;         // Kart başlığı
        number?: string;        // "Örnek 1" gibi numara
        imageCount?: number;    // İçerideki görsel sayısı
        hasFormula?: boolean;   // LaTeX formül içeriyor mu?
        [key: string]: unknown;
    };
}

// =====================================================
// PARSED CONTENT
// =====================================================

/**
 * İşlenmiş ders içeriği
 */
export interface ParsedLesson {
    /** Benzersiz ders ID'si (örn: "hukuk_3") */
    id: string;

    /** Ders başlığı */
    title: string;

    /** Ders tipi/kategorisi */
    lessonType: string;

    /** İçerik blokları */
    blocks: ContentBlock[];

    /** Görsel dosya yolları */
    images: ImageMetadata[];

    /** Son güncelleme tarihi */
    updatedAt: string;

    /** İstatistikler */
    stats: {
        blockCount: number;
        exampleCount: number;
        questionCount: number;
        tableCount: number;
        imageCount: number;
        wordCount: number;
    };
}

/**
 * Görsel meta verileri
 */
export interface ImageMetadata {
    /** Görsel yolu (relative) */
    path: string;

    /** Dosya var mı? */
    exists: boolean;

    /** Genişlik (px) */
    width?: number;

    /** Yükseklik (px) */
    height?: number;

    /** Format (jpg, png, webp) */
    format?: string;

    /** Dosya boyutu (bytes) */
    sizeBytes?: number;

    /** Alt metin */
    alt?: string;
}

// =====================================================
// CONTENT DATA
// =====================================================

/**
 * Tüm içerik verisinin yapısı
 */
export interface ContentData {
    /** Tüm dersler */
    lessons: ParsedLesson[];

    /** Oluşturulma tarihi */
    generatedAt: string;

    /** Pipeline versiyonu */
    version: string;
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Block tipi guard fonksiyonları için
 */
export function isCardBlock(block: ContentBlock): boolean {
    return ['example', 'question', 'solution'].includes(block.type);
}

export function isTextBlock(block: ContentBlock): boolean {
    return ['paragraph', 'heading', 'blockquote'].includes(block.type);
}

export function isMediaBlock(block: ContentBlock): boolean {
    return ['image', 'table', 'math'].includes(block.type);
}
