import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ Helper Functions ============

/**
 * Extract day of month from a timestamp
 * Normalizes to noon UTC before extraction to avoid timezone edge cases
 * where local midnight could be the previous day in UTC.
 */
function getDayOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  // Normalize to noon UTC to avoid timezone shifts
  const normalized = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0, 0
  ));
  return normalized.getUTCDate();
}

/**
 * Calculate how many billing periods a payment amount covers
 * Note: billingCycle parameter is kept for API consistency but not used in calculation
 */
function calculatePeriodsCovered(
  paymentAmount: number,
  subscriptionAmount: number,
  billingCycle?: "monthly" | "yearly" | "quarterly" | "weekly"
): number {
  // Calculate how many periods the payment covers
  const periods = paymentAmount / subscriptionAmount;
  
  // Round down to whole periods (you can't pay for 1.5 months)
  // If payment doesn't cover a full period, return 0 (don't force it to 1)
  return Math.floor(periods);
}

/**
 * Single source of truth for applying a payment to a subscription.
 * 
 * State model:
 * - startDate: Original start date
 * - dueDay: Day of month anchor (from startDate)
 * - billingCycle: Frequency
 * - periodsPaid: Number of periods that have been paid
 * - balance: Remaining balance (partial payment remainder)
 * 
 * Calculation:
 * - nextDueDate = addBillingPeriods(startDate, periodsPaid, dueDay, billingCycle)
 * - startDate IS the first due date (periodsPaid = 0 means nextDueDate = startDate)
 * 
 * @param subscription - The subscription object
 * @param paymentAmount - Amount being paid
 * @returns Object with periodsAdded, newBalance, and nextDueDate
 */
function applyPayment(
  subscription: {
    startDate: number;
    dueDay: number;
    billingCycle: "monthly" | "yearly" | "quarterly" | "weekly";
    amount: number;
    periodsPaid?: number;
    balance?: number;
  },
  paymentAmount: number
): { periodsAdded: number; newBalance: number; nextDueDate: number } {
  const currentBalance = subscription.balance || 0;
  const currentPeriodsPaid = subscription.periodsPaid || 0;
  
  // Total available: payment + existing balance
  const totalAvailable = paymentAmount + currentBalance;
  
  // Calculate how many periods this covers (can be 0 if partial payment)
  const periodsAdded = Math.floor(totalAvailable / subscription.amount);
  
  // Calculate new balance (remainder after covering periods)
  const newBalance = totalAvailable - (periodsAdded * subscription.amount);
  
  // Calculate next due date: startDate + (periodsPaid + periodsAdded)
  // startDate IS the first due date, so periodsPaid = 0 means nextDueDate = startDate
  const newPeriodsPaid = currentPeriodsPaid + periodsAdded;
  const nextDueDate = addBillingPeriods(
    subscription.startDate,
    newPeriodsPaid,
    subscription.dueDay,
    subscription.billingCycle
  );
  
  return {
    periodsAdded,
    newBalance,
    nextDueDate,
  };
}

/**
 * Rebuild subscription state from all payments.
 * This ensures consistency when payments are created, updated, or deleted.
 * 
 * @param subscription - The subscription object
 * @param payments - Array of all payment records for this subscription
 * @returns Object with periodsPaid, balance, nextDueDate, and lastPaidDate
 */
function rebuildSubscriptionState(
  subscription: {
    startDate: number;
    dueDay: number;
    billingCycle: "monthly" | "yearly" | "quarterly" | "weekly";
    amount: number;
  },
  payments: Array<{ amount: number; paidDate: number }>
): { periodsPaid: number; balance: number; nextDueDate: number; lastPaidDate: number | undefined } {
  // Sum all payment amounts
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Calculate how many periods have been paid
  const periodsPaid = Math.floor(totalPaid / subscription.amount);
  
  // Calculate balance (remainder after covering periods)
  const balance = totalPaid - (periodsPaid * subscription.amount);
  
  // Calculate next due date: startDate + periodsPaid
  // startDate IS the first due date, so periodsPaid = 0 means nextDueDate = startDate
  const nextDueDate = addBillingPeriods(
    subscription.startDate,
    periodsPaid,
    subscription.dueDay,
    subscription.billingCycle
  );
  
  // Find the latest payment date
  const lastPaidDate = payments.length > 0
    ? Math.max(...payments.map(p => p.paidDate))
    : undefined;
  
  return {
    periodsPaid,
    balance,
    nextDueDate,
    lastPaidDate,
  };
}

