# Password Manager (zero-knowledge)

Gestor de contraseñas personal. El servidor nunca ve tu master password ni las
contraseñas que guardás: solo blobs cifrados con AES-GCM. El cifrado y descifrado
pasan enteramente en el navegador con la Web Crypto API nativa.

## Cómo funciona (resumen)

1. Al registrarte, el navegador genera un `salt` aleatorio y deriva dos claves
   de tu master password con PBKDF2 (310.000 iteraciones, SHA-256):
   - `authKey`: se manda al servidor, que guarda `bcrypt(authKey)`. Sirve solo
     para probar que sos vos en el login, no sirve para descifrar nada.
   - `encryptionKey`: **nunca sale del navegador**. Cifra/descifra tus
     credenciales con AES-GCM.
2. Cada credencial (sitio, usuario, contraseña, notas) se cifra como un único
   blob antes de mandarse al servidor. El servidor solo guarda `ciphertext` + `iv`.
3. Si perdés la master password, no hay recuperación posible — es la
   contrapartida de que ni nosotros podemos leer tus datos.

## Requisitos

- Node.js 22+
- Una base MongoDB (local, Atlas, o Docker — ver más abajo)

## Correrlo en local

**Backend**
```
cd backend
cp .env.example .env    # completá MONGO_URI y un JWT_SECRET propio
npm install
npm run dev
```

**Frontend**
```
cd frontend
npm install
npm run dev
```

Por defecto el frontend espera el backend en `http://localhost:3001/api`
(configurable en `frontend/.env`, variable `VITE_API_URL`).

## Estado del proyecto

MVP básico: registro/login con master password, CRUD de credenciales cifradas,
generador de contraseñas seguras client-side. Pendiente: dockerizar (como se
hizo con bookmark-app), categorías/tags, exportar/importar.
