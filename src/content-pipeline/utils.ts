/**
 * Content Pipeline - Yardımcı Fonksiyonlar
 * =========================================
 */

import * as cheerio from 'cheerio';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { BlockType } from '../features/course/types/content';


// =====================================================
// ID GENERATION
// =====================================================

let blockCounter = 0;

/**
 * Benzersiz block ID'si oluşturur
 */
export function generateBlockId(prefix: string = 'block'): string {
    return `${prefix}_${++blockCounter}_${Date.now().toString(36)}`;
}

/**
 * Counter'ı sıfırla (yeni dosya işlerken)
 */
export function resetBlockCounter(): void {
    blockCounter = 0;
}

/**
 * Slug oluşturur (Türkçe karakter desteği)
 */
export function slugify(text: string): string {
    const trMap: Record<string, string> = {
        'İ': 'i', 'I': 'i', 'ı': 'i',
        'Ş': 's', 'ş': 's',
        'Ğ': 'g', 'ğ': 'g',
        'Ü': 'u', 'ü': 'u',
        'Ö': 'o', 'ö': 'o',
        'Ç': 'c', 'ç': 'c',
    };

    let result = text;
    for (const [from, to] of Object.entries(trMap)) {
        result = result.replace(new RegExp(from, 'g'), to);
    }

    return result
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)
        .replace(/^-|-$/g, '');
}

/**
 * Veritabanından ders ID'sini bulur (courses.json)
 */
export function findCourseIdByName(courseName: string): string | null {
    try {
        const dbPath = join(process.cwd(), 'src/features/course/data/courses.json');

        if (!existsSync(dbPath)) return null;

        const data = readFileSync(dbPath, 'utf-8');
        const categories = JSON.parse(data);

        // Normalizasyon fonksiyonu
        const normalize = (s: string) => {
            const trMap: Record<string, string> = {
                'İ': 'i', 'I': 'i', 'ı': 'i',
                'Ş': 's', 'ş': 's',
                'Ğ': 'g', 'ğ': 'g',
                'Ü': 'u', 'ü': 'u',
                'Ö': 'o', 'ö': 'o',
                'Ç': 'c', 'ç': 'c',
            };
            let res = s;
            for (const [from, to] of Object.entries(trMap)) {
                res = res.replace(new RegExp(from, 'g'), to);
            }
            return res.toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        const target = normalize(courseName);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const category of categories as any[]) {
            if (!category.courses) continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const course of category.courses as any[]) {
                // lessonType öncelikli
                if (course.lessonType && normalize(course.lessonType) === target) {
                    return course.id;
                }
            }
        }
    } catch (e) {
        // Hata durumunda sessizce null dön
    }
    return null;
}

// =====================================================
// HTML UTILITIES
// =====================================================

/**
 * HTML'den text içeriği çıkarır
 */
export function extractText(html: string): string {
    const $ = cheerio.load(html);
    return $.text().trim();
}

/**
 * HTML elementinin boş olup olmadığını kontrol eder
 */
export function isEmptyElement(html: string): boolean {
    const text = extractText(html);

    // Eğer metin varsa boş değildir
    if (text.length > 0) return false;

    // Metin yoksa ama medya/yapısal elementler varsa boş değildir
    const hasMediaOrStructure = /<(img|table|iframe|video|canvas|svg|math|div[^>]*class=["']math)/i.test(html);
    return !hasMediaOrStructure;
}

/**
 * Başlık prefix'ini temizler (A. B. 1. 2. gibi)
 */
export function cleanHeadingPrefix(text: string): string {
    return text.replace(/^[A-Z0-9]+\.\s*/, '').trim();
}

/**
 * HTML tag adından BlockType çıkarır
 */
export function tagToBlockType(tagName: string): BlockType {
    const tag = tagName.toLowerCase();

    const mapping: Record<string, BlockType> = {
        'p': 'paragraph',
        'h1': 'heading',
        'h2': 'heading',
        'h3': 'heading',
        'h4': 'heading',
        'h5': 'heading',
        'h6': 'heading',
        'table': 'table',
        'ul': 'list',
        'ol': 'list',
        'blockquote': 'blockquote',
        'img': 'image',
    };

    return mapping[tag] || 'raw-html';
}

/**
 * Heading seviyesini çıkarır
 */
export function getHeadingLevel(tagName: string): 1 | 2 | 3 | 4 | 5 | 6 | undefined {
    const match = tagName.match(/^h([1-6])$/i);
    if (match) {
        return parseInt(match[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
    }
    return undefined;
}

// =====================================================
// MATH UTILITIES
// =====================================================

/**
 * LaTeX içeriyor mu kontrol eder
 */
export function hasLatex(html: string): boolean {
    return html.includes('\\(') ||
        html.includes('\\[') ||
        html.includes('class="math"');
}

/**
 * Display math içeriyor mu
 */
export function hasDisplayMath(html: string): boolean {
    return html.includes('\\[') ||
        html.includes('math display');
}

// =====================================================
// WORD COUNT
// =====================================================

/**
 * Kelime sayısını hesaplar
 */
export function countWords(text: string): number {
    return text
        .replace(/<[^>]*>/g, '') // HTML tag'lerini kaldır
        .replace(/\s+/g, ' ')    // Boşlukları normalize et
        .trim()
        .split(' ')
        .filter(w => w.length > 0)
        .length;
}

// =====================================================
// IMAGE UTILITIES
// =====================================================

/**
 * HTML'den görsel yollarını çıkarır
 */
export function extractImagePaths(html: string): string[] {
    const $ = cheerio.load(html);
    const paths: string[] = [];

    $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            paths.push(src);
        }
    });

    return [...new Set(paths)];
}
