import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminWithSession } from "./adminAuth";
import { Id } from "./_generated/dataModel";

// TimeContext type - shared between backend and frontend
export type TimeContext = {
  now: number;
  todayStart: number;
  tomorrowStart: number;
  weekStart: number;
  nextWeekStart: number;
};

// Helper: Build server time context (fallback when client doesn't provide one)
function buildServerTimeContext(now: number): TimeContext {
  const nowDate = new Date(now);
  const today = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
    0, 0, 0, 0
  );
  const todayStart = today.getTime();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = tomorrow.getTime();

  const dayOfWeek = today.getDay(); // Sunday = 0
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartTime = weekStart.getTime();

  const nextWeekStartTime = weekStartTime + 7 * 24 * 60 * 60 * 1000;

  return {
    now,
    todayStart,
    tomorrowStart,
    weekStart: weekStartTime,
    nextWeekStart: nextWeekStartTime,
  };
}

// Helper: Generate recurring task instances
function generateRecurringInstances(
  task: any,
  now: number,
  maxFutureDays: number = 90 // Generate instances up to 90 days in the future
): any[] {
  if (task.taskType !== "recurring" || !task.recurrencePattern || !task.recurrenceStartDate) {
    return [];
  }

  const instances: any[] = [];
  const startDate = new Date(task.recurrenceStartDate);
  const endDate = task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : null;
  const maxDate = new Date(now + maxFutureDays * 24 * 60 * 60 * 1000);
  const cutoffDate = endDate && endDate < maxDate ? endDate : maxDate;

  // Generate instances from start date, including past dates (they may be needed for overdue view)
  // But for most views, we'll filter to only show future/current instances
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  // Generate instances up to 2 weeks in the past for overdue detection, but not before recurrence start
  const pastCutoff = new Date(today);
  pastCutoff.setDate(pastCutoff.getDate() - 14); // 2 weeks ago
  const actualStartFrom = startDate < pastCutoff ? pastCutoff : startDate;
  
  if (actualStartFrom > cutoffDate) {
    return [];
  }

  switch (task.recurrencePattern) {
    case "daily": {
      // Generate instances for selected days of week
      const daysOfWeek = task.recurrenceDaysOfWeek || [];
      if (daysOfWeek.length === 0) return [];

      let current = new Date(actualStartFrom);
      while (current <= cutoffDate) {
        const dayOfWeek = current.getDay();
        if (daysOfWeek.includes(dayOfWeek)) {
          const instanceDate = new Date(current);
          instanceDate.setHours(0, 0, 0, 0);
          instances.push({
            ...task,
            _id: `${task._id}_${instanceDate.getTime()}` as any, // Virtual ID
            scheduledAt: instanceDate.getTime(),
            isRecurringInstance: true,
            parentTaskId: task._id,
            taskType: "scheduled_time" as const, // Instances appear as scheduled tasks
          });
        }
        current.setDate(current.getDate() + 1);
      }
      break;
    }

    case "weekly": {
      const daysOfWeek = task.recurrenceDaysOfWeek || [];
      const weekInterval = task.recurrenceWeekInterval || 1;
      if (daysOfWeek.length === 0) return [];

      // Find the first occurrence after start date
      let current = new Date(actualStartFrom);
      const startWeekStart = new Date(current);
      startWeekStart.setDate(startWeekStart.getDate() - startWeekStart.getDay()); // Start of week (Sunday)

      let weekOffset = 0;
      while (current <= cutoffDate) {
        const weekStart = new Date(startWeekStart);
        weekStart.setDate(weekStart.getDate() + weekOffset * 7 * weekInterval);

        for (const dayOfWeek of daysOfWeek) {
          const instanceDate = new Date(weekStart);
          instanceDate.setDate(instanceDate.getDate() + dayOfWeek);
          instanceDate.setHours(0, 0, 0, 0);

          if (instanceDate >= actualStartFrom && instanceDate <= cutoffDate) {
            instances.push({
              ...task,
              _id: `${task._id}_${instanceDate.getTime()}` as any,
              scheduledAt: instanceDate.getTime(),
              isRecurringInstance: true,
              parentTaskId: task._id,
              taskType: "scheduled_time" as const,
            });
          }
        }

        weekOffset++;
        // Move to next interval
        current = new Date(weekStart);
        current.setDate(current.getDate() + 7 * weekInterval);
        if (current > cutoffDate) break;
      }
      break;
    }

    case "monthly": {
      const dayOfMonth = task.recurrenceDayOfMonth || 1;
      let current = new Date(actualStartFrom);

      while (current <= cutoffDate) {
        const instanceDate = new Date(current.getFullYear(), current.getMonth(), dayOfMonth);
        instanceDate.setHours(0, 0, 0, 0);

        if (instanceDate >= actualStartFrom && instanceDate <= cutoffDate) {
          instances.push({
            ...task,
            _id: `${task._id}_${instanceDate.getTime()}` as any,
            scheduledAt: instanceDate.getTime(),
            isRecurringInstance: true,
            parentTaskId: task._id,
            taskType: "scheduled_time" as const,
          });
        }

        // Move to next month
        current.setMonth(current.getMonth() + 1);
        current.setDate(1); // Reset to first day of month
      }
      break;
    }

    case "yearly": {
      const month = task.recurrenceMonth ?? 0;
      const dayOfYear = task.recurrenceDayOfYear || 1;
      let current = new Date(actualStartFrom);

      while (current <= cutoffDate) {
        const instanceDate = new Date(current.getFullYear(), month, dayOfYear);
        instanceDate.setHours(0, 0, 0, 0);

        if (instanceDate >= actualStartFrom && instanceDate <= cutoffDate) {
          instances.push({
            ...task,
            _id: `${task._id}_${instanceDate.getTime()}` as any,
            scheduledAt: instanceDate.getTime(),
            isRecurringInstance: true,
            parentTaskId: task._id,
            taskType: "scheduled_time" as const,
          });
        }

        // Move to next year
        current.setFullYear(current.getFullYear() + 1);
        current.setMonth(0);
        current.setDate(1);
      }
      break;
    }

    case "specific_dates": {
      if (!task.recurrenceSpecificDates || task.recurrenceSpecificDates.length === 0) {
        return [];
      }

      for (const dateTimestamp of task.recurrenceSpecificDates) {
        const instanceDate = new Date(dateTimestamp);
        instanceDate.setHours(0, 0, 0, 0);

        if (instanceDate >= actualStartFrom && instanceDate <= cutoffDate) {
          instances.push({
            ...task,
            _id: `${task._id}_${instanceDate.getTime()}` as any,
            scheduledAt: instanceDate.getTime(),
            isRecurringInstance: true,
            parentTaskId: task._id,
            taskType: "scheduled_time" as const,
          });
        }
      }
      break;
    }
  }

  return instances;
}

