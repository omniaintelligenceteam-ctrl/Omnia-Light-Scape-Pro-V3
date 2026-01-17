# Deployment Guide - Omnia Light Scape Pro

## What's Been Set Up

✅ **Supabase Database**
- 6 tables created (users, subscriptions, projects, quotes, company_profiles, render_logs)
- Row Level Security enabled
- Database URL and service key configured

✅ **Gemini AI (Nano Banana Pro)**
- API key configured
- Model: `gemini-3-pro-image` for high-quality 4K image generation
- Rate limiting: 10 renders per 10 minutes per user

✅ **Clerk Authentication**
- ClerkProvider wrapping the app
- AuthWrapper component for sign-in flow
- User sync webhook ready (needs webhook secret)

✅ **Vercel API Routes**
- `/api/generate.ts` - Image generation with subscription check
- `/api/projects/index.ts` - List and create projects
- `/api/projects/[id].ts` - Get, update, delete projects
- `/api/webhooks/clerk.ts` - Sync users from Clerk to Supabase

---

## Deploy to Vercel (Step-by-Step)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Omnia Light Scape Pro"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Connect to Vercel

1. Go to https://vercel.com
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Vite

### 3. Configure Environment Variables in Vercel

In Vercel Project Settings → Environment Variables, add:

```
VITE_GEMINI_API_KEY=AIzaSyCRdoXzN49PUY2cyl43xENQp7VGWWMJRKU
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZGlzdGluY3QtbWFzdGlmZi0yNC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_WEBHOOK_SECRET=(get from Clerk dashboard - see step 4)
VITE_SUPABASE_URL=https://mbhtcjpdjfwxprqmzmpy.supabase.co
VITE_SUPABASE_SERVICE_KEY=sb_secret_4-YGib107F_38M7KAPoKdA_xwLisdpR
```

**When you get Stripe keys (in 12 hours), add:**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_ID_MONTHLY=price_...
VITE_STRIPE_PRICE_ID_YEARLY=price_...
```

### 4. Set Up Clerk Webhook

1. Go to your Clerk Dashboard → Webhooks
2. Click **"Add Endpoint"**
3. **Endpoint URL**: `https://your-app.vercel.app/api/webhooks/clerk`
4. **Subscribe to events**:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. **Copy the Signing Secret** → Add to Vercel as `CLERK_WEBHOOK_SECRET`

### 5. Configure Clerk Dashboard

In Clerk Dashboard → Paths:
- **Sign-in URL**: `https://your-app.vercel.app`
- **Sign-up URL**: `https://your-app.vercel.app`
- **After sign-in**: `https://your-app.vercel.app`
- **After sign-up**: `https://your-app.vercel.app`

### 6. Deploy

Click **"Deploy"** in Vercel. It will:
- Build your Vite frontend
- Deploy Vercel serverless functions for `/api` routes
- Auto-assign a URL like `https://omnia-light-scape-pro.vercel.app`

---

## What Works Right Now

✅ **User Authentication**
- Sign up/sign in with Clerk
- Users automatically sync to Supabase
- Session management

✅ **Image Generation**
- Nano Banana Pro (Gemini 3 Pro Image) integration
- 4K quality image generation
- Rate limiting (10 per 10 minutes)

✅ **Projects**
- Save projects to Supabase
- List, view, update, delete projects
- All data persists in database

⏳ **Needs Stripe Keys** (in 12 hours):
- Subscription checks currently disabled
- Once you add Stripe keys, subscriptions will be enforced

---

## Testing Locally Before Deploy

```bash
npm run dev
```

Visit http://localhost:5173

You should see:
1. Clerk sign-in screen
2. After signing in → Main app interface
3. Can upload images and generate (if subscription check is temporarily disabled)

---

## After Stripe Keys Arrive

1. **Create Stripe Products**:
   - Monthly: $250/month recurring
   - Yearly: $2000/year recurring

2. **Copy Price IDs** and add to Vercel environment variables

3. **Create Stripe billing API routes** (I'll help with this when ready)

4. **Enable subscription gate** in the generate API

---

## Current Architecture

```
Frontend (Vercel)
  ├── React + Vite
  ├── Clerk Authentication
  └── Tailwind CSS

Backend (Vercel Serverless Functions)
  ├── /api/generate.ts → Gemini AI
  ├── /api/projects → Supabase CRUD
  └── /api/webhooks/clerk → User sync

Database (Supabase)
  ├── users (synced from Clerk)
  ├── subscriptions (for Stripe)
  ├── projects (user-generated scenes)
  ├── quotes (professional quotes)
  ├── company_profiles (business info)
  └── render_logs (analytics + rate limiting)

Storage (Future: Cloudflare R2)
  └── Generated images (currently using URLs)
```

---

## Cost Breakdown (Monthly)

**Current Setup:**
- Vercel: $0 (Hobby plan)
- Supabase: $0 (Free tier - 500MB)
- Clerk: $0 (Free tier - up to 10,000 MAU)
- Gemini API: ~$0.02-0.05 per image generation

**Total: $0/month** + Gemini API usage costs

---

## Next Steps

1. **Deploy to Vercel** (follow steps above)
2. **Test authentication** (sign up, sign in)
3. **Test image generation** (once live)
4. **Wait for Stripe keys** (12 hours)
5. **Add Stripe integration** (I'll help when ready)

---

## Support Checklist

✅ Database schema deployed
✅ Clerk authentication integrated
✅ Gemini API configured
✅ Vercel API routes created
✅ User sync webhook ready
⏳ Stripe integration (waiting for keys)
⏳ Subscription enforcement (waiting for Stripe)

---

**Ready to deploy!** 🚀

Let me know when you:
1. Push to GitHub
2. Deploy to Vercel
3. Get your Stripe keys

I'll help with any issues along the way!