/**
 * Core helper: Add N billing periods to a reference date, anchoring to dueDay.
 * Respects billing cycle: monthly (1 month), quarterly (3 months), yearly (12 months), weekly (7 days).
 * This is the single source of truth for all due date calculations.
 * No dependency on Date.now() - purely mathematical date advancement.
 * 
 * @param referenceDate - The date to advance from (startDate, currentDueDate, etc.)
 * @param periods - Number of billing periods to add (must be >= 1)
 * @param dueDay - The anchor day of month (from original startDate)
 * @param billingCycle - The billing cycle (monthly, quarterly, yearly, weekly)
 * @returns The new due date, anchored to dueDay
 */
function addBillingPeriods(
  referenceDate: number,
  periods: number,
  dueDay: number,
  billingCycle: "monthly" | "yearly" | "quarterly" | "weekly"
): number {
  const reference = new Date(referenceDate);
  
  // For weekly, just add days
  if (billingCycle === "weekly") {
    const nextDue = new Date(reference);
    nextDue.setUTCDate(nextDue.getUTCDate() + (7 * periods));
    return nextDue.getTime();
  }
  
  // Normalize to noon UTC to avoid timezone edge cases when extracting date components
  // This ensures we get the correct calendar date regardless of when the timestamp was created
  const normalizedRef = new Date(Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate(),
    12, 0, 0, 0
  ));
  
  // Extract calendar date components from normalized date
  let year = normalizedRef.getUTCFullYear();
  let month = normalizedRef.getUTCMonth(); // 0-indexed (0 = January, 7 = August, etc.)
  
  // Calculate how many months to add based on billing cycle
  let monthsToAdd: number;
  if (billingCycle === "monthly") {
    monthsToAdd = periods; // 1 period = 1 month
  } else if (billingCycle === "quarterly") {
    monthsToAdd = periods * 3; // 1 period = 3 months
  } else if (billingCycle === "yearly") {
    monthsToAdd = periods * 12; // 1 period = 12 months (1 year)
  } else {
    monthsToAdd = periods; // Fallback to monthly
  }
  
  // Add exactly the specified number of months (no more, no less)
  month += monthsToAdd;
  
  // Handle month overflow (e.g., month 12 -> month 0 of next year)
  if (month > 11) {
    year += Math.floor(month / 12);
    month = month % 12;
  }
  
  // Get the number of days in the target month using UTC
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Use the minimum of dueDay and daysInMonth to handle edge cases:
  // - Jan 31, monthly → Feb 28/29 (leap year) → Mar 31 → Apr 30 → May 31
  // - Feb 29 (leap year), yearly → Feb 28 (non-leap) → Feb 28 (non-leap) → Feb 29 (leap)
  // - Aug 31, quarterly → Nov 30 → Feb 28/29 → May 31 → Aug 31
  // Always uses original dueDay (from start date), not the day from reference date
  const targetDay = Math.min(dueDay, daysInMonth);
  
  // Create the next due date at noon UTC to avoid DST and timezone edge cases
  // This represents the calendar date consistently regardless of timezone
  const nextDue = new Date(Date.UTC(year, month, targetDay, 12, 0, 0, 0));
  
  return nextDue.getTime();
}

/**
 * Calculate the initial nextDueDate for a subscription.
 *
 * Rules:
 * - The schedule is anchored on startDate + billingCycle + dueDay.
 * - First candidate is exactly one billing period after startDate.
 * - If that candidate is in the future relative to `now`, use it.
 * - If it's in the past, keep advancing by whole periods until
 *   we land on the first due date strictly AFTER `now`.
 *
 * This is used for:
 * - creating a new subscription
 * - re-anchoring when startDate or billingCycle changes
 */
