import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiLock, FiAlertTriangle, FiEye, FiEyeOff } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';

export default function AuthForm() {
  const { login, register, sessionMessage } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'register' && masterPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (masterPassword.length < 8) {
      setError('La master password debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, masterPassword);
        setMode('login');
        setInfo('Si los datos son válidos, ya podés iniciar sesión.');
        setMasterPassword('');
        setConfirmPassword('');
      } else {
        await login(email, masterPassword);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-theme-toggle"><ThemeToggle /></div>

        <div className="auth-content">
          <div className="auth-icon-badge">
            <FiLock />
          </div>
          <h1 className="auth-title">Password Manager</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Iniciá sesión con tu master password' : 'Creá tu cuenta'}
          </p>

          {sessionMessage && <p className="auth-info">{sessionMessage}</p>}

          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label>
              Master password
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
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
            </label>

            {mode === 'register' && (
              <label>
                Confirmar master password
                <div className="password-input-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-icon"
                    onClick={() => setShowConfirm((v) => !v)}
                    title={showConfirm ? 'Ocultar' : 'Mostrar'}
                  >
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </label>
            )}

            {error && <p className="auth-error">{error}</p>}
            {info && <p className="auth-info">{info}</p>}

            <button type="submit" className="primary auth-submit" disabled={loading}>
              {loading ? 'Un momento...' : mode === 'login' ? 'Iniciar sesión' : 'Registrarme'}
            </button>
          </form>

          <button
            type="button"
            className="link-button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
              setInfo('');
            }}
          >
            {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
          </button>
        </div>

        <p className="auth-warning">
          <FiAlertTriangle className="icon-inline" /> Si perdés tu master password no hay forma de
          recuperar tus contraseñas guardadas. Ni vos ni nosotros la tenemos guardada en ningún lado.
        </p>
      </div>
    </div>
  );
}
