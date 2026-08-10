import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { generateSalt, deriveAuthKeyHex, deriveEncryptionKey } from '../lib/crypto';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // token y encryptionKey viven SOLO en memoria (estado de React).
  // Se pierden al recargar la página a propósito: no hay forma de
  // recuperar la encryptionKey sin volver a escribir la master password.
  const [email, setEmail] = useState(null);
  const [token, setToken] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);

  const register = useCallback(async (emailInput, masterPassword) => {
    const authSalt = generateSalt();
    const authKey = await deriveAuthKeyHex(masterPassword, authSalt);
    await api.register(emailInput, authSalt, authKey);
  }, []);

  const login = useCallback(async (emailInput, masterPassword) => {
    const { authSalt } = await api.getSalt(emailInput);
    const authKey = await deriveAuthKeyHex(masterPassword, authSalt);
    const { token: newToken } = await api.login(emailInput, authKey);
    const newEncryptionKey = await deriveEncryptionKey(masterPassword, authSalt);

    setEmail(emailInput);
    setToken(newToken);
    setEncryptionKey(newEncryptionKey);
  }, []);

  const logout = useCallback(() => {
    setEmail(null);
    setToken(null);
    setEncryptionKey(null);
  }, []);

  const value = useMemo(
    () => ({ email, token, encryptionKey, isAuthenticated: Boolean(token && encryptionKey), register, login, logout }),
    [email, token, encryptionKey, register, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
