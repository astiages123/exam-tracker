#!/usr/bin/env node
/**
 * NotParser.js - HTML Ders Notları Parser (v2 - Image Enhanced)
 * 
 * HTML dosyalarını okur, h1/h2 etiketlerine göre bölümlere ayırır,
 * görsel meta verilerini toplar ve JSON formatına dönüştürür.
 */

import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { glob } from 'glob';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { dirname, basename, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =====================================================
// IMAGE PROCESSING UTILITIES
// =====================================================

/**
 * Markdown içeriğinden ve images dizisinden görsel yollarını çıkarır
 * @param {string} contentMd - Markdown içerik
 * @param {string[]} imagesArray - Mevcut images dizisi
 * @returns {string[]} - Benzersiz görsel yolları
 */
function extractImagePaths(contentMd, imagesArray = []) {
    const markdownImageRegex = /!\[.*?\]\(([^)]+)\)/g;
    const pathsFromMd = [];
    let match;

    while ((match = markdownImageRegex.exec(contentMd)) !== null) {
        pathsFromMd.push(match[1]);
    }

    // İki kaynağı birleştir ve benzersiz yap
    const allPaths = [...new Set([...imagesArray, ...pathsFromMd])];
    return allPaths.filter(p => p && !p.startsWith('http'));
}

/**
 * Görsel dosyasının meta verilerini toplar
 * @param {string} imagePath - Görsel yolu (relative to HTML file)
 * @param {string} basePath - HTML dosyasının bulunduğu dizin
 * @returns {Promise<Object>} - Görsel meta verileri
 */
async function getImageMetadata(imagePath, basePath) {
    const absolutePath = resolve(basePath, imagePath);

    const metadata = {
        path: imagePath,
        absolute_path: absolutePath,
        exists: false,
        missing: false,
        width: null,
        height: null,
        format: null,
        size_bytes: null,
        error: null
    };

    // Dosya var mı kontrol et
    if (!existsSync(absolutePath)) {
        metadata.missing = true;
        metadata.error = 'File not found';
        console.warn(`     ⚠️  Görsel bulunamadı: ${imagePath}`);
        return metadata;
    }

    try {
        // Dosya boyutu
        const stats = statSync(absolutePath);
        metadata.size_bytes = stats.size;
        metadata.exists = true;

        // Sharp ile görsel bilgilerini al
        const imageInfo = await sharp(absolutePath).metadata();
        metadata.width = imageInfo.width;
        metadata.height = imageInfo.height;
        metadata.format = imageInfo.format;

    } catch (error) {
        metadata.missing = true;
        metadata.error = `Invalid image: ${error.message}`;
        console.warn(`     ⚠️  Bozuk görsel: ${imagePath} - ${error.message}`);
    }

    return metadata;
}

/**
 * Görsel dosyasını Base64 formatına dönüştürür (Gemini API için)
 * Sharp ile optimize eder (max 800px genişlik)
 * NOT: Bu fonksiyon JSON'a yazılmaz, runtime'da çağrılır
 * 
 * @param {string} imagePath - Görsel dosya yolu (absolute)
 * @param {number} maxWidth - Maksimum genişlik (default: 800)
 * @returns {Promise<{base64: string, mimeType: string} | null>}
 */
async function convertToBase64(imagePath, maxWidth = 800) {
    if (!existsSync(imagePath)) {
        console.warn(`convertToBase64: Dosya bulunamadı - ${imagePath}`);
        return null;
    }

    try {
        // Sharp ile oku ve optimize et
        const image = sharp(imagePath);
        const metadata = await image.metadata();

        // Genişlik maxWidth'den büyükse resize et
        let processed = image;
        if (metadata.width && metadata.width > maxWidth) {
            processed = image.resize(maxWidth, null, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Format belirleme ve dönüştürme
        let buffer;
        let mimeType;

        if (metadata.format === 'webp') {
            buffer = await processed.webp({ quality: 80 }).toBuffer();
            mimeType = 'image/webp';
        } else if (metadata.format === 'png') {
            buffer = await processed.png({ quality: 80 }).toBuffer();
            mimeType = 'image/png';
        } else {
            // Default: JPEG
            buffer = await processed.jpeg({ quality: 80 }).toBuffer();
            mimeType = 'image/jpeg';
        }

        const base64 = buffer.toString('base64');

        return {
            base64,
            mimeType,
            originalWidth: metadata.width,
            originalHeight: metadata.height,
            optimizedSize: buffer.length
        };

    } catch (error) {
        console.error(`convertToBase64 hatası: ${imagePath} - ${error.message}`);
        return null;
    }
}

// Export for external use
export { convertToBase64, getImageMetadata, extractImagePaths };

// =====================================================
// TURNDOWN CONFIGURATION
// =====================================================

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
});

