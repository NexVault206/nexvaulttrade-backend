# NexVaultTrade — Full Stack Deployment Guide

**Status:** All 14 pages fully wired to real Express/MongoDB backend. Ready for production deployment on Render.

---

## Architecture Overview

### Frontend (Static HTML/CSS/JS)
- **14 Pages:** index, login, createaccount, deposit, withdraw, dashboard, plans, actions, history, profile, admin, contact, services, aboutus
- **Auth:** JWT stored in localStorage (`nvt_token` for users, `nvt_adminToken` for admin)
- **API Client:** `api-config.js` — global fetch helpers with auto-token injection
- **Real API Calls:** All forms and buttons now hit the actual backend (no mock localStorage data)

### Backend (Express + MongoDB)
- **Database:** MongoDB Atlas (cloud-hosted)
- **Auth Routes:**
  - `POST /api/auth/signup` — User registration with referral support
  - `POST /api/auth/login` — User login
  - `POST /api/auth/admin-login` — Admin login (email: `oyeladetowobola@gmail.com`, password: `kamala Harris`)
  
- **User Routes** (require auth token):
  - `GET /api/user/me` — Current user profile
  - `PATCH /api/user/profile` — Update profile
  - `POST /api/user/deposit` — Create deposit request (pending admin approval)
  - `POST /api/user/withdraw` — Create withdrawal request (balance deducted immediately, refunded if rejected)
  - `POST /api/user/invest` — Purchase investment plan
  - `POST /api/user/message` — Send message to admin
  - `POST /api/user/upgrade-tier` — Clear balance lock after tier upgrade

- **Admin Routes** (require admin token):
  - `GET /api/admin/users` — List all users
  - `PATCH /api/admin/users/:userId/balance` — Adjust user balance
  - `PATCH /api/admin/users/:userId/verify` — Verify user KYC
  - `PATCH /api/admin/users/:userId/restrict` — Restrict user account
  - `DELETE /api/admin/users/:userId` — Delete user
  - `PATCH /api/admin/deposits/:userId/:txId/approve` — Approve deposit (credits balance)
  - `PATCH /api/admin/deposits/:userId/:txId/reject` — Reject deposit
  - `GET /api/admin/withdrawals` — List all pending withdrawals
  - `PATCH /api/admin/withdrawals/:id/approve` — Approve withdrawal
  - `PATCH /api/admin/withdrawals/:id/reject` — Reject withdrawal (refunds balance)
  - `GET /api/admin/messages` — List all user messages

---

## Deployment Steps

### Step 1: Deploy Backend to Render

1. **Create a Render account** if you don't have one (https://render.com)

2. **Push backend to GitHub** (or any Git provider):
   ```bash
   cd nvt-backend
   git init
   git add .
   git commit -m "Initial backend commit"
   # Create a new GitHub repo and push
   git remote add origin https://github.com/YOUR_USERNAME/nexvaulttrade-backend.git
   git push -u origin main
   ```

3. **Create MongoDB Atlas cluster** (free tier available):
   - Go to https://www.mongodb.com/cloud/atlas
   - Create cluster in same region as Render for speed
   - Create database user and get connection string:
     ```
     mongodb+srv://username:password@cluster.mongodb.net/nexvaulttrade?retryWrites=true&w=majority
     ```

4. **Create Render Web Service**:
   - Go to Render dashboard, click "New +" → "Web Service"
   - Connect your GitHub repo (`nexvaulttrade-backend`)
   - **Name:** `nexvaulttrade-backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (sufficient for demo; upgrade to paid for production)
   - Add environment variables:
     ```
     MONGO_URI = mongodb+srv://username:password@cluster.mongodb.net/nexvaulttrade?retryWrites=true&w=majority
     JWT_SECRET = your-long-random-secret-here-use-32-chars-minimum
     ADMIN_EMAIL = oyeladetowobola@gmail.com
     ADMIN_PASSWORD = kamala Harris
     PORT = (Render sets this automatically)
     CORS_ORIGINS = https://nexvaulttrade-frontend.onrender.com
     ```
   - Click "Create Web Service"
   - **Wait 2-5 minutes** for deployment. You'll get a URL like: `https://nexvaulttrade-backend.onrender.com`

5. **Verify backend is running**:
   ```bash
   curl https://nexvaulttrade-backend.onrender.com/api/health
   # Should return: {"status":"ok","time":"..."}
   ```

6. **Test admin login** (manually in browser console or Postman):
   ```bash
   POST https://nexvaulttrade-backend.onrender.com/api/auth/admin-login
   Body: {"email": "oyeladetowobola@gmail.com", "password": "kamala Harris"}
   # Should return JWT token
   ```

---

### Step 2: Update Frontend API URLs & Deploy

1. **Update `api-config.js`** in your frontend folder:
   ```javascript
   const API_BASE = 'https://nexvaulttrade-backend.onrender.com/api';
   ```

2. **Push frontend to GitHub**:
   ```bash
   cd nvt-frontend
   git init
   git add .
   git commit -m "Initial frontend commit - all 14 pages wired to real API"
   git remote add origin https://github.com/YOUR_USERNAME/nexvaulttrade-frontend.git
   git push -u origin main
   ```

3. **Deploy frontend static site to Render**:
   - In Render dashboard, click "New +" → "Static Site"
   - Connect your GitHub repo (`nexvaulttrade-frontend`)
   - **Name:** `nexvaulttrade-frontend`
   - **Build Command:** Leave empty (no build step needed)
   - **Publish Directory:** `.` (root, since HTML files are in root)
   - Click "Create Static Site"
   - **Wait 1-2 minutes** for deployment. You'll get a URL like: `https://nexvaulttrade-frontend.onrender.com`

