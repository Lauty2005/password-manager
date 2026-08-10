const express = require('express');
const Credential = require('../models/Credential');
const auth = require('../middleware/auth');

const router = express.Router();

const TRASH_RETENTION_DAYS = 30;

// Borra para siempre lo que lleve mas de TRASH_RETENTION_DAYS en la papelera.
// Se llama "al pasar" en cada listado en vez de usar un cron aparte: no hay
// tanto trafico como para que importe la carga extra, y evita sumar un proceso mas.
async function purgeExpiredTrash() {
  const threshold = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await Credential.deleteMany({ deletedAt: { $ne: null, $lt: threshold } });
}

router.use(auth);

// Lista los blobs cifrados del usuario. El descifrado pasa 100% en el cliente.
// ?trash=1 devuelve solo las que estan en la papelera (deletedAt seteado).
router.get('/', async (req, res) => {
  await purgeExpiredTrash();
  const isTrash = req.query.trash === '1' || req.query.trash === 'true';
  const filter = { userId: req.userId, deletedAt: isTrash ? { $ne: null } : null };
  const sort = isTrash ? { deletedAt: -1 } : { createdAt: -1 };
  const credentials = await Credential.find(filter).sort(sort);
  res.json(credentials);
});

router.post('/', async (req, res) => {
  try {
    const { ciphertext, iv } = req.body;
    if (!ciphertext || !iv) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    const credential = await Credential.create({ userId: req.userId, ciphertext, iv });
    res.status(201).json(credential);
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

    const credential = await Credential.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ciphertext, iv },
      { new: true }
    );

    if (!credential) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    res.json(credential);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Marca/desmarca como favorita.
router.patch('/:id/favorite', async (req, res) => {
  try {
    const credential = await Credential.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isFavorite: !!req.body.isFavorite },
      { new: true }
    );
    if (!credential) {
      return res.status(404).json({ error: 'No encontrada' });
    }
    res.json(credential);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Se llama cuando el usuario revela o copia la password, para poder ordenar por "mas usados".
router.post('/:id/touch', async (req, res) => {
  try {
    const credential = await Credential.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $inc: { usageCount: 1 }, lastUsedAt: new Date() },
      { new: true }
    );
    if (!credential) {
      return res.status(404).json({ error: 'No encontrada' });
    }
    res.json(credential);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Soft delete: manda a la papelera en vez de borrar.
router.delete('/:id', async (req, res) => {
  const result = await Credential.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!result) {
    return res.status(404).json({ error: 'No encontrada' });
  }
  res.json({ message: 'Movida a la papelera' });
});

// Saca de la papelera.
router.post('/:id/restore', async (req, res) => {
  const result = await Credential.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId, deletedAt: { $ne: null } },
    { deletedAt: null },
    { new: true }
  );
  if (!result) {
    return res.status(404).json({ error: 'No encontrada' });
  }
  res.json(result);
});

// Borrado definitivo, solo permitido si ya estaba en la papelera.
router.delete('/:id/permanent', async (req, res) => {
  const result = await Credential.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: { $ne: null }
  });
  if (!result) {
    return res.status(404).json({ error: 'No encontrada' });
  }
  res.json({ message: 'Eliminada definitivamente' });
});

module.exports = router;
