import sharp from 'sharp';
import * as path from 'path';

async function convertIcon() {
    const svgPath = path.join(__dirname, '../images/icon.svg');
    const pngPath = path.join(__dirname, '../images/icon.png');

    await sharp(svgPath)
        .resize(128, 128)
        .png()
        .toFile(pngPath);
}

convertIcon().catch(console.error); 