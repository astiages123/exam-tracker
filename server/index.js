/**
 * Admin API Server
 * ================
 * Express.js sunucusu - Pandoc dönüşümü ve pipeline yönetimi
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// =====================================================
// SUPABASE SETUP
// =====================================================

function loadEnv() {
    const envFiles = ['.env.local', '.env'];
    let env = { ...process.env };
    for (const file of envFiles) {
        try {
            const envPath = path.resolve(PROJECT_ROOT, file);
            if (!fs.existsSync(envPath)) continue;
            const envFile = fs.readFileSync(envPath, 'utf8');
            envFile.split('\n').forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) return;
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    env[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            });
        } catch (e) { }
    }
    return env;
}

const env = loadEnv();
const supabase = createClient(
    env.VITE_SUPABASE_URL || '',
    env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''
);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Multer config - temp storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(PROJECT_ROOT, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        // Preserve original filename
        cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.docx' && ext !== '.doc') {
            return cb(new Error('Sadece Word dosyaları (.docx, .doc) kabul edilir.'));
        }
        cb(null, true);
    }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function slugify(str) {
    const trMap = {
        'İ': 'i', 'I': 'i', 'ı': 'i',
        'Ş': 's', 'ş': 's',
        'Ğ': 'g', 'ğ': 'g',
        'Ü': 'u', 'ü': 'u',
        'Ö': 'o', 'ö': 'o',
        'Ç': 'c', 'ç': 'c'
    };
    let result = str;
    for (const key in trMap) {
        result = result.replace(new RegExp(key, 'g'), trMap[key]);
    }
    return result
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

async function checkCommand(cmd) {
    return new Promise((resolve) => {
        exec(`which ${cmd}`, (error) => {
            resolve(!error);
        });
    });
}

async function convertToWebP(imagePath, cwebpPath) {
    const ext = path.extname(imagePath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) return;

    const webpPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');

    return new Promise((resolve, reject) => {
        const proc = spawn(cwebpPath, ['-q', '80', imagePath, '-o', webpPath]);
        proc.on('close', (code) => {
            if (code === 0) {
                fs.unlinkSync(imagePath); // Remove original
                resolve(webpPath);
            } else {
                reject(new Error(`cwebp failed with code ${code}`));
            }
        });
    });
}

// =====================================================
// ENDPOINTS
// =====================================================

/**
 * POST /api/convert-docx
 * Word dosyasını Markdown'a dönüştürür
 */
app.post('/api/convert-docx', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Dosya yüklenmedi.' });
        }

        const filePath = req.file.path;

        // Check pandoc
        const hasPandoc = await checkCommand('pandoc');
        if (!hasPandoc) {
            return res.status(500).json({ error: 'Pandoc kurulu değil. Lütfen pandoc yükleyin.' });
        }

        const hasCwebp = await checkCommand('cwebp');

        const fixedFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const fileName = path.parse(fixedFileName).name;
        const targetFolder = path.join(PROJECT_ROOT, 'input', fileName);

        // Create target folder
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        const outputMd = path.join(targetFolder, `${fileName}.md`);

        // Run pandoc
        const pandocArgs = [
            filePath,
            '--from', 'docx',
            '--to', 'markdown-pipe_tables-grid_tables-multiline_tables-simple_tables',
            '--extract-media', targetFolder,
            '--standalone',
            '--wrap', 'none',
            '--output', outputMd
        ];

        const pandoc = spawn('pandoc', pandocArgs);

        let stderr = '';
        pandoc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pandoc.on('close', async (code) => {
            // Clean up temp file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            if (code !== 0) {
                return res.status(500).json({ error: `Pandoc hatası: ${stderr}` });
            }

            // Post-process: Update image extensions in markdown
            if (fs.existsSync(outputMd)) {
                let mdContent = fs.readFileSync(outputMd, 'utf8');
                mdContent = mdContent.replace(/\.(png|jpg|jpeg)/gi, '.webp');
                fs.writeFileSync(outputMd, mdContent);
            }

            // Convert images to WebP
            const mediaFolder = path.join(targetFolder, 'media');
            let convertedImages = 0;

            if (hasCwebp && fs.existsSync(mediaFolder)) {
                const images = fs.readdirSync(mediaFolder).filter(f =>
                    /\.(png|jpg|jpeg)$/i.test(f)
                );

                for (const img of images) {
                    try {
                        await convertToWebP(path.join(mediaFolder, img), 'cwebp');
                        convertedImages++;
                    } catch (e) {
                        console.error(`WebP dönüşüm hatası: ${img}`, e);
                    }
                }
            }

            res.json({
                success: true,
                message: 'Dönüşüm tamamlandı.',
                outputFolder: targetFolder,
                markdownFile: outputMd,
                stats: {
                    imagesConverted: convertedImages,
                    cwebpAvailable: hasCwebp
                }
            });
        });

    } catch (error) {
        console.error('Convert error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/content-build
 * npm run content:build çalıştırır
 */
app.post('/api/content-build', (req, res) => {
    exec('npm run content:build', { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: stderr || error.message });
        }
        res.json({ success: true, output: stdout });
    });
});

