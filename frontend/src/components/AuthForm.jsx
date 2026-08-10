import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthForm() {
  const { login, register, sessionMessage } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        setInfo('Cuenta creada. Ahora iniciá sesión.');
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
    <div className="auth-card">
      <h1>🔐 Password Manager</h1>
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
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            required
          />
        </label>

        {mode === 'register' && (
          <label>
            Confirmar master password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
        )}

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <button type="submit" disabled={loading}>
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

      <p className="auth-warning">
        ⚠️ Si perdés tu master password no hay forma de recuperar tus contraseñas guardadas.
        Ni vos ni nosotros la tenemos guardada en ningún lado.
      </p>
    </div>
  );
}
