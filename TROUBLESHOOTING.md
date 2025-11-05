# Troubleshooting Guide

## Common Issues

### "Could not find public function"
- Make sure `npx convex dev` is running
- Check that functions are exported correctly
- Wait for Convex to finish bundling

### WebSocket connection failed
- Ensure Convex dev server is running (`npx convex dev`)
- Check `NEXT_PUBLIC_CONVEX_URL` is set in `.env.local`
- Verify port 3210 is not blocked

### Authentication not working
- Create admin user in Convex dashboard
- Ensure Convex auth is configured
- Check email matches in users table

### Storage issues
- All files are stored using Convex Storage (built-in)
- No additional configuration needed
- Files are automatically accessible via Convex storage URLs


