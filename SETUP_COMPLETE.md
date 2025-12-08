# Complete Setup Guide - Synapse OS

## ✅ What You Already Have

Your app is already built and ready! You just need to configure it.

---

## 📋 Step-by-Step Setup

### 1. **Install Node.js** (if not already installed)

**Check if installed:**
```powershell
node --version
npm --version
```

**If not installed:**
- Download from: https://nodejs.org/
- Install the LTS version (v18 or higher)
- Restart your terminal after installation

---

### 2. **Install Dependencies**

Open terminal in your project folder:
```powershell
cd C:\Users\2010n\OneDrive\Desktop\random\synapse-os\app
npm install
```

This installs all required packages (Next.js, Supabase, etc.)

---

### 3. **Set Up Supabase** (Database + Auth)

#### Option A: Use Existing Supabase Project

1. Go to https://supabase.com
2. Sign in to your account
3. Open your project (or create a new one)
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon Key** (found in Settings → API)

#### Option B: Create New Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in:
   - Name: `synapse-os`
   - Database Password: (create a strong password)
   - Region: Choose closest to you
4. Wait for project to be created (2-3 minutes)
5. Copy the **Project URL** and **Anon Key**

---

### 4. **Run Database Migration**

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of: `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

This creates all the tables your app needs!

---

### 5. **Create Environment Variables**

Create a file called `.env.local` in the `synapse-os/app` folder:

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For advanced features
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=sk-your-key-here
```

**How to get these values:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Found in Supabase → Settings → API → Project API keys → `anon` `public`
- `SUPABASE_SERVICE_ROLE_KEY`: Same page, `service_role` key (keep secret!)
- `OPENAI_API_KEY`: Only needed if you want advanced AI features (optional)

---

### 6. **Configure Supabase Auth**

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add these URLs to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://your-app.vercel.app/auth/callback
   ```
3. Add to **Site URL**:
   ```
   http://localhost:3000
   ```

---

### 7. **Test Locally**

```powershell
npm run dev
```

Then open: http://localhost:3000

**What to test:**
- ✅ Sign up a new account
- ✅ Log in
- ✅ Navigate to Dashboard
- ✅ Click "Nexus" in sidebar
- ✅ Try asking a question in Nexus
- ✅ Add an item in Tracker
- ✅ Generate a suggestion

---

### 8. **Deploy to Vercel** (Production)

#### Step 1: Push to GitHub

```powershell
# If you haven't already
git add .
git commit -m "Ready for production"
git push origin main
```

#### Step 2: Deploy on Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Vercel will auto-detect Next.js
6. **Add Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` = (your Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key - optional)
7. Click **Deploy**

#### Step 3: Update Supabase Auth URLs

After Vercel gives you a URL (like `https://your-app.vercel.app`):

1. Go back to Supabase → Authentication → URL Configuration
2. Add to **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   ```
3. Update **Site URL** to:
   ```
   https://your-app.vercel.app
   ```

---

## 🎯 Quick Checklist

- [ ] Node.js installed (v18+)
- [ ] Dependencies installed (`npm install`)
- [ ] Supabase project created
- [ ] Database migration run (SQL file executed)
- [ ] `.env.local` file created with Supabase keys
- [ ] Supabase auth URLs configured
- [ ] Local test successful (`npm run dev`)
- [ ] Code pushed to GitHub
- [ ] Vercel deployment created
- [ ] Environment variables added to Vercel
- [ ] Production Supabase URLs updated

---

## 🚨 Common Issues & Fixes

### Issue: "Module not found"
**Fix:** Run `npm install` again

### Issue: "Supabase connection error"
**Fix:** Check your `.env.local` file has correct keys

### Issue: "Database error"
**Fix:** Make sure you ran the SQL migration in Supabase

### Issue: "Authentication not working"
**Fix:** Check Supabase → Authentication → URL Configuration has correct URLs

### Issue: "Build fails on Vercel"
**Fix:** Make sure all environment variables are set in Vercel dashboard

---

## 📦 What Gets Installed

When you run `npm install`, these are the main packages:

- **Next.js 14** - React framework
- **Supabase** - Database & auth
- **Tailwind CSS** - Styling
- **Shadcn/UI** - UI components
- **Zustand** - State management
- **TypeScript** - Type safety
- **All Nexus dependencies** - Already included!

---

## 🎉 You're Done!

Once setup is complete:
- ✅ App runs locally at `http://localhost:3000`
- ✅ App runs in production at `https://your-app.vercel.app`
- ✅ All features work (Nexus, Tracker, Analytics, etc.)
- ✅ Authentication works
- ✅ Database is connected

**No additional downloads needed!** Everything is included in `npm install`.

---

## 🆘 Need Help?

If something doesn't work:
1. Check the error message
2. Verify environment variables are correct
3. Make sure database migration ran successfully
4. Check Supabase dashboard for any errors
5. Try `npm run build` to see if there are build errors

