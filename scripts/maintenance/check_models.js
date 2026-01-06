import fs from 'fs';
import path from 'path';

// Load env
function getApiKey() {
    const envFiles = ['.env.local', '.env'];
    for (const file of envFiles) {
        const envPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const match = content.match(/VITE_GEMINI_API_KEY=(.*)/);
            if (match) {
                console.log(`ℹ️  Found API Key in ${file}`);
                return match[1].trim().replace(/^["']|["']$/g, '');
            }
        }
    }
    return null;
}

const apiKey = getApiKey();

if (!apiKey) {
    console.error("API KEY NOT FOUND IN .env or .env.local");
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
