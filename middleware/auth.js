const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies a JWT sent in the 'x-auth-token' header and attaches req.user
async function auth(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ msg: 'User no longer exists' });
    if (user.isRestricted) return res.status(403).json({ msg: 'Account restricted. Contact support.' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

// Must be used AFTER auth() — checks that the authenticated user is an admin
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Admin access required' });
  }
  next();
}

module.exports = { auth, adminOnly };
