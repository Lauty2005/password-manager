import { useState } from 'react';
import { generatePassword } from '../lib/crypto';
import { normalizeTotpSecret, base32Decode } from '../lib/totp';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import SiteAvatar from './SiteAvatar';
import { FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi';

export default function CredentialForm({ initialData, onSave, onCancel, existingFolders = [] }) {
  const [site, setSite] = useState(initialData?.site || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [folder, setFolder] = useState(initialData?.folder || '');
  const [tagsInput, setTagsInput] = useState((initialData?.tags || []).join(', '));
  const [totpSecret, setTotpSecret] = useState(initialData?.totpSecret || '');
  const [showPassword, setShowPassword] = useState(false);
  const [genLength, setGenLength] = useState(20);
  const [genOptions, setGenOptions] = useState({ lower: true, upper: true, numbers: true, symbols: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleGenOption = (key) => {
    setGenOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = () => {
    if (!Object.values(genOptions).some(Boolean)) {
      setError('Elegí al menos un tipo de carácter para generar la contraseña');
      return;
    }
    setError('');
    setPassword(generatePassword(genLength, genOptions));
    setShowPassword(true);
  };

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

    let normalizedTotp = '';
    if (totpSecret.trim()) {
      normalizedTotp = normalizeTotpSecret(totpSecret);
      try {
        base32Decode(normalizedTotp);
      } catch {
        setError('El código 2FA no es válido (tiene que ser el secreto en base32 que te da el sitio)');
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        site,
        url: url.trim(),
        username,
        password,
        notes,
        folder: folder.trim(),
        tags: parseTags(tagsInput),
        totpSecret: normalizedTotp
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="credential-form" onSubmit={handleSubmit}>
      <h2>{initialData ? 'Editar' : 'Nueva'} credencial</h2>

      <div className="form-row-2col">
        <label>
          Sitio / App
          <div className="site-input-wrap">
            <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="github.com" required />
            <SiteAvatar site={site} size={26} />
          </div>
        </label>

        <label>
          URL (opcional)
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/login"
          />
        </label>
      </div>

      <div className="form-row-2col">
        <label>
          Usuario / Email
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>

        <label>
          Contraseña
          <div className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-icon"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? 'Ocultar' : 'Mostrar'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          <PasswordStrengthMeter password={password} />
        </label>
      </div>

      <div className="generator-section">
        <p className="field-group-label">Generador de contraseña segura</p>
        <div className="generator-top-row">
          <div className="generator-options-grid">
            <label className="checkbox-label">
              <input type="checkbox" checked={genOptions.upper} onChange={() => toggleGenOption('upper')} />
              Mayúsculas (A-Z)
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={genOptions.lower} onChange={() => toggleGenOption('lower')} />
              Minúsculas (a-z)
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={genOptions.numbers} onChange={() => toggleGenOption('numbers')} />
              Números (0-9)
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={genOptions.symbols} onChange={() => toggleGenOption('symbols')} />
              Símbolos (!@#$...)
            </label>
          </div>
          <input
            type="number"
            min={8}
            max={64}
            value={genLength}
            onChange={(e) => setGenLength(Number(e.target.value))}
            className="generator-length-input"
            aria-label="Longitud de la contraseña generada"
            title="Longitud"
          />
        </div>
        <button type="button" className="primary generator-generate-btn" onClick={handleGenerate}>
          <FiRefreshCw className="icon-inline" /> Generar contraseña segura
        </button>
      </div>

      <div className="form-row-2col">
        <label>
          Carpeta (opcional)
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Trabajo, Personal, Banco..."
            list="folder-options"
          />
          <datalist id="folder-options">
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
            placeholder="trabajo, banco, redes"
          />
        </label>
      </div>

      <label>
        Notas (opcional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      <label>
        Código 2FA / TOTP (opcional)
        <input
          value={totpSecret}
          onChange={(e) => setTotpSecret(e.target.value)}
          placeholder="El secreto que te da el sitio al activar el 2FA"
        />
      </label>

      {error && <p className="auth-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
}