function calculateInitialNextDueDate(
  startDate: number,
  billingCycle: "monthly" | "yearly" | "quarterly" | "weekly",
  dueDay: number,
  now: number = Date.now()
): number {
  // First due = one billing period after the start
  let nextDue = addBillingPeriods(startDate, 1, dueDay, billingCycle);

  // If that first due is already in the future, we're done.
  if (nextDue > now) {
    return nextDue;
  }

  // Otherwise, keep stepping forward by whole periods until
  // we land strictly after `now`.
  while (nextDue <= now) {
    nextDue = addBillingPeriods(nextDue, 1, dueDay, billingCycle);
  }

  return nextDue;
}

// ============ Tags ============

export const getAllSubscriptionTags = query({
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const allTags = new Set<string>();
    subscriptions.forEach(sub => {
      if (sub.tags && sub.tags.length > 0) {
        sub.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  },
});

// ============ Payment Methods ============

export const paymentMethodsList = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("subscriptionPaymentMethods")
      .order("desc")
      .collect();
  },
});

export const paymentMethodsListSorted = query({
  handler: async (ctx) => {
    const methods = await ctx.db
      .query("subscriptionPaymentMethods")
      .collect();
    
    // Sort by sortOrder (ascending), then by createdAt (descending)
    return methods.sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return b.createdAt - a.createdAt;
    });
  },
});

export const paymentMethodGet = query({
  args: { id: v.id("subscriptionPaymentMethods") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const paymentMethodCreate = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    isDefault: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("subscriptionPaymentMethods", {
      name: args.name,
      color: args.color,
      isDefault: args.isDefault ?? false,
      sortOrder: args.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const paymentMethodUpdate = mutation({
  args: {
    id: v.id("subscriptionPaymentMethods"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Payment method not found");
    }
    
    await ctx.db.patch(args.id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const paymentMethodRemove = mutation({
  args: { id: v.id("subscriptionPaymentMethods") },
  handler: async (ctx, args) => {
    // Check if any subscriptions use this payment method
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_payment_method", (q) => q.eq("paymentMethodId", args.id))
      .collect();
    
    if (subscriptions.length > 0) {
      throw new Error("Cannot delete payment method: it is being used by subscriptions");
    }
    
    // Check if any payments use this payment method
    const payments = await ctx.db
      .query("subscriptionPayments")
      .withIndex("by_payment_method", (q) => q.eq("paymentMethodId", args.id))
      .collect();
    
    if (payments.length > 0) {
      throw new Error("Cannot delete payment method: it is being used by payment records");
    }
    
    await ctx.db.delete(args.id);
  },
});

// ============ Subscriptions ============

export const subscriptionsList = query({
  args: {
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived"),
      v.literal("all")
    )),
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("nextDueDate"),
      v.literal("amount"),
      v.literal("name"),
      v.literal("createdAt")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    let subscriptions;
    
    // Filter by status
    if (args.status && args.status !== "all") {
      const statusFilter = args.status as "active" | "paused" | "archived";
      subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_status", (q) => q.eq("status", statusFilter))
        .collect();
    } else {
      subscriptions = await ctx.db
        .query("subscriptions")
        .collect();
    }
    
    // Search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      subscriptions = subscriptions.filter((sub) => {
        return (
          sub.name.toLowerCase().includes(searchLower) ||
          sub.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          (sub.notes && sub.notes.toLowerCase().includes(searchLower))
        );
      });
    }
    
    // Populate payment method info
    const subscriptionsWithMethods = await Promise.all(
      subscriptions.map(async (sub) => {
        let paymentMethod = null;
        if (sub.paymentMethodId) {
          paymentMethod = await ctx.db.get(sub.paymentMethodId);
        }
        return {
          ...sub,
          paymentMethod,
        };
      })
    );
    
    // Sort
    const sortBy = args.sortBy || "nextDueDate";
    const sortOrder = args.sortOrder || "asc";
    
    subscriptionsWithMethods.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      if (sortBy === "nextDueDate") {
        aVal = a.nextDueDate;
        bVal = b.nextDueDate;
      } else if (sortBy === "amount") {
        aVal = a.amount;
        bVal = b.amount;
      } else if (sortBy === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortBy === "createdAt") {
        aVal = a.createdAt;
        bVal = b.createdAt;
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    return subscriptionsWithMethods;
  },
});

export const subscriptionsGet = query({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.id);
    if (!subscription) {
      return null;
    }
    
    // Populate payment method
    let paymentMethod = null;
    if (subscription.paymentMethodId) {
      paymentMethod = await ctx.db.get(subscription.paymentMethodId);
    }
    
    return {
      ...subscription,
      paymentMethod,
    };
  },
});

export const subscriptionsGetUpcoming = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const now = Date.now();
    const futureDate = now + (days * 24 * 60 * 60 * 1000);
    
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    const upcoming = subscriptions.filter((sub) => {
      return sub.nextDueDate >= now && sub.nextDueDate <= futureDate;
    });
    
    // Populate payment methods
    const upcomingWithMethods = await Promise.all(
      upcoming.map(async (sub) => {
        let paymentMethod = null;
        if (sub.paymentMethodId) {
          paymentMethod = await ctx.db.get(sub.paymentMethodId);
        }
        return {
          ...sub,
          paymentMethod,
        };
      })
    );
    
    // Sort by nextDueDate
    upcomingWithMethods.sort((a, b) => a.nextDueDate - b.nextDueDate);
    
    return upcomingWithMethods;
  },
});

