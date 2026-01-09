
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Utility to read .env file manually
function loadEnv() {
    const envFiles = ['.env.local', '.env'];
    let env = { ...process.env };

    for (const file of envFiles) {
        try {
            const envPath = path.resolve(process.cwd(), file);
            if (!fs.existsSync(envPath)) continue;

            const envFile = fs.readFileSync(envPath, 'utf8');
            console.log(`ℹ️  Loading environment variables from ${file}`);

            envFile.split('\n').forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) return;

                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    // Remove quotes if present
                    env[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            });
        } catch (e) {
            console.warn(`⚠️  Error reading ${file}: ${e.message}`);
        }
    }

    return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
// Prioritize Service Role Key for admin privileges (seeding)
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and a valid API key must be set in .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_FILE = path.resolve(process.cwd(), '.generated/content-data.json');

async function seed() {
    console.log('🌱 Seeding database from pipeline output...');

    try {
        if (!fs.existsSync(CONTENT_FILE)) {
            console.error(`Error: ${CONTENT_FILE} not found. Did you run 'npm run content:build' first?`);
            return;
        }

        const data = fs.readFileSync(CONTENT_FILE, 'utf8');
        const contentData = JSON.parse(data);

        if (!contentData.lessons || !Array.isArray(contentData.lessons)) {
            console.error('Error: Invalid content-data.json format.');
            return;
        }

        console.log(`Found ${contentData.lessons.length} lessons to process.`);

        let totalSuccess = 0;
        let totalFail = 0;

        for (const lesson of contentData.lessons) {
            const lessonName = lesson.title;
            const lessonSlug = lesson.id;

            console.log(`\n📚 Processing Lesson: ${lessonName} (${lessonSlug})`);

            // 1. Check/Insert Lesson
            const { data: existingLesson } = await supabase
                .from('lessons')
                .select('id')
                .eq('slug', lessonSlug)
                .maybeSingle();

            let lessonId;
            if (existingLesson) {
                lessonId = existingLesson.id;
                // Update name if changed
                await supabase.from('lessons').update({ name: lessonName }).eq('id', lessonId);
                console.log(`   ✅ Lesson exists: ${lessonName}`);
            } else {
                const { data: inserted, error } = await supabase
                    .from('lessons')
                    .insert({ name: lessonName, slug: lessonSlug })
                    .select()
                    .single();

                if (error) {
                    console.error(`   ❌ Error inserting lesson:`, error);
                    totalFail++;
                    continue;
                }
                lessonId = inserted.id;
                console.log(`   ✨ Created lesson: ${lessonName}`);
            }

            // 2. Group Blocks by H2 headings
            const groupedChunks = [];
            let currentChunk = null;

            for (let i = 0; i < lesson.blocks.length; i++) {
                const block = lesson.blocks[i];
                const isH2 = block.type === 'heading' && block.level === 2;

                if (isH2) {
                    // Start a new chunk
                    if (currentChunk) groupedChunks.push(currentChunk);

                    currentChunk = {
                        source_id: block.id,
                        title: block.metadata?.title || block.content.replace(/<[^>]*>/g, '').trim(),
                        content_md: block.content,
                        metadata: {
                            ...block.metadata,
                            type: 'section'
                        }
                    };
                } else if (!currentChunk) {
                    // Content before any H2 goes to "Introduction"
                    currentChunk = {
                        source_id: 'intro_' + lessonSlug,
                        title: 'Giriş',
                        content_md: block.content,
                        metadata: { type: 'introduction' }
                    };
                } else {
                    // Append block to current chunk
                    currentChunk.content_md += '\n\n' + block.content;
                }
            }
            if (currentChunk) groupedChunks.push(currentChunk);

            console.log(`   ⚙️  Processing ${groupedChunks.length} sections (delimited by H2)...`);

            for (let i = 0; i < groupedChunks.length; i++) {
                const chunk = groupedChunks[i];
                const order = i + 1;

                // Check if chunk exists by source_id
                const { data: existingChunks } = await supabase
                    .from('lesson_chunks')
                    .select('id')
                    .eq('lesson_id', lessonId)
                    .contains('metadata', { source_id: chunk.source_id });

                const existingChunk = existingChunks && existingChunks.length > 0 ? existingChunks[0] : null;

                const dbData = {
                    lesson_id: lessonId,
                    title: chunk.title,
                    content_md: chunk.content_md,
                    metadata: {
                        ...chunk.metadata,
                        source_id: chunk.source_id,
                        order: order
                    }
                };

                let error;
                if (existingChunk) {
                    const { error: updateError } = await supabase
                        .from('lesson_chunks')
                        .update(dbData)
                        .eq('id', existingChunk.id);
                    error = updateError;
                } else {
                    const { error: insertError } = await supabase
                        .from('lesson_chunks')
                        .insert(dbData);
                    error = insertError;
                }

                if (error) {
                    console.error(`      ❌ Error processing section "${chunk.title}":`, error);
                    totalFail++;
                } else {
                    totalSuccess++;
                }
            }
        }

        console.log(`\n✅ Seeding complete!`);
        console.log(`   Successfully processed ${totalSuccess} items.`);
        if (totalFail > 0) console.log(`   Failed ${totalFail} items.`);

    } catch (error) {
        console.error('Seeding failed:', error);
    }
}

seed();
