# Content Pipeline - Kullanım Kılavuzu

## Genel Bakış

Bu proje, **Markdown** veya HTML ders notlarını yapısal JSON verisine dönüştüren bir **TypeScript content pipeline** içerir. Pipeline, içeriği block-based bir yapıya ayırır ve React componentleri ile render eder.

## Desteklenen Formatlar

- ✅ **Markdown (.md)** - Önerilen format
- ✅ **MDX (.mdx)** - React componentleri ile
- ✅ **HTML (.html)** - Fallback

**Öncelik sırası:** `.md` > `.mdx` > `.html`

## Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT PIPELINE v2.1                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   input/<ders>/<ders>.md  →  content-pipeline  →  .generated│
│         (Markdown)              (Parser)         (JSON)     │
│                                                             │
│   input/<ders>/media/*  →  public/content/<ders>/media/     │
│         (Görseller)         (Kopyalanır)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Hızlı Başlangıç

### Klasör Yapısı

```
input/
├── Mikro İktisat/
│   ├── Mikro İktisat.md    # Ana içerik dosyası
│   └── media/              # Görseller
│       ├── image1.webp
│       ├── image2.webp
│       └── ...
│
├── Makro İktisat/
│   ├── Makro İktisat.md
│   └── media/
│       └── ...
```

### İçerik İşleme

```bash
# Tüm Markdown dosyalarını işle
npm run content:build

# Veritabanına seed ile birlikte
npm run process:all
```

### Çıktı

```json
{
  "lessons": [
    {
      "id": "mikro_iktisat",
      "title": "Mikro İktisat",
      "blocks": [
        { "type": "heading", "content": "<h2>EĞİM</h2>", "level": 2 },
        { "type": "example", "content": "...", "metadata": { "title": "Örnek", "number": "1" } }
      ],
      "stats": { "blockCount": 404, "exampleCount": 4 }
    }
  ],
  "version": "2.1.0"
}
```

## Markdown Formatı

### Başlıklar

```markdown
# Ders Başlığı (h1)
## Konu Başlığı (h2)
### Alt Başlık (h3)
#### Detay Başlığı (h4)
```

### Matematik Formülleri

**Display Math:**
````markdown
```math
m = \frac{\Delta y}{\Delta x}
```
````

**Inline Math:**
```markdown
Bu formül $`E = mc^2`$ çok önemlidir.
```

### Görseller

```markdown
> <img src="media/image1.webp" />
```

> **Not:** Pipeline, görsel yollarını otomatik olarak `/content/<ders>/media/` olarak düzeltir.

### Örnek Kartları

```markdown
> **Örnek 1:** Bir tüketici bütçesi 120 TL ise...
>
> **Cevap:**
> Tüketici sadece Y malı satın alır.
```

### Tablolar

```markdown
| **Mal Türü** | **Gelir Artarsa** | **Fiyat Artarsa** |
|:--:|:--:|:--:|
| Normal Mal | Talep Artar | Talep Azalır |
| Düşük Mal | Talep Azalır | Talep Azalır |
```

### Listeler

```markdown
- Birinci madde
- İkinci madde
  - Alt madde

1. Numaralı liste
2. İkinci öğe
```

## Kart Tespiti

Pipeline aşağıdaki pattern'leri otomatik tespit eder:

| Pattern | Örnek | Tip |
|---------|-------|-----|
| `Örnek 1:` | Örnek 1: Tüketici bütçesi... | `example` |
| `**Örnek 1:**` | **Örnek 1:** Yatay eksende... | `example` |
| `Soru:` | Soru: Hangi hesaplar... | `question` |
| `Cevap:` | Cevap: X = 20, Y = 30 | `solution` |
| `Çözüm:` | Çözüm: Formülü uygulayarak... | `solution` |

## Dosya Yapısı

```
src/
├── content-pipeline/           # İçerik işleme pipeline'ı
│   ├── index.ts               # Ana giriş noktası
│   ├── parser.ts              # Markdown/HTML → Block
│   ├── types.ts               # Pipeline tipleri
│   ├── utils.ts               # Yardımcı fonksiyonlar
│   └── README.md              # Bu dosya
│
├── features/course/
│   ├── components/
│   │   ├── ContentBlock.tsx   # Block router
│   │   ├── ExampleCard.tsx    # Örnek kartı
│   │   ├── QuestionCard.tsx   # Soru kartı
│   │   └── ...
│   └── types/
│       └── content.ts         # İçerik tipleri
```

## Yeni Ders Ekleme

1. `input/` klasörüne yeni klasör oluşturun: `input/Yeni Ders/`
2. Markdown dosyasını ekleyin: `input/Yeni Ders/Yeni Ders.md`
3. Görselleri ekleyin: `input/Yeni Ders/media/`
4. `npm run content:build` çalıştırın
5. Görseller otomatik olarak `public/content/yeni_ders/media/` klasörüne kopyalanır

## Sorun Giderme

### Örnek sayısı beklenenden az

Pattern'lerin dosyanızdaki formatla eşleştiğinden emin olun:
- `Örnek 1:` (boşluk + numara + iki nokta)
- `**Örnek 1:**` (bold format)

### Görseller görünmüyor

1. Görsellerin `input/<ders>/media/` klasöründe olduğundan emin olun
2. `npm run content:build` tekrar çalıştırın
3. `public/content/<ders>/media/` klasörünü kontrol edin

### Türkçe karakterler bozuk

Markdown dosyasının UTF-8 encoding ile kaydedildiğinden emin olun.

---

**Version:** 2.1.0  
**Tarih:** 2026-01-04
