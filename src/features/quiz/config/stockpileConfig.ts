/**
 * Stockpile Configuration
 * Target question counts for each lesson type
 * Based on src/features/course/data/courses.json
 * Formula: Total Videos * 10 Questions
 */

export const STOCKPILE_CONFIG: Record<string, number> = {
    // Ekonomi
    'Mikro İktisat': 1000,
    'Makro İktisat': 900,
    'Para, Banka ve Kredi': 300,
    'Uluslararası Ticaret': 300,
    'Türkiye Ekonomisi': 400,

    // Hukuk
    'Medeni Hukuk': 600,
    'Borçlar Hukuku': 500,
    'Ticaret Hukuku': 700,
    'Bankacılık Hukuku': 150,
    'İcra ve İflas Hukuku': 250,
    'Ceza Hukuku': 360,
    'İş Hukuku': 90,

    // Muhasebe & Maliye (Ana Kategoriler)
    'Muhasebe': 1250, // Tüm Muhasebe derslerinin toplamı
    'Maliye': 750,    // Tüm Maliye derslerinin toplamı

    // Bankacılık & Finans & İşletme
    'Banka Muhasebesi': 150,
    'Finans Matematiği': 200,
    'İşletme Yönetimi': 80,
    'Pazarlama Yönetimi': 80,
    'Finansal Yönetim': 80,

    // Genel Yetenek / Diğer
    'Matematik & Sayısal Mantık': 500,
    'İstatistik': 150
};

export const STOCKPILE_DELAY_MS = 2000;