export const subscriptionsGetOverdue = query({
  handler: async (ctx) => {
    const now = Date.now();
    
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    const overdue = subscriptions.filter((sub) => {
      return sub.nextDueDate < now;
    });
    
    // Populate payment methods
    const overdueWithMethods = await Promise.all(
      overdue.map(async (sub) => {
        let paymentMethod = null;
        if (sub.paymentMethodId) {
          paymentMethod = await ctx.db.get(sub.paymentMethodId);
        }
        return {
          ...sub,
          paymentMethod,
        };
      })
    );
    
    // Sort by nextDueDate (most overdue first)
    overdueWithMethods.sort((a, b) => a.nextDueDate - b.nextDueDate);
    
    return overdueWithMethods;
  },
});

export const subscriptionsGetStats = query({
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
    
    const allSubscriptions = await ctx.db
      .query("subscriptions")
      .collect();
    
    const active = allSubscriptions.filter((s) => s.status === "active");
    const overdue = active.filter((s) => s.nextDueDate < now);
    const dueSoon = active.filter((s) => {
      return s.nextDueDate >= now && s.nextDueDate <= sevenDaysFromNow;
    });
    
    const totalMonthly = active.reduce((sum, s) => {
      // Convert to monthly equivalent
      let monthly = s.amount;
      if (s.billingCycle === "yearly") {
        monthly = s.amount / 12;
      } else if (s.billingCycle === "quarterly") {
        monthly = s.amount / 3;
      } else if (s.billingCycle === "weekly") {
        monthly = s.amount * 4.33; // Average weeks per month
      }
      return sum + monthly;
    }, 0);
    
    return {
      total: allSubscriptions.length,
      active: active.length,
      paused: allSubscriptions.filter((s) => s.status === "paused").length,
      archived: allSubscriptions.filter((s) => s.status === "archived").length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      totalMonthly: Math.round(totalMonthly * 100) / 100,
    };
  },
});


