/**
 * Content Pipeline - Parser
 * =========================
 * HTML içeriğini block-based yapıya dönüştürür.
 */

import * as cheerio from 'cheerio';
import type { ContentBlock, ParsedLesson, ImageMetadata } from '../features/course/types/content';
import type { ParserConfig, SourceFile } from './types';
import { DEFAULT_PARSER_CONFIG } from './types';
import {
    generateBlockId,
    resetBlockCounter,

    tagToBlockType,
    getHeadingLevel,

    extractText,
    isEmptyElement,
    hasLatex,
    extractImagePaths,
    countWords,
} from './utils';

// =====================================================
// MAIN PARSER
// =====================================================

/**
 * HTML içeriğini ContentBlock dizisine dönüştürür
 */
export function parseHtmlToBlocks(
    html: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: ParserConfig = DEFAULT_PARSER_CONFIG
): ContentBlock[] {
    const $ = cheerio.load(html);
    resetBlockCounter();

    const blocks: ContentBlock[] = [];
    let currentCard: ContentBlock | null = null;

    // Ana içerik alanını bul
    const contentArea = $('main.content').length ? $('main.content') : $('body');

    // İlk seviye çocukları işle
    contentArea.children().each((_, element) => {
        const $el = $(element);
        const tagName = element.type === 'tag' ? element.tagName?.toLowerCase() : null;

        if (!tagName) return;

        // Boş elementleri atla
        const elHtml = $.html($el) || '';
        if (config.removeEmptyParagraphs && isEmptyElement(elHtml)) {
            return;
        }

        // Block oluştur
        const block = processElement($, $el, tagName, config);

        if (!block) return;

        // Custom Block (Örnek Kartı) tespiti
        // Artık sadece ':::' ile oluşturulan div.custom-block yapılarını kart olarak kabul ediyoruz
        if (block.type === 'example') {
            // Eğer önceki bir kart varsa kapat
            if (currentCard) {
                blocks.push(currentCard);
            }

            // Bu zaten bir kart (block container), doğrudan ekle ya da stack mantığı kur
            // Şu anki yapıda nested kart desteği yok, o yüzden direkt ekliyoruz
            blocks.push(block);
            currentCard = null; // Aktif kartı sıfırla çünkü bu self-contained bir blok
            return;
        }

        blocks.push(block);
    });

    return blocks;
}

/**
 * Tek bir HTML elementini ContentBlock'a dönüştürür
 */
