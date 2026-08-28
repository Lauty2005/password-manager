import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { encryptData, decryptData } from '../lib/crypto';
import TokenForm from './TokenForm';
import TokenItem from './TokenItem';
import {
  FiPlus, FiFolder, FiTrash2, FiArrowLeft, FiInbox, FiSearch
} from 'react-icons/fi';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'alpha', label: 'Alfabético' },
  { value: 'used', label: 'Más usados' },
  { value: 'expiring', label: 'Por vencer' }
];

function sortTokens(list, sortBy) {
  const compare = {
    recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    alpha: (a, b) => a.service.localeCompare(b.service),
    used: (a, b) =>
      (b.usageCount || 0) - (a.usageCount || 0) ||
      new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0),
    // Sin fecha de expiracion quedan al final, no compiten con las que si vencen.
    expiring: (a, b) => {
      if (!a.expiresAt && !b.expiresAt) return 0;
      if (!a.expiresAt) return 1;
      if (!b.expiresAt) return -1;
      return new Date(a.expiresAt) - new Date(b.expiresAt);
    }
  }[sortBy];

  return [...list].sort((a, b) => {
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    return compare(a, b);
  });
}

// Mismo patron que CredentialsPanel (ver ese archivo para el porque de la
// forma general). Sin historial ni deteccion de reuso -- no tiene sentido
// para tokens de API, no fue pedido.
export default function TokensPanel() {
  const { token, encryptionKey } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null); // null = todas, '' = sin carpeta
  const [editing, setEditing] = useState(null); // null | 'new' | token
  const [revealedId, setRevealedId] = useState(null);
  const [sortBy, setSortBy] = useState('recent');
  const [showTrash, setShowTrash] = useState(false);

  const loadTokens = useCallback(async (trash = showTrash) => {
    setLoading(true);
    setError('');
    try {
      const raw = await api.listTokens(token, { trash });
      const decrypted = await Promise.all(
        raw.map(async (item) => {
          const meta = {
            _id: item._id,
            createdAt: item.createdAt,
            isFavorite: item.isFavorite,
            usageCount: item.usageCount,
            lastUsedAt: item.lastUsedAt,
            deletedAt: item.deletedAt
          };
          try {
            const data = await decryptData(encryptionKey, item.ciphertext, item.iv);
            return {
              name: '', scopes: '', url: '', folder: '', tags: [], expiresAt: '', notes: '',
              ...data,
              ...meta
            };
          } catch {
            return {
              service: '(no se pudo descifrar)',
              name: '',
              tokenValue: '',
              scopes: '',
              url: '',
              folder: '',
              tags: [],
              expiresAt: '',
              notes: '',
              ...meta
            };
          }
        })
      );
      setTokens(decrypted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, encryptionKey, showTrash]);

  useEffect(() => {
    loadTokens(showTrash);
  }, [loadTokens, showTrash]);

  const handleSave = async (data) => {
    const { ciphertext, iv } = await encryptData(encryptionKey, data);
    if (editing && editing !== 'new') {
      await api.updateToken(token, editing._id, ciphertext, iv);
    } else {
      await api.createToken(token, ciphertext, iv);
    }
    setEditing(null);
    await loadTokens();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Mandar este token a la papelera?')) return;
    await api.deleteToken(token, id);
    await loadTokens();
  };

  const handleRestore = async (id) => {
    await api.restoreToken(token, id);
    await loadTokens();
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Esto lo borra para siempre, no se puede deshacer. ¿Continuar?')) return;
    await api.permanentDeleteToken(token, id);
    await loadTokens();
  };

  const handleToggleFavorite = async (t) => {
    await api.setTokenFavorite(token, t._id, !t.isFavorite);
    setTokens((prev) =>
      prev.map((item) => (item._id === t._id ? { ...item, isFavorite: !t.isFavorite } : item))
    );
  };

  const handleReveal = async (t) => {
    const willReveal = revealedId !== t._id;
    setRevealedId(willReveal ? t._id : null);
    if (willReveal) {
      try {
        await api.touchToken(token, t._id);
      } catch {
        // no es critico si falla el tracking de uso
      }
    }
  };

  const handleCopy = async (t) => {
    try {
      await api.touchToken(token, t._id);
    } catch {
      // idem
    }
  };

  const allTags = [...new Set(tokens.flatMap((t) => t.tags || []))].sort((a, b) =>
    a.localeCompare(b)
  );

  const allFolders = [...new Set(tokens.map((t) => t.folder).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const hasUnfiledToken = tokens.some((t) => !t.folder);

  const filtered = tokens.filter((t) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      t.service.toLowerCase().includes(term) ||
      (t.name || '').toLowerCase().includes(term) ||
      (t.folder || '').toLowerCase().includes(term) ||
      (t.tags || []).some((tag) => tag.toLowerCase().includes(term));

    const matchesTag =
      !activeTag || (t.tags || []).some((tag) => tag.toLowerCase() === activeTag.toLowerCase());

    const matchesFolder =
      activeFolder === null ||
      (activeFolder === '' ? !t.folder : t.folder?.toLowerCase() === activeFolder.toLowerCase());

    return matchesSearch && matchesTag && matchesFolder;
  });

  const sorted = showTrash ? filtered : sortTokens(filtered, sortBy);

  return (
    <>
      {showTrash ? (
        <div className="dashboard-toolbar">
          <button type="button" className="secondary" onClick={() => setShowTrash(false)}>
            <FiArrowLeft className="icon-inline" /> Volver
          </button>
          <h2 className="trash-title"><FiTrash2 className="icon-inline" /> Papelera</h2>
        </div>
      ) : (
        <div className="dashboard-toolbar">
          <div className="search-input-wrap">
            <FiSearch className="search-input-icon" />
            <input
              className="search-input"
              placeholder="Buscar por servicio o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Ordenar por"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="secondary icon-only-md"
            onClick={() => setShowTrash(true)}
            title="Papelera"
          >
            <FiTrash2 className="icon-inline" /> <span className="btn-label">Papelera</span>
          </button>
          <button
            type="button"
            className="primary icon-only-md"
            onClick={() => setEditing('new')}
            title="Nuevo token"
          >
            <FiPlus className="icon-inline" /> <span className="btn-label">Nuevo token</span>
          </button>
        </div>
      )}

      {!showTrash && allFolders.length > 0 && (
        <div className="tag-filter-row folder-filter-row">
          <button
            type="button"
            className={activeFolder === null ? 'tag-chip tag-chip-active' : 'tag-chip'}
            onClick={() => setActiveFolder(null)}
          >
            <FiFolder className="icon-inline" /> Todas
          </button>
          {allFolders.map((folder) => (
            <button
              key={folder}
              type="button"
              className={activeFolder === folder ? 'tag-chip tag-chip-active' : 'tag-chip'}
              onClick={() => setActiveFolder(activeFolder === folder ? null : folder)}
            >
              <FiFolder className="icon-inline" /> {folder}
            </button>
          ))}
          {hasUnfiledToken && (
            <button
              type="button"
              className={activeFolder === '' ? 'tag-chip tag-chip-active' : 'tag-chip'}
              onClick={() => setActiveFolder(activeFolder === '' ? null : '')}
            >
              Sin carpeta
            </button>
          )}
        </div>
      )}

      {!showTrash && allTags.length > 0 && (
        <div className="tag-filter-row">
          <button
            type="button"
            className={activeTag === null ? 'tag-chip tag-chip-active' : 'tag-chip'}
            onClick={() => setActiveTag(null)}
          >
            Todas
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={activeTag === tag ? 'tag-chip tag-chip-active' : 'tag-chip'}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}

      {loading && (
        <div className="loading-state">
          <span className="spinner" /> Descifrando...
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="empty-state">
          {showTrash ? (
            <>
              <FiTrash2 className="empty-state-icon" />
              <p>La papelera está vacía.</p>
            </>
          ) : (
            <>
              <FiInbox className="empty-state-icon" />
              <p>No hay tokens guardados todavía.</p>
              <p className="empty-state-hint">
                Usá el botón "Nuevo token" de arriba para agregar el primero.
              </p>
            </>
          )}
        </div>
      )}

      <ul className="credential-list">
        {sorted.map((t) => (
          <TokenItem
            key={t._id}
            token={t}
            revealed={revealedId === t._id}
            trashMode={showTrash}
            onToggleReveal={() => handleReveal(t)}
            onCopy={() => handleCopy(t)}
            onEdit={() => setEditing(t)}
            onDelete={() => handleDelete(t._id)}
            onToggleFavorite={() => handleToggleFavorite(t)}
            onRestore={() => handleRestore(t._id)}
            onPermanentDelete={() => handlePermanentDelete(t._id)}
          />
        ))}
      </ul>

      {editing && (
        <div className="modal-overlay">
          <TokenForm
            initialData={editing === 'new' ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            existingFolders={allFolders}
          />
        </div>
      )}
    </>
  );
}
