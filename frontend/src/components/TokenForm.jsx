import { useState } from 'react';
import SiteAvatar from './SiteAvatar';
import { FiEye, FiEyeOff } from 'react-icons/fi';

// Mismas clases CSS que CredentialForm (form-row-2col, site-input-wrap,
// password-input-wrap, credential-form) a proposito -- son layout genérico,
// no algo atado semánticamente a "credencial", y reusarlas evita duplicar
// CSS para una tarjeta que visualmente tiene que verse igual.
export default function TokenForm({ initialData, onSave, onCancel, existingFolders = [] }) {
  const [service, setService] = useState(initialData?.service || '');
  const [name, setName] = useState(initialData?.name || '');
  const [tokenValue, setTokenValue] = useState(initialData?.tokenValue || '');
  const [scopes, setScopes] = useState(initialData?.scopes || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [folder, setFolder] = useState(initialData?.folder || '');
  const [tagsInput, setTagsInput] = useState((initialData?.tags || []).join(', '));
  const [expiresAt, setExpiresAt] = useState(initialData?.expiresAt || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parseTags = (raw) => {
    const seen = new Set();
    const tags = [];
    for (const part of raw.split(',')) {
      const tag = part.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
    }
    return tags;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        service,
        name: name.trim(),
        tokenValue,
        scopes: scopes.trim(),
        url: url.trim(),
        folder: folder.trim(),
        tags: parseTags(tagsInput),
        expiresAt,
        notes
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="credential-form" onSubmit={handleSubmit}>
      <h2>{initialData ? 'Editar' : 'Nuevo'} token</h2>

      <div className="form-row-2col">
        <label>
          Servicio / App
          <div className="site-input-wrap">
            <input
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="GitHub"
              required
            />
            <SiteAvatar site={service} size={26} />
          </div>
        </label>

        <label>
          Nombre / descripción (opcional)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="PAT con acceso a repos privados"
          />
        </label>
      </div>

      <label>
        Token
        <div className="password-input-wrap">
          <input
            type={showToken ? 'text' : 'password'}
            value={tokenValue}
            onChange={(e) => setTokenValue(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle-icon"
            onClick={() => setShowToken((v) => !v)}
            title={showToken ? 'Ocultar' : 'Mostrar'}
          >
            {showToken ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      </label>

      <div className="form-row-2col">
        <label>
          Scopes / permisos (opcional)
          <input
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            placeholder="repo, read:org"
          />
        </label>

        <label>
          URL de referencia (opcional)
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/settings/tokens"
          />
        </label>
      </div>

      <div className="form-row-2col">
        <label>
          Carpeta (opcional)
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Trabajo, Personal, Infra..."
            list="token-folder-options"
          />
          <datalist id="token-folder-options">
            {existingFolders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>

        <label>
          Tags (separados por coma, opcional)
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ci, deploy, api"
          />
        </label>
      </div>

      <label>
        Fecha de expiración (opcional)
        <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </label>

      <label>
        Notas (opcional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      {error && <p className="auth-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
}