// GitHub Flavored Markdown desteği (tablolar)
turndownService.use(gfm);

// MathJax/LaTeX formüllerini koru
turndownService.addRule('mathDisplay', {
    filter: (node) => {
        return node.classList && node.classList.contains('math') && node.classList.contains('display');
    },
    replacement: (content, node) => {
        const latex = node.textContent.trim();
        return `\n$$${latex}$$\n`;
    }
});

turndownService.addRule('mathInline', {
    filter: (node) => {
        return node.classList && node.classList.contains('math') && node.classList.contains('inline');
    },
    replacement: (content, node) => {
        const latex = node.textContent.trim();
        return `$${latex}$`;
    }
});

// Görsel src'lerini topla
turndownService.addRule('images', {
    filter: 'img',
    replacement: (content, node) => {
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || 'Görsel';
        return `![${alt}](${src})`;
    }
});

// =====================================================
// PARSING FUNCTIONS
// =====================================================

/**
 * ID oluşturur (slug formatı)
 */
function createSlug(text, order, lessonType) {
    const cleanText = text
        .toLowerCase()
        .replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .substring(0, 30);

    const lessonSlug = lessonType
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .substring(0, 20);

    return `${lessonSlug}_${cleanText}_${order}`;
}

/**
 * İki heading arasındaki içeriği alır
 * @param {*} $ - Cheerio instance
 * @param {*} startEl - Başlangıç elementi
 * @param {string[]} stopTags - Durulacak tag'ler (h1, h2, h3, h4)
 */
function getContentBetweenHeadings($, startEl, stopTags = ['h1', 'h2']) {
    const content = [];
    let current = $(startEl).next();

    while (current.length > 0) {
        const tagName = current.prop('tagName')?.toLowerCase();

        // Durma koşulu: belirtilen tag'lerden birine ulaştık
        if (stopTags.includes(tagName)) {
            break;
        }

        content.push($.html(current));
        current = current.next();
    }

    return content.join('\n');
}

/**
 * HTML dosyasını parse eder (async - görsel metadata için)
 * H2, H3 ve H4 başlıklarını ayrı chunk olarak alır
 */
