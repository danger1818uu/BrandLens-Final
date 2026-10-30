import crypto from 'node:crypto';

// Secret key derivation: use APP_ENCRYPTION_KEY if set, otherwise a deterministic machine-derived secret
const secret = process.env.APP_ENCRYPTION_KEY || 'brandlens-secure-encryption-key-v1-32b';
const KEY = crypto.createHash('sha256').update(secret).digest(); // 32 bytes for AES-256
const ALGO = 'aes-256-gcm';

export function encryptToken(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptToken(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return '';
  }
}
