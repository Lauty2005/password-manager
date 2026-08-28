import SiteAvatar from './SiteAvatar';
import { getExpiryInfo } from '../lib/tokenExpiry';
import {
  FiFolder, FiExternalLink, FiEye, FiEyeOff, FiCopy, FiEdit2, FiTrash2,
  FiStar, FiRotateCcw, FiXCircle, FiClock, FiAlertTriangle
} from 'react-icons/fi';

function isSafeUrl(url) {
  return /^https?:\/\//i.test(url || '');
}

// Debe coincidir con TRASH_RETENTION_DAYS del backend (backend/routes/tokens.js).
const TRASH_RETENTION_DAYS = 30;

function daysUntilPurge(deletedAt) {
  if (!deletedAt) return null;
  const purgeTime = new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(Math.ceil((purgeTime - Date.now()) / (24 * 60 * 60 * 1000)), 0);
}

// Mismas clases CSS que CredentialItem a proposito (ver comentario en
// TokenForm.jsx) -- layout de tarjeta en dos zonas, generico.
export default function TokenItem({
  token,
  revealed,
  trashMode = false,
  onToggleReveal,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite,
  onRestore,
  onPermanentDelete
}) {
  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token.tokenValue);
    } catch {
      // Clipboard API puede fallar en contextos no seguros (http); no es crítico.
    }
    onCopy?.();
  };

  const hasLink = isSafeUrl(token.url);
  const { status: expiryStatus, daysLeft } = getExpiryInfo(token.expiresAt);

  return (
    <li className="credential-item">
      <div className="credential-top">
        <div className="credential-info">
          <SiteAvatar site={token.service} />
          <div className="credential-main">
            {trashMode && (
              <span className="credential-trash-expiry">
                Se borra para siempre en {daysUntilPurge(token.deletedAt)} día
                {daysUntilPurge(token.deletedAt) === 1 ? '' : 's'}
              </span>
            )}
            {token.folder && (
              <span className="credential-folder">
                <FiFolder className="icon-inline" /> {token.folder}
              </span>
            )}
            {hasLink ? (
              <a
                className="credential-site-link"
                href={token.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{token.service}</strong> <FiExternalLink className="icon-inline" />
              </a>
            ) : (
              <strong>{token.service}</strong>
            )}
            {!trashMode && expiryStatus === 'expired' && (
              <span className="expiry-expired" title="Este token venció">
                <FiAlertTriangle className="icon-inline" /> Vencido
              </span>
            )}
            {!trashMode && expiryStatus === 'soon' && (
              <span className="expiry-warning" title={`Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}>
                <FiClock className="icon-inline" /> Vence en {daysLeft} día{daysLeft === 1 ? '' : 's'}
              </span>
            )}
            {token.name && <span>{token.name}</span>}
            {token.scopes && (
              <div className="credential-tags">
                <span className="tag-chip tag-chip-small">{token.scopes}</span>
              </div>
            )}
            {token.tags && token.tags.length > 0 && (
              <div className="credential-tags">
                {token.tags.map((tag) => (
                  <span key={tag} className="tag-chip tag-chip-small">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="credential-password">
          <code>{revealed ? token.tokenValue : '••••••••••'}</code>
          <button type="button" onClick={onToggleReveal}>
            {revealed ? <FiEyeOff className="icon-inline" /> : <FiEye className="icon-inline" />}
            {revealed ? ' Ocultar' : ' Ver'}
          </button>
          {!trashMode && (
            <button type="button" onClick={copyToken}>
              <FiCopy className="icon-inline" /> Copiar
            </button>
          )}
        </div>
      </div>
      <div className="credential-actions">
        {trashMode ? (
          <>
            <button type="button" onClick={onRestore}>
              <FiRotateCcw className="icon-inline" /> Restaurar
            </button>
            <button type="button" className="danger" onClick={onPermanentDelete}>
              <FiXCircle className="icon-inline" /> Eliminar para siempre
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={token.isFavorite ? 'favorite-active' : ''}
              onClick={onToggleFavorite}
              title={token.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
            >
              <FiStar className="icon-inline" />
            </button>
            <button type="button" onClick={onEdit}>
              <FiEdit2 className="icon-inline" /> Editar
            </button>
            <button type="button" className="danger" onClick={onDelete}>
              <FiTrash2 className="icon-inline" /> Borrar
            </button>
          </>
        )}
      </div>
    </li>
  );
}
