# Quick Setup

## 1. Install
```bash
npm install
```

## 2. Create `.env.local` file
Copy this into a new file called `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_BETA_MODE=true
```

## 3. Run
```bash
npm run dev
```

Open http://localhost:3000

---

## Get Supabase Keys

1. Go to https://supabase.com → Create free account
2. Create new project
3. Go to Settings → API
4. Copy "Project URL" → paste as `NEXT_PUBLIC_SUPABASE_URL`
5. Copy "anon public" key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Done! 🚀


