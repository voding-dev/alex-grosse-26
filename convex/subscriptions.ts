import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ Helper Functions ============

/**
 * Extract day of month from a timestamp
 * Uses UTC to avoid timezone issues
 */
function getDayOfMonth(timestamp: number): number {
  return new Date(timestamp).getUTCDate();
}

/**
 * Calculate how many billing periods a payment amount covers
 */
function calculatePeriodsCovered(
  paymentAmount: number,
  subscriptionAmount: number,
  billingCycle: "monthly" | "yearly" | "quarterly" | "weekly"
): number {
  // Calculate how many periods the payment covers
  const periods = paymentAmount / subscriptionAmount;
  
  // Round down to whole periods (you can't pay for 1.5 months)
  return Math.floor(periods);
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
  
  // Extract date components using UTC to avoid timezone issues
  // This ensures we work with the actual calendar date, not a timezone-shifted version
  let year = reference.getUTCFullYear();
  let month = reference.getUTCMonth(); // 0-indexed (0 = January, 6 = July, etc.)
  
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
  
  // Add the months
  month += monthsToAdd;
  
  // Handle month overflow (e.g., month 12 -> month 0 of next year)
  if (month > 11) {
    year += Math.floor(month / 12);
    month = month % 12;
  }
  
  // Get the number of days in the target month using UTC
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Use the minimum of dueDay and daysInMonth to handle edge cases (e.g., Jan 31 -> Feb 28/29)
  const targetDay = Math.min(dueDay, daysInMonth);
  
  // Create the next due date using UTC to avoid timezone shifts
  const nextDueUTC = new Date(Date.UTC(year, month, targetDay, 0, 0, 0, 0));
  
  return nextDueUTC.getTime();
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
    // For new subscriptions, calculate the first due date (one billing period after start)
    // This allows past start dates to show as DUE immediately
    const nextDueDate = addBillingPeriods(
      args.startDate,
      1, // One billing period after start
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
    
    // If startDate or billingCycle changes, recalculate dueDay and nextDueDate
    let dueDay = existing.dueDay;
    let nextDueDate = existing.nextDueDate;
    
    if (updates.startDate || updates.billingCycle) {
      const newStartDate = updates.startDate || existing.startDate;
      const newBillingCycle = updates.billingCycle || existing.billingCycle;
      dueDay = getDayOfMonth(newStartDate);
      // Always calculate from start date: one billing period after start
      // This ensures clean sequence regardless of payment history
      nextDueDate = addBillingPeriods(
        newStartDate,
        1, // One billing period after start
        dueDay,
        newBillingCycle
      );
    }
    
    await ctx.db.patch(id, {
      ...updates,
      dueDay,
      nextDueDate,
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
    
    // Get current balance (default to 0 if not set)
    const currentBalance = subscription.balance || 0;
    
    // Total available: payment + existing balance
    const totalAvailable = paymentAmount + currentBalance;
    
    // Calculate how many periods this covers
    const periodsCovered = calculatePeriodsCovered(
      totalAvailable,
      subscription.amount,
      subscription.billingCycle
    );
    
    // Calculate how much was used for periods
    const amountUsedForPeriods = periodsCovered * subscription.amount;
    
    // Calculate new balance (remainder after covering periods)
    const newBalance = totalAvailable - amountUsedForPeriods;
    
    // Calculate next due date based on periods covered
    // Advance from current nextDueDate (not from now or payment date)
    // This ensures clean sequence based on billing cycle
    const currentDueDate = subscription.nextDueDate || subscription.startDate;
    const periodsToAdvance = Math.max(1, periodsCovered); // At least 1 period
    const nextDueDate = addBillingPeriods(
      currentDueDate,
      periodsToAdvance,
      subscription.dueDay,
      subscription.billingCycle
    );
    
    // Update subscription with new balance
    await ctx.db.patch(args.id, {
      lastPaidDate: paidDate,
      nextDueDate,
      balance: newBalance, // Store the new balance
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
      nextDueDate,
      periodsCovered,
      paymentAmount,
      subscriptionAmount: subscription.amount,
      balanceApplied: currentBalance, // How much balance was used
      newBalance, // New balance after payment
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
    
    // Update subscription if this is the latest payment
    // Advance from current nextDueDate, not from payment date
    if (!subscription.lastPaidDate || args.paidDate >= subscription.lastPaidDate) {
      // Calculate how many periods this payment covers
      const periodsCovered = calculatePeriodsCovered(
        args.amount,
        subscription.amount,
        subscription.billingCycle
      );
      const periodsToAdvance = Math.max(1, periodsCovered);
      
      const currentDueDate = subscription.nextDueDate || subscription.startDate;
      const nextDueDate = addBillingPeriods(
        currentDueDate,
        periodsToAdvance,
        subscription.dueDay,
        subscription.billingCycle
      );
      
      await ctx.db.patch(args.subscriptionId, {
        lastPaidDate: args.paidDate,
        nextDueDate,
        paymentMethodId: args.paymentMethodId || subscription.paymentMethodId,
        updatedAt: now,
      });
    }
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
    
    // If paidDate or amount changed, recalculate subscription's nextDueDate if this is the latest payment
    if (updates.paidDate || updates.amount) {
      const subscription = await ctx.db.get(existing.subscriptionId);
      if (subscription && (!subscription.lastPaidDate || (updates.paidDate && updates.paidDate >= subscription.lastPaidDate))) {
        // Calculate how many periods this payment covers
        const paymentAmount = updates.amount !== undefined ? updates.amount : existing.amount;
        const periodsCovered = calculatePeriodsCovered(
          paymentAmount,
          subscription.amount,
          subscription.billingCycle
        );
        const periodsToAdvance = Math.max(1, periodsCovered);
        
        // Advance from current nextDueDate, not from payment date
        const currentDueDate = subscription.nextDueDate || subscription.startDate;
        const nextDueDate = addBillingPeriods(
          currentDueDate,
          periodsToAdvance,
          subscription.dueDay,
          subscription.billingCycle
        );
        
        await ctx.db.patch(existing.subscriptionId, {
          lastPaidDate: updates.paidDate || existing.paidDate,
          nextDueDate,
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
    
    // If this was the latest payment, recalculate subscription's nextDueDate
    // CRITICAL: Always calculate from startDate + periods, never from paidDate
    if (subscription.lastPaidDate === payment.paidDate) {
      // Get all remaining payments
      const remainingPayments = await ctx.db
        .query("subscriptionPayments")
        .withIndex("by_subscription", (q) => q.eq("subscriptionId", payment.subscriptionId))
        .collect();
      
      // Sort by paidDate to find the latest
      const sorted = remainingPayments.sort((a, b) => b.paidDate - a.paidDate);
      const latestPayment = sorted[0];
      
      if (latestPayment) {
        // Calculate total periods covered by all remaining payments
        // Sum up periods covered by each payment
        const totalPeriodsCovered = remainingPayments.reduce((sum, p) => {
          const periods = calculatePeriodsCovered(
            p.amount,
            subscription.amount,
            subscription.billingCycle
          );
          return sum + Math.max(1, periods); // At least 1 period per payment
        }, 0);
        
        // Next due date = startDate + (periods covered + 1)
        // The +1 is because we want the NEXT period after what's been paid
        const nextDueDate = addBillingPeriods(
          subscription.startDate,
          totalPeriodsCovered + 1,
          subscription.dueDay,
          subscription.billingCycle
        );
        
        await ctx.db.patch(payment.subscriptionId, {
          lastPaidDate: latestPayment.paidDate, // Only used for tracking, not schedule
          nextDueDate,
          updatedAt: Date.now(),
        });
      } else {
        // No remaining payments, reset to first due date
        const nextDueDate = addBillingPeriods(
          subscription.startDate,
          1, // One billing period after start
          subscription.dueDay,
          subscription.billingCycle
        );
        
        await ctx.db.patch(payment.subscriptionId, {
          lastPaidDate: undefined,
          nextDueDate,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

