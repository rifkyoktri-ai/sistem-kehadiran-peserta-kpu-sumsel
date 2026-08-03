const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
};

function getImageMime(header) {
  for (const [mime, magic] of Object.entries(MAGIC_BYTES)) {
    if (magic.every((b, i) => header[i] === b)) return mime;
  }
  return null;
}

function generateFilename() {
  return `${crypto.randomUUID()}.jpg`;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function saveBase64Photo(base64String, filename) {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length < 12) {
    throw new Error('Data foto terlalu kecil atau tidak valid.');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('Ukuran foto maksimal 2MB.');
  }

  const mime = getImageMime(buffer);
  if (!mime) {
    throw new Error('File yang diupload bukan format gambar yang didukung (JPEG/PNG/WebP).');
  }

  const ext = mime === 'jpeg' ? 'jpg' : mime;
  const safeFilename = filename.replace(/\.[^/.]+$/, '') + '.' + ext;

  const IS_RENDER = process.env.RENDER === 'true';
  const uploadDir = IS_RENDER 
    ? path.join('/data', 'uploads', 'photos')
    : path.join(__dirname, '..', 'uploads', 'photos');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filepath = path.join(uploadDir, safeFilename);
  fs.writeFileSync(filepath, buffer);

  return IS_RENDER ? `uploads/photos/${safeFilename}` : `uploads/photos/${safeFilename}`;
}

module.exports = { saveBase64Photo, generateFilename };
