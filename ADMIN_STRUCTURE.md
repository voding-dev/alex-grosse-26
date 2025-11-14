# Admin Structure: Portfolio vs Projects

## Overview

The admin is organized into two main workflows:

1. **Portfolio Management** - What appears on your public site
2. **Project Fulfillment** - Client work and deliveries

## Portfolio (`/admin/portfolio`)

**Purpose**: Manage curated work that appears on your public marketing site

- Add/edit/remove portfolio pieces
- Control what's visible on `/photo`, `/video`, `/design`, `/project/[slug]`
- Set status to `approved`/`delivered` to make visible
- This is your showcase work - you pay for permanent storage

**Workflow**:
1. Create portfolio item (or convert from project)
2. Add media/images
3. Set status to `approved` → appears on public site
4. Manage what appears where on your portfolio

## Projects (`/admin/projects`)

**Purpose**: Client project fulfillment and delivery

- Create project for client work (photo/video/design jobs)
- Upload assets for client review
- Create delivery portals (`/dl/[slug]`) for clients
- Manage client feedback
- Track project status (draft → review → delivered)
- Projects are separate from portfolio - they're for fulfillment

**Workflow**:
1. Create project for client job
2. Upload work-in-progress assets
3. Create delivery portal → send client PIN link
4. Client reviews and provides feedback
5. After approval, optionally add to portfolio

## Deliveries (`/admin/deliveries`)

**Purpose**: Manage all client delivery portals

- View all active deliveries
- See expiration status
- Manage storage subscriptions
- Track client access

## Key Separation

| Feature | Portfolio | Projects |
|---------|-----------|----------|
| **Purpose** | Public showcase | Client fulfillment |
| **Storage** | Permanent (you pay) | Temporary (expires) |
| **Visibility** | Public site | PIN-gated |
| **Workflow** | Curate best work | Deliver client jobs |
| **Status** | Approved = visible | Status = workflow stage |

## Navigation

- **Dashboard** (`/admin`) - Overview of both
- **Portfolio** (`/admin/portfolio`) - Manage public site content
- **Projects** (`/admin/projects`) - Client job fulfillment
- **Deliveries** (`/admin/deliveries`) - All delivery portals
- **Settings** (`/admin/settings`) - Configuration














