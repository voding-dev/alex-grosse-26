# Storage Strategy: Portfolio vs Client Deliveries

## Overview

This project implements a dual storage strategy:
- **Portfolio Projects**: Permanent storage (you pay for these)
- **Client Deliveries**: Temporary storage with expiration and optional monthly subscriptions (MRR upsell)

## Portfolio Storage (Permanent)

- **Who pays**: You (admin)
- **Duration**: Permanent
- **Purpose**: Showcase your best work on public site
- **Control**: Set project status to `approved`/`delivered` to make visible
- **Storage**: Files stored permanently in Convex Storage for portfolio display

## Client Delivery Storage (Temporary with Upsell)

### Free Storage Period

- **Duration**: 30 days (default, configurable per delivery)
- **Expiration Date**: Tracked in `deliveries.expiresAt`
- **Original Delivery Date**: Tracked in `deliveries.originalDeliveryDate`
- **Warning**: Clients see expiration warnings when ≤7 days remain
- **After Expiration**: Files become inaccessible (PIN-gated access denied)

### Monthly Storage Subscription (MRR Upsell)

- **Who pays**: Client (monthly recurring)
- **Price**: Configured via Stripe Price ID (`STRIPE_STORAGE_PRICE_ID`)
- **Duration**: Monthly recurring subscription
- **Status**: Tracked in `deliveries.storageSubscriptionStatus`
- **Expiration**: Tracked in `deliveries.storageSubscriptionExpiresAt`
- **Stripe Integration**: Monthly subscriptions via Stripe Checkout

## Admin Controls

### Creating Deliveries

1. Set expiration date (default: 30 days from creation)
2. Deliveries show expiration warnings when ≤7 days remain
3. Admin can see expiration status and paid storage status
4. Expired deliveries are clearly marked

### Monitoring Storage

- Dashboard shows active deliveries and expiration status
- Color-coded warnings:
  - **Red**: Expired
  - **Yellow**: Expiring soon (≤7 days)
  - **Green**: Paid storage active

## Client Experience

### Delivery Page (`/dl/[slug]`)

1. **PIN-gated access**: Must enter PIN to view
2. **Expiration warnings**: 
   - Yellow banner when ≤7 days until expiration
   - Red banner when expired
   - Shows original delivery date
3. **Subscription option**: "Subscribe to Storage" button when approaching expiration
4. **Paid storage indicator**: Green banner when subscription is active

### Storage Subscription Flow

1. Client clicks "Subscribe to Storage" 
2. Redirected to Stripe Checkout (monthly subscription)
3. Upon payment, Stripe webhook updates delivery:
   - `storageSubscriptionId`: Stripe subscription ID
   - `storageSubscriptionStatus`: "active"
   - `storageSubscriptionExpiresAt`: 30 days from payment
4. Files remain accessible as long as subscription is active
5. Subscription auto-renews monthly

## Database Schema

```typescript
deliveries: {
  expiresAt: number, // Free storage expiration
  originalDeliveryDate: number, // When delivery was created
  storageSubscriptionId?: string, // Stripe subscription ID
  storageSubscriptionStatus?: "active" | "canceled" | "past_due" | "unpaid",
  storageSubscriptionExpiresAt?: number, // Paid storage expiration
}
```

## Stripe Setup Required

1. Create a Stripe Product and Price for monthly storage
2. Set `STRIPE_SECRET_KEY` environment variable
3. Set `STRIPE_STORAGE_PRICE_ID` environment variable
4. Configure Stripe webhook endpoint to `/api/stripe/webhook`
5. Webhook updates delivery subscription status

## Benefits

- **Cost Control**: You only pay for portfolio storage long-term
- **Client Flexibility**: Clients can extend storage if needed
- **MRR Opportunity**: Monthly storage subscriptions generate recurring revenue
- **Automatic Cleanup**: Expired deliveries automatically deny access
- **Clear Communication**: Clients see expiration dates and can subscribe


