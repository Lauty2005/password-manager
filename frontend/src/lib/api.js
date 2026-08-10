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

  listCredentials: (token) =>
    request('/credentials', { headers: authHeaders(token) }),

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

  deleteCredential: (token, id) =>
    request(`/credentials/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    })
};
