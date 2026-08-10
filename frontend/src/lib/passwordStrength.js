// Estimación de fortaleza 100% client-side, no manda nada al servidor
// (ni siquiera la contraseña en texto plano, que ya de por sí nunca sale
// del navegador en este proyecto).

const COMMON_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345', 'qwerty',
  'abc123', 'password1', 'admin', 'letmein', '111111', '123123',
  'welcome', 'iloveyou', 'monkey', 'dragon', 'football', 'contraseña',
  'contrasena', '123456a', 'qwerty123', '1q2w3e4r', 'senha', 'passw0rd'
]);

function charsetSize(password) {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 32;
  return size || 1;
}

// Corrida más larga de un mismo caracter repetido (ej. "aaaa" -> 4).
// Una contraseña como "aaaaaaaaaaaa" tiene MUCHA menos entropía real
// de la que sugiere length * log2(charset), así que la penalizamos.
function longestRepeatRun(password) {
  let max = 1;
  let current = 1;
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }
  return max;
}

export function estimatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: '', bits: 0, percent: 0 };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { score: 0, label: 'Muy débil (contraseña común)', bits: 0, percent: 5 };
  }

  const size = charsetSize(password);
  let bits = password.length * Math.log2(size);

  const repeatRun = longestRepeatRun(password);
  if (repeatRun >= 4) {
    bits *= 0.5;
  }

  let score;
  let label;
  if (password.length < 8 || bits < 28) {
    score = 0;
    label = 'Muy débil';
  } else if (bits < 36) {
    score = 1;
    label = 'Débil';
  } else if (bits < 60) {
    score = 2;
    label = 'Media';
  } else if (bits < 100) {
    score = 3;
    label = 'Fuerte';
  } else {
    score = 4;
    label = 'Muy fuerte';
  }

  const percent = Math.min(100, Math.round((bits / 120) * 100));

  return { score, label, bits: Math.round(bits), percent };
}
