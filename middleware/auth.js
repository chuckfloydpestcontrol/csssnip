const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  console.log('Auth check - Session ID:', req.sessionID, 'User ID:', req.session.userId);
  
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