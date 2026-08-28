import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAvatarColor, getAvatarInitial } from '../lib/avatar';
import CredentialsPanel from './CredentialsPanel';
import TokensPanel from './TokensPanel';
import ThemeToggle from './ThemeToggle';
import ChangeMasterPasswordModal from './ChangeMasterPasswordModal';
import { FiLock, FiKey, FiLogOut } from 'react-icons/fi';

// Shell de la app ya logueada: nav/header (cuenta, tema, cambio de master
// password -- nada de esto es especifico de una seccion) + un switch de
// tabs que elige que panel renderizar. Toda la logica de datos vive en
// CredentialsPanel/TokensPanel, este componente no sabe nada de eso.
export default function Dashboard() {
  const { email, logout } = useAuth();
  const [view, setView] = useState('credentials'); // 'credentials' | 'tokens'
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <header className="dashboard-header">
          <h1><FiLock className="icon-inline" /> Mis contraseñas</h1>
          <div className="dashboard-header-right">
            <ThemeToggle />
            <button
              type="button"
              className="secondary btn-collapsible"
              onClick={() => setShowChangePassword(true)}
              title="Contraseña maestra"
            >
              <FiKey className="icon-inline" /> <span className="btn-label">Contraseña maestra</span>
            </button>
            <button
              type="button"
              className="secondary btn-collapsible"
              onClick={() => logout()}
              title="Cerrar sesión"
            >
              <FiLogOut className="icon-inline" /> <span className="btn-label">Cerrar sesión</span>
            </button>
            <div
              className="site-avatar user-avatar"
              style={{ background: getAvatarColor(email) }}
              title={email}
            >
              {getAvatarInitial(email)}
            </div>
          </div>
        </header>
      </nav>

      <div className="dashboard-content">
        <div className="view-tabs">
          <button
            type="button"
            className={view === 'credentials' ? 'view-tab view-tab-active' : 'view-tab'}
            onClick={() => setView('credentials')}
          >
            <FiLock className="icon-inline" /> Contraseñas
          </button>
          <button
            type="button"
            className={view === 'tokens' ? 'view-tab view-tab-active' : 'view-tab'}
            onClick={() => setView('tokens')}
          >
            <FiKey className="icon-inline" /> Tokens
          </button>
        </div>

        {view === 'credentials' ? <CredentialsPanel /> : <TokensPanel />}
      </div>

      {showChangePassword && (
        <ChangeMasterPasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
