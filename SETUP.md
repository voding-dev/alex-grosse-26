# Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize Convex:**
   ```bash
   npx convex dev
   ```
   Follow the prompts to sign in or create an account. This will:
   - Create a `.convex` folder
   - Generate Convex configuration
   - Give you a deployment URL (set as `NEXT_PUBLIC_CONVEX_URL`)

3. **Set up environment variables:**
   Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_CONVEX_URL` - from Convex dashboard

4. **Create admin user:**
   In Convex dashboard → Data → Run query:
   ```javascript
   await ctx.db.insert("users", {
     name: "Your Name",
     email: "your@email.com",
     role: "admin",
     createdAt: Date.now(),
   });
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

## Authentication Setup

Convex auth supports passkey or email link authentication. Configure in your Convex dashboard:

1. Go to Settings → Authentication
2. Enable your preferred auth method
3. Make sure your email matches the admin user you created

## Storage

All files are stored using Convex Storage, which is built-in and requires no additional configuration. Files uploaded through the admin dashboard are automatically stored and accessible via Convex storage URLs.

## Testing the Delivery Portal

1. Create a delivery portal via the admin dashboard
2. Visit the delivery portal link: `http://localhost:3000/dl/[slug]`
3. Enter the PIN you configured for the delivery
4. Browse assets, leave feedback, test downloads

Note: PINs are randomly generated for security. Never use hardcoded PINs in production.

## Next Steps

- Upload real assets via admin dashboard
- Configure Stripe links per-page in Settings
- Customize branding and copy
- Deploy to Vercel


