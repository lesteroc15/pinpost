const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

function labelSvg(text, width) {
  const fontSize = 42;
  const padX = 20;
  const padY = 12;
  // Dark translucent banner with white text in bottom-left.
  // DejaVu Sans is installed via nixpacks.toml — it's the only sans-serif
  // we can rely on inside Railway's Linux container.
  return `<svg width="${width}" height="${fontSize + padY * 2 + 24}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${padX}" y="24" rx="6" ry="6" width="${text.length * 24 + padX * 2}" height="${fontSize + padY * 2}" fill="rgba(0,0,0,0.72)" />
    <text x="${padX * 2}" y="${fontSize + padY + 14}" font-family="DejaVu Sans, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" letter-spacing="1">${text}</text>
  </svg>`;
}

async function createCollage(imagePaths, { labels = [] } = {}) {
  if (imagePaths.length === 1) return imagePaths[0];

  const CELL_W = 600;
  const CELL_H = 450;

  // If the user explicitly tagged one photo as "before" and another as "after",
  // use those for the collage and burn the labels into the panels. Otherwise,
  // default to the first two photos with no labels.
  const beforeIdx = labels.findIndex(l => l === 'before');
  const afterIdx = labels.findIndex(l => l === 'after');
  const tagged = beforeIdx >= 0 && afterIdx >= 0 && beforeIdx !== afterIdx;

  const leftIdx = tagged ? beforeIdx : 0;
  const rightIdx = tagged ? afterIdx : 1;

  const left = await sharp(imagePaths[leftIdx]).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer();
  const right = await sharp(imagePaths[rightIdx]).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer();

  let leftPanel = left;
  let rightPanel = right;
  if (tagged) {
    leftPanel = await sharp(left)
      .composite([{ input: Buffer.from(labelSvg('BEFORE', CELL_W)), gravity: 'southwest' }])
      .toBuffer();
    rightPanel = await sharp(right)
      .composite([{ input: Buffer.from(labelSvg('AFTER', CELL_W)), gravity: 'southwest' }])
      .toBuffer();
  }

  const collageName = `collage_${uuidv4()}.jpg`;
  const collagePath = path.join(UPLOAD_DIR, collageName);

  await sharp({
    create: { width: CELL_W * 2, height: CELL_H, channels: 3, background: { r: 255, g: 255, b: 255 } }
  })
    .composite([
      { input: leftPanel, top: 0, left: 0 },
      { input: rightPanel, top: 0, left: CELL_W }
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

async function compressImage(filePath) {
  const compressed = await sharp(filePath)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  await fs.promises.writeFile(filePath, compressed);
}

module.exports = { createCollage, compressImage, ensureUploadDir, UPLOAD_DIR };
