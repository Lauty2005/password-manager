const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Ademas de validar la firma, chequea tokenVersion contra el usuario en DB.
// Sin esto, un JWT robado o de una sesion vieja seguiria sirviendo hasta
// que expire solo (hasta 2hs) sin forma de cortarlo antes -- ver
// /api/auth/logout-all y el bump de tokenVersion en cambio de master password.
module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado, token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('tokenVersion');
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};
