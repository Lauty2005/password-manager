const mongoose = require('mongoose');

// site, username, password y notas viajan y se guardan como un unico blob cifrado
// (AES-GCM) armado en el cliente. El servidor no puede leer nada de esto.
const credentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ciphertext: { type: String, required: true }, // base64
  iv: { type: String, required: true },         // base64, 12 bytes para AES-GCM

  // Metadata en texto plano (no viaja cifrada, igual que timestamps ya lo hacia).
  // No expone site/usuario/password, solo señales de uso.
  isFavorite: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }, // soft delete -> papelera
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Credential', credentialSchema);
