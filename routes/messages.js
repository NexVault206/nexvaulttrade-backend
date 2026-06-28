const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// User sends message to admin
router.post('/send', async (req, res) => {
  const { subject, message, userEmail } = req.body;
  try {
    await resend.emails.send({
      from: 'noreply@nexvaulttrade.site',
      to: 'nexvaulttrade@gmail.com',
      subject: `[NexVaultTrade] ${subject}`,
      html: `<h3>New message from ${userEmail}</h3><p>${message}</p>`
    });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin replies to user
router.post('/reply', async (req, res) => {
  const { toEmail, message, msgId } = req.body;
  try {
    await resend.emails.send({
      from: 'noreply@nexvaulttrade.site',
      to: toEmail,
      subject: 'Reply from NexVaultTrade Support',
      html: `<h3>Message from NexVaultTrade Admin</h3><p>${message}</p><br><small>NexVaultTrade Support Team</small>`
    });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
