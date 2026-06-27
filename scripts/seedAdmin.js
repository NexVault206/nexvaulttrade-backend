// Creates (or updates) the admin account from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
// Runs automatically on server start (see server.js), and can also be run manually:
//   npm run seed:admin
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = hashed;
    existing.role = 'admin';
    await existing.save();
    console.log(`✅ Admin account updated: ${email}`);
  } else {
    await User.create({
      name: 'Admin',
      email,
      password: hashed,
      role: 'admin',
      balance: 0
    });
    console.log(`✅ Admin account created: ${email}`);
  }
}

// Allow running standalone: `node scripts/seedAdmin.js`
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI)
    .then(seedAdmin)
    .then(() => mongoose.disconnect())
    .catch(err => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = seedAdmin;
