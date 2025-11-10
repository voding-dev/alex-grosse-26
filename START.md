# Quick Start Guide

## To Run the Application

You need **two terminal windows** running simultaneously:

### Terminal 1: Convex Backend
```bash
npx convex dev
```
This will:
- Prompt you to sign in/create Convex account (if first time)
- Start the Convex dev server on port 3210
- Watch for changes and sync your functions

### Terminal 2: Next.js Frontend  
```bash
npm run dev
```
This will:
- Start Next.js dev server on port 3000
- Connect to Convex via WebSocket

## Important Notes

1. **Both servers must be running** - The frontend connects to Convex via WebSocket, so Convex must be running first.

2. **First Time Setup**:
   - Run `npx convex dev` first - it will guide you through account setup
   - You'll get a `NEXT_PUBLIC_CONVEX_URL` that you need to add to `.env.local`
   - After Convex is set up, start Next.js

3. **AWS SDK Issue**: The storage functions use dynamic imports with `"use node"` directive. Convex may show bundling warnings during startup, but these won't affect runtime functionality - the code runs in Node.js where AWS SDK is available.

4. **Environment Variables**: Create `.env.local` with:
   ```
   NEXT_PUBLIC_CONVEX_URL=your-convex-url-from-setup
   ```

## Troubleshooting

- **WebSocket connection failed**: Make sure Convex dev is running in another terminal
- **Still seeing "Loading..."**: Check browser console for errors, ensure Convex is running
- **Bundle errors**: AWS SDK warnings are expected during Convex bundling - they won't affect runtime