// Helper: Get computed task state using TimeContext
export function getComputedTaskState(
  task: {
    taskType: "none" | "deadline" | "date_range" | "scheduled_time" | "recurring";
    deadlineAt?: number;
    rangeStartDate?: number;
    rangeEndDate?: number;
    scheduledAt?: number;
    recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly" | "specific_dates";
    recurrenceDaysOfWeek?: number[];
    recurrenceWeekInterval?: number;
    recurrenceSpecificDates?: number[];
    recurrenceStartDate?: number;
    recurrenceEndDate?: number;
    recurrenceDayOfMonth?: number;
    recurrenceMonth?: number;
    recurrenceDayOfYear?: number;
    isCompleted: boolean;
    pinnedToday: boolean;
    pinnedTomorrow: boolean;
    tagIds: string[];
  },
  timeContext: TimeContext
) {
  const { now, todayStart, tomorrowStart, weekStart, nextWeekStart } = timeContext;

  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const tomorrowEnd = tomorrowStart + 24 * 60 * 60 * 1000 - 1;
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000 - 1;
  const nextWeekEnd = nextWeekStart + 7 * 24 * 60 * 60 * 1000 - 1;

  const result = {
    inToday: false,
    inTomorrow: false,
    inThisWeek: false,
    inNextWeek: false,
    isOverdue: false,
    isSomeday: false,
  };

  // Someday tag
  result.isSomeday = task.tagIds.includes("Someday");

  // Manual pins override views
  if (task.pinnedToday) result.inToday = true;
  if (task.pinnedTomorrow) result.inTomorrow = true;

  // Completed: keep manual pins only, no auto logic
  if (task.isCompleted) {
    if (result.inToday && todayStart >= weekStart && todayStart <= weekEnd) {
      result.inThisWeek = true;
    }
    return result;
  }

  // Helper to normalize a timestamp to 00:00 local (based on timeContext, not server tz)
  const startOfDay = (ts: number) => {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
  };

  // DEADLINE TASKS
  if (task.taskType === "deadline" && task.deadlineAt) {
    const deadlineDayStart = startOfDay(task.deadlineAt);

    // Overdue: now past deadline time
    if (now > task.deadlineAt) {
      result.isOverdue = true;
    }

    // Today:
    // - On the due date
    // - OR any day after due date while still incomplete (overdue stays in Today)
    if (todayStart >= deadlineDayStart) {
      result.inToday = true;
    }

    // Tomorrow: the day before the due date
    const dayBeforeStart = deadlineDayStart - 24 * 60 * 60 * 1000;
    const dayBeforeEnd = dayBeforeStart + 24 * 60 * 60 * 1000 - 1;

    if (todayStart >= dayBeforeStart && todayStart <= dayBeforeEnd) {
      result.inTomorrow = true;
    }

    // Week views based on the actual due day
    if (deadlineDayStart >= weekStart && deadlineDayStart <= weekEnd) {
      result.inThisWeek = true;
    }
    if (deadlineDayStart >= nextWeekStart && deadlineDayStart <= nextWeekEnd) {
      result.inNextWeek = true;
    }
  }

  // SCHEDULED TIME TASKS (including recurring instances)
  if (task.taskType === "scheduled_time" && task.scheduledAt) {
    const scheduledDayStart = startOfDay(task.scheduledAt);

    if (now > task.scheduledAt) {
      result.isOverdue = true;
    }

    // Today: scheduled day AND any day after while incomplete
    if (todayStart >= scheduledDayStart) {
      result.inToday = true;
    }

    // Tomorrow: day before scheduled day
    const dayBeforeStart = scheduledDayStart - 24 * 60 * 60 * 1000;
    const dayBeforeEnd = dayBeforeStart + 24 * 60 * 60 * 1000 - 1;

    if (todayStart >= dayBeforeStart && todayStart <= dayBeforeEnd) {
      result.inTomorrow = true;
    }

    if (scheduledDayStart >= weekStart && scheduledDayStart <= weekEnd) {
      result.inThisWeek = true;
    }
    if (scheduledDayStart >= nextWeekStart && scheduledDayStart <= nextWeekEnd) {
      result.inNextWeek = true;
    }
  }

  // DATE RANGE TASKS
  if (task.taskType === "date_range" && task.rangeStartDate && task.rangeEndDate) {
    const startDay = startOfDay(task.rangeStartDate);
    const endDay = startOfDay(task.rangeEndDate);

    // In-range: always in Today
    if (todayStart >= startDay && todayStart <= endDay) {
      result.inToday = true;
    }

    // Tomorrow: from day before start through end - 1 day
    const dayBeforeStart = startDay - 24 * 60 * 60 * 1000;
    const endMinusOne = endDay - 24 * 60 * 60 * 1000 + (24 * 60 * 60 * 1000 - 1);

    if (todayStart >= dayBeforeStart && todayStart <= endMinusOne) {
      result.inTomorrow = true;
    }

    // Once range is past and still incomplete → overdue + stays in Today
    if (todayStart > endDay) {
      result.isOverdue = true;
      result.inToday = true;
    }

    // Week overlaps
    if (startDay <= weekEnd && endDay >= weekStart) {
      result.inThisWeek = true;
    }
    if (startDay <= nextWeekEnd && endDay >= nextWeekStart) {
      result.inNextWeek = true;
    }
  }

  // NONE TYPE → Someday by default (unless manually pinned)
  if (task.taskType === "none") {
    result.isSomeday = true;
  }

  // If it appears in Today or Tomorrow, also mark This Week when we are in that week
  if (todayStart >= weekStart && todayStart <= weekEnd && (result.inToday || result.inTomorrow)) {
    result.inThisWeek = true;
  }

  return result;
}

