# Omnia Light Scape Pro - Implementation Guide

## 🎯 Project Overview

Transform Omnia Light Scape Pro into a production-ready SaaS platform for landscape lighting professionals.

**Business Model**: Premium B2B subscription
- **Monthly**: $250/month
- **Yearly**: $2,000/year (save $1,000)
- **Offering**: Unlimited AI-powered night scene renders with professional quote generation

## ✅ Phase 1: Security Hardening (COMPLETED)

- ✅ Created `.env.example` template
- ✅ Updated `.gitignore` to exclude sensitive files
- ✅ Deleted `local-backup/` folder with exposed credentials
- ✅ Created `.env` for local development

## 🚨 URGENT: Required Actions (YOU MUST DO)

### 1. Revoke Exposed API Key (DO THIS NOW!)
- Go to: https://aistudio.google.com/app/apikey
- Find and delete key: `AIzaSyDqMYOdWHAH2shUysqNluJlOy6GNZjFteA`
- Generate NEW API key
- Add to `.env`: `VITE_GEMINI_API_KEY=your_new_key_here`

### 2. Sign Up for Required Services (15-20 minutes)

#### Clerk (Authentication)
1. Go to: https://clerk.com
2. Create account → New application
3. Copy **Publishable Key** (pk_test_...)
4. Add to `.env`: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`

#### Stripe (Payments)
1. Go to: https://stripe.com
2. Enable **Test Mode** toggle (top right)
3. Go to Products → Add Product:
   - **Product 1**: "Omnia Pro Monthly"
     - Price: $250/month recurring
     - Copy Price ID → Add to `.env`: `VITE_STRIPE_PRICE_ID_MONTHLY=price_...`
   - **Product 2**: "Omnia Pro Yearly"
     - Price: $2000/year recurring
     - Copy Price ID → Add to `.env`: `VITE_STRIPE_PRICE_ID_YEARLY=price_...`
4. Go to Developers → API Keys
5. Copy **Publishable Key** (pk_test_...)
6. Add to `.env`: `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`

#### Supabase (Database)
1. Go to: https://supabase.com
2. New Project → Choose name and password
3. Wait for database to provision (~2 minutes)
4. Copy **Project URL** and **Service Role Key**
5. Save for backend setup later

#### Cloudflare R2 (Image Storage)
1. Go to: https://cloudflare.com
2. R2 Object Storage → Create Bucket
3. Name: `omnia-images-production`
4. Generate API Token (permissions: Object Read & Write)
5. Copy: Account ID, Access Key ID, Secret Access Key
6. Save for backend setup later

## 📁 Current Project Structure

```
Omnia-Light-Scape-Pro-V3/
├── .env                    ✅ Created (not committed)
├── .env.example            ✅ Created (template)
├── .gitignore              ✅ Updated (protects secrets)
├── App.tsx                 (Main app - 1208 lines)
├── components/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── ImageUpload.tsx
│   ├── QuoteView.tsx
│   └── SettingsView.tsx
├── services/
│   └── geminiService.ts    (Current: Direct API calls)
├── types.ts
├── constants.ts
└── package.json
```

## 🏗️ Next Implementation Phases

### Phase 2: Backend Infrastructure (Week 1)
**Create separate repository**: `omnia-backend`

**Directory Structure**:
```
omnia-backend/
├── src/
│   ├── server.ts           # Express app entry
│   ├── middleware/
│   │   ├── auth.ts         # Clerk JWT verification
│   │   └── rateLimiter.ts  # 10 renders per 10 min
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── billing.routes.ts
│   │   ├── projects.routes.ts
│   │   └── gemini.routes.ts
│   ├── services/
│   │   ├── geminiService.ts   # Proxy to Gemini API
│   │   ├── stripeService.ts   # Checkout + portal
│   │   └── storageService.ts  # R2 image upload
│   └── controllers/
├── package.json
└── .env
```

### Phase 3: Clerk Authentication (Week 2, Days 1-3)
**Frontend Changes**:
- Wrap app in `<ClerkProvider>`
- Create `AuthWrapper.tsx` component
- Remove `LoginScreen.tsx`
- Use `useUser()` hook

**Backend Changes**:
- Implement Clerk webhook handler
- Sync users to database

### Phase 4: Stripe Payments (Week 2, Days 4-7)
**Frontend Changes**:
- Create `hooks/useBilling.ts`
- Update `Pricing.tsx` component
- Add subscription gate modal

**Backend Changes**:
- Implement Stripe checkout session
- Implement Stripe webhook handler
- Handle subscription lifecycle

### Phase 5: Persistent Storage (Week 3)
**Backend Changes**:
- Implement R2 image upload service
- Create projects CRUD API
- Create quotes CRUD API

**Frontend Changes**:
- Create `hooks/useProjects.ts`
- Replace in-memory state with API calls
- Migrate from `useState` to API-backed storage

### Phase 6: Code Refactoring (Week 4)
- Split `App.tsx` (1208 lines) into smaller components
- Extract hooks: `useGeminiGeneration.ts`, `useFixtureConfig.ts`
- Create `services/promptBuilder.ts`
- Improve TypeScript types (remove `any`)
- Migrate Tailwind from CDN to build-time

### Phase 7: Deployment (Week 4-5)
- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Railway
- **Database**: Supabase (already hosted)
- Configure webhooks (Clerk + Stripe)

### Phase 8: Testing & Launch (Week 5)
- Security audit
- Functional testing
- Performance testing
- Launch to beta users

## 💰 Business Metrics

**Break-Even**: 4 monthly subscribers ($1,000/month revenue)

**Revenue Scenarios**:
- **10 users**: $2,500/month - $1,200 costs = **$1,300 profit** (52% margin)
- **50 users**: $12,500/month - $3,000 costs = **$9,500 profit** (76% margin)
- **100 users**: $25,000/month - $5,000 costs = **$20,000 profit** (80% margin)

**Yearly Subscriptions**: $2,000 upfront provides instant cash flow!

## 🎯 Target Market

**Primary**: Landscape lighting contractors and designers who need to:
- Visualize lighting designs for client proposals
- Generate professional quotes quickly
- Save and manage multiple projects
- Win more $5,000-$10,000+ lighting contracts

**Value Proposition**: At $250/month, if the tool helps close just ONE additional lighting project per year, it pays for itself 20-40x over.

## 📝 Development Checklist

### Immediate (Today)
- [ ] Revoke old Gemini API key
- [ ] Generate new Gemini API key
- [ ] Sign up for Clerk
- [ ] Sign up for Stripe (test mode)
- [ ] Create Stripe products ($250/month, $2000/year)
- [ ] Add all keys to `.env` file

### Week 1 (Backend Setup)
- [ ] Create `omnia-backend` GitHub repository
- [ ] Initialize Node.js + TypeScript project
- [ ] Set up Express server with routes
- [ ] Create Supabase database schema
- [ ] Implement authentication middleware

### Week 2 (Auth + Payments)
- [ ] Integrate Clerk on frontend
- [ ] Implement Clerk webhook (backend)
- [ ] Implement Stripe checkout flow
- [ ] Implement Stripe webhook handler
- [ ] Add subscription gate modal

### Week 3 (Storage)
- [ ] Set up Cloudflare R2 bucket
- [ ] Implement image upload service
- [ ] Create projects API endpoints
- [ ] Create quotes API endpoints
- [ ] Migrate frontend to use API

### Week 4 (Refactor + Deploy)
- [ ] Refactor App.tsx into smaller components
- [ ] Extract custom hooks
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure production webhooks

### Week 5 (Launch)
- [ ] Security audit
- [ ] End-to-end testing
- [ ] Beta launch
- [ ] Monitor usage and costs

## 🔗 Useful Links

- **Plan Document**: `C:\Users\default.DESKTOP-ON29PVN\.claude\plans\humble-prancing-valley.md`
- **Clerk Docs**: https://clerk.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2

## 🆘 Support

If you encounter issues during implementation, refer to:
1. The detailed plan document (humble-prancing-valley.md)
2. Official documentation for each service
3. Phase-specific instructions in the plan

---

**Next Step**: Complete the "URGENT: Required Actions" section above, then we'll move to Phase 2 (Backend Infrastructure).