async function parseHtmlFile(filePath) {
    const html = readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    const fileDir = dirname(filePath);

    const sections = [];
    let currentLessonType = '';
    let order = 0;

    // İçerik alanını bul (main veya body)
    const contentArea = $('main.content').length ? $('main.content') : $('body');

    // h1 ana ders adı
    const h1 = contentArea.find('h1').first();
    if (h1.length) {
        currentLessonType = h1.text().trim();
    }

    // Sadece h2'leri topla (User request: h2 üzerinden parçalama)
    const allHeadings = contentArea.find('h2').toArray();

    console.log(`     📌 ${allHeadings.length} ana başlık bulundu (h2)`);

    for (const el of allHeadings) {
        const $el = $(el);
        let tagName = el.tagName.toLowerCase(); // Will be 'h2'
        let rawTitle = $el.text().trim();
        let title = rawTitle.replace(/^[A-Z0-9]+\.\s*/, '').trim();
        let startNode = el; // İçerik toplamaya normalde bu elementten sonra başlanır

        // ÖZEL KURAL: H2'den hemen sonra H3 geliyorsa (arada içerik yoksa), başlığı H3 yap
        const $next = $el.next();
        if ($next.length && $next.prop('tagName').toLowerCase() === 'h3') {
            const h3Title = $next.text().trim();
            console.log(`     👉 H2 atlandı, H3 alındı: "${title}" -> "${h3Title}"`);

            // Değişkenleri güncelle
            rawTitle = h3Title;
            tagName = 'h3';
            title = rawTitle.replace(/^[A-Z0-9]+\.\s*/, '').trim();
            startNode = $next[0]; // İçerik toplamaya h3'ten sonra başla
        }

        // Çok kısa başlıkları atla (boş veya sadece numara)
        if (title.length < 3) {
            console.log(`     ⏭️  Atlandı (çok kısa): "${rawTitle}"`);
            continue;
        }

        order++;

        // Diğer h2'ye veya h1'e kadar her şeyi al
        const stopTags = ['h1', 'h2'];

        // Bu heading ile sonraki aynı/üst seviye heading arasındaki içeriği al
        const htmlContent = getContentBetweenHeadings($, startNode, stopTags);

        // İçerik çok kısa ise atla (en az 50 karakter)
        if (htmlContent.length < 50) {
            console.log(`     ⏭️  Atlandı (içerik çok kısa): "${title}"`);
            order--; // Sırayı geri al
            continue;
        }

        // HTML içeriği Markdown'a dönüştür
        const contentMd = turndownService.turndown(htmlContent).trim();

        // Görselleri çıkar
        const $tempContainer = cheerio.load(htmlContent);
        const images = [];
        $tempContainer('img').each((_, img) => {
            const src = $tempContainer(img).attr('src');
            if (src) images.push(src);
        });

        // Tüm görsel yollarını çıkar (markdown + images dizisi)
        const allImagePaths = extractImagePaths(contentMd, images);

        // Görsel meta verilerini topla
        const imageMetadata = [];
        for (const imgPath of allImagePaths) {
            const meta = await getImageMetadata(imgPath, fileDir);
            imageMetadata.push(meta);
        }

        // İstatistikler
        const totalImages = imageMetadata.length;
        const missingImages = imageMetadata.filter(m => m.missing).length;

        sections.push({
            id: createSlug(title, order, currentLessonType),
            title: title,
            content_md: contentMd,
            lesson_type: currentLessonType,
            order: order,
            heading_level: tagName, // h2, h3 veya h4
            images: images,
            image_metadata: imageMetadata,
            image_stats: {
                total: totalImages,
                found: totalImages - missingImages,
                missing: missingImages
            }
        });
    }

    return sections;
}

// =====================================================
// MAIN FUNCTION
// =====================================================

async function main() {
    console.log('🔍 HTML dosyaları taranıyor...\n');

    const inputDir = join(__dirname, '../../public/content');

    if (!existsSync(inputDir)) {
        console.error('❌ public/notlar/ dizini bulunamadı!');
        process.exit(1);
    }

    // Tüm HTML dosyalarını bul
    const htmlFiles = await glob('**/*.html', {
        cwd: inputDir,
        absolute: true
    });

    if (htmlFiles.length === 0) {
        console.error('❌ Hiç HTML dosyası bulunamadı!');
        process.exit(1);
    }

    console.log(`📚 ${htmlFiles.length} HTML dosyası bulundu:\n`);

    const allSections = [];
    let totalImages = 0;
    let missingImages = 0;

    for (const filePath of htmlFiles) {
        const relativePath = relative(inputDir, filePath);
        console.log(`  📄 İşleniyor: ${relativePath}`);

        try {
            const sections = await parseHtmlFile(filePath);
            console.log(`     ✅ ${sections.length} bölüm parse edildi`);

            // İstatistikleri topla
            for (const section of sections) {
                totalImages += section.image_stats.total;
                missingImages += section.image_stats.missing;
            }

            allSections.push(...sections);
        } catch (error) {
            console.error(`     ❌ Hata: ${error.message}`);
        }
    }

    // JSON dosyasına yaz
    const outputPath = resolve(process.cwd(), 'output.json');
    writeFileSync(outputPath, JSON.stringify(allSections, null, 2), 'utf8');

    console.log(`\n✨ Tamamlandı!`);
    console.log(`📊 Toplam ${allSections.length} bölüm parse edildi`);
    console.log(`🖼️  Toplam ${totalImages} görsel bulundu (${missingImages} eksik)`);
    console.log(`💾 Çıktı: ${outputPath}`);
}

main().catch(console.error);
