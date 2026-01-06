/**
 * Quiz Prompts - KPSS A Grubu Kapsamlı Soru Üretim Sistemi
 * 
 * Bu modül şunları içerir:
 * - Soru tipi tanımları (6 farklı format)
 * - Zorluk seviyeleri (Bloom taksonomisi bazlı)
 * - Kognitif seviye matrisi
 * - Profesyonel çeldirici stratejileri
 * - Ders bazlı özelleştirilmiş yönergeler
 */

// ============================================================================
// SORU TİPİ TANIMLARI
// ============================================================================

export const QUESTION_TYPES = {
    SCENARIO: {
        name: 'Olay/Senaryo Sorusu',
        description: 'Somut bir durum/vaka üzerinden sorgulama',
        template: 'Aşağıdaki durumda [X kişisi/kurum] ne yapmalıdır? / Hangi hukuki sonuç doğar?',
        example: 'Ahmet, 15 yaşındaki oğlu Mehmet\'in velayetini almak istemektedir. Bu durumda...'
    },
    TRUE_FALSE_MULTI: {
        name: 'Doğru/Yanlış Çoklu',
        description: 'Birden fazla önermeyi aynı anda test eder',
        template: 'Aşağıdakilerden hangisi doğrudur/yanlıştır?',
        example: 'Anayasa Mahkemesi ile ilgili aşağıdaki ifadelerden hangisi yanlıştır?'
    },
    COMPARISON: {
        name: 'Karşılaştırma/İlişki Sorusu',
        description: 'İki veya daha fazla kavramı karşılaştırır',
        template: 'X ile Y arasındaki fark nedir? / X ve Y\'nin ortak özelliği hangisidir?',
        example: 'Anonim şirket ile limited şirket arasındaki temel fark hangisidir?'
    },
    CALCULATION: {
        name: 'Analitik/Hesaplama Sorusu',
        description: 'Sayısal işlem veya grafik yorumu gerektirir',
        template: 'Verilen bilgilere göre [X değeri] kaçtır? / Grafikteki değişim neyi gösterir?',
        example: 'Faiz oranı %10, anapara 1000 TL ise 2 yıl sonra bileşik faizle toplam tutar kaç TL olur?'
    },
    DEFINITION: {
        name: 'Kavram Tanımı Sorusu',
        description: 'Temel kavram veya terimin anlaşılmasını test eder',
        template: 'Aşağıdakilerden hangisi [X kavramını] doğru tanımlar?',
        example: 'Aşağıdakilerden hangisi "hak ehliyeti" kavramını doğru açıklamaktadır?'
    },
    SEQUENCE: {
        name: 'Sıralama/Süreç Sorusu',
        description: 'Bir sürecin aşamalarını veya öncelik sırasını test eder',
        template: 'Aşağıdaki işlemlerden hangisi ilk/son sırada yapılmalıdır? / Doğru sıralama hangisidir?',
        example: 'Bütçe sürecinde aşağıdaki aşamalardan hangisi en son gerçekleşir?'
    }
} as const;

export type QuestionType = keyof typeof QUESTION_TYPES;

// ============================================================================
// ZORLUK SEVİYELERİ (Bloom Taksonomisi Bazlı)
// ============================================================================

export const DIFFICULTY_DIRECTIVES = {
    easy: {
        level: 'Kolay',
        bloomLevels: ['Hatırlama', 'Anlama'],
        criteria: [
            'Temel kavram ve tanımları sorgula',
            'Doğrudan metinde yer alan bilgileri sor',
            'Tek bir bilgi parçasını test et',
            'Çeldiriciler açıkça yanlış olsun'
        ],
        cognitiveLoad: 'Düşük - Doğrudan bilgi çağırma',
        questionTypes: ['DEFINITION', 'TRUE_FALSE_MULTI'] as QuestionType[]
    },
    medium: {
        level: 'Orta',
        bloomLevels: ['Uygulama', 'Analiz'],
        criteria: [
            'Bilgiyi yeni bir duruma uygulama gerektir',
            'Basit senaryo veya vaka analizi kullan',
            'Birden fazla bilgiyi ilişkilendir',
            'Çeldiriciler kısmen doğru bilgi içersin'
        ],
        cognitiveLoad: 'Orta - Uygulama ve analiz',
        questionTypes: ['SCENARIO', 'COMPARISON', 'SEQUENCE'] as QuestionType[]
    },
    hard: {
        level: 'Zor',
        bloomLevels: ['Değerlendirme', 'Sentez'],
        criteria: [
            'Karmaşık senaryo veya çok boyutlu analiz gerektir',
            'Birden fazla kavramı sentezle',
            'Eleştirel düşünme ve karar verme bekle',
            'Çeldiriciler çok yakın ve ince ayrımlar içersin',
            'İstisnaları veya özel durumları sorgula'
        ],
        cognitiveLoad: 'Yüksek - Sentez ve değerlendirme',
        questionTypes: ['SCENARIO', 'CALCULATION', 'COMPARISON'] as QuestionType[]
    }
} as const;

