import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.join(__dirname, '..', 'public', 'photos');
const JPEG_EXT = /\.jpe?g$/i;

async function main() {
    let entries;
    try {
        entries = await fs.readdir(PHOTOS_DIR);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error('public/photos/ does not exist');
            process.exit(1);
        }
        throw err;
    }

    const jpegs = entries.filter((name) => JPEG_EXT.test(name));
    if (jpegs.length === 0) {
        console.log('No .jpg/.jpeg files in public/photos/');
        return;
    }

    for (const file of jpegs) {
        const inputPath = path.join(PHOTOS_DIR, file);
        const stat = await fs.stat(inputPath);
        if (!stat.isFile()) continue;

        const base = file.replace(JPEG_EXT, '');
        const outName = `${base}.webp`;
        const outputPath = path.join(PHOTOS_DIR, outName);

        await sharp(inputPath)
            .resize({ width: 1920, withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(outputPath);

        console.log(`✓ ${outName}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
