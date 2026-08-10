// Test end-to-end contra el backend YA levantado (docker compose up).
// Corre: node e2e-test.mjs   (parado en la raíz del proyecto, backend en :3001)
import assert from 'node:assert/strict';
import {
  generateSalt,
  deriveAuthKeyHex,
  deriveEncryptionKey,
  encryptData,
  decryptData
} from './frontend/src/lib/crypto.js';

const API = 'http://localhost:3001/api';

async function main() {
  const email = `test-${Date.now()}@local.dev`; // único en cada corrida
  const masterPassword = 'una-master-password-de-prueba-123';

  console.log('[1] Registro...');
  const authSalt = generateSalt();
  const authKeyRegister = await deriveAuthKeyHex(masterPassword, authSalt);
  let res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, authSalt, authKey: authKeyRegister })
  });
  assert.equal(res.status, 201, `Registro debería devolver 201 (dio ${res.status})`);
  console.log('  OK: usuario registrado ->', email);

  console.log('[2] Login...');
  res = await fetch(`${API}/auth/salt/${encodeURIComponent(email)}`);
  const { authSalt: fetchedSalt } = await res.json();
  assert.equal(fetchedSalt, authSalt);
  const authKeyLogin = await deriveAuthKeyHex(masterPassword, fetchedSalt);
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, authKey: authKeyLogin })
  });
  assert.equal(res.status, 200, `Login debería devolver 200 (dio ${res.status})`);
  const { token } = await res.json();
  assert.ok(token);
  console.log('  OK: login exitoso');

  console.log('[3] Login con master password incorrecta debe rechazarse...');
  const badAuthKey = await deriveAuthKeyHex('password-incorrecta', fetchedSalt);
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, authKey: badAuthKey })
  });
  assert.equal(res.status, 401);
  console.log('  OK: rechazado');

  console.log('[4] Guardar credencial cifrada...');
  const encryptionKey = await deriveEncryptionKey(masterPassword, fetchedSalt);
  const plainCredential = { site: 'github.com', username: 'lauty2005', password: 'S3cr3t!Pass', notes: 'cuenta principal' };
  const { ciphertext, iv } = await encryptData(encryptionKey, plainCredential);
  assert.ok(!ciphertext.includes('S3cr3t'), 'El ciphertext no debe filtrar la contraseña en claro');

  res = await fetch(`${API}/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ciphertext, iv })
  });
  assert.equal(res.status, 201);
  const created = await res.json();
  console.log('  OK: credencial creada, id=' + created._id);

  console.log('[5] Listar y confirmar que el servidor solo tiene ciphertext...');
  res = await fetch(`${API}/credentials`, { headers: { Authorization: `Bearer ${token}` } });
  const list = await res.json();
  assert.equal(list.length, 1);
  assert.ok(list[0].ciphertext && list[0].iv);
  assert.equal(list[0].site, undefined, 'El servidor NO debe tener un campo site en claro');
  console.log('  OK');

  console.log('[6] Descifrar y comparar con el original...');
  const decrypted = await decryptData(encryptionKey, list[0].ciphertext, list[0].iv);
  assert.deepEqual(decrypted, plainCredential);
  console.log('  OK: coincide exactamente');

  console.log('[7] Editar...');
  const updated = { ...plainCredential, password: 'NuevaPass456!' };
  const enc2 = await encryptData(encryptionKey, updated);
  res = await fetch(`${API}/credentials/${created._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(enc2)
  });
  assert.equal(res.status, 200);
  console.log('  OK');

  console.log('[8] Borrar...');
  res = await fetch(`${API}/credentials/${created._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(res.status, 200);
  res = await fetch(`${API}/credentials`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await res.json()).length, 0);
  console.log('  OK');

  console.log('[9] Sin token debe rechazar...');
  res = await fetch(`${API}/credentials`);
  assert.equal(res.status, 401);
  console.log('  OK');

  console.log('\n✅ TODO EL FLUJO END-TO-END PASÓ CORRECTAMENTE (contra tu backend real en Docker)');
}

main().catch((err) => {
  console.error('\n❌ FALLÓ:', err.message);
  process.exitCode = 1;
});
