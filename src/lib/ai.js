import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabaseClient";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const generateQuestions = async (courseId, courseName, rawNoteText, existingQuestionCount = 0, weakTopics = [], questionCount = 10) => {
    if (!genAI) {
        throw new Error("Gemini API Anahtarı bulunamadı. Lütfen .env dosyanıza VITE_GEMINI_API_KEY ekleyin.");
    }

    // List models for debugging
    const modelName = "gemini-2.5-flash-lite";

    const model = genAI.getGenerativeModel({ model: modelName });

    const contextText = rawNoteText.slice(0, 30000);

    let focusInstruction = "";
    if (weakTopics && weakTopics.length > 0) {
        focusInstruction = `
        ÖNEMLİ: Kullanıcı şu konularda zayıf: ${weakTopics.join(", ")}.
        Lütfen üreteceğin soruların çoğunluğunu bu zayıf konulara odakla.
        `;
    }

    // Grafik ağırlıklı konu kontrolü
    const graphKeywords = ['grafik', 'tablo', 'istatistik', 'diyagram', 'şekil', 'histogram', 'pasta grafik', 'çubuk grafik', 'çizgi grafik'];
    const courseNameLower = courseName.toLowerCase();
    const isGraphHeavyTopic = graphKeywords.some(keyword => courseNameLower.includes(keyword));

    // Grafik sayısını hesapla
    const chartCount = isGraphHeavyTopic ? questionCount : Math.max(2, Math.floor(questionCount / 5));

    // Grafik oranı talimatı
    const graphInstruction = isGraphHeavyTopic
        ? `ÖNEMLİ: Bu konu grafik ağırlıklı bir konudur. TÜM SORULARIN (${questionCount}/${questionCount}) "chart_data" alanı doldurulmalıdır. Her soru bir grafik içermelidir.`
        : `${questionCount} sorunun EN AZ ${chartCount} TANESİ grafik içersin (eğer not içeriği uygunsa).`;

    // ... Prompt string ...
    const prompt = `
    Sen uzman bir sınav hazırlayıcısısın. Aşağıdaki ders notlarını kullanarak bir soru bankası için soru hazırlayacaksın.
    
    Ders: ${courseName}
    Mevcut Soru Sayısı: ${existingQuestionCount}
    
    ${focusInstruction}
    
    GÖREV:
    Bu metinden, KPSS veya Kurum sınavı formatında, zorluk dereceleri karışık (1-3 arası),
    tam olarak ${questionCount} ADET çoktan seçmeli soru üret.
    
    KURALLAR:
    1. Çıktı SADECE ve SADECE geçerli bir JSON array formatında olmalıdır. Markdown, kod bloğu (\`\`\`) veya ek açıklama kullanma.
    2. JSON formatı şöyle olmalıdır:
    [
      {
        "course_id": "${courseId}",
        "topic": "Konu Başlığı (Örn: Fonksiyonlar, Türev, vb.)",
        "sub_topic": "Alt Konu (Opsiyonel)",
        "question_text": "Soru metni...",
        "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı", "E şıkkı"],
        "correct_option_index": 0,
        "explanation": "Doğru cevabın neden doğru olduğunun kısa açıklaması",
        "difficulty_level": 1,
        "chart_data": null
      }
    ]
    3. Sorular notların farklı bölümlerinden seçilmelidir.
    4. Sorular bilgiye dayalı ve net olmalıdır.
    5. Türkçe dilde üretilmelidir.
    6. Her soruya mutlaka "topic" (konu) alanı ekle. Bu alan analitik için kullanılacaktır.
    7. ÖNEMLİ: JSON içinde LaTeX formatı (\\Delta, \\frac, $..$ gibi) KULLANMA! Matematiksel ifadeleri düz metin olarak yaz. Örneğin: "delta y / delta x" veya "(12-4)/(6-2)" gibi.
    
    GRAFİK DESTEĞİ:
    Eğer ders notlarında grafik, tablo veya veri içeren konular varsa (örn: ekonomi verileri, nüfus istatistikleri, 
    yakıt tüketimi, satış rakamları, oran-orantı problemleri vb.), bu konulardan GRAFİK GEREKTİREN sorular da üret.
    
    Grafik gerektiren sorularda "chart_data" alanını şu formatta doldur:
    {
      "chart_data": {
        "type": "line",  // "line" | "bar" | "pie" | "area" türlerinden biri
        "title": "Grafik Başlığı",
        "xAxisLabel": "X Ekseni Etiketi (pie için kullanılmaz)",
        "yAxisLabel": "Y Ekseni Etiketi (pie için kullanılmaz)",
        "displayMode": "percent",  // SADECE pie için: "percent" veya "angle" - Soru açı soruyorsa "angle" kullan!
        "data": [
          { "label": "Etiket1", "value": 100, "angle": 216 },  // pie için açı değeri (derece)
          { "label": "Etiket2", "value": 200, "angle": 144 }
        ]
      }
    }
    
    ÖNEMLİ - PASTA GRAFİĞİ (PIE) KURALLARI:
    - Eğer soru açı (derece/°) soruyorsa: displayMode: "angle" kullan ve her data'ın "angle" değerini derece olarak yaz
    - Eğer soru yüzde soruyorsa: displayMode: "percent" kullan
    - Açı hesabı: (değer / toplam) * 360 = açı
    
    Grafik türü seçimi:
    - "line": Zaman içindeki değişimler (yıllara göre nüfus, aylık satışlar vb.)
    - "bar": Karşılaştırmalar (şehirlerin nüfusları, ürün satışları vb.)
    - "pie": Dağılım/oran gösterimi (bütçe dağılımı, pazar payları vb.)
    - "area": Birikimli değerler veya alansal karşılaştırmalar
    
    Grafik gerektirmeyen sorularda "chart_data": null olarak bırak.
    ${graphInstruction}
    
    KAYNAK METİN:
    ${contextText}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // LaTeX ve özel karakterleri temizle (JSON'u bozabilir)
        text = text
            .replace(/\\Delta/g, 'delta')
            .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1/$2)')
            .replace(/\\Rightarrow/g, '=>')
            .replace(/\\times/g, 'x')
            .replace(/\$([^$]*)\$/g, '$1'); // Remove $ wrappers

        let questions = JSON.parse(text);

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("Yapay zeka geçerli soru üretemedi (Boş liste).");
        }

        // Force correct course_id for all questions
        // AI might hallucinate different IDs or increment them
        questions = questions.map(q => ({
            ...q,
            course_id: courseId,
            difficulty_level: q.difficulty_level || 1, // Ensure difficulty exists
            topic: q.topic || "Genel", // Fallback topic
            sub_topic: q.sub_topic || "",
            chart_data: q.chart_data || null // Grafik verisi
        }));

        const { data, error } = await supabase
            .from('questions')
            .insert(questions)
            .select();

        if (error) throw error;

        return data;

    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new Error("Soru üretimi başarısız oldu: " + error.message);
    }
};

export const fetchNoteContent = async (notePath) => {
    try {
        const response = await fetch(notePath);
        if (!response.ok) throw new Error("Not dosyası okunamadı");
        const html = await response.text();

        // Simple regex to strip HTML tags for cleaner text context
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    } catch (error) {
        console.error(error);
        return "";
    }
};
