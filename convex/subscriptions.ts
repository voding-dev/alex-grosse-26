import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ Helper Functions ============

/**
 * Calculate the next due date based on:
 * - Original start date's day of month (dueDay)
 * - Last paid date (or start date if never paid)
 * - Billing cycle
 * Always anchors to the dueDay (e.g., if started on 15th, always due on 15th)
 */
function calculateNextDueDate(
  startDate: number,
  lastPaidDate: number | undefined,
  dueDay: number,
  billingCycle: "monthly" | "yearly" | "quarterly" | "weekly"
): number {
  const now = Date.now();
  const referenceDate = lastPaidDate || startDate;
  const reference = new Date(referenceDate);
  
  // Get the next occurrence of dueDay after the reference date
  let nextDue = new Date(reference);
  
  // For weekly, just add weeks
  if (billingCycle === "weekly") {
    nextDue = new Date(reference);
    nextDue.setDate(nextDue.getDate() + 7);
    return nextDue.getTime();
  }
  
  // For monthly, quarterly, yearly - anchor to day of month
  // Move to the next billing period
  if (billingCycle === "monthly") {
    nextDue.setMonth(nextDue.getMonth() + 1);
  } else if (billingCycle === "quarterly") {
    nextDue.setMonth(nextDue.getMonth() + 3);
  } else if (billingCycle === "yearly") {
    nextDue.setFullYear(nextDue.getFullYear() + 1);
  }
  
  // Set to the dueDay, handling month-end edge cases
  const daysInMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(dueDay, daysInMonth);
  nextDue.setDate(targetDay);
  
  // If the calculated date is in the past or today, move to next period
  if (nextDue.getTime() <= now) {
    if (billingCycle === "monthly") {
      nextDue.setMonth(nextDue.getMonth() + 1);
    } else if (billingCycle === "quarterly") {
      nextDue.setMonth(nextDue.getMonth() + 3);
    } else if (billingCycle === "yearly") {
      nextDue.setFullYear(nextDue.getFullYear() + 1);
    }
    
    // Recalculate days in month after moving forward
    const newDaysInMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
    const newTargetDay = Math.min(dueDay, newDaysInMonth);
    nextDue.setDate(newTargetDay);
  }
  
  return nextDue.getTime();
}

/**
 * Extract day of month from a timestamp
 */
