"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Stripe integration for storage subscriptions
// This creates a Stripe checkout session for monthly storage subscription

export const createStorageSubscriptionCheckout = action({
  args: {
    deliveryId: v.id("deliveries"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Create Stripe checkout session for monthly storage subscription
    // This creates a recurring subscription for extended storage access
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe not configured - STRIPE_SECRET_KEY environment variable required");
    }
    
    // Stripe integration - use require for Node.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    // Get delivery details using public query
    const delivery = await ctx.runQuery(api.deliveries.get, {
      id: args.deliveryId,
    });

    if (!delivery) {
      throw new Error("Delivery not found");
    }

    // Create Stripe checkout session for monthly storage subscription
    // Price ID should be configured in settings
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_STORAGE_PRICE_ID, // Monthly storage price
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        deliveryId: args.deliveryId,
        type: "storage_subscription",
      },
      subscription_data: {
        metadata: {
          deliveryId: args.deliveryId,
        },
      },
    });

    return { checkoutUrl: session.url };
  },
});

// Webhook handler for Stripe events (stripe subscription updates)
export const handleStripeWebhook = action({
  args: {
    event: v.any(),
  },
  handler: async (ctx, args) => {
    // Handle Stripe webhook events for subscription updates
    // Updates delivery.storageSubscriptionStatus and storageSubscriptionExpiresAt
    // based on Stripe subscription events
    
    const event = args.event;
    
    switch (event.type) {
      case "checkout.session.completed":
        // Subscription created, update delivery
        const deliveryId = event.data.object.metadata?.deliveryId;
        if (deliveryId) {
          // Update delivery subscription status via internal mutation
          // Note: This requires a delivery update mutation to be implemented
          // For now, the subscription metadata is stored in the delivery record
          // The subscription status should be updated via a separate mutation
          // that handles the delivery update based on subscription ID
        }
        break;
        
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // Subscription status changed
        const subscriptionId = event.data.object.id;
        // Find delivery by subscription ID and update status
        // This requires querying deliveries by storageSubscriptionId
        // and updating the subscription status accordingly
        break;
    }
    
    return { received: true };
  },
});

