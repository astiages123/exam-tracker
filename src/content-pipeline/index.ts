#!/usr/bin/env npx tsx
/**
 * Content Pipeline - Ana Giriş Noktası
 * =====================================
 * Markdown veya HTML dosyalarını işleyip JSON çıktısı üretir.
 *
 * Kullanım:
 *   npm run content:build
 *   npx tsx src/content-pipeline/index.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { ContentData, ParsedLesson } from '../features/course/types/content';
import type { SourceFile } from './types';
import { parseSourceFile } from './parser';
import { findCourseIdByName } from './utils';

// =====================================================
// CONFIGURATION
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Proje kök dizini
const PROJECT_ROOT = resolve(__dirname, '../..');

// Giriş ve çıkış dizinleri
const INPUT_DIR = join(PROJECT_ROOT, 'input');
const OUTPUT_DIR = join(PROJECT_ROOT, '.generated');
const OUTPUT_FILE = join(OUTPUT_DIR, 'content-data.json');
const PUBLIC_CONTENT_DIR = join(PROJECT_ROOT, 'public/content');

// Pipeline versiyonu
const VERSION = '2.1.0';

// =====================================================
// FILE DISCOVERY
// =====================================================

/**
 * İşlenecek Markdown veya HTML dosyalarını bulur
 */
function discoverSourceFiles(): SourceFile[] {
    const files: SourceFile[] = [];

    if (!existsSync(INPUT_DIR)) {
        console.error(`❌ Giriş dizini bulunamadı: ${INPUT_DIR}`);
        return files;
    }

    // Her alt dizini tara
    const entries = readdirSync(INPUT_DIR);

    for (const entry of entries) {
        const entryPath = join(INPUT_DIR, entry);
        const stat = statSync(entryPath);

        if (!stat.isDirectory()) continue;
        if (entry.startsWith('.')) continue;

        // Dizin içinde MD veya HTML dosyası ara (önce MD)
        const subEntries = readdirSync(entryPath);

        // Öncelik: .md > .mdx > .html > .htm
        let contentFile = subEntries.find(f => f.endsWith('.md'));
        if (!contentFile) contentFile = subEntries.find(f => f.endsWith('.mdx'));
        if (!contentFile) contentFile = subEntries.find(f => f.endsWith('.html') || f.endsWith('.htm'));

        if (!contentFile) {
            console.warn(`  ⚠️  ${entry} dizininde içerik dosyası bulunamadı`);
            continue;
        }

        const contentPath = join(entryPath, contentFile);
        const isMarkdown = contentFile.endsWith('.md') || contentFile.endsWith('.mdx');

        try {
            const content = readFileSync(contentPath, 'utf-8');

            // Lesson ID oluştur (slugify)
            const lessonId = slugifyLessonId(entry);

            files.push({
                name: contentFile,
                path: contentPath,
                lessonId,
                content,
                isMarkdown,
                originalDirName: entry,
            });
        } catch (error) {
            console.error(`  ❌ Dosya okunamadı: ${contentPath}`);
        }
    }

    return files;
}

/**
 * Ders ID'si için slug oluşturur
 */
