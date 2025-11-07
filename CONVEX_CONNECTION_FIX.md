# Convex Connection Fix Guide

## Issue
Database content is not showing - Convex connection issue.

## Solution

### If Running Locally (Development)

1. **Make sure Convex dev server is running:**
   ```bash
   npx convex dev
   ```
   This should show: "Convex dev server running on http://127.0.0.1:3210"

2. **Verify `.env.local` has:**
   ```
   NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
   ```

3. **Restart your Next.js dev server:**
   ```bash
   npm run dev
   ```

4. **Check browser console** - You should see:
   ```
   [Convex Client] Connecting to: http://127.0.0.1:3210
   [Convex Client] Initialized, checking connection...
   ```

### If Running on Vercel (Production)

1. **Get your production Convex URL:**
   ```bash
   npx convex deploy --dry-run
   ```
   Look for: `NEXT_PUBLIC_CONVEX_URL=https://adjoining-dinosaur-258.convex.cloud`

2. **Set environment variable in Vercel:**
   - Go to your Vercel project dashboard
   - Settings → Environment Variables
   - Add/Update:
     - **Name:** `NEXT_PUBLIC_CONVEX_URL`
     - **Value:** `https://adjoining-dinosaur-258.convex.cloud`
   - Make sure it's set for **Production**, **Preview**, and **Development** environments

3. **Redeploy your Vercel app** after setting the environment variable

4. **Verify deployment:**
   - Check Vercel build logs to ensure the environment variable is set
   - Check browser console on your production site for connection logs

## Current Status

- **Local Dev URL:** `http://127.0.0.1:3210` ✅ (in `.env.local`)
- **Production URL:** `https://adjoining-dinosaur-258.convex.cloud` ⚠️ (needs to be set in Vercel)

## Troubleshooting

### Check if Convex is connected:
1. Open browser console
2. Look for `[Convex Client]` logs
3. If you see errors, check:
   - Is Convex dev server running? (for local)
   - Is the environment variable set correctly?
   - Are there any network errors in the console?

### Common Issues:
- **"NEXT_PUBLIC_CONVEX_URL is not set!"** → Set the environment variable
- **WebSocket connection failed** → Make sure Convex dev server is running (for local)
- **Queries return undefined** → Check if you're using the correct URL (local vs production)

