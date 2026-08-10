export default function CredentialItem({ credential, revealed, onToggleReveal, onEdit, onDelete }) {
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(credential.password);
    } catch {
      // Clipboard API puede fallar en contextos no seguros (http); no es crítico.
    }
  };

  return (
    <li className="credential-item">
      <div className="credential-main">
        <strong>{credential.site}</strong>
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
        <button type="button" onClick={onToggleReveal}>{revealed ? 'Ocultar' : 'Ver'}</button>
        <button type="button" onClick={copyPassword}>Copiar</button>
      </div>
      <div className="credential-actions">
        <button type="button" onClick={onEdit}>Editar</button>
        <button type="button" className="danger" onClick={onDelete}>Borrar</button>
      </div>
    </li>
  );
}