export const subscriptionCreate = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    currency: v.string(),
    billingCycle: v.union(
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("quarterly"),
      v.literal("weekly")
    ),
    startDate: v.number(),
    paymentMethodId: v.optional(v.id("subscriptionPaymentMethods")),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dueDay = getDayOfMonth(args.startDate);
    // startDate IS the first due date (no auto-advancement)
    // If start date is in the past, subscription will show as overdue
    const nextDueDate = addBillingPeriods(
      args.startDate,
      0, // 0 periods paid so far, so nextDueDate = startDate
      dueDay,
      args.billingCycle
    );
    
    return await ctx.db.insert("subscriptions", {
      name: args.name,
      amount: args.amount,
      currency: args.currency,
      billingCycle: args.billingCycle,
      startDate: args.startDate,
      dueDay,
      status: "active",
      nextDueDate,
      lastPaidDate: undefined,
      periodsPaid: 0, // Initialize to 0 periods paid
      balance: 0, // Initialize balance to 0
      paymentMethodId: args.paymentMethodId,
      notes: args.notes,
      tags: args.tags || [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const subscriptionUpdate = mutation({
  args: {
    id: v.id("subscriptions"),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingCycle: v.optional(v.union(
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("quarterly"),
      v.literal("weekly")
    )),
    startDate: v.optional(v.number()),
    paymentMethodId: v.optional(v.id("subscriptionPaymentMethods")),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Subscription not found");
    }
    
    // If startDate or billingCycle changes, recalculate dueDay, nextDueDate, and reset payment state
    let dueDay = existing.dueDay;
    let nextDueDate = existing.nextDueDate;
    let periodsPaid = existing.periodsPaid;
    let balance = existing.balance;
    
    if (updates.startDate || updates.billingCycle) {
      const newStartDate = updates.startDate ?? existing.startDate;
      const newBillingCycle = updates.billingCycle ?? existing.billingCycle;

      dueDay = getDayOfMonth(newStartDate);

      // startDate IS the first due date (no auto-advancement)
      // If start date is in the past, subscription will show as overdue
      nextDueDate = addBillingPeriods(
        newStartDate,
        0, // Reset to 0 periods paid when schedule is re-anchored
        dueDay,
        newBillingCycle
      );
      
      // Reset payment state when schedule is re-anchored
      // User will need to re-enter payments or they'll be recalculated from payment history
      periodsPaid = 0;
      balance = 0;
    }
    
    await ctx.db.patch(id, {
      ...updates,
      dueDay,
      nextDueDate,
      periodsPaid,
      balance,
      updatedAt: Date.now(),
    });
  },
});

export const subscriptionUpdateStatus = mutation({
  args: {
    id: v.id("subscriptions"),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Subscription not found");
    }
    
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const subscriptionMarkAsPaid = mutation({
  args: {
    id: v.id("subscriptions"),
    paidDate: v.number(),
    amount: v.optional(v.number()), // Can be any amount, not just subscription amount
    paymentMethodId: v.optional(v.id("subscriptionPaymentMethods")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.id);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    const now = Date.now();
    const paidDate = args.paidDate;
    const paymentAmount = args.amount || subscription.amount;
    
    // Use the single source of truth for payment application
    const result = applyPayment(
      {
        startDate: subscription.startDate,
        dueDay: subscription.dueDay,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount,
        periodsPaid: subscription.periodsPaid,
        balance: subscription.balance,
      },
      paymentAmount
    );
    
    // Update subscription with new state
    await ctx.db.patch(args.id, {
      lastPaidDate: paidDate,
      nextDueDate: result.nextDueDate,
      periodsPaid: (subscription.periodsPaid || 0) + result.periodsAdded,
      balance: result.newBalance,
      paymentMethodId: args.paymentMethodId || subscription.paymentMethodId,
      updatedAt: now,
    });
    
    // Create payment record (store the actual payment amount, not total available)
    await ctx.db.insert("subscriptionPayments", {
      subscriptionId: args.id,
      amount: paymentAmount, // Store the actual payment made
      paidDate,
      paymentMethodId: args.paymentMethodId || subscription.paymentMethodId,
      notes: args.notes,
      createdAt: now,
    });
    
    return { 
      nextDueDate: result.nextDueDate,
      periodsCovered: result.periodsAdded,
      paymentAmount,
      subscriptionAmount: subscription.amount,
      balanceApplied: subscription.balance || 0, // How much balance was used
      newBalance: result.newBalance, // New balance after payment
    };
  },
});

export const subscriptionRemove = mutation({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    // Delete all payment records first
    const payments = await ctx.db
      .query("subscriptionPayments")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.id))
      .collect();
    
    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }
    
    // Delete subscription
    await ctx.db.delete(args.id);
  },
});

// ============ Payments ============

export const paymentsList = query({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("subscriptionPayments")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
      .order("desc")
      .collect();
    
    // Populate payment methods
    const paymentsWithMethods = await Promise.all(
      payments.map(async (payment) => {
        let paymentMethod = null;
        if (payment.paymentMethodId) {
          paymentMethod = await ctx.db.get(payment.paymentMethodId);
        }
        return {
          ...payment,
          paymentMethod,
        };
      })
    );
    
    return paymentsWithMethods;
  },
});

export const paymentGet = query({
  args: { id: v.id("subscriptionPayments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) {
      return null;
    }
    
    // Populate payment method
    let paymentMethod = null;
    if (payment.paymentMethodId) {
      paymentMethod = await ctx.db.get(payment.paymentMethodId);
    }
    
    return {
      ...payment,
      paymentMethod,
    };
  },
});

