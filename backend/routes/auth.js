const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { loginLimiter, registerLimiter, saltLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Registro: el cliente ya generó authSalt y derivó authKey localmente a partir
// de la master password. Acá solo guardamos bcrypt(authKey) + el salt.
//
// Si el email ya existe, NO lo decimos: devolvemos la misma respuesta (201,
// mismo mensaje) que en un alta real, y hacemos igual el bcrypt.hash aunque
// no se use, para que el tiempo de respuesta tampoco lo delate. Misma idea
// que el salt falso de /salt/:email -- que un atacante no pueda usar este
// endpoint como oráculo para saber si un email tiene cuenta acá.
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, authSalt, authKey } = req.body;

    if (!email || !authSalt || !authKey) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    const authHash = await bcrypt.hash(authKey, 10);

    if (!existing) {
      await User.create({ email: normalizedEmail, authSalt, authHash });
    }

    res.status(201).json({
      message: 'Si los datos son válidos, ya podés iniciar sesión.',
      email: normalizedEmail
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// El cliente necesita el authSalt del usuario ANTES de poder derivar authKey
// para hacer login. Si el email no existe, devolvemos un salt falso pero
// determinístico (HMAC del email con JWT_SECRET) para no revelar por timing
// ni por forma de respuesta si ese email está registrado o no.
router.get('/salt/:email', saltLimiter, async (req, res) => {
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

router.post('/login', loginLimiter, async (req, res) => {
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

    const token = jwt.sign(
      { userId: user._id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Cambio de master password. El cliente ya re-cifro TODAS sus credenciales
// (activas y en papelera) con la nueva encryptionKey ANTES de llamar a esto --
// ver frontend/src/lib/masterPassword.js. Aca solo actualizamos el material
// de auth, y es literalmente el ultimo paso de todo el flujo: si esto se
// llega a llamar es porque el re-cifrado de credenciales ya termino bien.
router.put('/master-password', auth, async (req, res) => {
  try {
    const { oldAuthKey, newAuthKey } = req.body;
    if (!oldAuthKey || !newAuthKey) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const valid = await bcrypt.compare(oldAuthKey, user.authHash);
    if (!valid) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }

    user.authHash = await bcrypt.hash(newAuthKey, 10);
    // Invalida cualquier JWT emitido antes de este cambio (de este dispositivo
    // u otro) -- si alguien tenia una sesion abierta con la password vieja,
    // se corta acá en vez de seguir viva hasta que el token expire solo.
    user.tokenVersion += 1;
    await user.save();

    res.json({ message: 'Contraseña maestra actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Cierra todas las sesiones activas (todos los dispositivos), sin cambiar la
// master password. Util si perdiste un dispositivo o sospechás que alguien
// tiene un token tuyo -- corta el acceso ahi mismo en vez de esperar a que
// el JWT expire solo (hasta 2hs).
router.post('/logout-all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.tokenVersion += 1;
    await user.save();

    res.json({ message: 'Se cerraron todas las sesiones' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
