import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { encryptData, decryptData } from '../lib/crypto';
import CredentialForm from './CredentialForm';
import CredentialItem from './CredentialItem';
import ThemeToggle from './ThemeToggle';
import PasswordHistoryModal from './PasswordHistoryModal';
import ChangeMasterPasswordModal from './ChangeMasterPasswordModal';
import { FiLock, FiPlus, FiLogOut, FiFolder, FiTrash2, FiArrowLeft, FiKey } from 'react-icons/fi';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'alpha', label: 'Alfabético' },
  { value: 'used', label: 'Más usados' }
];

// El historial viaja dentro del mismo blob cifrado (ver handleSave), asi que
// hay que ponerle un techo para que no crezca sin limite.
const MAX_HISTORY_ENTRIES = 10;

function sortCredentials(list, sortBy) {
  const compare = {
    recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    alpha: (a, b) => a.site.localeCompare(b.site),
    used: (a, b) =>
      (b.usageCount || 0) - (a.usageCount || 0) ||
      new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0)
  }[sortBy];

  return [...list].sort((a, b) => {
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    return compare(a, b);
  });
}

export default function Dashboard() {
  const { token, encryptionKey, email, logout } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null); // null = todas, '' = sin carpeta
  const [editing, setEditing] = useState(null); // null | 'new' | credencial
  const [revealedId, setRevealedId] = useState(null);
  const [sortBy, setSortBy] = useState('recent');
  const [showTrash, setShowTrash] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const loadCredentials = useCallback(async (trash = showTrash) => {
    setLoading(true);
    setError('');
    try {
      const raw = await api.listCredentials(token, { trash });
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
            return { tags: [], folder: '', url: '', history: [], totpSecret: '', ...data, ...meta };
          } catch {
            return {
              site: '(no se pudo descifrar)',
              username: '',
              password: '',
              notes: '',
              tags: [],
              folder: '',
              url: '',
              history: [],
              totpSecret: '',
              ...meta
            };
          }
        })
      );
      setCredentials(decrypted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, encryptionKey, showTrash]);

  useEffect(() => {
    loadCredentials(showTrash);
  }, [loadCredentials, showTrash]);

  const handleSave = async (data) => {
    // Si esta editando y la password cambio, la vieja pasa al historial.
    // El historial viaja dentro del mismo blob cifrado -- nunca sale en claro del navegador.
    let history = (editing && editing !== 'new' && editing.history) || [];
    if (editing && editing !== 'new' && editing.password !== data.password) {
      history = [
        { password: editing.password, changedAt: new Date().toISOString() },
        ...history
      ].slice(0, MAX_HISTORY_ENTRIES);
    }

    const { ciphertext, iv } = await encryptData(encryptionKey, { ...data, history });
    if (editing && editing !== 'new') {
      await api.updateCredential(token, editing._id, ciphertext, iv);
    } else {
      await api.createCredential(token, ciphertext, iv);
    }
    setEditing(null);
    await loadCredentials();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Mandar esta credencial a la papelera?')) return;
    await api.deleteCredential(token, id);
    await loadCredentials();
  };

  const handleRestore = async (id) => {
    await api.restoreCredential(token, id);
    await loadCredentials();
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Esto la borra para siempre, no se puede deshacer. ¿Continuar?')) return;
    await api.permanentDeleteCredential(token, id);
    await loadCredentials();
  };

  const handleToggleFavorite = async (cred) => {
    await api.setFavorite(token, cred._id, !cred.isFavorite);
    setCredentials((prev) =>
      prev.map((c) => (c._id === cred._id ? { ...c, isFavorite: !cred.isFavorite } : c))
    );
  };

  const handleReveal = async (cred) => {
    const willReveal = revealedId !== cred._id;
    setRevealedId(willReveal ? cred._id : null);
    if (willReveal) {
      try {
        await api.touchCredential(token, cred._id);
      } catch {
        // no es critico si falla el tracking de uso
      }
    }
  };

  const handleCopy = async (cred) => {
    try {
      await api.touchCredential(token, cred._id);
    } catch {
      // idem
    }
  };

  const allTags = [...new Set(credentials.flatMap((c) => c.tags || []))].sort((a, b) =>
    a.localeCompare(b)
  );

  const allFolders = [...new Set(credentials.map((c) => c.folder).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const hasUnfiledCredential = credentials.some((c) => !c.folder);

  // Deteccion de passwords repetidas: 100% client-side, las passwords ya estan
  // descifradas en memoria para poder mostrarlas. No tiene sentido en la papelera.
  const passwordCounts = showTrash
    ? {}
    : credentials.reduce((acc, c) => {
        if (!c.password) return acc;
        acc[c.password] = (acc[c.password] || 0) + 1;
        return acc;
      }, {});

  const filtered = credentials.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      c.site.toLowerCase().includes(term) ||
      c.username.toLowerCase().includes(term) ||
      (c.folder || '').toLowerCase().includes(term) ||
      (c.tags || []).some((tag) => tag.toLowerCase().includes(term));

    const matchesTag =
      !activeTag || (c.tags || []).some((tag) => tag.toLowerCase() === activeTag.toLowerCase());

    // activeFolder === null -> todas; '' -> solo sin carpeta; string -> esa carpeta puntual
    const matchesFolder =
      activeFolder === null ||
      (activeFolder === '' ? !c.folder : c.folder?.toLowerCase() === activeFolder.toLowerCase());

    return matchesSearch && matchesTag && matchesFolder;
  });

  const sorted = showTrash ? filtered : sortCredentials(filtered, sortBy);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1><FiLock className="icon-inline" /> Mis contraseñas</h1>
        <div className="dashboard-header-right">
          <span className="user-email">{email}</span>
          <ThemeToggle />
          <button type="button" className="secondary" onClick={() => setShowChangePassword(true)}>
            <FiKey className="icon-inline" /> Contraseña maestra
          </button>
          <button type="button" className="secondary" onClick={() => logout()}>
            <FiLogOut className="icon-inline" /> Cerrar sesión
          </button>
        </div>
      </header>

      {showTrash ? (
        <div className="dashboard-toolbar">
          <button type="button" className="secondary" onClick={() => setShowTrash(false)}>
            <FiArrowLeft className="icon-inline" /> Volver
          </button>
          <h2 className="trash-title"><FiTrash2 className="icon-inline" /> Papelera</h2>
        </div>
      ) : (
        <div className="dashboard-toolbar">
          <input
            className="search-input"
            placeholder="Buscar por sitio o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <button type="button" className="secondary" onClick={() => setShowTrash(true)}>
            <FiTrash2 className="icon-inline" /> Papelera
          </button>
          <button type="button" onClick={() => setEditing('new')}>
            <FiPlus className="icon-inline" /> Nueva credencial
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
          {hasUnfiledCredential && (
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
      {loading && <p>Descifrando...</p>}
      {!loading && sorted.length === 0 && (
        <p className="empty-state">
          {showTrash ? 'La papelera está vacía.' : 'No hay credenciales guardadas todavía.'}
        </p>
      )}

      <ul className="credential-list">
        {sorted.map((cred) => (
          <CredentialItem
            key={cred._id}
            credential={cred}
            revealed={revealedId === cred._id}
            trashMode={showTrash}
            reusedCount={passwordCounts[cred.password] || 0}
            onToggleReveal={() => handleReveal(cred)}
            onCopy={() => handleCopy(cred)}
            onEdit={() => setEditing(cred)}
            onDelete={() => handleDelete(cred._id)}
            onToggleFavorite={() => handleToggleFavorite(cred)}
            onRestore={() => handleRestore(cred._id)}
            onPermanentDelete={() => handlePermanentDelete(cred._id)}
            onShowHistory={() => setHistoryFor(cred)}
          />
        ))}
      </ul>

      {editing && (
        <div className="modal-overlay">
          <CredentialForm
            initialData={editing === 'new' ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            existingFolders={allFolders}
          />
        </div>
      )}

      {historyFor && (
        <PasswordHistoryModal credential={historyFor} onClose={() => setHistoryFor(null)} />
      )}

      {showChangePassword && (
        <ChangeMasterPasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
