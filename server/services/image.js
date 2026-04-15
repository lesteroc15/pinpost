const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

function labelSvg(text, width) {
  const fontSize = 42;
  const padX = 20;
  const padY = 12;
  // Dark translucent banner with white text in bottom-left
  return `<svg width="${width}" height="${fontSize + padY * 2 + 24}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${padX}" y="24" rx="6" ry="6" width="${text.length * 24 + padX * 2}" height="${fontSize + padY * 2}" fill="rgba(0,0,0,0.72)" />
    <text x="${padX * 2}" y="${fontSize + padY + 14}" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" letter-spacing="1">${text}</text>
  </svg>`;
}

async function createCollage(imagePaths) {
  if (imagePaths.length === 1) return imagePaths[0];

  const CELL_W = 600;
  const CELL_H = 450;

  // Resize each image to the cell size
  const before = await sharp(imagePaths[0]).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer();
  const after = await sharp(imagePaths[1]).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer();

  // Create labels as SVG buffers
  const beforeLabel = Buffer.from(labelSvg('BEFORE', CELL_W));
  const afterLabel = Buffer.from(labelSvg('AFTER', CELL_W));

  // Composite label onto each image (bottom-left)
  const beforeWithLabel = await sharp(before)
    .composite([{ input: beforeLabel, gravity: 'southwest' }])
    .toBuffer();
  const afterWithLabel = await sharp(after)
    .composite([{ input: afterLabel, gravity: 'southwest' }])
    .toBuffer();

  const collageName = `collage_${uuidv4()}.jpg`;
  const collagePath = path.join(UPLOAD_DIR, collageName);

  await sharp({
    create: { width: CELL_W * 2, height: CELL_H, channels: 3, background: { r: 255, g: 255, b: 255 } }
  })
    .composite([
      { input: beforeWithLabel, top: 0, left: 0 },
      { input: afterWithLabel, top: 0, left: CELL_W }
    ])
    .jpeg({ quality: 90 })
    .toFile(collagePath);

  return collagePath;
}

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

module.exports = { createCollage, ensureUploadDir, UPLOAD_DIR };
