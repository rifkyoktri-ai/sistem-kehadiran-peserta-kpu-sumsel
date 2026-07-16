const fs = require('fs');
const path = require('path');

function saveBase64Photo(base64String, filename) {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  const uploadDir = path.join(__dirname, '..', 'uploads', 'photos');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer);
  
  return `uploads/photos/${filename}`;
}

module.exports = { saveBase64Photo };
