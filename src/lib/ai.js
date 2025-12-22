import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabaseClient";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const generateQuestions = async (courseId, courseName, rawNoteText, existingQuestionCount = 0, weakTopics = []) => {
    if (!genAI) {
        throw new Error("Gemini API Anahtarı bulunamadı. Lütfen .env dosyanıza VITE_GEMINI_API_KEY ekleyin.");
    }

    // List models for debugging
    var modelName = "gemini-2.5-flash-lite";

    const model = genAI.getGenerativeModel({ model: modelName });

    console.log("Generating questions for:", courseName, "Model:", modelName);
    const contextText = rawNoteText.slice(0, 30000);
    console.log("Context length:", contextText.length);

    let focusInstruction = "";
    if (weakTopics && weakTopics.length > 0) {
        focusInstruction = `
        ÖNEMLİ: Kullanıcı şu konularda zayıf: ${weakTopics.join(", ")}.
        Lütfen üreteceğin 50 sorunun en az 30 tanesini (%60) bu zayıf konulara odakla.
        Geri kalan 20 soruyu genel not içeriğinden seç.
        `;
    }

    // ... Prompt string ...
    const prompt = `
    Sen uzman bir sınav hazırlayıcısısın. Aşağıdaki ders notlarını kullanarak bir soru bankası için soru hazırlayacaksın.
    
    Ders: ${courseName}
    Mevcut Soru Sayısı: ${existingQuestionCount}
    
    ${focusInstruction}
    
    GÖREV:
    Bu metinden, KPSS veya Kurum sınavı formatında, zorluk dereceleri karışık (1-3 arası),
    tam olarak 50 ADET çoktan seçmeli soru üret.
    
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
        "correct_option_index": 0, // 0-4 arası sayı (Hangi şıkkın doğru olduğunu belirtir)
        "explanation": "Doğru cevabın neden doğru olduğunun kısa açıklaması",
        "difficulty_level": 1 // 1: Kolay, 2: Orta, 3: Zor
      }
    ]
    3. Sorular notların farklı bölümlerinden seçilmelidir.
    4. Sorular bilgiye dayalı ve net olmalıdır.
    5. Türkçe dilde üretilmelidir.
    6. Her soruya mutlaka "topic" (konu) alanı ekle. Bu alan analitik için kullanılacaktır.
    
    KAYNAK METİN:
    ${contextText}
    `;

    try {
        console.log("Sending prompt to Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        console.log("Raw AI Response:", text);

        // Cleanup markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let questions = JSON.parse(text);
        console.log("Parsed Questions:", questions);

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
            sub_topic: q.sub_topic || ""
        }));

        // Save to Supabase
        const { data, error } = await supabase
            .from('questions')
            .insert(questions)
            .select();

        console.log("Supabase Insert Result:", data, error);

        if (error) throw error;

        return data;

    } catch (error) {
        console.error("AI Generation Error:", error);

        // DEBUG: List available models to console
        console.log("Listing available models due to error...");
        try {
            // Not all keys have permission to list models, but worth a try
            // There isn't a direct listModels on the instance in this SDK version usually, 
            // but we can try to guide user or just log the error clearly.
        } catch {
            // ignore
        }

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
