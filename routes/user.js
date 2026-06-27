const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

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
    totalReferrals: user.totalReferrals,
    transactions: user.transactions,
    withdrawalRequests: user.withdrawalRequests,
    messages: user.messages
  };
}

// GET /api/user/me
router.get('/me', auth, async (req, res) => {
  res.json(publicUser(req.user));
});

// PATCH /api/user/profile — update name, email, phone, dob, country, address
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, email, phone, dob, country, address } = req.body;
    const user = req.user;

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (phone !== undefined) user.phone = phone;
    if (dob !== undefined) user.dob = dob;
    if (country !== undefined) user.country = country;
    if (address !== undefined) user.address = address;

    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error updating profile.' });
  }
});

// POST /api/user/deposit — create a pending deposit request
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, method, details } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ msg: 'Enter a valid amount.' });

    req.user.transactions.push({
      type: 'Deposit',
      amount: Number(amount),
      method: method || '',
      details: details || '',
      status: 'pending'
    });
    await req.user.save();

    res.status(201).json({ msg: 'Deposit request submitted. Awaiting admin confirmation.', user: publicUser(req.user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error creating deposit.' });
  }
});

// POST /api/user/withdraw — create a pending withdrawal request (deducts balance immediately, refunded on rejection)
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, method, address, memo } = req.body;
    const user = req.user;

    if (user.balanceLocked) return res.status(403).json({ msg: 'Your balance is locked. Upgrade your tier to continue.' });
    if (!amount || amount <= 0) return res.status(400).json({ msg: 'Enter a valid amount.' });
    if (!['bank', 'crypto'].includes(method)) return res.status(400).json({ msg: 'Invalid withdrawal method.' });
    if (amount > user.balance) return res.status(400).json({ msg: 'Insufficient balance.' });

    const fee = Math.round(amount * 0.02 * 100) / 100; // 2% fee, adjust as needed
    const netAmount = Math.round((amount - fee) * 100) / 100;

    user.balance -= amount;
    user.withdrawalRequests.push({
      amount, fee, netAmount, method,
      address: address || '', memo: memo || '',
      status: 'pending'
    });
    user.transactions.push({
      type: 'Withdrawal',
      amount,
      method,
      details: `Fee: $${fee.toFixed(2)} · Net: $${netAmount.toFixed(2)}`,
      status: 'pending'
    });

    await user.save();
    res.status(201).json({ msg: 'Withdrawal request submitted.', user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error creating withdrawal.' });
  }
});

// POST /api/user/upgrade-tier — clears balanceLocked flag (e.g. after a fee payment flow)
router.post('/upgrade-tier', auth, async (req, res) => {
  try {
    req.user.tierUpgraded = true;
    req.user.balanceLocked = false;
    await req.user.save();
    res.json({ msg: 'Tier upgraded.', user: publicUser(req.user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error upgrading tier.' });
  }
});

// POST /api/user/invest — purchase an investment plan
router.post('/invest', auth, async (req, res) => {
  try {
    const { planId, planName, amount, durationDays, expectedReturn } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) return res.status(400).json({ msg: 'Enter a valid amount.' });
    if (amount > user.balance) return res.status(400).json({ msg: 'Insufficient balance.' });

    user.balance -= amount;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (Number(durationDays) || 7) * 24 * 60 * 60 * 1000);

    user.activePlan = {
      planId, name: planName, startDate, endDate,
      investedAmount: amount, expectedReturn: expectedReturn || 0
    };

    user.transactions.push({
      type: 'Plan',
      amount,
      method: planName,
      details: `${durationDays || 7} day plan`,
      status: 'completed'
    });

    await user.save();
    res.status(201).json({ msg: 'Investment successful.', user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error processing investment.' });
  }
});

// POST /api/user/message — send a message to admin/support
router.post('/message', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ msg: 'Subject and message are required.' });

    req.user.messages.push({ subject, message });
    await req.user.save();
    res.status(201).json({ msg: 'Message sent to admin.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error sending message.' });
  }
});

module.exports = router;
