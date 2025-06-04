const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  console.log('Auth check:', {
    sessionID: req.sessionID,
    userId: req.session?.userId,
    session: req.session,
    secure: req.secure,
    protocol: req.protocol,
    headers: {
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });
  
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireSuperUser(req, res, next) {
  if (!req.session.userId || !req.session.isSuperUser) {
    return res.status(403).json({ error: 'Super user access required' });
  }
  next();
}

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  requireAuth,
  requireSuperUser,
  generateToken,
  verifyToken
};