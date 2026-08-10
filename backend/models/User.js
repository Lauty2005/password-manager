const mongoose = require('mongoose');

// El servidor NUNCA guarda la master password ni la encryptionKey.
// authSalt: sal usada por el cliente para derivar authKey y encryptionKey (no es secreta).
// authHash: bcrypt(authKey). authKey es solo para probar identidad, no sirve para descifrar nada.
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  authSalt: { type: String, required: true },
  authHash: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
