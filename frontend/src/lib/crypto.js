// Todo lo que pasa acá queda en el navegador. Nada de esto se manda al servidor,
// salvo authKeyHex (que ni siquiera sirve para descifrar nada, solo para probar
// identidad).

const ITERATIONS = 310000; // recomendación mínima OWASP para PBKDF2-SHA256 (2024+)

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Salt aleatorio (16 bytes) que se genera una sola vez, al registrarse.
// No es secreto: viaja y se guarda en el servidor para poder re-derivar
// las mismas claves en cada login.
export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(bytes.buffer);
}

async function getKeyMaterial(masterPassword) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
}

// authKey: se manda al servidor para verificar identidad (login). El servidor
// solo guarda bcrypt(authKey) y con eso NO puede descifrar nada.
export async function deriveAuthKeyHex(masterPassword, salt) {
  const keyMaterial = await getKeyMaterial(masterPassword);
  const enc = new TextEncoder();
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(`${salt}:auth`), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bufferToHex(bits);
}

// encryptionKey: NUNCA sale del navegador. Se deriva con el mismo salt pero
// un "info" distinto ("encrypt" vs "auth"), así son criptográficamente
// independientes: filtrar una no compromete la otra.
export async function deriveEncryptionKey(masterPassword, salt) {
  const keyMaterial = await getKeyMaterial(masterPassword);
  const enc = new TextEncoder();
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(`${salt}:encrypt`), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // no extraible: ni siquiera el propio JS puede exportarla como texto
    ['encrypt', 'decrypt']
  );
}

// Cifra un objeto (site/username/password/notes) como un único blob.
export async function encryptData(encryptionKey, dataObj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(dataObj));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    plaintext
  );
  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer)
  };
}

export async function decryptData(encryptionKey, ciphertextB64, ivB64) {
  const ciphertext = base64ToBuffer(ciphertextB64);
  const iv = new Uint8Array(base64ToBuffer(ivB64));
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    ciphertext
  );
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plaintextBuffer));
}

const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?'
};

// Generador con rechazo de bytes fuera de rango, para no introducir sesgo
// de módulo (si simplemente hicieras byte % charset.length, algunos
// caracteres saldrían con más probabilidad que otros).
export function generatePassword(length = 20, options = {}) {
  const opts = { lower: true, upper: true, numbers: true, symbols: true, ...options };
  let charset = '';
  if (opts.lower) charset += CHARSETS.lower;
  if (opts.upper) charset += CHARSETS.upper;
  if (opts.numbers) charset += CHARSETS.numbers;
  if (opts.symbols) charset += CHARSETS.symbols;
  if (!charset) throw new Error('Elegí al menos un tipo de carácter');

  const max = 256 - (256 % charset.length);
  const result = [];
  while (result.length < length) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(length - result.length));
    for (const byte of randomBytes) {
      if (byte < max) result.push(charset[byte % charset.length]);
    }
  }
  return result.join('');
}