export type DifficultyLevel = keyof typeof DIFFICULTY_DIRECTIVES;

// ============================================================================
// PROFESYONEL ÇELDİRİCİ STRATEJİLERİ
// ============================================================================

export const DISTRACTOR_STRATEGIES = {
    reversal: {
        name: 'Kavram Tersi',
        description: 'Doğru kavramın tam tersini kullan',
        example: '"Hak ehliyeti" yerine "Fiil ehliyeti" koy'
    },
    partial: {
        name: 'Kısmi Doğru',
        description: 'Yarısı doğru, yarısı yanlış bilgi',
        example: '"7 gün içinde" yerine "15 gün içinde" (süre yanlış, işlem doğru)'
    },
    related: {
        name: 'Yakın Kavram',
        description: 'Aynı kategoriden farklı bir kavram',
        example: '"İptal davası" yerine "Tam yargı davası"'
    },
    common_mistake: {
        name: 'Yaygın Yanılgı',
        description: 'Öğrencilerin sıkça yaptığı hatalar',
        example: 'Medeni Kanun yerine Borçlar Kanunu referansı'
    },
    overgeneralization: {
        name: 'Aşırı Genelleme',
        description: 'İstisnaları görmezden gelen genel ifade',
        example: '"Tüm sözleşmeler yazılı olmalıdır" (aslında bazıları sözlü olabilir)'
    }
} as const;

// ============================================================================
// GELİŞTİRİLMİŞ DERS PROMPTLARI
// ============================================================================

