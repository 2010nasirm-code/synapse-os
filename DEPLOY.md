# 🚀 Deploy Synapse OS

## Step 1: Setup Supabase (5 min)

1. Go to [supabase.com](https://supabase.com) → Create account
2. Click **New Project**
3. Copy your credentials from **Settings → API**:
   - Project URL
   - anon public key

4. Go to **SQL Editor** → Paste contents of `supabase/migrations/001_initial_schema.sql` → Run

5. Enable **Authentication** → Providers → Enable Email

---

## Step 2: Deploy to Vercel (3 min)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub

2. Click **Add New Project** → Import your repo

3. Set **Root Directory** to: `synapse-os/app`

4. Add **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL = your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
   NEXT_PUBLIC_BETA_MODE = true
   CRON_SECRET = generate_random_string_here
   ```

5. Click **Deploy** ✅

---

## Step 3: Configure Supabase for Production

In Supabase dashboard:

1. **Authentication → URL Configuration**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

2. **Authentication → Email Templates** (optional):
   - Customize welcome emails

---

## 🎉 You're Live!

Your app is now at: `https://your-app.vercel.app`

### Monitor Your App:
- **Health Check**: `https://your-app.vercel.app/api/health`
- **Vercel Dashboard**: View logs, analytics, errors
- **Supabase Dashboard**: View database, users, API usage

### Collect Feedback:
- Users can click the 💬 feedback button (bottom-right)
- View feedback in Supabase → `analytics_events` table → filter by `event_type = 'beta_feedback'`

---

## Quick Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```


