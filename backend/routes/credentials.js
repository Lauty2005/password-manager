const express = require('express');
const Credential = require('../models/Credential');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Lista los blobs cifrados del usuario. El descifrado pasa 100% en el cliente.
router.get('/', async (req, res) => {
  const credentials = await Credential.find({ userId: req.userId }).sort({ createdAt: -1 });
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

router.delete('/:id', async (req, res) => {
  const result = await Credential.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!result) {
    return res.status(404).json({ error: 'No encontrada' });
  }
  res.json({ message: 'Eliminada' });
});

module.exports = router;
