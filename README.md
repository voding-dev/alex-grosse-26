# IanCourtright.com — Portfolio + Booking + Delivery

A minimalist, fast portfolio site with booking integration and secure client delivery portals.

## Features

- **Portfolio**: Showcase photo, video, and design work with category filtering
- **Booking**: Integrated Cal.com scheduling and Stripe payment links
- **Client Delivery**: PIN-gated delivery portals with feedback and download capabilities
- **Admin Dashboard**: Manage projects, assets, and deliveries

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + TailwindCSS
- **Backend**: Convex (database, auth, server functions)
- **Storage**: Convex Storage (built-in file storage)
- **UI Components**: shadcn/ui + Radix UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account (free tier works)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Convex:**
   ```bash
   npx convex dev
   ```
   This will create a `convex` folder and prompt you to sign in/create an account.

3. **Configure environment variables:**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_CONVEX_URL=your-convex-url
   ```

4. **Seed the database (development only):**
   ```bash
   npx convex run seed
   ```
   This creates 3 sample projects and sample delivery portals with randomly generated PINs.
   Note: Seed functions are disabled in production for security.

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Set up admin authentication:**
   - Sign in with Convex auth (passkey or email link)
   - Create an admin user in Convex dashboard:
     ```javascript
     // In Convex dashboard → Data → Run query
     await ctx.db.insert("users", {
       name: "Your Name",
       email: "your@email.com",
       role: "admin",
       createdAt: Date.now(),
     });
     ```

## How to Ship a Delivery in 5 Minutes

1. **Create/Edit Project** (`/admin/projects`):
   - Add project details (title, client name, categories)
   - Upload assets or link existing assets

2. **Create Delivery** (`/admin/projects/[id]`):
   - Click "Create Delivery"
   - Enter a secure PIN (randomly generated recommended)
   - Select which assets to include
   - Toggle watermark and ZIP download options

3. **Share Link**:
   - Copy the delivery link: `/dl/[slug]`
   - Send to client with PIN (securely, not in plaintext)
   - Link format: `https://yourdomain.com/dl/wedding-sarah-john-delivery?pin=XXXX`

4. **Client Experience**:
   - Client visits link, enters PIN
   - Views assets, leaves feedback
   - Downloads files when approved

5. **Admin Review**:
   - Check feedback in project dashboard
   - Mark assets as approved when ready
   - Enable final downloads

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard routes
│   ├── dl/                # Client delivery portals
│   ├── photo/             # Photo category gallery
│   ├── video/             # Video category gallery
│   ├── design/            # Design category gallery
│   └── project/           # Project case studies
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── convex/                # Convex backend
│   ├── schema.ts          # Database schema
│   ├── projects.ts        # Project functions
│   ├── assets.ts          # Asset functions
│   ├── deliveries.ts      # Delivery functions
│   ├── feedback.ts        # Feedback functions
│   └── storage.ts         # Signed URL generation
└── lib/                   # Utilities
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | Yes |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Convex Deployment

```bash
npx convex deploy
```

## Storage

All files are stored using Convex Storage, which is built-in and requires no additional configuration. Files are automatically uploaded and accessible via Convex storage URLs.

## Security Notes

- Admin routes are protected by Convex auth
- Delivery PINs are hashed with bcrypt
- Files are stored securely in Convex Storage
- No client accounts required — just PIN access

## Performance

- Lighthouse target: ≥95
- Image optimization via Next.js Image
- Lazy loading for galleries
- Aggressive caching on public pages

## License

Private project — All rights reserved
