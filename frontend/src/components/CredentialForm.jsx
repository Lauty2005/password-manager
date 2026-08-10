import { useState } from 'react';
import { generatePassword } from '../lib/crypto';
import PasswordStrengthMeter from './PasswordStrengthMeter';

export default function CredentialForm({ initialData, onSave, onCancel, existingFolders = [] }) {
  const [site, setSite] = useState(initialData?.site || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [folder, setFolder] = useState(initialData?.folder || '');
  const [tagsInput, setTagsInput] = useState((initialData?.tags || []).join(', '));
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
    setSaving(true);
    try {
      await onSave({ site, username, password, notes, folder: folder.trim(), tags: parseTags(tagsInput) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="credential-form" onSubmit={handleSubmit}>
      <h2>{initialData ? 'Editar' : 'Nueva'} credencial</h2>

      <label>
        Sitio / App
        <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="github.com" required />
      </label>

      <label>
        Usuario / Email
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>

      <label>
        Contraseña
        <div className="password-row">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        <PasswordStrengthMeter password={password} />
      </label>

      <div className="generator-options-row">
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

      <div className="generator-row">
        <input
          type="number"
          min={8}
          max={64}
          value={genLength}
          onChange={(e) => setGenLength(Number(e.target.value))}
        />
        <button type="button" onClick={handleGenerate}>Generar contraseña segura</button>
      </div>

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
