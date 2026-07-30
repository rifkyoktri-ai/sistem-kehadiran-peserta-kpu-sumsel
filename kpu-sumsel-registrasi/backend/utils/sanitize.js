const escapeHtml = require('escape-html');

function sanitizeString(str, maxLength = 500) {
  if (!str || typeof str !== 'string') return '';
  return escapeHtml(str.trim().replace(/\0/g, '')).slice(0, maxLength);
}

function sanitizeInput(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined) {
      result[field] = sanitizeString(result[field]);
    }
  }
  return result;
}

module.exports = { sanitizeString, sanitizeInput };
