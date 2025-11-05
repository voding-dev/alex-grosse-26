# Architecture: Projects vs Deliverables

## Key Distinction

**Projects** = Portfolio pieces displayed on the public marketing site
**Deliverables** = Client delivery portals for feedback/work-in-progress (separate system)

## Public Portfolio Site

- **Purpose**: Showcase your best work (like [daniel-clark-cunningham.vercel.app](https://daniel-clark-cunningham.vercel.app))
- **Routes**: `/`, `/project/[slug]`, `/contact`
- **Visibility**: Only projects with status `"approved"` or `"delivered"` appear
- **Features**:
  - Hero section with rotating featured project images
  - Portfolio grid
  - About section
  - Contact form
  - Minimal navigation (menu/contact)

## Admin: Portfolio Projects

- **Location**: `/admin/projects`
- **Purpose**: Manage what appears on your public portfolio
- **Workflow**:
  1. Create project → Status: `draft` (hidden from public)
  2. Add assets (images/videos)
  3. Set status to `approved` → Project appears on public site
  4. Public can view at `/project/[slug]`

## Admin: Client Deliverables (Separate)

- **Location**: `/admin/projects/[id]` → "Create Delivery"
- **Purpose**: Send work-in-progress to clients for feedback
- **Features**:
  - PIN-gated access (`/dl/[slug]?pin=1234`)
  - Client feedback per asset
  - Download functionality
  - Independent of project status
- **Use Case**: Client reviews work before it goes live on portfolio

## Separation Summary

| Feature | Portfolio Projects | Client Deliverables |
|---------|-------------------|---------------------|
| **Access** | Public (after approval) | PIN-protected |
| **Purpose** | Marketing/showcase | Client review/feedback |
| **Route** | `/project/[slug]` | `/dl/[slug]` |
| **Status Control** | Admin sets `approved` | No status dependency |
| **Visibility** | Public portfolio | Private, client-only |

The admin dashboard manages both systems separately:
- **Projects tab**: Control your public portfolio
- **Deliveries**: Create client review portals (doesn't affect public site)
