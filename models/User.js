const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['Deposit', 'Withdrawal', 'Plan'], required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: '' },          // e.g. 'BTC', 'Bank Transfer', 'Starter Plan'
  details: { type: String, default: '' },          // human-readable extra info shown in history
  status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
  date: { type: Date, default: Date.now }
});

const withdrawalRequestSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  method: { type: String, enum: ['bank', 'crypto'], required: true },
  address: { type: String, default: '' },          // crypto address OR formatted bank details
  memo: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  date: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

  balance: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isRestricted: { type: Boolean, default: false },
  tierUpgraded: { type: Boolean, default: false },
  balanceLocked: { type: Boolean, default: false },

  activePlan: {
    planId: { type: String, default: null },
    name: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    investedAmount: { type: Number, default: 0 },
    expectedReturn: { type: Number, default: 0 }
  },

  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },
  referralEarnings: { type: Number, default: 0 },
  totalReferrals: { type: Number, default: 0 },

  transactions: [transactionSchema],
  withdrawalRequests: [withdrawalRequestSchema],
  messages: [messageSchema],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
