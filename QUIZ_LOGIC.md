# Exam Tracker Quiz Mantığı

Bu belge, projedeki quiz (sınav) oluşturma ve yönetim mantığını açıklamaktadır. Sistem **"Hibrit (Veritabanı + YZ)"** bir yaklaşım kullanmaktadır.

## 1. Akıllı Soru Seçimi (Smart Selection)
Quiz başladığında (`useQuiz.ts` -> `initializeQuiz`), sistem rastgele sorular getirmek yerine öğrencinin durumuna göre özel bir karışım yapar:

- **Zayıf Nokta Analizi:** Kullanıcının geçmiş istatistiklerine (`user_statistics` tablosu) bakılarak en başarısız olduğu 3 konu belirlenir.
- **Soru Havuzu Dağılımı:**
  - **~30% (6 soru):** Özellikle kullanıcının zayıf olduğu konulardan seçilir.
  - **~70% (14 soru):** Dersin genel havuzundan, daha önce çözülmemiş sorulardan seçilir.
  
Bu yöntemle öğrenci hem eksiklerini kapatır hem de genel tekrar yapmış olur.

## 2. Yapay Zeka ile Anlık Üretim (AI Generation)
Eğer veritabanında yeterli soru yoksa veya kullanıcı "Soru Üret" butonuna basarsa (`ai.ts`):

- **Kaynak:** Dersin not dosyasının (`notePath`) içeriği okunur.
- **Model:** Google Gemini (Flash Lite modeli) kullanılır.
- **Prompt Mühendisliği:**
  - Sisteme "uzman sınav hazırlayıcısı" rolü verilir.
  - Eğer konu "grafik, tablo, istatistik" içeriyorsa, yapay zekadan `chart_data` (grafik verisi) içeren sorular üretmesi istenir (Pie, Line, Bar charts).
  - Üretilen sorular JSON formatında direkt veritabanına (`questions` tablosuna) kaydedilir.
  
Bu sayede üretilen sorular tekrar tekrar kullanılabilir ve API maliyeti düşürülür.

## 3. Otomatik Tamamlama (Auto-Refill)
Quiz çözülürken arka planda çalışan dinamik bir mekanizma vardır:

- **Tetikleyici:** Kullanıcı sona yaklaştığında (son 5 soru kala).
- **İşlem:** Sistem hissettirmeden arka planda yeni sorular üretip listeye ekler (`triggerAutoGenerate`).
- **Odak:** Bu üretimde de yine kullanıcının o anki zayıf olduğu konulara ağırlık verilir.

---
**Özet:** Sistem "Önce var olanı kullan, ihtiyaç varsa YZ'ye ürettirip kaydet" prensibiyle çalışarak hem performanslı hem de kişiselleştirilmiş bir deneyim sunar.
