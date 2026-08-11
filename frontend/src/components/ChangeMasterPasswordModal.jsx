import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiKey, FiAlertTriangle, FiLogOut } from 'react-icons/fi';

const PROGRESS_LABELS = {
  reencrypting: 'Recifrando tus credenciales...',
  'updating-auth': 'Actualizando tu acceso...'
};

export default function ChangeMasterPasswordModal({ onClose }) {
  const { changeMasterPassword, logoutAllSessions } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmingLogoutAll, setConfirmingLogoutAll] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [logoutAllError, setLogoutAllError] = useState('');

  const handleLogoutAll = async () => {
    setLogoutAllError('');
    setLoggingOutAll(true);
    try {
      await logoutAllSessions();
      // Si termina bien, logoutAllSessions ya cerro la sesion local tambien
      // (el token de este dispositivo queda invalidado igual que el resto).
    } catch (err) {
      setLogoutAllError(err.message);
      setLoggingOutAll(false);
      setConfirmingLogoutAll(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      setError('La nueva master password debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña tiene que ser distinta de la actual');
      return;
    }

    setSaving(true);
    try {
      await changeMasterPassword(currentPassword, newPassword, setProgress);
      // Si llega hasta acá, changeMasterPassword ya cerró la sesión
      // (logout con mensaje de éxito). No hace falta cerrar el modal a mano.
    } catch (err) {
      setError(err.message);
      setSaving(false);
      setProgress('');
    }
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <form className="credential-form" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <h2><FiKey className="icon-inline" /> Cambiar contraseña maestra</h2>

        <p className="auth-warning">
          <FiAlertTriangle className="icon-inline" /> Esto vuelve a cifrar todas tus credenciales
          (incluidas las de la papelera) con la contraseña nueva. Puede tardar unos segundos según
          cuántas tengas guardadas.
        </p>

        <label>
          Contraseña actual
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={saving}
          />
        </label>

        <label>
          Nueva contraseña
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={saving}
          />
        </label>

        <label>
          Confirmar nueva contraseña
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={saving}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}
        {saving && <p className="auth-info">{PROGRESS_LABELS[progress] || 'Un momento...'}</p>}

        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Un momento...' : 'Cambiar contraseña'}
          </button>
        </div>

        <hr className="form-divider" />

        <p className="form-section-hint">
          ¿Perdiste un dispositivo o sospechás que alguien más tiene acceso a tu sesión?
        </p>

        {logoutAllError && <p className="auth-error">{logoutAllError}</p>}

        {confirmingLogoutAll ? (
          <div className="form-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setConfirmingLogoutAll(false)}
              disabled={loggingOutAll}
            >
              Cancelar
            </button>
            <button type="button" className="danger" onClick={handleLogoutAll} disabled={loggingOutAll}>
              {loggingOutAll ? 'Cerrando...' : 'Sí, cerrar todas'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="secondary btn-full-width"
            onClick={() => setConfirmingLogoutAll(true)}
          >
            <FiLogOut className="icon-inline" /> Cerrar sesión en todos los dispositivos
          </button>
        )}
      </form>
    </div>
  );
}
