
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
const COURSES_FILE = path.resolve(process.cwd(), 'src/features/course/data/courses.json');

async function seedLessons() {
    console.log('📚 Seeding lessons from courses.json...');

    try {
        const data = fs.readFileSync(COURSES_FILE, 'utf8');
        const categories = JSON.parse(data);

        let successCount = 0;
        let failCount = 0;

        for (const category of categories) {
            for (const course of category.courses) {
                if (!course.lessonType) {
                    console.warn(`⚠️  Skipping course ${course.id} (${course.name}): Missing lessonType`);
                    failCount++;
                    continue;
                }

                const lessonName = course.lessonType;

                // Tr karakterleri ve özel karakterleri temizleyip slug oluştur
                const slug = lessonName.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-') // Birden fazla tireyi teke indir
                    .replace(/^-|-$/g, ''); // Baştaki ve sondaki tireleri kaldır

                console.log(`Processing lesson: ${lessonName} -> slug: ${slug}`);

                // Check if exists
                const { data: existing } = await supabase
                    .from('lessons')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (existing) {
                    console.log(`   ✅ Lesson exists: ${lessonName}`);
                    // İsterseniz burada update de yapabilirsiniz ama şimdilik gerek yok gibi
                } else {
                    const { data: inserted, error } = await supabase
                        .from('lessons')
                        .insert({ name: lessonName, slug })
                        .select()
                        .single();

                    if (error) {
                        console.error(`   ❌ Error inserting lesson ${lessonName}:`, error);
                        failCount++;
                    } else {
                        console.log(`   ✨ Created lesson: ${lessonName}`);
                        successCount++;
                    }
                }
            }
        }

        console.log(`\n🎉 Lesson Seeding complete!`);
        console.log(`Created/Verified: ${successCount}`);
        console.log(`Failed/Skipped: ${failCount}`);

    } catch (error) {
        console.error('Seeding failed:', error);
    }
}

seedLessons();
