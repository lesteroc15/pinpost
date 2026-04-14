const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

async function createCollage(imagePaths) {
  if (imagePaths.length === 1) return imagePaths[0];

  const before = await sharp(imagePaths[0]).resize(600, 450, { fit: 'cover' }).toBuffer();
  const after = await sharp(imagePaths[1]).resize(600, 450, { fit: 'cover' }).toBuffer();

  const labelBefore = await sharp({
    create: { width: 600, height: 450, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: before }])
    .png()
    .toBuffer();

  const labelAfter = await sharp({
    create: { width: 600, height: 450, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: after }])
    .png()
    .toBuffer();

  const collageName = `collage_${uuidv4()}.jpg`;
  const collagePath = path.join(UPLOAD_DIR, collageName);

  await sharp({
    create: { width: 1200, height: 450, channels: 3, background: { r: 255, g: 255, b: 255 } }
  })
    .composite([
      { input: labelBefore, top: 0, left: 0 },
      { input: labelAfter, top: 0, left: 600 }
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
