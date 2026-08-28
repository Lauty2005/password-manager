const express = require('express');
const Token = require('../models/Token');
const auth = require('../middleware/auth');

const router = express.Router();

// Mismo CRUD/papelera/favoritos que routes/credentials.js, solo que sobre el
// modelo Token. Se mantiene como archivo separado (en vez de parametrizar un
// router generico) para que cada recurso quede explicito y sea facil de leer
// y modificar por separado.
const TRASH_RETENTION_DAYS = 30;

async function purgeExpiredTrash() {
  const threshold = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await Token.deleteMany({ deletedAt: { $ne: null, $lt: threshold } });
}

router.use(auth);

// Lista los blobs cifrados del usuario. El descifrado pasa 100% en el cliente.
// ?trash=1 devuelve solo los que estan en la papelera (deletedAt seteado).
router.get('/', async (req, res) => {
  await purgeExpiredTrash();
  const isTrash = req.query.trash === '1' || req.query.trash === 'true';
  const filter = { userId: req.userId, deletedAt: isTrash ? { $ne: null } : null };
  const sort = isTrash ? { deletedAt: -1 } : { createdAt: -1 };
  const tokens = await Token.find(filter).sort(sort);
  res.json(tokens);
});

router.post('/', async (req, res) => {
  try {
    const { ciphertext, iv } = req.body;
    if (!ciphertext || !iv) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    const token = await Token.create({ userId: req.userId, ciphertext, iv });
    res.status(201).json(token);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { ciphertext, iv } = req.body;
    if (!ciphertext || !iv) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const token = await Token.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ciphertext, iv },
      { new: true }
    );

    if (!token) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    res.json(token);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Marca/desmarca como favorito.
router.patch('/:id/favorite', async (req, res) => {
  try {
    const token = await Token.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isFavorite: !!req.body.isFavorite },
      { new: true }
    );
    if (!token) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    res.json(token);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Se llama cuando el usuario revela o copia el token, para poder ordenar por "mas usados".
router.post('/:id/touch', async (req, res) => {
  try {
    const token = await Token.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $inc: { usageCount: 1 }, lastUsedAt: new Date() },
      { new: true }
    );
    if (!token) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    res.json(token);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Soft delete: manda a la papelera en vez de borrar.
router.delete('/:id', async (req, res) => {
  const result = await Token.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!result) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  res.json({ message: 'Movido a la papelera' });
});

// Saca de la papelera.
router.post('/:id/restore', async (req, res) => {
  const result = await Token.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, deletedAt: { $ne: null } },
    { deletedAt: null },
    { new: true }
  );
  if (!result) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  res.json(result);
});

// Borrado definitivo, solo permitido si ya estaba en la papelera.
router.delete('/:id/permanent', async (req, res) => {
  const result = await Token.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: { $ne: null }
  });
  if (!result) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  res.json({ message: 'Eliminado definitivamente' });
});

module.exports = router;
