import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to update delivery subscription status
// Used by Stripe webhook handler
export const updateDeliverySubscription = internalMutation({
  args: {
    deliveryId: v.id("deliveries"),
    subscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("unpaid")
    ),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deliveryId, {
      storageSubscriptionId: args.subscriptionId,
      storageSubscriptionStatus: args.status,
      storageSubscriptionExpiresAt: args.expiresAt,
    });
  },
});