/**
 * POST /api/seed-db
 * npm run process:seed çalıştırır
 */
app.post('/api/seed-db', (req, res) => {
    exec('npm run process:seed', { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: stderr || error.message });
        }
        res.json({ success: true, output: stdout });
    });
});

/**
 * GET /api/input-files
 * input/ klasöründeki dosyaları listeler
 */
app.get('/api/input-files', (req, res) => {
    const inputDir = path.join(PROJECT_ROOT, 'input');

    if (!fs.existsSync(inputDir)) {
        return res.json({ files: [] });
    }

    const entries = fs.readdirSync(inputDir, { withFileTypes: true });
    const files = entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => {
            const folderPath = path.join(inputDir, e.name);
            const mdFile = path.join(folderPath, `${e.name}.md`);
            const hasMd = fs.existsSync(mdFile);
            const mediaPath = path.join(folderPath, 'media');
            const hasMedia = fs.existsSync(mediaPath);
            const mediaCount = hasMedia ? fs.readdirSync(mediaPath).length : 0;

            return {
                name: e.name,
                hasMarkdown: hasMd,
                mediaCount
            };
        });

    res.json({ files });
});

/**
 * DELETE /api/delete-course/:name
 * Kurs dosyasını, üretilen içerikleri ve veritabanı kayıtlarını siler
 */
app.delete('/api/delete-course/:name', async (req, res) => {
    const courseName = req.params.name;
    const inputPath = path.join(PROJECT_ROOT, 'input', courseName);
    const publicPath = path.join(PROJECT_ROOT, 'public/content', courseName);

    console.log(`🗑️ Deleting course: ${courseName}`);

    try {
        // 1. Delete from Database (Cascade will delete chunks)
        if (env.VITE_SUPABASE_URL) {
            const { error: dbError } = await supabase
                .from('lessons')
                .delete()
                .eq('slug', courseName); // slug matching the folder name

            if (dbError) {
                console.error('Database deletion error:', dbError);
                // We continue even if DB fails, or we could stop here
            } else {
                console.log('   ✅ Database records deleted.');
            }
        }

        // 2. Delete Input Files
        if (fs.existsSync(inputPath)) {
            fs.rmSync(inputPath, { recursive: true, force: true });
            console.log('   ✅ Input files deleted.');
        }

        // 3. Delete Public Content
        if (fs.existsSync(publicPath)) {
            fs.rmSync(publicPath, { recursive: true, force: true });
            console.log('   ✅ Public content deleted.');
        }

        res.json({ success: true, message: `${courseName} tüm sistemden (dosyalar ve veritabanı) başarıyla silindi.` });
    } catch (error) {
        console.error('Deletion error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/health
 * Sunucu durumu ve sistem kontrolü
 */
app.get('/api/health', async (req, res) => {
    const hasPandoc = await checkCommand('pandoc');
    const hasCwebp = await checkCommand('cwebp');

    res.json({
        status: 'ok',
        dependencies: {
            pandoc: hasPandoc,
            cwebp: hasCwebp
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Admin API Server running at http://localhost:${PORT}`);
    console.log(`📁 Project root: ${PROJECT_ROOT}`);
});
