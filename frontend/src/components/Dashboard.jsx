import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { encryptData, decryptData } from '../lib/crypto';
import CredentialForm from './CredentialForm';
import CredentialItem from './CredentialItem';
import { FiLock, FiPlus, FiLogOut, FiFolder } from 'react-icons/fi';

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

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await api.listCredentials(token);
      const decrypted = await Promise.all(
        raw.map(async (item) => {
          try {
            const data = await decryptData(encryptionKey, item.ciphertext, item.iv);
            return { _id: item._id, tags: [], folder: '', url: '', ...data };
          } catch {
            return {
              _id: item._id,
              site: '(no se pudo descifrar)',
              username: '',
              password: '',
              notes: '',
              tags: [],
              folder: '',
              url: ''
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
  }, [token, encryptionKey]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleSave = async (data) => {
    const { ciphertext, iv } = await encryptData(encryptionKey, data);
    if (editing && editing !== 'new') {
      await api.updateCredential(token, editing._id, ciphertext, iv);
    } else {
      await api.createCredential(token, ciphertext, iv);
    }
    setEditing(null);
    await loadCredentials();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Borrar esta credencial?')) return;
    await api.deleteCredential(token, id);
    await loadCredentials();
  };

  const allTags = [...new Set(credentials.flatMap((c) => c.tags || []))].sort((a, b) =>
    a.localeCompare(b)
  );

  const allFolders = [...new Set(credentials.map((c) => c.folder).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const hasUnfiledCredential = credentials.some((c) => !c.folder);

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1><FiLock className="icon-inline" /> Mis contraseñas</h1>
        <div className="dashboard-header-right">
          <span className="user-email">{email}</span>
          <button type="button" className="secondary" onClick={() => logout()}>
            <FiLogOut className="icon-inline" /> Cerrar sesión
          </button>
        </div>
      </header>

      <div className="dashboard-toolbar">
        <input
          className="search-input"
          placeholder="Buscar por sitio o usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" onClick={() => setEditing('new')}>
          <FiPlus className="icon-inline" /> Nueva credencial
        </button>
      </div>

      {allFolders.length > 0 && (
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

      {allTags.length > 0 && (
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
      {!loading && filtered.length === 0 && (
        <p className="empty-state">No hay credenciales guardadas todavía.</p>
      )}

      <ul className="credential-list">
        {filtered.map((cred) => (
          <CredentialItem
            key={cred._id}
            credential={cred}
            revealed={revealedId === cred._id}
            onToggleReveal={() => setRevealedId(revealedId === cred._id ? null : cred._id)}
            onEdit={() => setEditing(cred)}
            onDelete={() => handleDelete(cred._id)}
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
    </div>
  );
}
