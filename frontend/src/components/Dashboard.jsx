import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { encryptData, decryptData } from '../lib/crypto';
import CredentialForm from './CredentialForm';
import CredentialItem from './CredentialItem';

export default function Dashboard() {
  const { token, encryptionKey, email, logout } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
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
            return { _id: item._id, tags: [], ...data };
          } catch {
            return { _id: item._id, site: '(no se pudo descifrar)', username: '', password: '', notes: '', tags: [] };
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

  const filtered = credentials.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      c.site.toLowerCase().includes(term) ||
      c.username.toLowerCase().includes(term) ||
      (c.tags || []).some((tag) => tag.toLowerCase().includes(term));

    const matchesTag =
      !activeTag || (c.tags || []).some((tag) => tag.toLowerCase() === activeTag.toLowerCase());

    return matchesSearch && matchesTag;
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🔐 Mis contraseñas</h1>
        <div className="dashboard-header-right">
          <span className="user-email">{email}</span>
          <button type="button" className="secondary" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <div className="dashboard-toolbar">
        <input
          className="search-input"
          placeholder="Buscar por sitio o usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" onClick={() => setEditing('new')}>+ Nueva credencial</button>
      </div>

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
          />
        </div>
      )}
    </div>
  );
}
