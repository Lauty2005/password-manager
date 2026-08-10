const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Registro: el cliente ya generó authSalt y derivó authKey localmente a partir
// de la master password. Acá solo guardamos bcrypt(authKey) + el salt.
router.post('/register', async (req, res) => {
  try {
    const { email, authSalt, authKey } = req.body;

    if (!email || !authSalt || !authKey) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }

    const authHash = await bcrypt.hash(authKey, 10);
    const user = await User.create({ email: email.toLowerCase(), authSalt, authHash });

    res.status(201).json({ message: 'Usuario creado', email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// El cliente necesita el authSalt del usuario ANTES de poder derivar authKey
// para hacer login. Si el email no existe, devolvemos un salt falso pero
// determinístico (HMAC del email con JWT_SECRET) para no revelar por timing
// ni por forma de respuesta si ese email está registrado o no.
router.get('/salt/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const user = await User.findOne({ email });

    if (user) {
      return res.json({ authSalt: user.authSalt });
    }

    const fakeSalt = crypto
      .createHmac('sha256', process.env.JWT_SECRET)
      .update(email)
      .digest('hex')
      .slice(0, 32);

    res.json({ authSalt: fakeSalt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, authKey } = req.body;

    if (!email || !authKey) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(authKey, user.authHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
