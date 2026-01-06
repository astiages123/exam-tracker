/**
 * Content Pipeline - Tip Tanımları
 * =================================
 * Pipeline'a özgü dahili tipler.
 */

import type { ContentBlock } from '../features/course/types/content';

// =====================================================
// PARSER TYPES
// =====================================================

/**
 * Parser konfigürasyonu
 */
export interface ParserConfig {
    /** Örnek kartı regex pattern'leri */
    examplePatterns: RegExp[];

    /** Soru kartı regex pattern'leri */
    questionPatterns: RegExp[];

    /** Çözüm kartı regex pattern'leri */
    solutionPatterns: RegExp[];

    /** Başlık prefix'lerini temizle */
    cleanHeadingPrefixes: boolean;

    /** Boş paragrafları kaldır */
    removeEmptyParagraphs: boolean;
}

/**
 * Varsayılan parser konfigürasyonu
 */
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
    examplePatterns: [
        /^Örnek\s+(\d+)\s*:\s*(.*)/i,           // Örnek 1: ...
        /^Örnek\s*:\s*(.*)/i,                     // Örnek: ...
        /^Örnekler\s+(\d+)\s*:\s*(.*)/i,          // Örnekler 1: ...
        /^\*\*Örnek\s+(\d+):\*\*\s*(.*)/i,        // **Örnek 1:** ...
        /^\*\*Örnek:\*\*\s*(.*)/i,                // **Örnek:** ...
    ],
    questionPatterns: [
        /^Soru\s+(\d+)\s*:\s*(.*)/i,
        /^Soru\s*:\s*(.*)/i,
        /^\*\*Soru\s+(\d+):\*\*\s*(.*)/i,
    ],
    solutionPatterns: [
        /^Çözüm\s*:\s*(.*)/i,
        /^Cevap\s*:\s*(.*)/i,
        /^Yanıt\s*:\s*(.*)/i,
        /^\*\*Çözüm:\*\*\s*(.*)/i,
        /^\*\*Cevap:\*\*\s*(.*)/i,
    ],
    cleanHeadingPrefixes: true,
    removeEmptyParagraphs: true,
};

// =====================================================
// AST TYPES
// =====================================================

/**
 * HTML AST düğümü (basitleştirilmiş)
 */
export interface HtmlNode {
    type: 'element' | 'text' | 'root';
    tagName?: string;
    children?: HtmlNode[];
    value?: string;
    properties?: Record<string, unknown>;
}

/**
 * Parser durumu (state machine için)
 */
export interface ParserState {
    currentCard: ContentBlock | null;
    blocks: ContentBlock[];
    cardStack: ContentBlock[];
}

// =====================================================
// DETECTION TYPES
// =====================================================

/**
 * Tespit edilen kart tipi
 */
export interface DetectedCard {
    type: 'example' | 'question' | 'solution';
    title: string;
    number?: string;
    extra?: string;
}

/**
 * Tespit sonucu
 */
export type DetectionResult =
    | { detected: true; card: DetectedCard }
    | { detected: false };

// =====================================================
// FILE TYPES
// =====================================================

/**
 * İşlenecek dosya bilgisi
 */
export interface SourceFile {
    /** Dosya adı (basename) */
    name: string;

    /** Tam yol */
    path: string;

    /** Ders ID'si */
    lessonId: string;

    /** Dosya içeriği */
    content: string;

    /** Markdown dosyası mı? */
    isMarkdown?: boolean;

    /** Orijinal klasör adı */
    originalDirName?: string;
}

/**
 * Pipeline çıktısı
 */
export interface PipelineResult {
    success: boolean;
    lessonId: string;
    blockCount: number;
    errors: string[];
    warnings: string[];
}