function slugifyLessonId(name: string): string {
    // 1. Veritabanından kontrol et (Ders adı -> ID eşleşmesi)
    const dbId = findCourseIdByName(name);
    if (dbId) return dbId;

    // 2. Fallback: Standart slug oluşturma
    const trMap: Record<string, string> = {
        'İ': 'i', 'I': 'i', 'ı': 'i',
        'Ş': 's', 'ş': 's',
        'Ğ': 'g', 'ğ': 'g',
        'Ü': 'u', 'ü': 'u',
        'Ö': 'o', 'ö': 'o',
        'Ç': 'c', 'ç': 'c',
    };

    let result = name;
    for (const [from, to] of Object.entries(trMap)) {
        result = result.replace(new RegExp(from, 'g'), to);
    }

    return result
        .toLowerCase()
        .replace(/[^a-z0-9\s-_]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
        .substring(0, 50)
        .replace(/^_|_$/g, '');
}

// =====================================================
// MEDIA HANDLING
// =====================================================

/**
 * Medya dosyalarını public/content/<lessonId>/media/ klasörüne kopyalar
 */
function copyMediaFiles(sourceDir: string, lessonId: string): number {
    const mediaSourceDir = join(sourceDir, 'media');
    const mediaTargetDir = join(PUBLIC_CONTENT_DIR, lessonId, 'media');

    if (!existsSync(mediaSourceDir)) {
        return 0;
    }

    // Hedef klasörü oluştur
    mkdirSync(mediaTargetDir, { recursive: true });

    let count = 0;
    const files = readdirSync(mediaSourceDir);

    for (const file of files) {
        const sourcePath = join(mediaSourceDir, file);
        const targetPath = join(mediaTargetDir, file);

        if (statSync(sourcePath).isFile()) {
            copyFileSync(sourcePath, targetPath);
            count++;
        }
    }

    return count;
}

/**
 * İşlenmiş HTML'i public/content/<lessonId>/<lessonId>.html olarak kaydeder
 */
function writeProcessedHtml(lessonId: string, lesson: ParsedLesson): void {
    const targetDir = join(PUBLIC_CONTENT_DIR, lessonId);
    const targetPath = join(targetDir, `${lessonId}.html`);

    // Klasörü oluştur
    mkdirSync(targetDir, { recursive: true });

    // HTML içeriği oluştur
    const htmlContent = generateHtmlFromBlocks(lesson);

    // Dosyaya yaz
    writeFileSync(targetPath, htmlContent, 'utf-8');
}

/**
 * Block'lardan HTML içeriği oluşturur
 */
function generateHtmlFromBlocks(lesson: ParsedLesson): string {
    const blocksHtml = lesson.blocks.map(block => {
        // Kart tipi bloklar için wrapper
        if (block.type === 'example' || block.type === 'question' || block.type === 'solution') {
            const cardClass = `note-card ${block.type}-card`;
            const titleClass = `${block.type}-title`;
            const titleRaw = block.metadata?.title || block.type;
            const number = block.metadata?.number ? ` ${block.metadata.number}` : '';
            let finalTitleHtml = `${titleRaw}${number}`;

            // Unescape HTML entities for processing to find colon correctly if needed? 
            // Actually metadata title has &quot; from parser. 
            // Simplest check: split by first colon if exists.

            // "Örnek 1: ..." formatını yakala
            // Ancak &quot; gibi entityler olabilir, dikkat.
            // colon clean text içinde aranmalı.

            // Basitçe ilk ':' işaretine göre ayıralım.
            const colonIndex = finalTitleHtml.indexOf(':');
            if (colonIndex > -1) {
                const prefix = finalTitleHtml.substring(0, colonIndex + 1); // "Örnek 1:"
                const rest = finalTitleHtml.substring(colonIndex + 1);      // " Açıklama..."
                finalTitleHtml = `<strong>${prefix}</strong>${rest}`;
            } else {
                finalTitleHtml = `<strong>${finalTitleHtml}</strong>`;
            }

            let childrenHtml = '';
            if (block.children && block.children.length > 0) {
                childrenHtml = block.children.map(c => c.content).join('\n');
            } else if (block.content) {
                childrenHtml = block.content;
            }

            return `<div class="${cardClass}">
  <span class="${titleClass}">${finalTitleHtml}</span>
  <div class="${block.type}-content">
    ${childrenHtml}
  </div>
</div>`;
        }

        // Diğer bloklar için içeriği doğrudan döndür
        return block.content;
    }).join('\n\n');

    // Sidebar (ToC) Oluşturma
    let sidebarHtml = '';
    const headings: { id: string; title: string; level: number }[] = [];

    // Başlıkları topla
    lesson.blocks.forEach(block => {
        if (block.type === 'heading') {
            // ID'yi content'ten çıkar: <h2 id="...">
            const idMatch = block.content.match(/id="([^"]+)"/);
            // Level'i content'ten çıkar veya block.level varsa onu kullan
            // Parser level'i sağlıyor mu? Types kontrolü yapmadık ama parser.ts'de level property'si var.
            // Güvenlik için content'ten de bakabiliriz: <h(N)
            const levelMatch = block.content.match(/<h([1-6])/);

            if (idMatch && levelMatch) {
                headings.push({
                    id: idMatch[1],
                    title: block.metadata?.title || block.content.replace(/<[^>]+>/g, '').trim(),
                    level: parseInt(levelMatch[1])
                });
            }
        }
    });

    if (headings.length > 0) {
        let currentLevel = 1; // Başlangıç seviyesi (genelde h2'den başlarız ama h1 de olabilir)
        const tocBuilder: string[] = ['<div class="sidebar">', '<h3>İÇİNDEKİLER</h3>', '<ul class="toc-list">'];

        // H1 genellikle sayfa başlığıdır, ToC'a dahil etmeyelim mi? 
        // Kullanıcı CSS'inde h1 ToC'da yok gibi duruyor ama biz yine de hepsini alalım.
        // Genelde H1 (Ders Başlığı) ToC'da olmaz, H2, H3 ve H4 olur.
        // Filtreleyelim: Sadece H2, H3 ve H4'leri alalım
        const relevantHeadings = headings.filter(h => h.level > 1 && h.level <= 4);

        if (relevantHeadings.length > 0) {
            let openLists = 0; // Açık olan sublist sayısı

            relevantHeadings.forEach((h, index) => {
                // İlk eleman için işlem yapma
                if (index === 0) {
                    tocBuilder.push(`<li><a href="#${h.id}">${h.title}</a>`);
                    currentLevel = h.level;
                    return;
                }

                if (h.level > currentLevel) {
                    // Alt liste aç
                    tocBuilder.push(`<ul class="toc-sublist">`);
                    tocBuilder.push(`<li><a href="#${h.id}">${h.title}</a>`);
                    openLists++;
                    currentLevel = h.level;
                } else if (h.level < currentLevel) {
                    // Listeyi kapat
                    // Fark kadar kapat
                    // Basit implementasyon: Sadece 1 seviye fark bekliyoruz (h2 -> h3 -> h2)
                    // H3 -> H2 ise 1 tane kapat.
                    // H4 -> H2 ise 2 tane kapat.
                    while (openLists > 0 && currentLevel > h.level) {
                        tocBuilder.push(`</li></ul>`);
                        openLists--;
                        currentLevel--;
                        // Note: level takibi tam doğru olmayabilir ama h2/h3 için yeterli
                    }
                    // Önceki li'yi kapat
                    tocBuilder.push(`</li>`);
                    tocBuilder.push(`<li><a href="#${h.id}">${h.title}</a>`);
                    currentLevel = h.level;
                } else {
                    // Aynı seviye, önceki li'yi kapat, yenisini aç
                    tocBuilder.push(`</li>`);
                    tocBuilder.push(`<li><a href="#${h.id}">${h.title}</a>`);
                }
            });

            // Kalan açık tagları kapat
            tocBuilder.push('</li>'); // Son item kapama
            while (openLists > 0) {
                tocBuilder.push('</ul></li>'); // Sublist kapama
                openLists--;
            }
        }

        tocBuilder.push('</ul>'); // Ana liste kapama
        tocBuilder.push('</div>'); // Sidebar kapama
        sidebarHtml = tocBuilder.join('\n');
    }

    // Tam HTML dökümanı
    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lesson.title}</title>
    <link rel="stylesheet" href="/content/not_stilleri.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body, {
        delimiters: [
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '\\\\\\[', right: '\\\\\\]', display: true},
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ],
        throwOnError : false,
        strict: false
    });"></script>
