const rateLimit = require('express-rate-limit');

// Protege contra fuerza bruta / credential stuffing en los endpoints de auth.
// Los limites son por IP: no evitan un atacante distribuido, pero suben
// muchisimo el costo de un ataque dirigido contra una sola cuenta.

const message = { error: 'Demasiados intentos. Esperá unos minutos y volvé a intentar.' };

// /login: el endpoint mas sensible, es donde se prueban credenciales.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message
});

// /register: mas laxo que login, pero limitado para frenar creacion masiva
// de cuentas y reducir el abuso del endpoint como oraculo de enumeracion.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message
});

// /salt/:email: paso previo obligatorio para poder derivar authKey y loguear.
// Limitarlo tambien frena la fuerza bruta, no solo /login.
const saltLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message
});

module.exports = { loginLimiter, registerLimiter, saltLimiter };
