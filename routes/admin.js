const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth, adminOnly);

function publicUser(user) {
  return {
    _id: user._id,
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
    createdAt: user.createdAt
  };
}

// GET /api/admin/users — list all non-admin users (with transactions, for deposits tab too)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    res.json(users.map(publicUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error fetching users.' });
  }
});

// PATCH /api/admin/users/:userId/balance
router.patch('/users/:userId/balance', async (req, res) => {
  try {
    const { balance } = req.body;
    if (typeof balance !== 'number' || balance < 0) return res.status(400).json({ msg: 'Invalid balance.' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    user.balance = balance;
    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error updating balance.' });
  }
});

// PATCH /api/admin/users/:userId/verify
router.patch('/users/:userId/verify', async (req, res) => {
  try {
    const { isVerified } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    user.isVerified = !!isVerified;
    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error updating verification.' });
  }
});

// PATCH /api/admin/users/:userId/restrict
router.patch('/users/:userId/restrict', async (req, res) => {
  try {
    const { restrict } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    user.isRestricted = !!restrict;
    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error updating restriction.' });
  }
});

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found.' });
    res.json({ msg: 'User deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error deleting user.' });
  }
});

// PATCH /api/admin/deposits/:userId/:txId/approve — credits balance, marks completed
router.patch('/deposits/:userId/:txId/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    const tx = user.transactions.id(req.params.txId);
    if (!tx) return res.status(404).json({ msg: 'Transaction not found.' });
    if (tx.type !== 'Deposit') return res.status(400).json({ msg: 'Not a deposit transaction.' });
    if (tx.status !== 'pending') return res.status(400).json({ msg: 'Deposit already processed.' });

    tx.status = 'completed';
    user.balance += tx.amount;
    await user.save();

    res.json({ msg: 'Deposit approved.', user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error approving deposit.' });
  }
});

// PATCH /api/admin/deposits/:userId/:txId/reject
router.patch('/deposits/:userId/:txId/reject', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    const tx = user.transactions.id(req.params.txId);
    if (!tx) return res.status(404).json({ msg: 'Transaction not found.' });
    if (tx.status !== 'pending') return res.status(400).json({ msg: 'Deposit already processed.' });

    tx.status = 'rejected';
    await user.save();

    res.json({ msg: 'Deposit rejected.', user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error rejecting deposit.' });
  }
});

// GET /api/admin/withdrawals — flattened list of all pending withdrawal requests across users
router.get('/withdrawals', async (req, res) => {
  try {
    const users = await User.find({ role: 'user', 'withdrawalRequests.0': { $exists: true } });
    const all = [];
    users.forEach(u => {
      u.withdrawalRequests.forEach(w => {
        if (w.status === 'pending') {
          all.push({
            _id: w._id, userId: u._id, userName: u.name, userEmail: u.email,
            amount: w.amount, fee: w.fee, netAmount: w.netAmount,
            method: w.method, address: w.address, memo: w.memo,
            status: w.status, date: w.date
          });
        }
      });
    });
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error fetching withdrawals.' });
  }
});

// PATCH /api/admin/withdrawals/:id/approve
router.patch('/withdrawals/:id/approve', async (req, res) => {
  try {
    const user = await User.findOne({ 'withdrawalRequests._id': req.params.id });
    if (!user) return res.status(404).json({ msg: 'Withdrawal not found.' });

    const w = user.withdrawalRequests.id(req.params.id);
    if (w.status !== 'pending') return res.status(400).json({ msg: 'Already processed.' });

    w.status = 'approved';
    // also reflect on the matching transaction record, if present
    const tx = user.transactions.find(t => t.type === 'Withdrawal' && t.status === 'pending' && t.amount === w.amount);
    if (tx) tx.status = 'completed';

    await user.save();
    res.json({ msg: 'Withdrawal approved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error approving withdrawal.' });
  }
});

// PATCH /api/admin/withdrawals/:id/reject — refunds balance back to user
router.patch('/withdrawals/:id/reject', async (req, res) => {
  try {
    const user = await User.findOne({ 'withdrawalRequests._id': req.params.id });
    if (!user) return res.status(404).json({ msg: 'Withdrawal not found.' });

    const w = user.withdrawalRequests.id(req.params.id);
    if (w.status !== 'pending') return res.status(400).json({ msg: 'Already processed.' });

    w.status = 'rejected';
    user.balance += w.amount; // refund full original amount

    const tx = user.transactions.find(t => t.type === 'Withdrawal' && t.status === 'pending' && t.amount === w.amount);
    if (tx) tx.status = 'rejected';

    await user.save();
    res.json({ msg: 'Withdrawal rejected. Balance refunded.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error rejecting withdrawal.' });
  }
});

// GET /api/admin/messages — flattened list of all user messages, newest first
router.get('/messages', async (req, res) => {
  try {
    const users = await User.find({ role: 'user', 'messages.0': { $exists: true } });
    const all = [];
    users.forEach(u => {
      u.messages.forEach(m => {
        all.push({
          _id: m._id, userName: u.name, userEmail: u.email,
          subject: m.subject, message: m.message, read: m.read, date: m.date
        });
      });
    });
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error fetching messages.' });
  }
});

module.exports = router;
