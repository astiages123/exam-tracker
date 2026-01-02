import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = '';
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/VITE_GEMINI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error("API KEY NOT FOUND IN .env");
    process.exit(1);
}

async function listModels() {
    console.log("Fetching available models from API...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("\n=== AVAILABLE MODELS ===");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods?.join(', ')})`);
            });
        } else {
            console.log("No models found or error structure:", data);
        }
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listModels();
