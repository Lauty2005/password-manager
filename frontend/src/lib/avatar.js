// Avatar 100% generado client-side: color + inicial del sitio.
// A propósito NO se usa ningún servicio externo de favicons (ni Google,
// ni ninguno) porque eso implicaría que el navegador le pida al servicio
// "dame el logo de tal-sitio.com" cada vez que se ve la credencial,
// filtrando qué cuentas tenés guardadas a un tercero.

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

export function getAvatarColor(text) {
  if (!text) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function getAvatarInitial(text) {
  const trimmed = (text || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}
