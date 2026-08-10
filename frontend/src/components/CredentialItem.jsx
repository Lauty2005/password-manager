import SiteAvatar from './SiteAvatar';
import {
  FiFolder, FiExternalLink, FiEye, FiEyeOff, FiCopy, FiEdit2, FiTrash2,
  FiStar, FiRotateCcw, FiXCircle
} from 'react-icons/fi';

// Solo se linkea si es http(s) real, para no terminar generando un
// href con "javascript:" o algo raro a partir de datos guardados.
function isSafeUrl(url) {
  return /^https?:\/\//i.test(url || '');
}

// Debe coincidir con TRASH_RETENTION_DAYS del backend (backend/routes/credentials.js).
const TRASH_RETENTION_DAYS = 30;

function daysUntilPurge(deletedAt) {
  if (!deletedAt) return null;
  const purgeTime = new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(Math.ceil((purgeTime - Date.now()) / (24 * 60 * 60 * 1000)), 0);
}

export default function CredentialItem({
  credential,
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
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(credential.password);
    } catch {
      // Clipboard API puede fallar en contextos no seguros (http); no es crítico.
    }
    onCopy?.();
  };

  const hasLink = isSafeUrl(credential.url);

  return (
    <li className="credential-item">
      <SiteAvatar site={credential.site} />
      <div className="credential-main">
        {trashMode && (
          <span className="credential-trash-expiry">
            Se borra para siempre en {daysUntilPurge(credential.deletedAt)} día
            {daysUntilPurge(credential.deletedAt) === 1 ? '' : 's'}
          </span>
        )}
        {credential.folder && (
          <span className="credential-folder">
            <FiFolder className="icon-inline" /> {credential.folder}
          </span>
        )}
        {hasLink ? (
          <a
            className="credential-site-link"
            href={credential.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>{credential.site}</strong> <FiExternalLink className="icon-inline" />
          </a>
        ) : (
          <strong>{credential.site}</strong>
        )}
        <span>{credential.username}</span>
        {credential.tags && credential.tags.length > 0 && (
          <div className="credential-tags">
            {credential.tags.map((tag) => (
              <span key={tag} className="tag-chip tag-chip-small">{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="credential-password">
        <code>{revealed ? credential.password : '••••••••••'}</code>
        <button type="button" onClick={onToggleReveal}>
          {revealed ? <FiEyeOff className="icon-inline" /> : <FiEye className="icon-inline" />}
          {revealed ? ' Ocultar' : ' Ver'}
        </button>
        {!trashMode && (
          <button type="button" onClick={copyPassword}>
            <FiCopy className="icon-inline" /> Copiar
          </button>
        )}
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
              className={credential.isFavorite ? 'favorite-active' : ''}
              onClick={onToggleFavorite}
              title={credential.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorita'}
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
