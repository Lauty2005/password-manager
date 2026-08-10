// Implementación de TOTP (RFC 6238) a mano con Web Crypto, sin sumar
// dependencias nuevas -- el resto de la app (crypto.js) ya usa crypto.subtle
// para todo, esto sigue la misma línea.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD = 30; // segundos, estándar que usan todos los sitios
const DIGITS = 6;

// Si el usuario pega la URI completa que a veces muestran los sitios
// (otpauth://totp/...?secret=XXXX&...) en vez del secreto pelado, la
// interpretamos igual y sacamos el secret de ahí.
export function normalizeTotpSecret(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('otpauth://')) {
    try {
      const url = new URL(trimmed);
      const secret = url.searchParams.get('secret');
      if (secret) return secret.replace(/\s+/g, '').toUpperCase();
    } catch {
      // no era una URI valida, seguimos y la tratamos como secreto plano
    }
  }
  return trimmed.replace(/\s+/g, '').toUpperCase();
}

export function base32Decode(input) {
  const clean = input.replace(/=+$/, '');
  if (!clean) throw new Error('Secreto vacío');

  let bits = '';
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('El secreto no es un base32 válido');
    bits += idx.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  if (bytes.length === 0) throw new Error('El secreto no es un base32 válido');

  return new Uint8Array(bytes);
}

function counterToBytes(counter) {
  // 8 bytes big-endian. El contador (segundos/30) no llega a superar los
  // 32 bits hasta el año ~4147, así que los primeros 4 bytes siempre son 0.
  const buf = new ArrayBuffer(8);
  new DataView(buf).setUint32(4, counter, false);
  return new Uint8Array(buf);
}

async function hmacSha1(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgBytes);
  return new Uint8Array(sig);
}

// Devuelve el código de 6 dígitos vigente en este momento para ese secreto.
export async function generateTOTP(secretBase32, { period = PERIOD, digits = DIGITS } = {}) {
  const keyBytes = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / period);
  const hmac = await hmacSha1(keyBytes, counterToBytes(counter));

  // Truncamiento dinámico, tal cual lo define RFC 4226/6238.
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binCode % 10 ** digits).toString().padStart(digits, '0');
}

// Segundos que quedan hasta que el código actual expire (para la barra de countdown).
export function secondsRemaining(period = PERIOD) {
  return period - (Math.floor(Date.now() / 1000) % period);
}

export { PERIOD as TOTP_PERIOD };