function processElement(
    $: cheerio.CheerioAPI,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $el: any,
    tagName: string,
    config: ParserConfig
): ContentBlock | null {
    const html = $.html($el) || '';
    const text = extractText(html);

    // Özel elementler - Custom Block (:::)
    if (tagName === 'div' && $el.hasClass('custom-block')) {
        const title = $el.attr('data-title') || 'Örnek';

        // İçindeki blokları işle (Recursive parsing)
        const children: ContentBlock[] = [];
        // children() yerine contents() kullanıyoruz ki text node'ları da alabilelim
        $el.contents().each((_: number, child: any) => {
            const $child = $(child);
            const childTag = child.type === 'tag' ? child.tagName?.toLowerCase() : null;

            if (childTag) {
                const childBlock = processElement($, $child, childTag, config);
                if (childBlock) {
                    children.push(childBlock);
                }
            } else if (child.type === 'text') {
                // Text node'u paragraf bloğuna çevir
                const textContent = child.data?.trim();
                if (textContent) {
                    children.push({
                        id: generateBlockId('p'),
                        type: 'paragraph',
                        content: `<p>${textContent}</p>` // Basitçe wrap et, zaten HTML string içinde formatting olabilir
                    });
                }
            }
        });

        // Eğer children yoksa (düz text geldiyse) içeriği paragraf olarak al
        if (children.length === 0) {
            const innerHtml = $el.html() || '';
            if (innerHtml.trim()) {
                children.push({
                    id: generateBlockId('p'),
                    type: 'paragraph',
                    content: `<p>${innerHtml}</p>`
                });
            }
        }

        return {
            id: generateBlockId('example'),
            type: 'example',
            content: html,
            metadata: {
                title: title
            },
            children
        };
    }

    if (tagName === 'table') {
        return {
            id: generateBlockId('table'),
            type: 'table',
            content: html,
            metadata: {
                hasFormula: hasLatex(html),
            },
        };
    }

    if (tagName === 'img') {
        const src = $el.attr('src') || '';
        const alt = $el.attr('alt') || '';
        return {
            id: generateBlockId('img'),
            type: 'image',
            content: html,
            metadata: {
                path: src,
                alt: alt,
            },
        };
    }

    if (tagName === 'blockquote') {
        // Blockquote içindeki çocukları recursive işle
        const children: ContentBlock[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $el.children().each((_: number, child: any) => {
            const $child = $(child);
            const childTag = child.type === 'tag' ? child.tagName?.toLowerCase() : null;
            if (childTag) {
                const childBlock = processElement($, $child, childTag, config);
                if (childBlock) {
                    children.push(childBlock);
                }
            }
        });

        return {
            id: generateBlockId('bq'),
            type: 'blockquote',
            content: html,
            children: children.length > 0 ? children : undefined,
        };
    }

    // Başlıklar
    const headingLevel = getHeadingLevel(tagName);
    if (headingLevel) {


        return {
            id: generateBlockId('h'),
            type: 'heading',
            content: html,
            level: headingLevel,
            metadata: {
                title: text, // Prefix'i temizleme, olduğu gibi kalsın (1. Başlık vb.)
            },
        };
    }

    // Liste
    if (tagName === 'ul' || tagName === 'ol') {
        return {
            id: generateBlockId('list'),
            type: 'list',
            content: html,
            metadata: {
                ordered: tagName === 'ol',
            },
        };
    }

    // Paragraf veya diğer
    const blockType = tagToBlockType(tagName);
    return {
        id: generateBlockId(tagName),
        type: blockType,
        content: html,
        metadata: {
            hasFormula: hasLatex(html),
        },
    };
}

// =====================================================
// FILE PARSER
// =====================================================

/**
 * Kaynak dosyayı ParsedLesson'a dönüştürür
 */
export function parseSourceFile(file: SourceFile): ParsedLesson {
    let htmlContent = file.content;

    // Markdown ise HTML'e çevir
    if (file.isMarkdown) {
        htmlContent = markdownToHtml(file.content, file.lessonId);
    }

    const $ = cheerio.load(htmlContent);

    // Başlık bul
    const h1 = $('h1').first().text().trim();
    const title = h1 || $('title').text().trim() || file.originalDirName || file.lessonId;

    // İçeriği parse et
    const blocks = parseHtmlToBlocks(htmlContent);

    // Eğer ilk blok H1 ise, onu çıkar (Çünkü index.ts'de zaten başlık ekleniyor)
    if (blocks.length > 0 && blocks[0].type === 'heading' && blocks[0].level === 1) {
        blocks.shift();
    }

    // Görselleri topla
    const imagePaths = extractImagePaths(htmlContent);
    const images: ImageMetadata[] = imagePaths.map(path => ({
        path,
        exists: true,
    }));

    // İstatistikler
    const stats = calculateStats(blocks, htmlContent);

    return {
        id: file.lessonId,
        title: title,
        lessonType: title,
        blocks,
        images,
        updatedAt: new Date().toISOString(),
        stats,
    };
}

/**
 * Markdown'ı HTML'e çevirir
 */
/**
 * Markdown'ı HTML'e çevirir
 */
function markdownToHtml(markdown: string, lessonId: string): string {
    let html = markdown;

    // 0. Listelerdeki blockquote işaretini temizle (- > veya * >)
    // Bu sayede liste içindeki alıntılar düzgün liste elemanı olur
    html = html.replace(/^(\s*[-*])\s+>\s+(.+)$/gm, '$1 $2');

    // 1. Math blokları (Blockquote içindeki)


    // 2. Math blokları (Normal ``` math) - Blokquote (>) veya Indentation içinde olabilir
    // 2. Math blokları (Normal ``` math) - Blokquote (>) veya Indentation içinde olabilir
    html = html.replace(/(?:^|\n)([ \t]*)(?:>?[ \t]*)```\s*math\s*\n([\s\S]*?)\n(?:[ \t]*>?[ \t]*)```/g, (_: string, prefix: string, formula: string) => {
        // Blokquote (>) ve indentation işaretlerini temizle (her satırın başındaki)
        let processedFormula = formula.split('\n').map(line => line.replace(/^[ \t]*>?[ \t]*/, '')).join('\n').trim();

        const trChars = 'çÇğĞıİöÖşŞüÜ';
        const alpha = `a-zA-Z${trChars}`;

        // Pattern: (\ ile başlamayan) ( (BüyükHarf + Harfler) VEYA (Harfler + TrHarf + Harfler) )
        const pattern = new RegExp(`(?<!\\\\)(?:[A-Z${trChars}][${alpha}]*|[${alpha}]*[${trChars}][${alpha}]*)`, 'g');

        processedFormula = processedFormula.replace(pattern, (match) => {
            return `\\text{${match}}`;
        });

        // Üst üste binmeleri temizle: \text{\text{...}} -> \text{...}
        processedFormula = processedFormula.replace(/\\text\{(\\text\{([^}]+)\})\}/g, '\\text{$2}');

        // Çıkışta boşluk ekleyerek trailing \ sorununu çöz (\[ ve \] ile formula arasına boşluk)
        // Indentation'ı koru (prefix) ama blockquote işaretini prefix'e dahil etme
        return `\n${prefix}<div class="math display">\\[ ${processedFormula.replace(/\n/g, ' ')} \\]</div>\n`;
    });

    // 3. Inline math ($`...`$)
    html = html.replace(/\$`([^`]+)`\$/g, (_: string, formula: string) => {
        return `<span class="math inline">\\(${formula}\\)</span>`;
    });

    // 4. ToC oluştur ve Başlıkları işle
    const toc: string[] = [];
    let headingCount = 0;

    // Sayaçlar
    let h2Count = 0;
    let h3Count = 0;
    let h4Count = 0;

    const toAlpha = (n: number) => String.fromCharCode(96 + n); // 1 = a, 2 = b
    const toUpperAlpha = (n: number) => String.fromCharCode(64 + n); // 1 = A, 2 = B

    // Satır satır işle (Heading hiyerarşisi için)
    const splitLines = html.split('\n');
    for (let i = 0; i < splitLines.length; i++) {
        const line = splitLines[i];

        // Code block içinde olmadığımızdan eminiz (önceki adımlarda işlendi)
        // Regex: Satır başı #... ve sonrası
        const match = line.match(/^(#{1,6})\s+(.+)$/);

        if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            const cleanTitle = text.replace(/<[^>]+>/g, '').trim();

            let prefix = '';

            if (level === 1) {
                // H1 (Genelde Ders Başlığı) - Sayaçları sıfırla
                h2Count = 0; h3Count = 0; h4Count = 0;
                // H1'e numara vermiyoruz
            } else if (level === 2) {
                h2Count++;
                h3Count = 0; h4Count = 0;
                prefix = `${toUpperAlpha(h2Count)}. `;
            } else if (level === 3) {
                h3Count++;
                h4Count = 0;
                prefix = `${h3Count}. `;
            } else if (level === 4) {
                h4Count++;
                prefix = `${toAlpha(h4Count)}. `;
            }
            // H5, H6 için numara kuralı belirtilmedi

            const id = `h-${headingCount++}-${slugify(cleanTitle)}`;

            // HTML Çıktısı: <h2 id="..."><span>1. </span>Başlık</h2>
            // Prefix için 'prefix-num' sınıfını kullanıyoruz
            const prefixHtml = prefix ? `<span class="prefix-num">${prefix}</span>` : '';
            splitLines[i] = `<h${level} id="${id}">${prefixHtml}${text}</h${level}>`;

            // ToC Çıktısı
            toc.push(`<li class="toc-item toc-h${level}"><a href="#${id}"><span class="toc-num">${prefix}</span>${cleanTitle}</a></li>`);
        }
    }
    html = splitLines.join('\n');

    // ToC'u en başa ekle (Nav tagı ile)
    // Sidebar'a taşındığı için artık içerik içine gömmüyoruz.
    // Index.ts tarafında bloklardan yeniden üretilecek.
    /*
    if (toc.length > 0) {
        const tocHtml = `
        <nav class="toc">
            <h2>İçindekiler</h2>
            <ul>${toc.join('\n')}</ul>
        </nav>`;
        // H1'den sonra ekle
        if (html.includes('</h1>')) {
            html = html.replace('<h1>', '<h1>' + tocHtml);
        } else {
            html = tocHtml + html;
        }
    }
    */

    // 5. Görseller - yolları düzelt
    // Önce tam yollu img taglarını relative yola çevir
    // Sadece /media/ içeren yolları değiştir, http ile başlayanları elleme (data uri hariç)
    html = html.replace(/<img\s+src="([^"]+)"/g, (fullMatch, src) => {
        if (src.startsWith('http') || src.startsWith('data:')) return fullMatch;

        let filename = src;
        if (src.includes('/media/')) {
            filename = src.split('/media/').pop();
        } else if (src.includes('media/')) {
            filename = src.split('media/').pop();
        } else {
            // Eğer media yolunda değilse ve sadece dosya ismiyse
            if (!src.includes('/')) return fullMatch; // Emin değilsek dokunmayalım
            // Ama genelde images media klasöründedir
            return fullMatch;
        }

        const cleanName = decodeURIComponent(filename || '');
        return `<img src="/content/${lessonId}/media/${cleanName}"`;
    });

    // Markdown görsel syntax'ını HTML'e çevir
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
        let cleanSrc = src;
        if (src.includes('/media/') || src.includes('media/')) {
            const parts = src.split('/');
            const filename = parts[parts.length - 1];
            const cleanName = decodeURIComponent(filename);
            cleanSrc = `/content/${lessonId}/media/${cleanName}`;
        }
        return `<img src="${cleanSrc}" alt="${alt}" />`;
    });

    // 6. Custom Containers (::: Örnek ...)
    // Regex: ::: (Start) -> Header -> Content -> ::: (End)
    html = html.replace(/(?:^|\n)([ \t]*(?:>[ \t]*)?)(?:\*\*|__)?:::\s*([^\n]*)([\s\S]*?):::/gm, (_, prefix, header, content) => {
        // Yazım hatalarını ve formatı temizle
        // Header içinde ** kalmış olabilir
        let cleanHeader = header.replace(/(\*\*|__)/g, '').trim();

        let type = 'example'; // Varsayılan
        let title = cleanHeader; // Varsayılan başlık tüm satırdır

        // Tipi belirlemek için sol tarafa bakalım
        const splitParts = cleanHeader.split(/[:\s]/); // İlk kelimesine bak
        const firstWord = splitParts[0].toLowerCase();

        if (firstWord.includes('örnek')) type = 'example';
        else if (firstWord.includes('soru')) type = 'question';
        else if (firstWord.includes('çözüm') || firstWord.includes('cevap') || firstWord.includes('yanıt')) type = 'solution';

        // Bu yüzden title = cleanHeader yapıyoruz.
        title = title.replace(/"/g, '&quot;');

        // Prefix'i (indentation) koruyarak döndür
        return `\n${prefix}<div class="custom-block ${type}" data-title="${title}">\n${content}\n</div>\n`;
    });

    // 7. Badge'ler (Soru, Cevap, Çözüm, Örnek)
    // Custom Container'dan sonra, Blockquote'dan önce işle.
    // > karakterini de yutması için regex başına (?:>\s*)? ekledik.
    // Böylece > **Cevap:** satırı blockquote değil, sadece badge olur.


    // Unified Badge Regex: Soru: , **Soru:** , **Soru**: vb. varyasyonları yakalar ve iki noktayı badge içine sabitler
    const badgeWords = 'Soru\\s*\\d*|Cevap|Çözüm|Yanıt|Örnek|Sonuç';
    html = html.replace(new RegExp(`^\\s*(?:>\\s*)?(?:\\*\\*|__)?(${badgeWords})(?:[\\s:]*)(?:\\*\\*|__)?([\\s:]*)`, 'gim'), (match, word) => {
        const hasColon = match.includes(':');
        return `<span class="badge">${word}${hasColon ? ':' : ''}</span> `;
    });

    // 6. Blockquote'lar
    // Liste içindeki blockquote'ları (artık temizlendi) ve normal blockquote'ları işle
    // blockquote tag'ını ekle
    html = html.replace(/^>[^\S\n]?(.*)$/gm, '<blockquote>$1</blockquote>');
    // Ardışık blockquote'ları birleştir
    // Ardışık blockquote'ları birleştir
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Boş blockquote'ları temizle (Math blokları dışarı alındığında geride kalanlar)
    html = html.replace(/<blockquote>\s*<\/blockquote>/g, '');








    // 10. Listeler (Nested destekli)
    // Regex ile basit replacement yerine satır satır işleyerek nested yapı kuralım
    const lines = html.split('\n');
    const newListLines: string[] = [];
    const listStack: { type: 'ul' | 'ol', indent: number }[] = [];

    // Yardımcı: Stack'teki listeleri kapat
    const closeLists = (targetLevel: number) => {
        while (listStack.length > 0 && listStack[listStack.length - 1].indent >= targetLevel) {
            const list = listStack.pop()!;
            newListLines.push(`</${list.type}>`);
            if (listStack.length > 0) {
                newListLines.push('</li>'); // Alt listeyi kapatınca parent item da kapanmalı
            }
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Liste elemanı mı?
        // 1. Unordered: - veya * (opsiyonel indentation)
        // 2. Ordered: 1. (opsiyonel indentation)
        const ulMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
        const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

        if (ulMatch || olMatch) {
            const indentStr = (ulMatch || olMatch)![1];
            const content = (ulMatch || olMatch)![3];
            const type = ulMatch ? 'ul' : 'ol';

            // Indentation seviyesini hesapla (2 space = 1 level kabul edelim)
            const indentLevel = indentStr.length;

            // Stack yönetimi
            if (listStack.length === 0) {
                // Yeni ana liste
                listStack.push({ type, indent: indentLevel });
                newListLines.push(`<${type}>`);
                newListLines.push(`<li>${content}`); // Kapatmıyoruz, belki alt liste gelir
            } else {
                const lastList = listStack[listStack.length - 1];

                if (indentLevel > lastList.indent) {
                    // Alt liste başlıyor
                    listStack.push({ type, indent: indentLevel });
                    newListLines.push(`<${type}>`); // Parent li içinde yeni liste
                    newListLines.push(`<li>${content}`);
                } else {
                    // Aynı seviye veya üst listeye dönüş
                    if (indentLevel < lastList.indent) {
                        newListLines.push('</li>'); // Önceki item'ı kapat

                        // ÖNEMLİ DÜZELTME:
                        // Sadece hedef seviyenin ÜSTÜNDEKİ (daha derin) listeleri kapatmalıyız.
                        // closeLists fonksiyonu >= targetLevel olanları kapatıyor, bu yanlış.
                        // > targetLevel olanları kapatmalıyız.

                        while (listStack.length > 0 && listStack[listStack.length - 1].indent > indentLevel) {
                            const list = listStack.pop()!;
                            newListLines.push(`</${list.type}>`);
                            if (listStack.length > 0) {
                                newListLines.push('</li>'); // Parent'ı da kapat
                            }
                        }
                    } else {
                        // Aynı seviye (indentLevel === lastList.indent)
                        newListLines.push('</li>'); // Önceki item'ı kapat
                    }

                    // Şimdi stack'in en üstüne bakalım
                    if (listStack.length === 0) {
                        // Tamamen yeni liste
                        listStack.push({ type, indent: indentLevel });
                        newListLines.push(`<${type}>`);
                    } else {
                        const currentList = listStack[listStack.length - 1];

                        // Eğer mevcut listeden farklı bir tip geldiyse (ul -> ol veya tam tersi)
                        // Birebir aynı indentation seviyesinde olmalı
                        if (currentList.type !== type) {
                            // Mevcut listeyi kapat
                            newListLines.push(`</${currentList.type}>`);
                            // Tipini güncelle
                            currentList.type = type;
                            // Yeni tipi aç
                            newListLines.push(`<${type}>`);
                        }
                    }

                    newListLines.push(`<li>${content}`);
                }
            }
        } else {
            // Liste dışı satır

            // Eğer boş satırsa ve stack doluysa hemen kapatma, belki liste devam ediyordur.
            // Ama eğer bir sonraki satır liste elemanı DEĞİLSE kapat.
            // Basit çözüm: Boş satırları yutalım (list items arasında boşluk olabilir)
            const trimmed = line.trim();
            if (trimmed === '' && listStack.length > 0) {
                // Sadece devam et, satırı ekleme (HTML'de boşluk zaten önemsiz veya CSS ile halledilir)
                continue;
            }

            // Eğer stack doluysa hepsini kapat çünkü artık liste değil
            if (listStack.length > 0) {
                // Indentation kontrolü: Eğer satır mevcut son listenin indentation seviyesindeyse, devamı olarak kabul et.
                const currentIndent = line.search(/\S|$/); // İlk non-whitespace indexi (veya satır boşsa uzunluk)
                const lastList = listStack[listStack.length - 1];

                if (currentIndent > lastList.indent) {
                    // Liste elemanının devamı.
                    // Sadece ekle, kapatma.
                    newListLines.push(line);
                    continue;
                }

                newListLines.push('</li>'); // Son item
                closeLists(0); // Hepsini kapat
            }
            newListLines.push(line);
        }
    }
    // Döngü bitti, açık liste varsa kapat
    if (listStack.length > 0) {
        newListLines.push('</li>');
        closeLists(0);
    }

    html = newListLines.join('\n');

    // 11. Paragraflar
    // Blockquote, ul, ol, h, div, table olmayan metin bloklarını p ile sar
    const finalLines = html.split('\n');
    const finalResult: string[] = [];
    let pContent: string[] = [];

    const flushP = () => {
        if (pContent.length > 0) {
            const text = pContent.join('\n').trim();
            if (text) finalResult.push(`<p>${text}</p>`);
            pContent = [];
        }
    };

    for (const line of finalLines) {
        const trimmed = line.trim();
        if (!trimmed) {
            // Boş satır paragrafı bitirir
            flushP();
            continue;
        }

        // HTML tag ile başlıyorsa veya özel bir syntax ise
        // Yalnızca blok seviyesi HTML etiketlerini ve özel markörleri paragraf dışında tut
        // span, strong, em gibi inline etiketler pContent'e gitmeli
        const isBlockTag = /^<(div|table|blockquote|h[1-6]|ul|ol|li|nav|p|section|article|header|footer|aside|hr|pre)/i.test(trimmed);

        if (isBlockTag || trimmed.startsWith('|') || trimmed.startsWith(':::')) {
            flushP();
            finalResult.push(line);
        } else {
            // Eğer bir div içindeysek ve bu düz metinse...
            // Basitçe ekle, p ile sarmalanacak. 
            // Ama div tagının kendisi p içine girmemeli.
            if (trimmed.includes('<div') || trimmed.includes('</div>')) {
                flushP();
                finalResult.push(line);
            } else {
                pContent.push(line);
            }
        }
    }
    flushP();


    html = finalResult.join('\n');

    // 9. Bold ve italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 9. Tablolar
    html = processMarkdownTables(html);

    // 10. Tablo satırlarını işle (h4-h6 içeren satırlara section-header sınıfı ekle)
    // Bu işlem, markdown tablosu olmasa bile (HTML tablo olsa bile) çalışır.
    html = html.replace(/<tr>([\s\S]*?)<\/tr>/g, (match, content) => {
        if (/<h[4-6]/.test(content)) {
            return `<tr class="section-header">${content}</tr>`;
        }
        return match;
    });

    return `<body>${html}</body>`;
}

// Slugify tekrar gerekli (yukarıda import edilmemiş olabilir, buraya yardımcı olarak ekleyelim veya import edelim)
// utils dosyasında var ama burada closure içinde tanımlayalım hızlıca
function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Markdown tablolarını HTML'e çevirir
 */
function processMarkdownTables(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableLines = [];
            }
            tableLines.push(trimmed);
        } else {
            if (inTable) {
                // Tablo bitti, HTML'e çevir
                result.push(convertTableToHtml(tableLines));
                tableLines = [];
                inTable = false;
            }
            result.push(line);
        }
    }

    if (inTable && tableLines.length > 0) {
        result.push(convertTableToHtml(tableLines));
    }

    return result.join('\n');
}

/**
 * Tablo satırlarını HTML'e çevirir
 */
function convertTableToHtml(tableLines: string[]): string {
    if (tableLines.length < 2) return tableLines.join('\n');

    const rows: string[][] = [];
    let hasHeader = false;

    for (let i = 0; i < tableLines.length; i++) {
        const line = tableLines[i];

        // Header separator satırını kontrol et (|:--:|:--:|)
        // Regex: Pipe ile başlıyor, tire/iki nokta ve pipe içeriyor, pipe ile bitiyor.
        // Ayrıca içinde harf veya sayı OLMAMALI (sadece - : | ve space olabilir)
        const pureContent = line.replace(/\s/g, '');
        const isSeparator = /^\|[-:|]+\|$/.test(pureContent);

        if (isSeparator) {
            hasHeader = (i === 1); // Eğer 2. satırsa (index 1), ilki başlıktır
            continue;
        }

        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        rows.push(cells);
    }

    if (rows.length === 0) return '';

    let html = '<table>';

    // İlk satır header ise (separator gördüysek ve ilk satırdan sonraysa)
    // Ama separatorü loop'ta atladık. Eğer separator index 1 idiyse, rows[0] header'dır.
    // Logic düzeltmesi: rows dizisinde separator yok. Separator var mıydı kontrolü lazım.
    if (hasHeader && rows.length > 0) {
        html += '<thead><tr>';
        for (const cell of rows[0]) {
            html += `<th>${cell}</th>`;
        }
        html += '</tr></thead>';
        rows.shift(); // Header'ı çıkar
    }

    if (rows.length > 0) {
        html += '<tbody>';
        for (const row of rows) {
            // Bu satırın bir bölüm başlığı olup olmadığını kontrol et
            // Eğer herhangi bir hücre <h4>...<h6> içeriyorsa
            const isSectionHeader = row.some(cell => /<h[4-6]/.test(cell));
            const trClass = isSectionHeader ? ' class="section-header"' : '';

            html += `<tr${trClass}>`;
            for (const cell of row) {
                html += `<td>${cell}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody>';
    }

    html += '</table>';
    // 10. Temizlik
    // Boş blockquote'ları temizle (Math blokları dışarı alındığında geride kalanlar)
    html = html.replace(/<blockquote>\s*<\/blockquote>/g, '');

    return html;
}

/**
 * İstatistikleri hesaplar
 */
function calculateStats(blocks: ContentBlock[], html: string) {
    let exampleCount = 0;
    let questionCount = 0;
    let tableCount = 0;
    let imageCount = 0;

    function countBlocks(blockList: ContentBlock[]) {
        for (const block of blockList) {
            if (block.type === 'example') exampleCount++;
            if (block.type === 'question') questionCount++;
            if (block.type === 'table') tableCount++;
            if (block.type === 'image') imageCount++;

            if (block.children) {
                countBlocks(block.children);
            }
        }
    }

    countBlocks(blocks);

    return {
        blockCount: blocks.length,
        exampleCount,
        questionCount,
        tableCount,
        imageCount,
        wordCount: countWords(html),
    };
}
