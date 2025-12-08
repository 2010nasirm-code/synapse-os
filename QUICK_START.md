# 🚀 Quick Start Guide - Synapse OS

## ✅ What You Already Have Installed

- ✅ Node.js v24.11.1
- ✅ npm v11.6.2
- ✅ All code is ready!

**You don't need to download anything else!**

---

## 📝 Setup Steps (5 minutes)

### Step 1: Install Dependencies

```powershell
cd C:\Users\2010n\OneDrive\Desktop\random\synapse-os\app
npm install
```

This downloads all required packages (Next.js, Supabase, etc.)

---

### Step 2: Get Supabase Keys

1. Go to https://supabase.com
2. Sign in (or create free account)
3. Open your project (or create new one)
4. Go to **Settings** → **API**
5. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

### Step 3: Create `.env.local` File

In the `synapse-os/app` folder, create a file named `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace with your actual values from Step 2!**

---

### Step 4: Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open file: `supabase/migrations/001_initial_schema.sql`
4. Copy ALL the SQL code
5. Paste into Supabase SQL Editor
6. Click **Run**
7. Should see: "Success. No rows returned" ✅

---

### Step 5: Configure Auth URLs

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   ```
3. Set **Site URL** to:
   ```
   http://localhost:3000
   ```

---

### Step 6: Run the App!

```powershell
npm run dev
```

Open: **http://localhost:3000**

---

## 🎯 Test It Works

1. Click **"Get Started"** or **"Sign In"**
2. Create an account
3. You should see the Dashboard
4. Click **"Nexus"** in the sidebar (second item)
5. Try asking: "What should I focus on today?"

---

## 🌐 Deploy to Vercel (Production)

### 1. Push to GitHub

```powershell
git add .
git commit -m "Ready for production"
git push origin main
```

### 2. Deploy on Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **"Add New Project"**
4. Import your repository
5. **Add Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` = (your Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)
6. Click **Deploy**

### 3. Update Supabase URLs

After Vercel gives you a URL:

1. Supabase → **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   ```
3. Update **Site URL**:
   ```
   https://your-app.vercel.app
   ```

---

## ✅ Checklist

- [ ] `npm install` completed
- [ ] Supabase project created
- [ ] `.env.local` file created with keys
- [ ] Database migration run (SQL executed)
- [ ] Auth URLs configured
- [ ] `npm run dev` works
- [ ] Can sign up and log in
- [ ] Nexus page loads

---

## 🆘 Troubleshooting

**"Cannot find module"**
→ Run `npm install` again

**"Supabase connection error"**
→ Check `.env.local` has correct keys

**"Database error"**
→ Make sure SQL migration ran successfully

**"Authentication error"**
→ Check Supabase auth URLs are configured

---

## 📦 What's Included

Everything is already in the code:
- ✅ Next.js framework
- ✅ Supabase integration
- ✅ Nexus AI system
- ✅ All UI components
- ✅ Database schema
- ✅ Authentication
- ✅ All features

**No extra downloads needed!** Just configure Supabase and you're ready! 🎉


