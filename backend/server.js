const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const credentialRoutes = require('./routes/credentials');

const app = express();

// Lista blanca de origenes explicita en vez de cors() abierto a cualquiera.
// ALLOWED_ORIGINS es una lista separada por comas (ver .env.example).
// Requests sin Origin (curl, apps nativas, servidor-a-servidor) no son CORS
// del navegador, se dejan pasar igual -- el whitelist solo aplica al header
// que le importa al navegador.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  // callback(null, false) en vez de pasar un Error: el pedido sigue su curso
  // normal (misma respuesta que sin CORS), simplemente sin los headers de
  // Access-Control-*. Es el navegador el que bloquea que JS de un origen no
  // permitido pueda leer la respuesta -- no hace falta que el server corte
  // la request con un 500 (que ademas terminaba mostrando la pagina de
  // error default de Express).
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  }
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

app.use('/api/auth', authRoutes);
app.use('/api/credentials', credentialRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});