export const COURSE_PROMPTS: Record<string, {
    questionTypes: QuestionType[];
    specificDirectives: string;
    distractorStrategies: (keyof typeof DISTRACTOR_STRATEGIES)[];
    sampleFormats: string[];
    useChart?: 'never' | 'optional' | 'always';
    chartTypes?: ('bar' | 'line' | 'pie')[];
}> = {
    'Medeni Hukuk': {
        questionTypes: ['SCENARIO', 'DEFINITION', 'COMPARISON'],
        specificDirectives: `
- Kişilik hakları, aile hukuku ve miras hukuku senaryoları kur
- Ehliyet türlerini (hak/fiil ehliyeti) karşılaştıran sorular oluştur
- Butlan/iptal/yokluk ayrımlarını test et
- Hak düşürücü süre ve zamanaşımı karışıklığını çeldirici olarak kullan`,
        distractorStrategies: ['reversal', 'common_mistake', 'partial'],
        sampleFormats: [
            '[X yaşındaki Y], aşağıdaki işlemlerden hangisini tek başına yapabilir?',
            'Aşağıdaki evlilik engellerinden hangisi mutlak engeldir?',
            'Miras hukukunda saklı pay ile ilgili hangisi doğrudur?'
        ],
        useChart: 'never'
    },

    'Borçlar Hukuku': {
        questionTypes: ['SCENARIO', 'SEQUENCE', 'COMPARISON'],
        specificDirectives: `
- Sözleşme kurulması, ifa, ihlal ve sona erme aşamalarını senaryolaştır
- Kusursuz sorumluluk hallerini somut olaylarla sor
- Temerrüt, imkansızlık ve ayıplı ifa ayrımlarını test et
- Borç kaynakları (sözleşme/haksız fiil/sebepsiz zenginleşme) çeldiricisi kullan`,
        distractorStrategies: ['related', 'partial', 'overgeneralization'],
        sampleFormats: [
            '[X sözleşmesi] kapsamında satıcının borcu hangisidir?',
            'Aşağıdaki durumlardan hangisinde kusursuz sorumluluk söz konusudur?',
            'Borçlunun temerrüde düşmesi için aşağıdakilerden hangisi gereklidir?'
        ],
        useChart: 'never'
    },

    'Anayasa Hukuku': {
        questionTypes: ['TRUE_FALSE_MULTI', 'DEFINITION', 'COMPARISON'],
        specificDirectives: `
- Yasama, Yürütme, Yargı organlarının yetki ve yapısını sorgula
- Üye sayıları, toplantı/karar yeter sayıları, görev süreleri sor
- Anayasa değişikliği ve olağanüstü hal prosedürlerini test et
- Organlararası yetki karışıklığını çeldirici olarak kullan`,
        distractorStrategies: ['partial', 'reversal', 'common_mistake'],
        sampleFormats: [
            'TBMM ile ilgili aşağıdaki ifadelerden hangisi yanlıştır?',
            'Cumhurbaşkanlığı kararnamesi hangi konularda çıkarılamaz?',
            'Anayasa Mahkemesinin görevleri arasında hangisi yer almaz?'
        ],
        useChart: 'never'
    },

    'İdare Hukuku': {
        questionTypes: ['SCENARIO', 'TRUE_FALSE_MULTI', 'SEQUENCE'],
        specificDirectives: `
- Merkezi ve yerinden yönetim ayrımını net kurgula
- İdari işlem (düzenleyici/bireysel) ve eylem ayrımını test et
- İYUK süreleri ve dava türlerini somut olaylarla sor
- Hiyerarşi ve idari vesayet kavramlarını çeldiricilerde kullan`,
        distractorStrategies: ['related', 'partial', 'common_mistake'],
        sampleFormats: [
            'Aşağıdaki işlemlerden hangisine karşı iptal davası açılabilir?',
            'İdari başvuru süreleri ile ilgili hangisi doğrudur?',
            '[X memuru] hakkında hangi disiplin cezası uygulanabilir?'
        ],
        useChart: 'never'
    },

    'Ticaret Hukuku': {
        questionTypes: ['SCENARIO', 'COMPARISON', 'TRUE_FALSE_MULTI'],
        specificDirectives: `
- Anonim ve limited şirket karşılaştırmaları yap
- Kıymetli evrak (çek, poliçe, bono) özelliklerini somutlaştır
- Tescil, ilan ve basiretli iş adamı ölçüsünü senaryolaştır
- Şirket türleri arası yetki/sorumluluk farklarını çeldirici yap`,
        distractorStrategies: ['related', 'partial', 'overgeneralization'],
        sampleFormats: [
            'Anonim şirkette aşağıdakilerden hangisi zorunlu organdır?',
            'Çekin ibraz süresi ile ilgili hangisi doğrudur?',
            'Limited şirket ortağının sorumluluğu ile ilgili hangisi yanlıştır?'
        ],
        useChart: 'never'
    },

    'İcra ve İflas Hukuku': {
        questionTypes: ['SCENARIO', 'SEQUENCE', 'TRUE_FALSE_MULTI'],
        specificDirectives: `
- İlamlı/ilamsız takip yollarını senaryolaştır
- Ödeme emri, icra emri ve itiraz sürelerini test et
- Haciz sırası ve satış prosedürünü sorgula
- Takip türleri arası karışıklığı çeldirici olarak kullan`,
        distractorStrategies: ['partial', 'related', 'reversal'],
        sampleFormats: [
            'İlamsız icra takibinde borçlunun itiraz süresi kaç gündür?',
            'Hacizde öncelik sırası ile ilgili hangisi doğrudur?',
            'İflasın hukuki sonuçları arasında hangisi yer almaz?'
        ],
        useChart: 'never'
    },

    'Ceza Hukuku': {
        questionTypes: ['SCENARIO', 'DEFINITION', 'COMPARISON'],
        specificDirectives: `
- Suçun unsurlarını (maddi/manevi) somut olaylarla test et
- Hukuka uygunluk nedenleri ve kusurluluğu etkileyen halleri sor
- Teşebbüs, iştirak ve içtima konularını senaryolaştır
- Ceza hukuku/ceza muhakemesi karışıklığını çeldirici yap`,
        distractorStrategies: ['reversal', 'related', 'common_mistake'],
        sampleFormats: [
            'Aşağıdaki durumlardan hangisinde meşru müdafaa söz konusudur?',
            'Suça teşebbüste cezanın indirilmesi ile ilgili hangisi doğrudur?',
            '[X suçunda] aşağıdaki şahıslardan hangisi iştirakçi sayılır?'
        ],
        useChart: 'never'
    },

    'İş Hukuku': {
        questionTypes: ['SCENARIO', 'CALCULATION', 'TRUE_FALSE_MULTI'],
        specificDirectives: `
- İş sözleşmesi türleri ve fesih hallerini senaryolaştır
- Kıdem/ihbar tazminatı hesaplama soruları oluştur
- İşçi ve işveren hak/borçlarını karşılaştırmalı sor
- İş hukuku/sosyal güvenlik karışıklığını çeldirici yap`,
        distractorStrategies: ['partial', 'overgeneralization', 'related'],
        sampleFormats: [
            '[X yıl çalışan işçinin] kıdem tazminatı ne kadardır?',
            'İhbar öneli ile ilgili aşağıdakilerden hangisi doğrudur?',
            'Haklı fesih nedenleri arasında hangisi yer almaz?'
        ],
        useChart: 'never'
    },

    'Vergi Hukuku': {
        questionTypes: ['SEQUENCE', 'TRUE_FALSE_MULTI', 'DEFINITION'],
        specificDirectives: `
- Vergilendirme sürecini (tarh, tebliğ, tahakkuk, tahsil) sıralı sor
- Vergi suç ve cezalarını somutlaştır
- Mükellef hakları ve ödevlerini test et
- Vergi türleri arası karışıklığı çeldirici yap`,
        distractorStrategies: ['reversal', 'partial', 'related'],
        sampleFormats: [
            'Vergilendirme sürecinde aşağıdaki aşamalardan hangisi ilk sırada yer alır?',
            'Vergi ziyaı cezası ile ilgili hangisi doğrudur?',
            'Aşağıdakilerden hangisi dolaylı vergidir?'
        ],
        useChart: 'never'
    },

    'Maliye': {
        questionTypes: ['COMPARISON', 'TRUE_FALSE_MULTI', 'CALCULATION'],
        specificDirectives: `
- Kamu harcamaları ve gelirleri sınıflandırmasını sor
- Bütçe ilkeleri ve süreçlerini test et
- Maliye politikası araçlarını analitik formatta sorgula
- Ekonomi/maliye kavram karışıklığını çeldirici yap`,
        distractorStrategies: ['related', 'partial', 'overgeneralization'],
        sampleFormats: [
            'Bütçe ilkelerinden hangisi "bütçenin yıllık olması" anlamına gelir?',
            'Kamu harcamalarının sınıflandırılması ile ilgili hangisi yanlıştır?',
            'Genişletici maliye politikası araçları arasında hangisi yer almaz?'
        ],
        useChart: 'optional',
        chartTypes: ['bar', 'pie']
    },

    'Mikro İktisat': {
        questionTypes: ['CALCULATION', 'COMPARISON', 'SCENARIO'],
        specificDirectives: `
- Arz/talep esnekliği ve denge analizlerini grafiksel yorumla sor
- Tüketici/üretici dengesi optimizasyon problemleri kur
- Piyasa yapıları arası karşılaştırma yap
- Mikro/makro kavram karışıklığını çeldirici yap
- Arz-talep ve denge grafikleri için chart_data özelliğini AKTİF KULLAN`,
        distractorStrategies: ['reversal', 'partial', 'related'],
        sampleFormats: [
            'Talep esnekliği 2 ise fiyat %10 artarsa talep miktarı yüzde kaç değişir?',
            'Tam rekabet piyasasında uzun dönem denge ile ilgili hangisi doğrudur?',
            'İkame mal fiyatı artarsa talebi nasıl etkiler?'
        ],
        useChart: 'optional',
        chartTypes: ['line', 'bar']
    },

    'Makro İktisat': {
        questionTypes: ['COMPARISON', 'SCENARIO', 'TRUE_FALSE_MULTI'],
        specificDirectives: `
- IS-LM, AD-AS modelleri üzerinden politika etkinliği sor
- Enflasyon-işsizlik, faiz-yatırım ilişkilerini analitik sorgula
- Ekonomik gösterge yorumlama soruları oluştur
- Klasik/Keynesyen karışıklığını çeldirici yap`,
        distractorStrategies: ['reversal', 'related', 'partial'],
        sampleFormats: [
            'Genişletici para politikası uygulanırsa faiz oranları ne olur?',
            'Phillips eğrisine göre enflasyon ile işsizlik arasındaki ilişki nedir?',
            'Keynesyen modelde çarpan etkisi ile ilgili hangisi doğrudur?'
        ],
        useChart: 'optional',
        chartTypes: ['line', 'bar']
    },

    'Para, Banka ve Kredi': {
        questionTypes: ['DEFINITION', 'COMPARISON', 'TRUE_FALSE_MULTI'],
        specificDirectives: `
- Para arzı tanımları (M1, M2, M3) ve bileşenlerini sor
- Merkez bankası araçları ve transmisyon mekanizmasını test et
- Bankacılık sistemi çarpan etkisini hesaplatıcı sorgula
- Para/maliye politikası karışıklığını çeldirici yap`,
        distractorStrategies: ['related', 'partial', 'reversal'],
        sampleFormats: [
            'M2 para arzı tanımına aşağıdakilerden hangisi dahil değildir?',
            'Merkez bankası açık piyasa işlemleri ile hangisini etkiler?',
            'Zorunlu karşılık oranı artarsa para arzı ne olur?'
        ],
        useChart: 'never'
    },

    'Türkiye Ekonomisi': {
        questionTypes: ['TRUE_FALSE_MULTI', 'SEQUENCE', 'COMPARISON'],
        specificDirectives: `
- Tarihsel dönemleri ve ekonomik krizleri kronolojik sorgula
- Yapısal reform ve politikalarını test et
- Sektörel dağılımlar ve dış ticaret verilerini yorumlat
- Dönemler arası karışıklığı çeldirici yap`,
        distractorStrategies: ['partial', 'reversal', 'related'],
        sampleFormats: [
            '24 Ocak 1980 Kararları ile ilgili hangisi doğrudur?',
            'Türkiye ekonomisinde aşağıdaki gelişmelerden hangisi en son gerçekleşmiştir?',
            '2001 krizi sonrası uygulanan politikalar arasında hangisi yer almaz?'
        ],
        useChart: 'optional',
        chartTypes: ['line', 'bar']
    },

    'Muhasebe': {
        questionTypes: ['CALCULATION', 'SCENARIO', 'SEQUENCE'],
        specificDirectives: `
- Yevmiye kaydı soruları (Borç/Alacak mantığı) oluştur
- Hesap sınıflandırması ve işleyişini test et
- Envanter ve değerleme işlemlerini senaryolaştır
- Hesap grubu karışıklığını çeldirici yap`,
        distractorStrategies: ['reversal', 'partial', 'related'],
        sampleFormats: [
            'Peşin mal satışında aşağıdaki kayıtlardan hangisi yapılır?',
            'Aşağıdaki hesaplardan hangisi aktif karakterlidir?',
            'Amortisman kaydında hangi hesap borçlandırılır?'
        ],
        useChart: 'never'
    },

    'Banka Muhasebesi': {
        questionTypes: ['SCENARIO', 'DEFINITION', 'TRUE_FALSE_MULTI'],
        specificDirectives: `
- Mevduat, kredi ve kambiyo işlemlerini muhasebeleştir
- Banka hesap planı terminolojisini kullan
- Bankacılık özel aktif/pasif hesaplarını test et
- Genel muhasebe/banka muhasebesi karışıklığını çeldirici yap`,
        distractorStrategies: ['related', 'partial', 'reversal'],
        sampleFormats: [
            'Vadesiz mevduat hesabına para yatırılması nasıl kaydedilir?',
            'Kredi kullandırımında hangi hesap alacaklandırılır?',
            'Banka hesap planında aşağıdakilerden hangisi nazım hesaptır?'
        ],
        useChart: 'never'
    },

    'Mali Tablolar Analizi': {
        questionTypes: ['CALCULATION', 'COMPARISON', 'TRUE_FALSE_MULTI'],
        specificDirectives: `
- Finansal rasyo hesaplama ve yorumlama soruları oluştur
- Likidite, karlılık, kaldıraç oranlarını test et
- Yatay/dikey analiz tekniklerini sorgula
- Rasyo grupları arası karışıklığı çeldirici yap`,
        distractorStrategies: ['partial', 'reversal', 'related'],
        sampleFormats: [
            'Cari oran 2, asit-test oranı 1 ise stokların toplam varlıklara oranı nedir?',
            'Aşağıdakilerden hangisi karlılık oranıdır?',
            'Mali kaldıraç oranının yükselmesi neyi ifade eder?'
        ],
        useChart: 'optional',
        chartTypes: ['bar', 'pie']
    },

    'Finans Matematiği': {
        questionTypes: ['CALCULATION', 'COMPARISON', 'SEQUENCE'],
        specificDirectives: `
- Basit/bileşik faiz, anüite ve bugünkü değer hesaplamaları sor
- Vade, faiz oranı ve anapara ilişkisini test et
- Çözüm adımlarını açıklamada göster
- Formül karışıklığını çeldirici yap
- Bu ders için grafik (chart_data) KULLANMA`,
        distractorStrategies: ['partial', 'reversal', 'common_mistake'],
        sampleFormats: [
            '10.000 TL anapara, yıllık %12 faiz ile 3 yıl sonra bileşik faizle toplam tutar kaçtır?',
            'Aylık eşit taksitlerle ödenen kredinin bugünkü değeri nasıl hesaplanır?',
            'İskonto ve faiz arasındaki fark nedir?'
        ],
        useChart: 'never'
    },

    'İstatistik': {
        questionTypes: ['CALCULATION', 'DEFINITION', 'COMPARISON'],
        specificDirectives: `
- Olasılık, dağılım ve hipotez testi problemleri oluştur
- Merkezi eğilim ve dağılım ölçüleri soruları sor
- İstatistiksel karar verme formatını kullan
- Parametre/istatistik karışıklığını çeldirici yap`,
        distractorStrategies: ['partial', 'reversal', 'related'],
        sampleFormats: [
            'Standart sapması 5, ortalaması 50 olan dağılımda 55 değerinin z-skoru kaçtır?',
            'Aşağıdakilerden hangisi merkezi eğilim ölçüsü değildir?',
            'Hipotez testinde p-değeri 0.03 ise alfa=0.05 düzeyinde karar nedir?'
        ],
        useChart: 'always',
        chartTypes: ['bar', 'line']
    },

    'İşletme Yönetimi': {
        questionTypes: ['SCENARIO', 'DEFINITION', 'COMPARISON'],
        specificDirectives: `
- Yönetim fonksiyonları ve kuramlarını vaka analizi ile sor
- Organizasyon yapıları ve liderlik stillerini karşılaştır
- Stratejik yönetim kavramlarını senaryolaştır
- Kuramlar arası karışıklığı çeldirici yap`,
        distractorStrategies: ['related', 'partial', 'common_mistake'],
        sampleFormats: [
            'Aşağıdaki durumda hangi liderlik stili en uygun olur?',
            'Hawthorne deneyleri hangi yönetim yaklaşımının temelini oluşturur?',
            'SWOT analizinde aşağıdakilerden hangisi dış çevre faktörüdür?'
        ],
        useChart: 'never'
    },

    'Matematik': {
        questionTypes: ['CALCULATION', 'SEQUENCE', 'COMPARISON'],
        specificDirectives: `
- Fonksiyon, denklem ve eşitsizlik problemleri oluştur
- Türev, integral ve limit hesaplamaları sor
- Çözüm yolunu açıklamada adım adım belirt
- İşlem hatası çeldiricileri kullan
- GRAFİK SORULARINDA chart_data ile line grafiği MUTLAKA oluştur`,
        distractorStrategies: ['partial', 'common_mistake', 'reversal'],
        sampleFormats: [
            'f(x) = x² + 3x - 4 fonksiyonunun kökleri toplamı kaçtır?',
            'Aşağıdaki fonksiyonlardan hangisinin türevi 2x + 1 dir?',
            'Limit hesabında aşağıdaki adımlardan hangisi doğrudur?'
        ],
        useChart: 'always',
        chartTypes: ['line']
    },

    'Matematik & Sayısal Mantık': {
        questionTypes: ['CALCULATION', 'SCENARIO', 'SEQUENCE'],
        specificDirectives: `
- Sayı problemleri, oran-orantı, yüzde hesaplama soruları oluştur
- Mantık ve akıl yürütme problemleri (zar, küp, şifreleme, sıralama) kur
- Olasılık ve kombinasyon temel problemleri sor
- Çözüm yolunu açıklamada adım adım belirt
- İşlem hatası ve mantık yanılgısı çeldiricileri kullan

=== GRAFİK KURALI ===
Sayısal karşılaştırma veya trend analizi içeren sorularda chart_data KULLANARAK grafik oluşturabilirsin.
Bu durumda soru metninde "Aşağıdaki grafiğe göre..." ifadesi kullanılabilir çünkü grafik otomatik gösterilecek.

!!! KRİTİK KURAL - HARİCİ GÖRSEL YASAĞI !!!
"Yukarıdaki şekilde", "verilen tabloda", "çizilen şekil" gibi HARİCİ görsel referansları KULLANMA!
chart_data ile oluşturduğun grafikler HARİÇ, tüm bilgiler soru metninde açıkça yazılı olmalı.

YANLIŞ ÖRNEK (HARİCİ GÖRSEL - KULLANMA):
"Yukarıdaki şekilde verilen üç zarın görünen yüzlerindeki sayıların toplamı 23'tür."

DOĞRU ÖRNEK (TAM METİN):
"Üç zar atıldığında görünen yüzlerdeki sayıların toplamı 23'tür. Bir zarın tüm yüzlerindeki sayıların toplamı 21 olduğuna göre, görünmeyen yüzlerdeki sayıların toplamı kaçtır?"

DOĞRU ÖRNEK (chart_data İLE GRAFİK):
chart_data oluşturup soru metninde "Aşağıdaki grafiğe göre hangi yılda en yüksek değer gözlemlenmiştir?" yazabilirsin.`,
        distractorStrategies: ['partial', 'common_mistake', 'reversal'],
        sampleFormats: [
            'Üç ardışık tek sayının toplamı 45 ise en büyük sayı kaçtır?',
            'Bir kutuda 5 kırmızı, 3 mavi top var. Rastgele çekilen bir topun kırmızı olma olasılığı nedir?',
            'A, B ile 3 yaş büyük, B ise C den 5 yaş küçüktür. C 20 yaşında ise A kaç yaşındadır?',
            'Bir zarın tüm yüzlerindeki sayıların toplamı 21 olduğuna göre, 3 zar atıldığında görünmeyen yüzlerin maksimum toplamı kaç olabilir?',
            '(chart_data kullanarak) Aşağıdaki grafiğe göre en yüksek değer hangi yılda gözlemlenmiştir?'
        ],
        useChart: 'optional',
        chartTypes: ['bar', 'line']
    }
};

