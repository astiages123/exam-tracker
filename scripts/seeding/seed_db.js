
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Utility to read .env file manually
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim();
            }
        });
        return env;
    } catch (e) {
        console.warn('.env file not found or readable, relying on process.env');
        return process.env;
    }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
// Prioritize Service Role Key for admin privileges (seeding)
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.resolve(process.cwd(), 'output.json');

async function seed() {
    console.log('🌱 Seeding database...');

    try {
        const data = fs.readFileSync(OUTPUT_FILE, 'utf8');
        const chunks = JSON.parse(data);

        if (!Array.isArray(chunks) || chunks.length === 0) {
            console.error('Error: output.json is empty or invalid.');
            return;
        }

        console.log(`Found ${chunks.length} chunks to process.`);

        // 1. Extract unique lessons
        const uniqueLessons = [...new Set(chunks.map(c => c.lesson_type))].filter(Boolean);
        console.log('Unique Lessons:', uniqueLessons);

        const lessonMap = new Map();

        // 2. Insert Lessons
        for (const lessonName of uniqueLessons) {
            const slug = lessonName.toLowerCase()
                .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .replace(/[^a-z0-9-]/g, '-');

            console.log(`Processing lesson: ${lessonName} (${slug})`);

            // Check if exists
            const { data: existing } = await supabase
                .from('lessons')
                .select('id')
                .eq('slug', slug)
                .single();

            if (existing) {
                lessonMap.set(lessonName, existing.id);
            } else {
                const { data: inserted, error } = await supabase
                    .from('lessons')
                    .insert({ name: lessonName, slug })
                    .select()
                    .single();

                if (error) {
                    console.error(`Error inserting lesson ${lessonName}:`, error);
                } else {
                    lessonMap.set(lessonName, inserted.id);
                }
            }
        }

        // 3. Insert Chunks
        let successCount = 0;
        for (const chunk of chunks) {
            const lessonId = lessonMap.get(chunk.lesson_type);
            if (!lessonId) {
                console.warn(`Skipping chunk ${chunk.id}: Lesson ID not found for ${chunk.lesson_type}`);
                continue;
            }

            // Check if chunk exists by source_id
            const query = supabase
                .from('lesson_chunks')
                .select('id')
                .eq('lesson_id', lessonId)
                .contains('metadata', { source_id: chunk.id });

            // Robust check: get first match if variants exist
            const { data: foundChunks, error: findError } = await query.limit(1);

            if (findError) {
                console.error(`Error checking chunk ${chunk.id}:`, findError);
                continue;
            }

            const existingChunk = foundChunks && foundChunks.length > 0 ? foundChunks[0] : null;

            let operationError = null;

            if (existingChunk) {
                // UPDATE existing chunk
                console.log(`   🔄 Updating chunk: ${chunk.title}`);
                const { error } = await supabase
                    .from('lesson_chunks')
                    .update({
                        title: chunk.title.trim(),
                        content_md: chunk.content_md,
                        name: chunk.lesson_type,
                        metadata: {
                            source_id: chunk.id,
                            order: chunk.order,
                            images: chunk.images,
                            stats: chunk.image_stats
                        }
                    })
                    .eq('id', existingChunk.id);

                operationError = error;
            } else {
                // INSERT new chunk
                console.log(`   ✨ Inserting chunk: ${chunk.title}`);
                const { error } = await supabase
                    .from('lesson_chunks')
                    .insert({
                        lesson_id: lessonId,
                        title: chunk.title.trim(),
                        content_md: chunk.content_md,
                        name: chunk.lesson_type,
                        metadata: {
                            source_id: chunk.id,
                            order: chunk.order,
                            images: chunk.images,
                            stats: chunk.image_stats
                        }
                    });

                operationError = error;
            }

            if (operationError) {
                console.error(`Error processing chunk ${chunk.id}:`, operationError);
            } else {
                successCount++;
            }
        }

        console.log(`✅ Seeding complete! Successfully processed ${successCount} chunks.`);

    } catch (error) {
        console.error('Seeding failed:', error);
    }
}

seed();
