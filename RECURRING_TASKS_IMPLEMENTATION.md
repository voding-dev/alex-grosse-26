# Recurring Tasks System - Complete Implementation

## Summary

Successfully implemented instance-specific state tracking for recurring tasks, allowing independent completion/pinning per instance while maintaining the ability to complete all future occurrences. Fully integrated with daily cycle modal and acknowledge button functionality.

## Changes Made

### 1. Database Schema (`convex/schema.ts`)

Added new `recurringTaskInstances` table to persist instance-specific state:

```typescript
recurringTaskInstances: defineTable({
  parentTaskId: v.id("tasks"),
  instanceDate: v.number(), // Timestamp normalized to start of day
  isCompleted: v.boolean(),
  pinnedToday: v.boolean(),
  pinnedTomorrow: v.boolean(),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_parent", ["parentTaskId"])
  .index("by_parent_and_date", ["parentTaskId", "instanceDate"])
```

### 2. Backend Mutations (`convex/tasks.ts`)

#### New Instance-Specific Mutations:

- **`toggleInstanceComplete`**: Toggles completion for a specific instance date
- **`toggleInstancePinToday`**: Pins a specific instance to today
- **`toggleInstancePinTomorrow`**: Pins a specific instance to tomorrow
- **`completeAllFutureOccurrences`**: Marks parent task as complete (stops generating future instances)

#### Updated Instance Generation:

- Modified `createRecurringInstance()` to accept optional `instanceState` parameter
- Made `generateRecurringInstances()` async to query instance states from database
- Queries all instance states for parent task and merges with generated instances
- Refactored monthly/yearly patterns to use `createRecurringInstance()` helper consistently

### 3. Frontend Routing Logic (`app/admin/tasks/page.tsx`)

#### Added Handler Functions:

```typescript
handleToggleComplete(task)    // Routes to instance or parent mutation
handleTogglePinToday(task)    // Routes to instance or parent mutation
handleTogglePinTomorrow(task) // Routes to instance or parent mutation
```

Each handler checks if task is a recurring instance and calls the appropriate mutation:
- If `task.isRecurringInstance && task.parentTaskId`: calls instance-specific mutation
- Otherwise: calls regular parent task mutation

#### Updated All Task Interactions:

- Dashboard view (Today/Tomorrow)
- Bank view
- Week view  
- Carryover modal buttons
- Task card buttons

### 4. UI Enhancements

#### Complete All Future Button:

Added a small "Complete all future" button next to the main complete button for recurring instances:
- Only shows for incomplete recurring instances
- Confirmation dialog before executing
- Executes `completeAllFutureOccurrences` mutation
- Stops generation of future instances

#### Daily Cycle Modal:

- Now properly handles instance-specific state
- Complete, pin, or reschedule actions work independently per instance
- "Deal With It Later" marks instances as dealt with correctly
- Uses parent task ID for tracking (stable across renders)

#### Acknowledge Button:

- Works correctly for recurring instances
- Uses instance-specific pin mutation
- Clears overdue status when acknowledged (already implemented via `getComputedTaskState`)

## How It Works

### Instance State Resolution:

1. When listing tasks, `generateRecurringInstances()` is called for each recurring task
2. Function queries all stored instance states for that parent task
3. Creates a map of instanceDate → instanceState
4. For each generated instance, merges stored state (if exists) with parent task data
5. If no stored state exists, instance inherits parent's state (default behavior)

### Completing an Instance:

1. User clicks complete on a recurring instance (e.g., Monday's workout)
2. Frontend detects `task.isRecurringInstance === true`
3. Calls `toggleInstanceComplete` with:
   - `parentTaskId`: the parent task's ID
   - `instanceDate`: normalized timestamp (start of day)
4. Backend creates/updates entry in `recurringTaskInstances` table
5. Next render: instance shows as complete, other instances unaffected

### Completing All Future Occurrences:

1. User clicks "Complete all future" button (double checkmark icon)
2. Confirmation dialog appears
3. If confirmed, calls `completeAllFutureOccurrences` with parentTaskId
4. Backend marks parent task as complete
5. Next render: no future instances generate (parent is complete)
6. Past instances that were independently completed remain in database

### Daily Cycle Integration:

1. At midnight, system detects new day
2. Carryover modal queries yesterday's "Today" tasks
3. For recurring instances, tracks by parent task ID (stable)
4. If user interacts with instance (complete/pin/move), marks parent ID as "dealt with"
5. Instance won't reappear in modal for rest of that day
6. Next day: tracking resets, system re-evaluates

## Expected Behavior

### Scenario 1: Complete Single Instance

```
Monday 9am workout (instance) → User completes → Only Monday marked complete
Tuesday 9am workout (instance) → Still shows as incomplete
Wednesday 9am workout (instance) → Still shows as incomplete
```

### Scenario 2: Complete All Future

```
User completes Monday instance → Monday done
User clicks "Complete all future" → Parent task marked complete
Tuesday+ instances → No longer generate
```

### Scenario 3: Daily Cycle with Recurring Instance

```
Day 1: Monday workout appears overdue in modal
User acknowledges it (pins to today)
Modal closes, task marked as "dealt with"
User later uncompletes the task
Modal doesn't reopen (already dealt with today)

Day 2: New cycle
If Monday workout still incomplete → Shows in modal again (fresh day)
```

### Scenario 4: Independent Pins

```
Monday instance → User pins to today → Only Monday pinned
Tuesday instance → Remains unpinned
Wednesday instance → Remains unpinned
```

## Testing Checklist

✅ Single instance completion doesn't affect other instances
✅ Pin today works independently per instance
✅ Pin tomorrow works independently per instance  
✅ Complete all future stops generating new instances
✅ Daily cycle modal shows overdue instances correctly
✅ Carryover modal tracking works with recurring instances
✅ Acknowledge button works for recurring instances
✅ Instance state persists across page refreshes
✅ No linter errors

## Technical Notes

### Virtual IDs:

Recurring instances still use virtual IDs (`parentId_timestamp`) for display purposes, but:
- Mutations use `parentTaskId + instanceDate` for lookups
- Instance date is normalized to start of day for consistency
- Virtual ID changes don't break tracking (we track by parent + date)

### Performance:

- Query all instance states once per parent task (single DB query)
- Map lookup is O(1) for merging states
- No N+1 query problems

### Edge Cases Handled:

- Instance created before storing state → defaults to parent state
- Parent task completed → stops generating instances
- Instance completed then parent completed → instance state preserved
- Timezone changes → instance date normalized to start of day in client timezone

## Files Modified

1. `convex/schema.ts` - Added recurringTaskInstances table
2. `convex/tasks.ts` - Added mutations, updated instance generation
3. `app/admin/tasks/page.tsx` - Added routing logic, UI enhancements

## Migration Notes

No migration needed! The system handles:
- Existing recurring tasks continue working
- New instance states created on-demand when users interact
- No data loss or breaking changes