// ============================================================================
// YARDIMCI FONKSİYONLAR
// ============================================================================

/**
 * Rastgele zorluk seviyesi seçer
 * Dağılım: %30 easy, %50 medium, %20 hard
 */
export function getRandomDifficulty(): DifficultyLevel {
    const rand = Math.random();
    if (rand < 0.30) return 'easy';
    if (rand < 0.80) return 'medium';
    return 'hard';
}

/**
 * Belirli zorluk seviyesine uygun soru tipi seçer
 */
export function getQuestionTypeForDifficulty(difficulty: DifficultyLevel): QuestionType {
    const types = DIFFICULTY_DIRECTIVES[difficulty].questionTypes;
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Ders için uygun soru tipi seçer (varsa ders tiplerinden, yoksa genel)
 */
export function getQuestionTypeForLesson(lessonType: string): QuestionType {
    const courseConfig = COURSE_PROMPTS[lessonType];
    if (courseConfig && courseConfig.questionTypes.length > 0) {
        const types = courseConfig.questionTypes;
        return types[Math.floor(Math.random() * types.length)];
    }
    // Fallback to general types
    const allTypes = Object.keys(QUESTION_TYPES) as QuestionType[];
    return allTypes[Math.floor(Math.random() * allTypes.length)];
}

/**
 * Tam özelleştirilmiş prompt direktifi oluşturur
 * @param lessonType Ders adı
 * @returns Detaylı prompt yönergesi
 */
export function getSpecializedPrompt(lessonType: string | null): string {
    if (!lessonType) return getDefaultPrompt();

    // Exact match
    const courseConfig = COURSE_PROMPTS[lessonType];
    if (courseConfig) {
        return buildPrompt(lessonType, courseConfig);
    }

    // Partial match (e.g. "Anayasa Hukuku" -> "Hukuk")
    for (const key in COURSE_PROMPTS) {
        if (lessonType.includes(key)) {
            return buildPrompt(key, COURSE_PROMPTS[key]);
        }
    }

    return getDefaultPrompt();
}

/**
 * Ders konfigürasyonundan tam prompt oluşturur
 */
function buildPrompt(lessonType: string, config: typeof COURSE_PROMPTS[string]): string {
    const difficulty = getRandomDifficulty();
    const diffConfig = DIFFICULTY_DIRECTIVES[difficulty];
    const questionType = getQuestionTypeForLesson(lessonType);
    const questionTypeConfig = QUESTION_TYPES[questionType];

    // Çeldirici stratejileri
    const distractorGuide = config.distractorStrategies
        .map(s => `• ${DISTRACTOR_STRATEGIES[s].name}: ${DISTRACTOR_STRATEGIES[s].description}`)
        .join('\n');

    const chartPolicy = config.useChart || 'never';
    let chartGuide = '';

    if (chartPolicy === 'never') {
        chartGuide = `
=== GRAFİK VE GÖRSEL KURALI ===
- chart_data: null (Bu ders için grafik çizdirme)
- related_image: EĞER soruya kaynaklık eden metinde bir görsel varsa ve soru bu görselle ilgiliyse "related_image" alanını doldur. Yoksa null bırak.`;
    } else if (chartPolicy === 'always') {
        const types = config.chartTypes?.join(', ') || 'line';
        chartGuide = `
=== GRAFİK VE GÖRSEL KURALI ===
- chart_data: MUTLAKA oluştur (Tür: ${types})
- related_image: EĞER metindeki orijinal görseli kullanacaksan "related_image" doldur.`;
    } else if (chartPolicy === 'optional') {
        const types = config.chartTypes?.join(', ') || 'bar, line';
        chartGuide = `
=== GRAFİK VE GÖRSEL KURALI ===
- chart_data: Sayısal analiz varsa oluştur (Tür: ${types})
- related_image: Metindeki görseli kullanacaksan doldur.`;
    }

    return `
=== SORU FORMATI VE ZORLUK ===
Zorluk: ${diffConfig.level} (${diffConfig.bloomLevels.join('/')})
Soru Tipi: ${questionTypeConfig.name}
Kognitif Yük: ${diffConfig.cognitiveLoad}

=== SORU TİPİ ŞABLONU ===
${questionTypeConfig.description}
Örnek Format: ${questionTypeConfig.template}

=== DERS ÖZEL YÖNERGELERİ (${lessonType}) ===
${config.specificDirectives}

=== ÖRNEK SORU FORMATLARI ===
${config.sampleFormats.map((f, i) => `${i + 1}. ${f}`).join('\n')}

=== ZORLUK KRİTERLERİ ===
${diffConfig.criteria.map(c => `• ${c}`).join('\n')}

=== ÇELDİRİCİ STRATEJİLERİ ===
Aşağıdaki stratejilerden EN AZ 2'sini kullan:
${distractorGuide}
${chartGuide}

=== ÖNEMLİ ===
- Seçenekler birbirine yakın uzunlukta olsun
- Doğru cevabın konumu rastgele olsun (her zaman A veya C olmasın)
- Çeldiriciler metinden türetilmiş, makul yanlışlar olsun
- difficulty alanını "${difficulty}" olarak ayarla
`;
}

/**
 * Varsayılan prompt (ders eşleşmesi yoksa)
 */
function getDefaultPrompt(): string {
    const difficulty = getRandomDifficulty();
    const diffConfig = DIFFICULTY_DIRECTIVES[difficulty];
    const allTypes = Object.keys(QUESTION_TYPES) as QuestionType[];
    const questionType = allTypes[Math.floor(Math.random() * allTypes.length)];
    const questionTypeConfig = QUESTION_TYPES[questionType];

    return `
=== SORU FORMATI VE ZORLUK ===
Zorluk: ${diffConfig.level} (${diffConfig.bloomLevels.join('/')})
Soru Tipi: ${questionTypeConfig.name}

=== SORU TİPİ ŞABLONU ===
${questionTypeConfig.description}
Örnek: ${questionTypeConfig.template}

=== GENEL YÖNERGELER ===
- Metindeki ana kavram ve bilgileri test et
- Açık ve anlaşılır bir dil kullan
- Seçenekler mantıklı ve birbirine yakın olsun
- difficulty alanını "${difficulty}" olarak ayarla

=== ZORLUK KRİTERLERİ ===
${diffConfig.criteria.map(c => `• ${c}`).join('\n')}
`;
}
