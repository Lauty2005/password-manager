const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Error de red');
  }

  return data;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  getSalt: (email) => request(`/auth/salt/${encodeURIComponent(email)}`),

  register: (email, authSalt, authKey) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, authSalt, authKey })
    }),

  login: (email, authKey) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, authKey })
    }),

  changeMasterPassword: (token, oldAuthKey, newAuthKey) =>
    request('/auth/master-password', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ oldAuthKey, newAuthKey })
    }),

  listCredentials: (token, { trash = false } = {}) =>
    request(`/credentials${trash ? '?trash=1' : ''}`, { headers: authHeaders(token) }),

  createCredential: (token, ciphertext, iv) =>
    request('/credentials', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ ciphertext, iv })
    }),

  updateCredential: (token, id, ciphertext, iv) =>
    request(`/credentials/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ ciphertext, iv })
    }),

  setFavorite: (token, id, isFavorite) =>
    request(`/credentials/${id}/favorite`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ isFavorite })
    }),

  touchCredential: (token, id) =>
    request(`/credentials/${id}/touch`, {
      method: 'POST',
      headers: authHeaders(token)
    }),

  deleteCredential: (token, id) =>
    request(`/credentials/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    }),

  restoreCredential: (token, id) =>
    request(`/credentials/${id}/restore`, {
      method: 'POST',
      headers: authHeaders(token)
    }),

  permanentDeleteCredential: (token, id) =>
    request(`/credentials/${id}/permanent`, {
      method: 'DELETE',
      headers: authHeaders(token)
    })
};
