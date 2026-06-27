require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const seedAdmin = require('./scripts/seedAdmin');

const app = express();

// ── DATABASE ──────────────────────────────────────────────────
connectDB().then(() => {
  seedAdmin().catch(err => console.error('Admin seed error:', err));
});

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, Postman) and any listed origin
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Basic rate limiting on auth routes to slow down brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many attempts. Please try again later.' }
});
app.use('/api/auth', authLimiter);

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.get('/', (req, res) => res.send('NexVaultTrade API is running.'));

// ── 404 + ERROR HANDLING ─────────────────────────────────────
app.use((req, res) => res.status(404).json({ msg: 'Route not found.' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: 'Internal server error.' });
});

// ── START ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 NexVaultTrade API running on port ${PORT}`));
