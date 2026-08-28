// Umbral para marcar un token como "por vencer" en vez de solo mostrar la
// fecha. Todo esto corre sobre el objeto ya descifrado en el cliente -- el
// servidor nunca sabe cuándo vence nada.
const EXPIRY_WARNING_DAYS = 7;

export function getExpiryInfo(expiresAt) {
  if (!expiresAt) return { status: null, daysLeft: null };

  const target = new Date(expiresAt);
  if (Number.isNaN(target.getTime())) return { status: null, daysLeft: null };

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((target.getTime() - Date.now()) / msPerDay);

  if (daysLeft < 0) return { status: 'expired', daysLeft };
  if (daysLeft <= EXPIRY_WARNING_DAYS) return { status: 'soon', daysLeft };
  return { status: 'ok', daysLeft };
}
