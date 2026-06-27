const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    balance: user.balance,
    isVerified: user.isVerified,
    isRestricted: user.isRestricted,
    tierUpgraded: user.tierUpgraded,
    balanceLocked: user.balanceLocked,
    activePlan: user.activePlan,
    referralCode: user.referralCode,
    referralEarnings: user.referralEarnings,
    totalReferrals: user.totalReferrals
  };
}

function makeReferralCode(name) {
  const base = (name || 'user').replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'USER';
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, referredBy } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: 'All fields are required.' });
    if (password.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ msg: 'An account with this email already exists.' });

    const hashed = await bcrypt.hash(password, 10);

    let referralCode = makeReferralCode(name);
    // ensure uniqueness (extremely unlikely to collide, but be safe)
    while (await User.findOne({ referralCode })) {
      referralCode = makeReferralCode(name);
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      referralCode,
      referredBy: referredBy || null,
      balance: 0
    });

    // Credit referrer, if any
    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy });
      if (referrer) {
        referrer.totalReferrals += 1;
        await referrer.save();
      }
    }

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during signup.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ msg: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Invalid email or password.' });

    if (user.isRestricted) return res.status(403).json({ msg: 'Account restricted. Contact support.' });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during login.' });
  }
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'admin' });
    if (!user) return res.status(400).json({ msg: 'Invalid admin credentials.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Invalid admin credentials.' });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during admin login.' });
  }
});

module.exports = router;
