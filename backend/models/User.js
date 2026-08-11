const mongoose = require('mongoose');

// El servidor NUNCA guarda la master password ni la encryptionKey.
// authSalt: sal usada por el cliente para derivar authKey y encryptionKey (no es secreta).
// authHash: bcrypt(authKey). authKey es solo para probar identidad, no sirve para descifrar nada.
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  authSalt: { type: String, required: true },
  authHash: { type: String, required: true },
  // Se incluye en cada JWT emitido. Incrementarlo invalida de una todos los
  // tokens ya repartidos (aunque no hayan expirado todavia) -- es lo que le
  // da al login stateless una forma de revocacion real.
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
