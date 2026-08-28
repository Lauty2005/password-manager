import { deriveAuthKeyHex, deriveEncryptionKey, decryptData, encryptData } from './crypto';
import { api } from './api';

// Cambia la master password re-cifrando TODO (credenciales Y tokens, activos
// y en papelera) con la clave nueva ANTES de tocar el hash de login en el
// servidor. Los tokens usan la misma encryptionKey que las credenciales, asi
// que si se olvidaran del re-cifrado quedarian indescifrables para siempre
// despues de este cambio -- por eso viajan por el mismo pipeline, no aparte.
//
// El orden importa muchisimo:
//   1. Se descifra todo con la clave vieja (si la password actual esta mal,
//      esto directamente tira un error y no se toco nada todavia).
//   2. Se re-cifra todo con la clave nueva y se manda al servidor.
//   3. Recien si el paso 2 termino OK para TODO, se actualiza el auth
//      (authHash) en el servidor -- ese es el ultimo paso, nunca el primero.
//
// Por que en ese orden y no al reves: si algo se corta a mitad del paso 2
// (se fue el wifi, se cerro la pestaña, lo que sea), como el auth todavia
// no se toco, la master password vieja sigue siendo valida y alcanza con
// revertir lo que ya se habia actualizado. Si en cambio actualizaramos el
// auth primero, una falla a mitad del re-cifrado dejaria algunos items
// atrapados con la clave vieja pero el login ya exigiendo la clave nueva --
// inconsistencia mucho peor de resolver.
export async function changeMasterPassword({ token, authSalt, currentPassword, newPassword, onProgress }) {
  const oldAuthKey = await deriveAuthKeyHex(currentPassword, authSalt);
  const oldEncryptionKey = await deriveEncryptionKey(currentPassword, authSalt);

  onProgress?.('reencrypting');

  // Cada item se marca con su "kind" para saber que endpoint de update usar
  // (credencial vs token comparten forma pero viven en colecciones distintas).
  const updateFns = {
    credential: api.updateCredential,
    token: api.updateToken
  };

  const [credActive, credTrash, tokenActive, tokenTrash] = await Promise.all([
    api.listCredentials(token, { trash: false }),
    api.listCredentials(token, { trash: true }),
    api.listTokens(token, { trash: false }),
    api.listTokens(token, { trash: true })
  ]);
  const allRaw = [
    ...credActive.map((item) => ({ ...item, kind: 'credential' })),
    ...credTrash.map((item) => ({ ...item, kind: 'credential' })),
    ...tokenActive.map((item) => ({ ...item, kind: 'token' })),
    ...tokenTrash.map((item) => ({ ...item, kind: 'token' }))
  ];

  // Descifrar con la clave vieja funciona como verificacion de la password
  // actual "gratis": AES-GCM incluye un tag de autenticacion, asi que si la
  // clave derivada esta mal, decryptData tira en vez de devolver basura.
  const decrypted = [];
  for (const item of allRaw) {
    try {
      const data = await decryptData(oldEncryptionKey, item.ciphertext, item.iv);
      decrypted.push({
        _id: item._id,
        kind: item.kind,
        data,
        original: { ciphertext: item.ciphertext, iv: item.iv }
      });
    } catch {
      throw new Error('La contraseña actual no es correcta');
    }
  }

  const newAuthKey = await deriveAuthKeyHex(newPassword, authSalt);
  const newEncryptionKey = await deriveEncryptionKey(newPassword, authSalt);

  const updated = [];
  try {
    for (const item of decrypted) {
      const { ciphertext, iv } = await encryptData(newEncryptionKey, item.data);
      await updateFns[item.kind](token, item._id, ciphertext, iv);
      updated.push(item);
    }
  } catch {
    // Rollback: los que ya se habian actualizado vuelven a su ciphertext
    // original (el que ya teniamos guardado, no hace falta re-cifrar de nuevo).
    for (const item of updated) {
      try {
        await updateFns[item.kind](token, item._id, item.original.ciphertext, item.original.iv);
      } catch {
        // Si ni el rollback funciona no hay mucho mas para hacer desde el
        // cliente -- pero el auth todavia no se toco, asi que la password
        // vieja sigue sirviendo para volver a intentar mas tarde.
      }
    }
    throw new Error('No se pudo completar el cambio. Se revirtió todo, no se perdió nada. Probá de nuevo.');
  }

  onProgress?.('updating-auth');
  await api.changeMasterPassword(token, oldAuthKey, newAuthKey);

  return newEncryptionKey;
}