</head>
<body>
    ${sidebarHtml}
    <main class="content">
        <h1>${lesson.title}</h1>
        ${blocksHtml}
    </main>
    <script src="/content/notes.js"></script>
</body>
</html>`;
}

// =====================================================
// PIPELINE
// =====================================================

/**
 * Tüm dosyaları işleyip JSON üretir
 */
function runPipeline(): void {
    console.log('\n🚀 Content Pipeline v' + VERSION);
    console.log('================================\n');

    // 1. Dosyaları bul
    console.log('📁 Kaynak dosyalar taranıyor...');
    const files = discoverSourceFiles();

    if (files.length === 0) {
        console.error('❌ İşlenecek dosya bulunamadı!');
        console.log(`   Input klasörü: ${INPUT_DIR}`);
        console.log('   Beklenen yapı: input/<ders-adi>/<ders-adi>.md (veya .html)');
        process.exit(1);
    }

    console.log(`   ${files.length} dosya bulundu\n`);

    // 2. Dosyaları işle
    console.log('⚙️  İşleniyor...');
    const lessons: ParsedLesson[] = [];
    let successCount = 0;
    let errorCount = 0;
    let totalMedia = 0;

    for (const file of files) {
        const fileType = file.isMarkdown ? '📝' : '📄';
        process.stdout.write(`   ${fileType} ${file.lessonId}... `);

        try {
            const lesson = parseSourceFile(file);
            lessons.push(lesson);

            // Medya dosyalarını kopyala
            const mediaCount = copyMediaFiles(dirname(file.path), file.lessonId);
            totalMedia += mediaCount;

            // İşlenmiş HTML'i public/content/<lessonId>/<lessonId>.html olarak kaydet
            writeProcessedHtml(file.lessonId, lesson);

            successCount++;
            console.log(`✅ (${lesson.stats.blockCount} blok, ${lesson.stats.exampleCount} örnek, ${mediaCount} medya)`);
        } catch (error) {
            errorCount++;
            console.log(`❌ ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // 3. Çıktı dizinini oluştur
    if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 4. JSON yaz
    const output: ContentData = {
        lessons,
        generatedAt: new Date().toISOString(),
        version: VERSION,
    };

    writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

    // 5. Özet
    console.log('\n================================');
    console.log('📊 ÖZET');
    console.log('================================');
    console.log(`   Başarılı: ${successCount}`);
    console.log(`   Hatalı:   ${errorCount}`);
    console.log(`   Toplam blok: ${lessons.reduce((sum, l) => sum + l.stats.blockCount, 0)}`);
    console.log(`   Toplam örnek: ${lessons.reduce((sum, l) => sum + l.stats.exampleCount, 0)}`);
    console.log(`   Toplam medya: ${totalMedia}`);
    console.log(`\n💾 Çıktı: ${OUTPUT_FILE}`);
    console.log('================================\n');
}

// =====================================================
// ENTRY POINT
// =====================================================

runPipeline();