4. **Update backend `CORS_ORIGINS`** in Render environment variables:
   - Go to backend service settings
   - Update `CORS_ORIGINS` to include your frontend URL:
     ```
     CORS_ORIGINS = https://nexvaulttrade-frontend.onrender.com
     ```
   - Render auto-restarts on env var changes

---

### Step 3: Test Full Flow

1. **Open frontend**: https://nexvaulttrade-frontend.onrender.com
2. **Click "Create Account"** → fill form → sign up (creates user in MongoDB)
3. **Login** with your new account (gets JWT token)
4. **Go to Dashboard** → see balance = $0 (starting state)
5. **Go to Deposits** → submit deposit request → shows as "pending" in your history
6. **Login to Admin Panel** (https://nexvaulttrade-frontend.onrender.com/nexvaulttrade_admin.html):
   - Email: `oyeladetowobola@gmail.com`
   - Password: `kamala Harris`
7. **Go to "Deposits" tab** → find your pending deposit → click "✓ Approve"
   - User's balance updates automatically
8. **Go back to user dashboard** → balance now shows the deposited amount ✓

---

## Page-by-Page Integration Status

| Page | Auth Required | API Calls | Status |
|------|---------------|-----------|--------|
| `index.html` | ❌ | None (marketing) | ✅ Updated branding |
| `login.html` | ❌ | `POST /api/auth/login` | ✅ Real auth |
| `createaccount.html` | ❌ | `POST /api/auth/signup` | ✅ Real registration |
| `contact.html` | ❌ | None | ✅ Static page |
| `services.html` | ❌ | None | ✅ Updated branding |
| `aboutus.html` | ❌ | None | ✅ Updated branding |
| `dashboard.html` | ✅ | `GET /api/user/me` | ✅ Real data |
| `deposit.html` | ✅ | `POST /api/user/deposit` | ✅ Real requests |
| `withdraw.html` | ✅ | `POST /api/user/withdraw` | ✅ Real requests |
| `plans.html` | ✅ | `POST /api/user/invest` | ✅ Real investments |
| `actions.html` | ✅ | `GET /api/user/me` (referral code) | ✅ Real referrals |
| `history.html` | ✅ | `GET /api/user/me` (transactions) | ✅ Real history |
| `profile.html` | ✅ | `PATCH /api/user/profile` | ✅ Real updates |
| `admin.html` | ✅ (admin) | All admin routes | ✅ Real admin panel |

---

## Key Features Implemented

### User-Facing
- ✅ JWT authentication (signup/login with token storage)
- ✅ Deposit requests (pending admin approval, balance credited on approval)
- ✅ Withdrawals with 2% fee (balance deducted immediately, refunded if rejected)
- ✅ Investment plans (balance debited, plan tracked)
- ✅ Referral codes (each user gets unique code, can track referral count)
- ✅ Transaction history (all deposits/withdrawals/plans tracked)
- ✅ Profile updates (email, phone, address, KYC fields)
- ✅ Message to admin (support tickets)

### Admin-Facing
- ✅ User management (list, verify, restrict, delete, adjust balance)
- ✅ Deposit approval workflow (approve/reject pending deposits)
- ✅ Withdrawal approval workflow (approve/reject, auto-refund on reject)
- ✅ Message inbox (view all user support messages)
- ✅ Real-time data (all changes reflect across user & admin views)

---

## Security Notes

⚠️ **For Production, Add:**
1. **HTTPS only** (Render provides free SSL; set redirect in backend)
2. **Password hashing** (bcryptjs already integrated; all passwords hashed)
3. **Rate limiting** (express-rate-limit already on auth routes; extend to other endpoints)
4. **Input validation** (add joi or express-validator on all user inputs)
5. **Email verification** (send OTP/link on signup; require before balance withdrawal)
6. **2FA on admin login** (totp or SMS)
7. **Audit logging** (log all admin actions to separate collection)
8. **IP whitelisting** (optional; restrict admin panel to known IPs)

---

## Troubleshooting

### Backend won't start on Render
- Check `MONGO_URI` is correct (copy from MongoDB Atlas exactly)
- Check `JWT_SECRET` is set (at least 32 chars recommended)
- View Render logs: Settings → Logs tab

### Frontend can't reach backend
- Open browser DevTools (F12) → Network tab
- Try a login request; inspect network call
- If CORS error, check backend `CORS_ORIGINS` env var matches frontend URL exactly
- Clear browser cache and try again

### Admin login not working
- Ensure backend has `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars set
- First server start auto-creates admin account with those credentials
- Try testing with: `curl -X POST https://nexvaulttrade-backend.onrender.com/api/auth/admin-login -H "Content-Type: application/json" -d '{"email":"oyeladetowobola@gmail.com","password":"kamala Harris"}'`

### User deposits/withdrawals don't update balance
- Check admin approval workflow is being followed
- Admin must click ✓ Approve on the deposit for balance to credit
- Check MongoDB directly to verify transaction is created: ensure MongoDB credentials are correct

---

## Next Steps for Production

1. **Email notifications** (SendGrid/Mailgun for deposit approvals, withdrawal confirmations)
2. **Real payment gateway** (Stripe, PayPal, or crypto payment processor)
3. **KYC/AML compliance** (integrate identity verification service)
4. **Analytics dashboard** (track user metrics, trading volume, top coins)
5. **Mobile app** (React Native or Flutter wrapper)
6. **Trading bots integration** (connect to exchange APIs for real trading)

---

## Support

**Backend repo:** https://github.com/YOUR_USERNAME/nexvaulttrade-backend  
**Frontend repo:** https://github.com/YOUR_USERNAME/nexvaulttrade-frontend  
**Live:** https://nexvaulttrade-frontend.onrender.com

---

**Last updated:** June 19, 2026