function getDayOfMonth(timestamp: number): number {
  return new Date(timestamp).getDate();
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
 * Calculate next due date based on payment amount and periods covered
 * Always anchors to the original dueDay
 */
function calculateNextDueDateFromPayment(
  currentDueDate: number, // Current nextDueDate or lastPaidDate
  paymentDate: number,
  paymentAmount: number,
  subscriptionAmount: number,
  dueDay: number,
  billingCycle: "monthly" | "yearly" | "quarterly" | "weekly",
  startDate: number
): number {
  // Calculate how many periods this payment covers
  const periodsCovered = calculatePeriodsCovered(
    paymentAmount,
    subscriptionAmount,
    billingCycle
  );
  
  // If payment doesn't cover at least one period, advance by one period
  const periodsToAdvance = Math.max(1, periodsCovered);
  
  // Start from current due date (or payment date if no current due date)
  const referenceDate = currentDueDate || paymentDate;
  let nextDue = new Date(referenceDate);
  
  // Advance by the number of periods covered
  if (billingCycle === "weekly") {
    nextDue.setDate(nextDue.getDate() + (7 * periodsToAdvance));
  } else if (billingCycle === "monthly") {
    nextDue.setMonth(nextDue.getMonth() + periodsToAdvance);
  } else if (billingCycle === "quarterly") {
    nextDue.setMonth(nextDue.getMonth() + (3 * periodsToAdvance));
  } else if (billingCycle === "yearly") {
    nextDue.setFullYear(nextDue.getFullYear() + periodsToAdvance);
  }
  
  // Always anchor to the original dueDay
  const daysInMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(dueDay, daysInMonth);
  nextDue.setDate(targetDay);
  
  return nextDue.getTime();
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

/**
 * Calculate the first due date after a start date (one billing period later)
 * This is used for new subscriptions - it always returns the date one period after start,
 * even if that date is in the past, so it shows as DUE
 */
function calculateFirstDueDate(
  startDate: number,
  dueDay: number,
  billingCycle: "monthly" | "yearly" | "quarterly" | "weekly"
): number {
  const start = new Date(startDate);
  
  // For weekly, just add 7 days
  if (billingCycle === "weekly") {
    const firstDue = new Date(start);
    firstDue.setDate(firstDue.getDate() + 7);
    return firstDue.getTime();
  }
  
  // For monthly, quarterly, yearly - add the period and set to the same day of month
  let year = start.getFullYear();
  let month = start.getMonth();
  let day = dueDay;
  
  if (billingCycle === "monthly") {
    month += 1;
  } else if (billingCycle === "quarterly") {
    month += 3;
  } else if (billingCycle === "yearly") {
    year += 1;
  }
  
  // Handle month overflow (e.g., month 12 -> month 0 of next year)
  if (month > 11) {
    year += Math.floor(month / 12);
    month = month % 12;
  }
  
  // Get the number of days in the target month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Use the minimum of dueDay and daysInMonth to handle edge cases (e.g., Jan 31 -> Feb 28/29)
  const targetDay = Math.min(day, daysInMonth);
  
  // Create the first due date
  const firstDue = new Date(year, month, targetDay);
  
  return firstDue.getTime();
}

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
    // For new subscriptions, calculate the first due date (one period after start)
    // This allows past start dates to show as DUE immediately
    const nextDueDate = calculateFirstDueDate(
      args.startDate,
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
      // If there's no payment history, use first due date logic (allows past dates to show as DUE)
      // Otherwise, use the regular calculation that skips past dates
      if (!existing.lastPaidDate) {
        nextDueDate = calculateFirstDueDate(
          newStartDate,
          dueDay,
          newBillingCycle
        );
      } else {
        nextDueDate = calculateNextDueDate(
          newStartDate,
          existing.lastPaidDate,
          dueDay,
          newBillingCycle
        );
      }
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
    // Use current nextDueDate as reference, or startDate if never paid
    const currentDueDate = subscription.nextDueDate || subscription.startDate;
    const nextDueDate = calculateNextDueDateFromPayment(
      currentDueDate,
      paidDate,
      totalAvailable, // Use total available for date calculation
      subscription.amount,
      subscription.dueDay,
      subscription.billingCycle,
      subscription.startDate
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
    if (!subscription.lastPaidDate || args.paidDate >= subscription.lastPaidDate) {
      const nextDueDate = calculateNextDueDate(
        subscription.startDate,
        args.paidDate,
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
    
    // If paidDate changed, recalculate subscription's nextDueDate if this is the latest payment
    if (updates.paidDate) {
      const subscription = await ctx.db.get(existing.subscriptionId);
      if (subscription && (!subscription.lastPaidDate || updates.paidDate >= subscription.lastPaidDate)) {
        const nextDueDate = calculateNextDueDate(
          subscription.startDate,
          updates.paidDate,
          subscription.dueDay,
          subscription.billingCycle
        );
        
        await ctx.db.patch(existing.subscriptionId, {
          lastPaidDate: updates.paidDate,
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
    if (subscription.lastPaidDate === payment.paidDate) {
      // Find the most recent remaining payment
      const remainingPayments = await ctx.db
        .query("subscriptionPayments")
        .withIndex("by_subscription", (q) => q.eq("subscriptionId", payment.subscriptionId))
        .collect();
      
      const latestPayment = remainingPayments
        .sort((a, b) => b.paidDate - a.paidDate)[0];
      
      const nextDueDate = calculateNextDueDate(
        subscription.startDate,
        latestPayment?.paidDate,
        subscription.dueDay,
        subscription.billingCycle
      );
      
      await ctx.db.patch(payment.subscriptionId, {
        lastPaidDate: latestPayment?.paidDate,
        nextDueDate,
        updatedAt: Date.now(),
      });
    }
  },
});