// Initialize Someday and Overdue tags (run once)
export const initializeTags = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This is a one-time initialization - tags are just strings in the tagIds array
    // We don't need to create a separate tags table, just ensure tasks can use these tag names
    // The tags will be created automatically when tasks use them
    return { success: true };
  },
});

// List all tasks with optional filtering
export const list = query({
  args: {
    view: v.optional(v.union(
      v.literal("today"),
      v.literal("tomorrow"),
      v.literal("this_week"),
      v.literal("next_week"),
      v.literal("bank"),
      v.literal("someday"),
      v.literal("overdue")
    )),
    folderId: v.optional(v.id("folders")),
    tagIds: v.optional(v.array(v.string())),
    search: v.optional(v.string()),
    filterNotInFolder: v.optional(v.boolean()),
    filterNotTagged: v.optional(v.boolean()),
    sessionToken: v.optional(v.string()),
    timeContext: v.optional(v.object({
      now: v.number(),
      todayStart: v.number(),
      tomorrowStart: v.number(),
      weekStart: v.number(),
      nextWeekStart: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    let tasks = await ctx.db.query("tasks").order("desc").collect();
    const now = args.timeContext?.now ?? Date.now();
    const timeContext = args.timeContext ?? buildServerTimeContext(now);

    // Generate instances for recurring tasks
    const recurringTasks = tasks.filter((t) => t.taskType === "recurring" && !t.isRecurringInstance);
    const recurringInstances: any[] = [];
    
    for (const recurringTask of recurringTasks) {
      const instances = generateRecurringInstances(recurringTask, now);
      recurringInstances.push(...instances);
    }

    // Combine regular tasks with recurring instances
    // For Bank view: show parent recurring tasks only (not instances)
    // For other views: show instances only (not parent recurring tasks)
    const shouldShowParentRecurring = args.view === "bank" || !args.view;
    if (!shouldShowParentRecurring) {
      // Filter out parent recurring tasks for non-Bank views
      tasks = tasks.filter((t) => t.taskType !== "recurring" || t.isRecurringInstance);
      // Add instances for non-Bank views
      tasks = [...tasks, ...recurringInstances];
    } else {
      // For Bank view: filter out instances, keep parent recurring tasks
      tasks = tasks.filter((t) => !t.isRecurringInstance);
      // Don't add instances to Bank view - only show the parent recurring task
    }

    // Map tasks to include computedState, then filter by view
    // Create clean serializable objects (Convex needs plain objects, not document objects with internal properties)
    let tasksWithState = tasks.map((task) => {
      // Ensure required fields have defaults to prevent errors
      const taskForState = {
        taskType: task.taskType || "none",
        deadlineAt: task.deadlineAt,
        rangeStartDate: task.rangeStartDate,
        rangeEndDate: task.rangeEndDate,
        scheduledAt: task.scheduledAt,
        recurrencePattern: task.recurrencePattern,
        recurrenceDaysOfWeek: task.recurrenceDaysOfWeek,
        recurrenceWeekInterval: task.recurrenceWeekInterval,
        recurrenceSpecificDates: task.recurrenceSpecificDates,
        recurrenceStartDate: task.recurrenceStartDate,
        recurrenceEndDate: task.recurrenceEndDate,
        recurrenceDayOfMonth: task.recurrenceDayOfMonth,
        recurrenceMonth: task.recurrenceMonth,
        recurrenceDayOfYear: task.recurrenceDayOfYear,
        isCompleted: task.isCompleted ?? false,
        pinnedToday: task.pinnedToday ?? false,
        pinnedTomorrow: task.pinnedTomorrow ?? false,
        tagIds: task.tagIds || [],
      };
      
      const computedState = getComputedTaskState(taskForState, timeContext);
      
      // Return a clean object with only the fields we need
      return {
        _id: task._id,
        _creationTime: task._creationTime,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        deadlineAt: task.deadlineAt,
        rangeStartDate: task.rangeStartDate,
        rangeEndDate: task.rangeEndDate,
        scheduledAt: task.scheduledAt,
        recurrencePattern: task.recurrencePattern,
        recurrenceDaysOfWeek: task.recurrenceDaysOfWeek,
        recurrenceWeekInterval: task.recurrenceWeekInterval,
        recurrenceSpecificDates: task.recurrenceSpecificDates,
        recurrenceStartDate: task.recurrenceStartDate,
        recurrenceEndDate: task.recurrenceEndDate,
        recurrenceDayOfMonth: task.recurrenceDayOfMonth,
        recurrenceMonth: task.recurrenceMonth,
        recurrenceDayOfYear: task.recurrenceDayOfYear,
        parentTaskId: task.parentTaskId,
        isRecurringInstance: task.isRecurringInstance,
        isCompleted: task.isCompleted ?? false,
        pinnedToday: task.pinnedToday ?? false,
        pinnedTomorrow: task.pinnedTomorrow ?? false,
        folderId: task.folderId,
        tagIds: task.tagIds || [],
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        computedState,
      };
    });

    // Filter by view
    if (args.view) {
      tasksWithState = tasksWithState.filter((taskWithState) => {
        const state = taskWithState.computedState;
        
        switch (args.view) {
          case "today":
            return state.inToday;
          case "tomorrow":
            return state.inTomorrow;
          case "this_week":
            return state.inThisWeek;
          case "next_week":
            return state.inNextWeek;
          case "bank":
            // Bank: show ALL tasks - this is the default home for all tasks
            // Tasks can appear in multiple views (Bank + Today/Tomorrow/Week), but Bank shows everything
            return true;
          case "someday":
            return state.isSomeday;
          case "overdue":
            return state.isOverdue;
          default:
            return true;
        }
      });
    }

    // Filter by folder
    if (args.folderId) {
      tasksWithState = tasksWithState.filter((t) => t.folderId === args.folderId);
    }

    // Filter: Not in a folder
    if (args.filterNotInFolder) {
      tasksWithState = tasksWithState.filter((t) => !t.folderId);
    }

    // Filter by tags
    if (args.tagIds && args.tagIds.length > 0) {
      tasksWithState = tasksWithState.filter((t) => {
        return args.tagIds!.some((tagId) => t.tagIds.includes(tagId));
      });
    }

    // Filter: Not tagged
    if (args.filterNotTagged) {
      tasksWithState = tasksWithState.filter((t) => !t.tagIds || t.tagIds.length === 0);
    }

    // Search
    if (args.search && args.search.trim().length > 0) {
      const searchLower = args.search.toLowerCase();
      tasksWithState = tasksWithState.filter((t) =>
        t.title.toLowerCase().includes(searchLower) ||
        (t.description && t.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort: incomplete first, then by due date (sooner first) for bank view, otherwise by updatedAt
    tasksWithState.sort((a, b) => {
      // Always put incomplete tasks first
      if (!a.isCompleted && b.isCompleted) return -1;
      if (a.isCompleted && !b.isCompleted) return 1;
      
      // For bank view, sort by due date (sooner first)
      if (args.view === "bank") {
        // Get the earliest relevant date for each task
        const getEarliestDate = (task: typeof a): number | null => {
          if (task.deadlineAt) return task.deadlineAt;
          if (task.scheduledAt) return task.scheduledAt;
          if (task.rangeStartDate) return task.rangeStartDate;
          return null;
        };
        
        const aDate = getEarliestDate(a);
        const bDate = getEarliestDate(b);
        
        // Tasks with dates come before tasks without dates
        if (aDate !== null && bDate === null) return -1;
        if (aDate === null && bDate !== null) return 1;
        
        // If both have dates, sort by date (sooner first)
        if (aDate !== null && bDate !== null) {
          return aDate - bDate;
        }
        
        // If neither has a date, sort by updatedAt (most recent first)
        return b.updatedAt - a.updatedAt;
      }
      
      // For other views, sort by updatedAt (most recent first)
      return b.updatedAt - a.updatedAt;
    });

    return tasksWithState;
  },
});

// Get single task by ID
export const get = query({
  args: {
    id: v.id("tasks"),
    sessionToken: v.optional(v.string()),
    timeContext: v.optional(v.object({
      now: v.number(),
      todayStart: v.number(),
      tomorrowStart: v.number(),
      weekStart: v.number(),
      nextWeekStart: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    const task = await ctx.db.get(args.id);
    if (!task) return null;
    
    const now = args.timeContext?.now ?? Date.now();
    const timeContext = args.timeContext ?? buildServerTimeContext(now);
    const state = getComputedTaskState(task, timeContext);
    
    return { ...task, computedState: state };
  },
});

// Get computed state for a task
export const getTaskState = query({
  args: {
    id: v.id("tasks"),
    sessionToken: v.optional(v.string()),
    timeContext: v.optional(v.object({
      now: v.number(),
      todayStart: v.number(),
      tomorrowStart: v.number(),
      weekStart: v.number(),
      nextWeekStart: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    const task = await ctx.db.get(args.id);
    if (!task) return null;
    
    const now = args.timeContext?.now ?? Date.now();
    const timeContext = args.timeContext ?? buildServerTimeContext(now);
    return getComputedTaskState(task, timeContext);
  },
});

// Create new task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    taskType: v.union(
      v.literal("none"),
      v.literal("deadline"),
      v.literal("date_range"),
      v.literal("scheduled_time"),
      v.literal("recurring")
    ),
    deadlineAt: v.optional(v.number()),
    rangeStartDate: v.optional(v.number()),
    rangeEndDate: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    // Recurrence fields
    recurrencePattern: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("specific_dates")
    )),
    recurrenceDaysOfWeek: v.optional(v.array(v.number())),
    recurrenceWeekInterval: v.optional(v.number()),
    recurrenceSpecificDates: v.optional(v.array(v.number())),
    recurrenceStartDate: v.optional(v.number()),
    recurrenceEndDate: v.optional(v.number()),
    recurrenceDayOfMonth: v.optional(v.number()),
    recurrenceMonth: v.optional(v.number()),
    recurrenceDayOfYear: v.optional(v.number()),
    pinnedToday: v.optional(v.boolean()),
    pinnedTomorrow: v.optional(v.boolean()),
    folderId: v.optional(v.id("folders")),
    tagIds: v.optional(v.array(v.string())),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const now = Date.now();
    
    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      taskType: args.taskType,
      deadlineAt: args.deadlineAt,
      rangeStartDate: args.rangeStartDate,
      rangeEndDate: args.rangeEndDate,
      scheduledAt: args.scheduledAt,
      recurrencePattern: args.recurrencePattern,
      recurrenceDaysOfWeek: args.recurrenceDaysOfWeek,
      recurrenceWeekInterval: args.recurrenceWeekInterval,
      recurrenceSpecificDates: args.recurrenceSpecificDates,
      recurrenceStartDate: args.recurrenceStartDate,
      recurrenceEndDate: args.recurrenceEndDate,
      recurrenceDayOfMonth: args.recurrenceDayOfMonth,
      recurrenceMonth: args.recurrenceMonth,
      recurrenceDayOfYear: args.recurrenceDayOfYear,
      isCompleted: false,
      pinnedToday: args.pinnedToday || false,
      pinnedTomorrow: args.pinnedTomorrow || false,
      folderId: args.folderId,
      tagIds: args.tagIds || [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update existing task
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    taskType: v.optional(v.union(
      v.literal("none"),
      v.literal("deadline"),
      v.literal("date_range"),
      v.literal("scheduled_time"),
      v.literal("recurring")
    )),
    deadlineAt: v.optional(v.number()),
    rangeStartDate: v.optional(v.number()),
    rangeEndDate: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    // Recurrence fields
    recurrencePattern: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("specific_dates")
    )),
    recurrenceDaysOfWeek: v.optional(v.array(v.number())),
    recurrenceWeekInterval: v.optional(v.number()),
    recurrenceSpecificDates: v.optional(v.array(v.number())),
    recurrenceStartDate: v.optional(v.number()),
    recurrenceEndDate: v.optional(v.number()),
    recurrenceDayOfMonth: v.optional(v.number()),
    recurrenceMonth: v.optional(v.number()),
    recurrenceDayOfYear: v.optional(v.number()),
    pinnedToday: v.optional(v.boolean()),
    pinnedTomorrow: v.optional(v.boolean()),
    folderId: v.optional(v.id("folders")),
    tagIds: v.optional(v.array(v.string())),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const { id, sessionToken, ...updates } = args;
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.taskType !== undefined) updateData.taskType = updates.taskType;
    if (updates.deadlineAt !== undefined) updateData.deadlineAt = updates.deadlineAt;
    if (updates.rangeStartDate !== undefined) updateData.rangeStartDate = updates.rangeStartDate;
    if (updates.rangeEndDate !== undefined) updateData.rangeEndDate = updates.rangeEndDate;
    if (updates.scheduledAt !== undefined) updateData.scheduledAt = updates.scheduledAt;
    if (updates.recurrencePattern !== undefined) updateData.recurrencePattern = updates.recurrencePattern;
    if (updates.recurrenceDaysOfWeek !== undefined) updateData.recurrenceDaysOfWeek = updates.recurrenceDaysOfWeek;
    if (updates.recurrenceWeekInterval !== undefined) updateData.recurrenceWeekInterval = updates.recurrenceWeekInterval;
    if (updates.recurrenceSpecificDates !== undefined) updateData.recurrenceSpecificDates = updates.recurrenceSpecificDates;
    if (updates.recurrenceStartDate !== undefined) updateData.recurrenceStartDate = updates.recurrenceStartDate;
    if (updates.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = updates.recurrenceEndDate;
    if (updates.recurrenceDayOfMonth !== undefined) updateData.recurrenceDayOfMonth = updates.recurrenceDayOfMonth;
    if (updates.recurrenceMonth !== undefined) updateData.recurrenceMonth = updates.recurrenceMonth;
    if (updates.recurrenceDayOfYear !== undefined) updateData.recurrenceDayOfYear = updates.recurrenceDayOfYear;
    if (updates.pinnedToday !== undefined) updateData.pinnedToday = updates.pinnedToday;
    if (updates.pinnedTomorrow !== undefined) updateData.pinnedTomorrow = updates.pinnedTomorrow;
    if (updates.folderId !== undefined) updateData.folderId = updates.folderId;
    if (updates.tagIds !== undefined) updateData.tagIds = updates.tagIds;
    
    await ctx.db.patch(id, updateData);
    return await ctx.db.get(id);
  },
});

// Delete task
export const deleteTask = mutation({
  args: {
    id: v.id("tasks"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});

// Delete all completed tasks
export const deleteAllCompleted = mutation({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const allTasks = await ctx.db.query("tasks").collect();
    const completedTasks = allTasks.filter((task) => task.isCompleted);
    
    // Delete all completed tasks
    for (const task of completedTasks) {
      await ctx.db.delete(task._id);
    }
    
    return { deletedCount: completedTasks.length };
  },
});

// Toggle completion
export const toggleComplete = mutation({
  args: {
    id: v.id("tasks"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    
    const newCompleted = !task.isCompleted;
    
    // When marking as completed, clear both pinnedToday and pinnedTomorrow
    await ctx.db.patch(args.id, {
      isCompleted: newCompleted,
      pinnedToday: newCompleted ? false : task.pinnedToday,
      pinnedTomorrow: newCompleted ? false : task.pinnedTomorrow,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.id);
  },
});

// Toggle pin to Today
export const togglePinToday = mutation({
  args: {
    id: v.id("tasks"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    
    await ctx.db.patch(args.id, {
      pinnedToday: !task.pinnedToday,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.id);
  },
});

// Toggle pin to Tomorrow
export const togglePinTomorrow = mutation({
  args: {
    id: v.id("tasks"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    
    await ctx.db.patch(args.id, {
      pinnedTomorrow: !task.pinnedTomorrow,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.id);
  },
});

// Get all unique tags from tasks
export const getAllTags = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const tasks = await ctx.db.query("tasks").collect();
    const tags = new Set<string>();
    
    tasks.forEach((task) => {
      task.tagIds.forEach((tag) => tags.add(tag));
    });
    
    return Array.from(tags).sort();
  },
});

// Sync Overdue tag based on computed state
export const syncOverdueTags = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    timeContext: v.optional(v.object({
      now: v.number(),
      todayStart: v.number(),
      tomorrowStart: v.number(),
      weekStart: v.number(),
      nextWeekStart: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const tasks = await ctx.db.query("tasks").collect();
    const now = args.timeContext?.now ?? Date.now();
    const timeContext = args.timeContext ?? buildServerTimeContext(now);
    let updated = 0;
    
    for (const task of tasks) {
      const state = getComputedTaskState(task, timeContext);
      const hasOverdueTag = task.tagIds.includes("Overdue");
      
      if (state.isOverdue && !hasOverdueTag) {
        await ctx.db.patch(task._id, {
          tagIds: [...task.tagIds, "Overdue"],
          updatedAt: Date.now(),
        });
        updated++;
      } else if (!state.isOverdue && hasOverdueTag) {
        await ctx.db.patch(task._id, {
          tagIds: task.tagIds.filter((tag) => tag !== "Overdue"),
          updatedAt: Date.now(),
        });
        updated++;
      }
    }
    
    return { updated };
  },
});