export const paymentCreate = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    amount: v.number(),
    paidDate: v.number(),
    paymentMethodId: v.optional(v.id("subscriptionPaymentMethods")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    const now = Date.now();
    
    // Create payment record
    await ctx.db.insert("subscriptionPayments", {
      subscriptionId: args.subscriptionId,
      amount: args.amount,
      paidDate: args.paidDate,
      paymentMethodId: args.paymentMethodId || subscription.paymentMethodId,
      notes: args.notes,
      createdAt: now,
    });
    
    // Rebuild subscription state from all payments to ensure consistency
    const allPayments = await ctx.db
      .query("subscriptionPayments")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
      .collect();
    
    const newState = rebuildSubscriptionState(
      {
        startDate: subscription.startDate,
        dueDay: subscription.dueDay,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount,
      },
      allPayments
    );
    
    await ctx.db.patch(args.subscriptionId, {
      periodsPaid: newState.periodsPaid,
      balance: newState.balance,
      nextDueDate: newState.nextDueDate,
      lastPaidDate: newState.lastPaidDate,
      paymentMethodId: args.paymentMethodId || subscription.paymentMethodId,
      updatedAt: now,
    });
  },
});

export const paymentUpdate = mutation({
  args: {
    id: v.id("subscriptionPayments"),
    amount: v.optional(v.number()),
    paidDate: v.optional(v.number()),
    paymentMethodId: v.optional(v.id("subscriptionPaymentMethods")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Payment not found");
    }
    
    await ctx.db.patch(id, updates);
    
    // If paidDate or amount changed, rebuild subscription state from all payments
    if (updates.paidDate || updates.amount) {
      const subscription = await ctx.db.get(existing.subscriptionId);
      if (subscription) {
        // Get all payments (including the updated one)
        const allPayments = await ctx.db
          .query("subscriptionPayments")
          .withIndex("by_subscription", (q) => q.eq("subscriptionId", existing.subscriptionId))
          .collect();
        
        const newState = rebuildSubscriptionState(
          {
            startDate: subscription.startDate,
            dueDay: subscription.dueDay,
            billingCycle: subscription.billingCycle,
            amount: subscription.amount,
          },
          allPayments
        );
        
        await ctx.db.patch(existing.subscriptionId, {
          periodsPaid: newState.periodsPaid,
          balance: newState.balance,
          nextDueDate: newState.nextDueDate,
          lastPaidDate: newState.lastPaidDate,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const paymentRemove = mutation({
  args: { id: v.id("subscriptionPayments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) {
      throw new Error("Payment not found");
    }
    
    const subscription = await ctx.db.get(payment.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    // Delete payment
    await ctx.db.delete(args.id);
    
    // Rebuild subscription state from all remaining payments
    const remainingPayments = await ctx.db
      .query("subscriptionPayments")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", payment.subscriptionId))
      .collect();
    
    const newState = rebuildSubscriptionState(
      {
        startDate: subscription.startDate,
        dueDay: subscription.dueDay,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount,
      },
      remainingPayments
    );
    
    await ctx.db.patch(payment.subscriptionId, {
      periodsPaid: newState.periodsPaid,
      balance: newState.balance,
      nextDueDate: newState.nextDueDate,
      lastPaidDate: newState.lastPaidDate,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Preview what would happen if a payment is applied to a subscription.
 * This uses the same logic as subscriptionMarkAsPaid to ensure consistency.
 */
export const subscriptionPreviewPayment = query({
  args: {
    id: v.id("subscriptions"),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.id);
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    
    const paymentAmount = args.amount || subscription.amount;
    
    // Use the same applyPayment logic as the backend
    const result = applyPayment(
      {
        startDate: subscription.startDate,
        dueDay: subscription.dueDay,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount,
        periodsPaid: subscription.periodsPaid || 0,
        balance: subscription.balance || 0,
      },
      paymentAmount
    );
    
    return {
      periodsCovered: result.periodsAdded,
      newBalance: result.newBalance,
      nextDueDate: result.nextDueDate,
      currentBalance: subscription.balance || 0,
      paymentAmount,
      subscriptionAmount: subscription.amount,
    };
  },
});

