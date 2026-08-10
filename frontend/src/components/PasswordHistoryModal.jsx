import { useState } from 'react';
import { FiX, FiEye, FiEyeOff, FiClock } from 'react-icons/fi';

export default function PasswordHistoryModal({ credential, onClose }) {
  const [revealedIdx, setRevealedIdx] = useState(null);
  const history = credential.history || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="credential-form history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h2><FiClock className="icon-inline" /> Historial de {credential.site}</h2>
          <button type="button" className="secondary" onClick={onClose}>
            <FiX className="icon-inline" />
          </button>
        </div>

        {history.length === 0 ? (
          <p className="empty-state">Todavía no hay contraseñas anteriores guardadas.</p>
        ) : (
          <ul className="history-list">
            {history.map((entry, idx) => (
              <li key={idx} className="history-item">
                <span className="history-date">
                  {new Date(entry.changedAt).toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  })}
                </span>
                <code>{revealedIdx === idx ? entry.password : '••••••••••'}</code>
                <button type="button" onClick={() => setRevealedIdx(revealedIdx === idx ? null : idx)}>
                  {revealedIdx === idx ? <FiEyeOff className="icon-inline" /> : <FiEye className="icon-inline" />}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
