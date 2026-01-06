/**
 * Quiz Service Utilities
 */

export function normalizeLatex(content: string): string {
    return content
        .replace(/\$\\\((.+?)\\\)\$/g, '$$$1$$')
        .replace(/\$\$\\\[(.+?)\\\]\$\$/gs, '$$$$$1$$$$')
        .replace(/\\\[(.+?)\\\]/gs, '$$$$$1$$$$')
        .replace(/\\\((.+?)\\\)/g, '$$$1$$');
}

/**
 * Extracted image data with structured alt-text
 */
export interface ExtractedImage {
    placeholder: string;      // Full markdown syntax: ![alt](path)
    relativePath: string;     // Image file path
    altText: string;          // Raw alt-text
    description?: string;     // Parsed structured description
    metadata?: {              // Parsed metadata (if present)
        xAxis?: string;
        yAxis?: string;
        type?: string;
    };
}

/**
 * Parses structured alt-text to extract description and metadata
 * Expected format: "Title - Detailed description with axis info"
 */
function parseAltText(altText: string): {
    description: string;
    metadata?: { xAxis?: string; yAxis?: string; type?: string }
} {
    if (!altText || altText.trim().length === 0) {
        return { description: 'Görsel açıklaması yok' };
    }

    const parts = altText.split(' - ');
    const title = parts[0].trim();

    if (parts.length === 1) {
        return { description: title };
    }

    const details = parts.slice(1).join(' - ');
    const metadata: { xAxis?: string; yAxis?: string; type?: string } = {};

    // Extract axis info (Turkish and English)
    const xMatch = details.match(/[xX]\s*(?:eksen|axis)[^,.]*/i);
    const yMatch = details.match(/[yY]\s*(?:eksen|axis)[^,.]*/i);

    if (xMatch) metadata.xAxis = xMatch[0].trim();
    if (yMatch) metadata.yAxis = yMatch[0].trim();

    // Detect chart type keywords
    if (/eğri|curve|line/i.test(details)) metadata.type = 'line';
    else if (/bar|çubuk|histogram/i.test(details)) metadata.type = 'bar';
    else if (/pie|pasta|daire/i.test(details)) metadata.type = 'pie';
    else if (/tablo|table/i.test(details)) metadata.type = 'table';

    return {
        description: `${title}: ${details}`,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    };
}

export function extractImagesFromMarkdown(content: string): ExtractedImage[] {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images: ExtractedImage[] = [];
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        const altText = match[1] || '';
        const parsed = parseAltText(altText);

        images.push({
            placeholder: match[0],
            relativePath: match[2],
            altText: altText,
            description: parsed.description,
            metadata: parsed.metadata
        });
    }

    return images;
}

/**
 * Ders adından görsel klasör yolunu belirler
 */
export function getLessonMediaPath(lessonType: string): string {
    const lessonFolderMap: Record<string, string> = {
        'Mikro İktisat': 'ekonomi_1',
        'Makro İktisat': 'ekonomi_2',
        'Para, Banka ve Kredi': 'ekonomi_3',
        'Uluslararası Ticaret': 'ekonomi_4',
        'Türkiye Ekonomisi': 'ekonomi_5',
        'Medeni Hukuk': 'hukuk_1',
        'Borçlar Hukuku': 'hukuk_2',
        'Ticaret Hukuku': 'hukuk_3',
        'Bankacılık Hukuku': 'hukuk_4',
        'İcra ve İflas Hukuku': 'hukuk_5',
        'Ceza Hukuku': 'hukuk_6',
        'İş Hukuku': 'hukuk_7',
        'Muhasebe': 'muhasebe_1',
        'İşletme Yönetimi': 'muhasebe_2',
        'Pazarlama Yönetimi': 'muhasebe_3',
        'Finansal Yönetim': 'muhasebe_4',
        'Maliye': 'muhasebe_5',
        'Finans Matematiği': 'yetenek_1',
        'Matematik & Sayısal Mantık': 'yetenek_2',
        'İstatistik': 'yetenek_3',
        'Banka Muhasebesi': 'yetenek_4'
    };

    if (lessonFolderMap[lessonType]) {
        return lessonFolderMap[lessonType];
    }
    return '';
}

/**
 * Rastgele bir bölüm seçer
 */
export function extractRandomSection(content: string): { title: string; content: string } {
    const sections = content.split(/^#+\s+/m).filter(s => s.trim().length > 50); // Filter tiny sections

    if (sections.length === 0) {
        return { title: 'Genel', content: content.substring(0, 2000) };
    }

    const randomSection = sections[Math.floor(Math.random() * sections.length)];
    const lines = randomSection.split('\n');
    const title = lines[0] || 'Genel Konu';
    const body = lines.slice(1).join('\n').trim();

    return { title, content: body };
}
