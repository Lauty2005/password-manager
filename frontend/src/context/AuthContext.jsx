import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { generateSalt, deriveAuthKeyHex, deriveEncryptionKey } from '../lib/crypto';
import { changeMasterPassword as changeMasterPasswordFlow } from '../lib/masterPassword';

const AuthContext = createContext(null);

// Después de esto de inactividad, se cierra la sesión y se borra la
// encryptionKey de memoria. Es la mitigación obvia para "dejé la compu
// desbloqueada con el gestor de contraseñas abierto".
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export function AuthProvider({ children }) {
  // token y encryptionKey viven SOLO en memoria (estado de React).
  // Se pierden al recargar la página a propósito: no hay forma de
  // recuperar la encryptionKey sin volver a escribir la master password.
  const [email, setEmail] = useState(null);
  const [token, setToken] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [authSalt, setAuthSalt] = useState(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const lastActivityRef = useRef(Date.now());

  const isAuthenticated = Boolean(token && encryptionKey);

  const register = useCallback(async (emailInput, masterPassword) => {
    const authSalt = generateSalt();
    const authKey = await deriveAuthKeyHex(masterPassword, authSalt);
    await api.register(emailInput, authSalt, authKey);
  }, []);

  const login = useCallback(async (emailInput, masterPassword) => {
    const { authSalt: salt } = await api.getSalt(emailInput);
    const authKey = await deriveAuthKeyHex(masterPassword, salt);
    const { token: newToken } = await api.login(emailInput, authKey);
    const newEncryptionKey = await deriveEncryptionKey(masterPassword, salt);

    setEmail(emailInput);
    setToken(newToken);
    setEncryptionKey(newEncryptionKey);
    setAuthSalt(salt);
    setSessionMessage('');
  }, []);

  const logout = useCallback((reason) => {
    setEmail(null);
    setToken(null);
    setEncryptionKey(null);
    setAuthSalt(null);
    let message = '';
    if (reason === 'idle') {
      message = 'Cerramos tu sesión por inactividad. Volvé a ingresar tu master password.';
    } else if (reason === 'password-changed') {
      message = 'Contraseña maestra actualizada. Volvé a iniciar sesión con la nueva.';
    }
    setSessionMessage(message);
  }, []);

  // No devuelve nada: si termina bien, ya hizo logout() para forzar un login
  // limpio con la password nueva (evita dejar el estado de la sesion actual
  // desincronizado de lo que realmente quedo guardado en el servidor).
  const changeMasterPassword = useCallback(async (currentPassword, newPassword, onProgress) => {
    await changeMasterPasswordFlow({ token, authSalt, currentPassword, newPassword, onProgress });
    logout('password-changed');
  }, [token, authSalt, logout]);

  // Timer de inactividad: solo corre mientras hay una sesión activa.
  // Se fija en actividad real del usuario (mouse/teclado/scroll/touch),
  // no en llamadas de red, para no extender la sesión solo porque
  // la app está pidiendo datos en segundo plano.
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    lastActivityRef.current = Date.now();
    const registerActivity = () => {
      lastActivityRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, registerActivity));

    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) {
        logout('idle');
      }
    }, 10000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, logout]);

  const value = useMemo(
    () => ({
      email,
      token,
      encryptionKey,
      isAuthenticated,
      sessionMessage,
      register,
      login,
      logout,
      changeMasterPassword
    }),
    [email, token, encryptionKey, isAuthenticated, sessionMessage, register, login, logout, changeMasterPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
