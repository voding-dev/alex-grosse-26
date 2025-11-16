"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { 
  CheckCircle2, 
  Circle, 
  Pin, 
  PinOff, 
  Calendar, 
  Clock, 
  CalendarRange,
  Plus,
  X,
  Edit2,
  Trash2,
  Tag as TagIcon,
  Folder,
  AlertCircle,
  Grid3x3,
  List,
  Search,
  Filter,
  X as XIcon,
  Sun,
  Moon,
  CalendarDays,
  CalendarClock,
  Home
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResizableTextarea } from "@/components/ui/resizable-textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminTabs, AdminTab, TabsContent } from "@/components/admin/admin-tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { CustomTimePicker } from "@/components/ui/custom-time-picker";
import { TagInput } from "@/components/notes/tag-input";
import { FolderSelectorNested } from "@/components/tasks/folder-selector-nested";
import { FolderNavigation } from "@/components/tasks/folder-navigation";
import { RecurrenceSelector, RecurrencePattern } from "@/components/tasks/recurrence-selector";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, isToday, isTomorrow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TaskView = "dashboard" | "today" | "tomorrow" | "this_week" | "next_week" | "bank" | "someday" | "overdue";

// Helper: Build client time context from device timezone
function buildClientTimeContext(): {
  now: number;
  todayStart: number;
  tomorrowStart: number;
  weekStart: number;
  nextWeekStart: number;
} {
  const nowDate = new Date();
  const now = nowDate.getTime();

  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0);
  const todayStart = today.getTime();

  const tomorrow = addDays(today, 1);
  const tomorrowStart = tomorrow.getTime();

  const weekStartDate = startOfWeek(today, { weekStartsOn: 0 });
  const weekStart = weekStartDate.getTime();

  const nextWeekStart = addDays(weekStartDate, 7).getTime();

  return {
    now,
    todayStart,
    tomorrowStart,
    weekStart,
    nextWeekStart,
  };
}

export default function TasksPage() {
  const { sessionToken } = useAdminAuth();
  const { toast } = useToast();

  // Helper: Get the real task ID (parent ID for recurring instances)
  const getTaskId = (task: any): Id<"tasks"> => {
    if (task.isRecurringInstance && task.parentTaskId) {
      return task.parentTaskId;
    }
    return task._id;
  };
  const [activeView, setActiveView] = useState<TaskView>("dashboard");
  // Quick Add state for Today and Tomorrow
  const [todayQuickAddText, setTodayQuickAddText] = useState("");
  const [tomorrowQuickAddText, setTomorrowQuickAddText] = useState("");
  const [editingTask, setEditingTask] = useState<Id<"tasks"> | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; taskId: Id<"tasks"> | null }>({ open: false, taskId: null });
  const [deleteAllCompletedDialog, setDeleteAllCompletedDialog] = useState(false);
  const [weekViewMode, setWeekViewMode] = useState<"list" | "week">("week");
  
  // Bank view filters
  const [selectedFolderId, setSelectedFolderId] = useState<Id<"folders"> | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterNotInFolder, setFilterNotInFolder] = useState(false);
  const [filterNotTagged, setFilterNotTagged] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<Id<"folders">>>(new Set());

  // Midnight reset / carryover dialog state
  const [carryoverDialogOpen, setCarryoverDialogOpen] = useState(false);
  const [carryoverTasks, setCarryoverTasks] = useState<any[]>([]);
  const [carryoverTimeContext, setCarryoverTimeContext] = useState<ReturnType<typeof buildClientTimeContext> | null>(null);

  // Build time context from client device timezone (memoized on mount)
  const timeContext = useMemo(() => buildClientTimeContext(), []);

  // Queries
  const allTasks = useQuery(
    api.tasks.list,
    sessionToken ? { sessionToken: sessionToken ?? undefined, timeContext } : "skip"
  ) || [];
  const tasks = useQuery(
    api.tasks.list,
    sessionToken ? { 
      sessionToken: sessionToken ?? undefined, 
      view: activeView === "dashboard" ? undefined : activeView,
      folderId: (activeView === "bank" || activeView === "someday") ? selectedFolderId : undefined,
      tagIds: (activeView === "bank" || activeView === "someday") && selectedTags.length > 0 ? selectedTags : undefined,
      search: (activeView === "bank" || activeView === "someday") && searchQuery ? searchQuery : undefined,
      filterNotInFolder: (activeView === "bank" || activeView === "someday") ? filterNotInFolder : undefined,
      filterNotTagged: (activeView === "bank" || activeView === "someday") ? filterNotTagged : undefined,
      timeContext,
    } : "skip"
  ) || [];
  
  // Separate queries for dashboard view
  const todayTasks = useQuery(
    api.tasks.list,
    sessionToken && activeView === "dashboard" ? { sessionToken: sessionToken ?? undefined, view: "today", timeContext } : "skip"
  ) || [];
  
  const tomorrowTasks = useQuery(
    api.tasks.list,
    sessionToken && activeView === "dashboard" ? { sessionToken: sessionToken ?? undefined, view: "tomorrow", timeContext } : "skip"
  ) || [];
  const allTags = useQuery(api.tasks.getAllTags, sessionToken ? { sessionToken: sessionToken ?? undefined } : "skip") || [];
  const folders = useQuery(api.folders.getHierarchy, sessionToken ? { sessionToken: sessionToken ?? undefined } : "skip") || [];
  const editingTaskData = useQuery(
    api.tasks.get,
    editingTask && sessionToken ? { id: editingTask, sessionToken: sessionToken ?? undefined, timeContext } : "skip"
  );

  // Query yesterday's "Today" tasks for carryover detection
  const carryoverQueryTasks = useQuery(
    api.tasks.list,
    sessionToken && carryoverTimeContext
      ? {
          sessionToken: sessionToken ?? undefined,
          view: "today",
          timeContext: carryoverTimeContext,
        }
      : "skip"
  ) || [];

  // Mutations
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const deleteAllCompleted = useMutation(api.tasks.deleteAllCompleted);
  const toggleComplete = useMutation(api.tasks.toggleComplete);
  const togglePinToday = useMutation(api.tasks.togglePinToday);
  const togglePinTomorrow = useMutation(api.tasks.togglePinTomorrow);
  
  // Instance-specific mutations
  const toggleInstanceComplete = useMutation(api.tasks.toggleInstanceComplete);
  const toggleInstancePinToday = useMutation(api.tasks.toggleInstancePinToday);
  const toggleInstancePinTomorrow = useMutation(api.tasks.toggleInstancePinTomorrow);
  const completeAllFutureOccurrences = useMutation(api.tasks.completeAllFutureOccurrences);

  // Helper: Route to the correct complete mutation based on task type
  const handleToggleComplete = async (task: any) => {
    if (task.isRecurringInstance && task.parentTaskId && task.scheduledAt) {
      // Normalize scheduled date to start of day for instance tracking
      const instanceDate = new Date(task.scheduledAt);
      instanceDate.setHours(0, 0, 0, 0);
      await toggleInstanceComplete({
        sessionToken: sessionToken ?? undefined,
        parentTaskId: task.parentTaskId,
        instanceDate: instanceDate.getTime(),
      });
    } else {
      await toggleComplete({
        sessionToken: sessionToken ?? undefined,
        id: getTaskId(task),
      });
    }
  };

  // Helper: Route to the correct pin today mutation
  const handleTogglePinToday = async (task: any) => {
    if (task.isRecurringInstance && task.parentTaskId && task.scheduledAt) {
      const instanceDate = new Date(task.scheduledAt);
      instanceDate.setHours(0, 0, 0, 0);
      await toggleInstancePinToday({
        sessionToken: sessionToken ?? undefined,
        parentTaskId: task.parentTaskId,
        instanceDate: instanceDate.getTime(),
      });
    } else {
      await togglePinToday({
        sessionToken: sessionToken ?? undefined,
        id: getTaskId(task),
      });
    }
  };

  // Helper: Route to the correct pin tomorrow mutation
  const handleTogglePinTomorrow = async (task: any) => {
    if (task.isRecurringInstance && task.parentTaskId && task.scheduledAt) {
      const instanceDate = new Date(task.scheduledAt);
      instanceDate.setHours(0, 0, 0, 0);
      await toggleInstancePinTomorrow({
        sessionToken: sessionToken ?? undefined,
        parentTaskId: task.parentTaskId,
        instanceDate: instanceDate.getTime(),
      });
    } else {
      await togglePinTomorrow({
        sessionToken: sessionToken ?? undefined,
        id: getTaskId(task),
      });
    }
  };

  // Quick Add handlers
  const handleQuickAddToday = async () => {
    if (!todayQuickAddText.trim()) return;

    try {
      // Set deadline to end of today (23:59:59)
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const deadlineAt = today.getTime();

      await createTask({
        sessionToken: sessionToken ?? undefined,
        title: todayQuickAddText.trim(),
        taskType: "deadline",
        deadlineAt,
        pinnedToday: false, // Don't need to pin since it's already a deadline for today
        pinnedTomorrow: false,
      });
      setTodayQuickAddText("");
      toast({
        title: "Task added",
        description: "Added to Today",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const handleQuickAddTomorrow = async () => {
    if (!tomorrowQuickAddText.trim()) return;

    try {
      // Set deadline to end of tomorrow (23:59:59)
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(23, 59, 59, 999);
      const deadlineAt = tomorrow.getTime();

      await createTask({
        sessionToken: sessionToken ?? undefined,
        title: tomorrowQuickAddText.trim(),
        taskType: "deadline",
        deadlineAt,
        pinnedToday: false,
        pinnedTomorrow: false, // Don't need to pin since it's already a deadline for tomorrow
      });
      setTomorrowQuickAddText("");
      toast({
        title: "Task added",
        description: "Added to Tomorrow",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTaskType, setEditTaskType] = useState<"none" | "deadline" | "date_range" | "scheduled_time" | "recurring">("none");
  const [editDeadlineDate, setEditDeadlineDate] = useState("");
  const [editDeadlineTime, setEditDeadlineTime] = useState("");
  const [editRangeStartDate, setEditRangeStartDate] = useState("");
  const [editRangeEndDate, setEditRangeEndDate] = useState("");
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  // Recurrence state
  const [editRecurrencePattern, setEditRecurrencePattern] = useState<RecurrencePattern>(null);
  const [editRecurrenceDaysOfWeek, setEditRecurrenceDaysOfWeek] = useState<number[]>([]);
  const [editRecurrenceWeekInterval, setEditRecurrenceWeekInterval] = useState<number>(1);
  const [editRecurrenceSpecificDates, setEditRecurrenceSpecificDates] = useState<string[]>([]);
  const [editRecurrenceStartDate, setEditRecurrenceStartDate] = useState("");
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState("");
  const [editRecurrenceDayOfMonth, setEditRecurrenceDayOfMonth] = useState<number>(1);
  const [editRecurrenceMonth, setEditRecurrenceMonth] = useState<number>(0);
  const [editRecurrenceDayOfYear, setEditRecurrenceDayOfYear] = useState<number>(1);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editFolderId, setEditFolderId] = useState<Id<"folders"> | undefined>(undefined);

  // Load editing task data
  useEffect(() => {
    if (editingTaskData) {
      setEditTitle(editingTaskData.title);
      setEditDescription(editingTaskData.description || "");
      setEditTaskType(editingTaskData.taskType);
      setEditTagIds(editingTaskData.tagIds || []);
      setEditFolderId(editingTaskData.folderId);

      if (editingTaskData.deadlineAt) {
        const deadline = new Date(editingTaskData.deadlineAt);
        setEditDeadlineDate(format(deadline, "yyyy-MM-dd"));
        setEditDeadlineTime(format(deadline, "HH:mm"));
      } else {
        setEditDeadlineDate("");
        setEditDeadlineTime("");
      }

      if (editingTaskData.rangeStartDate) {
        setEditRangeStartDate(format(new Date(editingTaskData.rangeStartDate), "yyyy-MM-dd"));
      } else {
        setEditRangeStartDate("");
      }

      if (editingTaskData.rangeEndDate) {
        setEditRangeEndDate(format(new Date(editingTaskData.rangeEndDate), "yyyy-MM-dd"));
      } else {
        setEditRangeEndDate("");
      }

      if (editingTaskData.scheduledAt) {
        const scheduled = new Date(editingTaskData.scheduledAt);
        setEditScheduledDate(format(scheduled, "yyyy-MM-dd"));
        setEditScheduledTime(format(scheduled, "HH:mm"));
      } else {
        setEditScheduledDate("");
        setEditScheduledTime("");
      }

      // Load recurrence data
      if (editingTaskData.recurrencePattern) {
        setEditRecurrencePattern(editingTaskData.recurrencePattern);
        setEditRecurrenceDaysOfWeek(editingTaskData.recurrenceDaysOfWeek || []);
        setEditRecurrenceWeekInterval(editingTaskData.recurrenceWeekInterval || 1);
        setEditRecurrenceDayOfMonth(editingTaskData.recurrenceDayOfMonth || 1);
        setEditRecurrenceMonth(editingTaskData.recurrenceMonth || 0);
        setEditRecurrenceDayOfYear(editingTaskData.recurrenceDayOfYear || 1);
        
        if (editingTaskData.recurrenceStartDate) {
          // Use local date components to avoid timezone shifting
          const date = new Date(editingTaskData.recurrenceStartDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          setEditRecurrenceStartDate(`${year}-${month}-${day}`);
        } else {
          setEditRecurrenceStartDate("");
        }
        
        if (editingTaskData.recurrenceEndDate) {
          // Use local date components to avoid timezone shifting
          const date = new Date(editingTaskData.recurrenceEndDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          setEditRecurrenceEndDate(`${year}-${month}-${day}`);
        } else {
          setEditRecurrenceEndDate("");
        }
        
        if (editingTaskData.recurrenceSpecificDates && editingTaskData.recurrenceSpecificDates.length > 0) {
          setEditRecurrenceSpecificDates(
            editingTaskData.recurrenceSpecificDates.map((ts: number) => {
              // Use local date components to avoid timezone shifting
              const date = new Date(ts);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            })
          );
        } else {
          setEditRecurrenceSpecificDates([]);
        }
      } else {
        setEditRecurrencePattern(null);
        setEditRecurrenceDaysOfWeek([]);
        setEditRecurrenceWeekInterval(1);
        setEditRecurrenceSpecificDates([]);
        setEditRecurrenceStartDate("");
        setEditRecurrenceEndDate("");
        setEditRecurrenceDayOfMonth(1);
        setEditRecurrenceMonth(0);
        setEditRecurrenceDayOfYear(1);
      }
    }
  }, [editingTaskData]);

  // Reset form when creating new task
  useEffect(() => {
    if (creatingTask) {
      setEditTitle("");
      setEditDescription("");
      setEditTaskType("none");
      setEditDeadlineDate("");
      setEditDeadlineTime("");
      setEditRangeStartDate("");
      setEditRangeEndDate("");
      setEditScheduledDate("");
      setEditScheduledTime("");
      setEditRecurrencePattern(null);
      setEditRecurrenceDaysOfWeek([]);
      setEditRecurrenceWeekInterval(1);
      setEditRecurrenceSpecificDates([]);
      setEditRecurrenceStartDate("");
      setEditRecurrenceEndDate("");
      setEditRecurrenceDayOfMonth(1);
      setEditRecurrenceMonth(0);
      setEditRecurrenceDayOfYear(1);
      setEditTagIds([]);
      setEditFolderId(undefined);
    }
  }, [creatingTask]);

  // Midnight reset detection - check if we've opened on a new calendar day
  useEffect(() => {
    if (!sessionToken) return;

    const storageKey = "task_tool_last_opened_date";
    const now = new Date();
    const todayKey = format(now, "yyyy-MM-dd");
    const lastOpened = typeof window !== "undefined"
      ? window.localStorage.getItem(storageKey)
      : null;

    // If we've opened on a new calendar day, prepare a yesterday timeContext
    if (lastOpened && lastOpened !== todayKey) {
      const yesterday = addDays(now, -1);
      const yesterdayContext = {
        now: yesterday.getTime(),
        todayStart: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0).getTime(),
        tomorrowStart: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime(),
        weekStart: startOfWeek(yesterday, { weekStartsOn: 0 }).getTime(),
        nextWeekStart: addDays(startOfWeek(yesterday, { weekStartsOn: 0 }), 7).getTime(),
      };

      setCarryoverTimeContext(yesterdayContext);
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, todayKey);
    }
  }, [sessionToken]);

  // Watch carryover query and open dialog with unfinished tasks
  useEffect(() => {
    if (!carryoverTimeContext || !sessionToken) return;
    if (!carryoverQueryTasks || carryoverQueryTasks.length === 0) return;

    const now = new Date();
    const todayKey = format(now, "yyyy-MM-dd");
    const dealtWithKey = `task_tool_dealt_with_${todayKey}`;
    
    // Get list of task IDs that were already dealt with today
    const dealtWithToday = typeof window !== "undefined"
      ? JSON.parse(window.localStorage.getItem(dealtWithKey) || "[]")
      : [];

    // Filter out completed tasks AND tasks that were already dealt with today
    // For recurring instances, check the parent task ID
    const unfinished = carryoverQueryTasks.filter((t: any) => {
      if (t.isCompleted) return false;
      
      const trackingId = t.isRecurringInstance && t.parentTaskId 
        ? String(t.parentTaskId) 
        : String(t._id);
      
      return !dealtWithToday.includes(trackingId);
    });
    
    if (unfinished.length > 0) {
      setCarryoverTasks(unfinished);
      setCarryoverDialogOpen(true);
    }
  }, [carryoverTimeContext, carryoverQueryTasks, sessionToken]);

  // Mark task as dealt with today (so it won't appear in carryover dialog again today)
  // For recurring instances, use the parent task ID instead of the virtual instance ID
  const markTaskAsDealtWith = (task: any) => {
    if (typeof window === "undefined") return;
    
    // For recurring instances, track the parent task ID, not the virtual instance ID
    const trackingId = task.isRecurringInstance && task.parentTaskId 
      ? String(task.parentTaskId) 
      : String(task._id);
    
    const now = new Date();
    const todayKey = format(now, "yyyy-MM-dd");
    const dealtWithKey = `task_tool_dealt_with_${todayKey}`;
    
    const dealtWithToday = JSON.parse(window.localStorage.getItem(dealtWithKey) || "[]");
    if (!dealtWithToday.includes(trackingId)) {
      dealtWithToday.push(trackingId);
      window.localStorage.setItem(dealtWithKey, JSON.stringify(dealtWithToday));
    }
  };

  // Handle date range start date change
  const handleRangeStartDateChange = (date: string) => {
    setEditRangeStartDate(date);
    // If end date is set and is before the new start date, clear it
    if (editRangeEndDate && date && editRangeEndDate < date) {
      setEditRangeEndDate("");
    }
  };

  // Open edit dialog
  const handleEdit = (taskId: Id<"tasks">) => {
    setEditingTask(taskId);
    setCreatingTask(false);
  };

  // Open create dialog
  const handleCreate = () => {
    setCreatingTask(true);
    setEditingTask(null);
  };

  // Save task (create or update)
  const handleSaveTask = async () => {
    if (!editTitle.trim()) return;

    try {
      let deadlineAt: number | undefined;
      let rangeStartDate: number | undefined;
      let rangeEndDate: number | undefined;
      let scheduledAt: number | undefined;

      if (editTaskType === "deadline" && editDeadlineDate) {
        const date = new Date(editDeadlineDate);
        if (editDeadlineTime) {
          const [hours, minutes] = editDeadlineTime.split(":").map(Number);
          date.setHours(hours, minutes, 0, 0);
        } else {
          date.setHours(23, 59, 59, 999);
        }
        deadlineAt = date.getTime();
      }

      if (editTaskType === "date_range") {
        if (editRangeStartDate) {
          const start = new Date(editRangeStartDate);
          start.setHours(0, 0, 0, 0);
          rangeStartDate = start.getTime();
        }
        if (editRangeEndDate) {
          const end = new Date(editRangeEndDate);
          end.setHours(23, 59, 59, 999);
          rangeEndDate = end.getTime();
        }
      }

      if (editTaskType === "scheduled_time" && editScheduledDate && editScheduledTime) {
        const scheduled = new Date(editScheduledDate);
        const [hours, minutes] = editScheduledTime.split(":").map(Number);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledAt = scheduled.getTime();
      }

      // Recurrence data
      let recurrenceStartDate: number | undefined;
      let recurrenceEndDate: number | undefined;
      let recurrenceSpecificDates: number[] | undefined;
      
      if (editTaskType === "recurring" && editRecurrencePattern && editRecurrenceStartDate) {
        // Parse date string in local timezone to avoid shifting
        const [year, month, day] = editRecurrenceStartDate.split('-').map(Number);
        const start = new Date(year, month - 1, day, 0, 0, 0, 0);
        recurrenceStartDate = start.getTime();
        
        if (editRecurrenceEndDate) {
          // Parse date string in local timezone to avoid shifting
          const [endYear, endMonth, endDay] = editRecurrenceEndDate.split('-').map(Number);
          const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
          recurrenceEndDate = end.getTime();
        }
        
        if (editRecurrencePattern === "specific_dates" && editRecurrenceSpecificDates.length > 0) {
          recurrenceSpecificDates = editRecurrenceSpecificDates.map((dateStr) => {
            // Parse date string in local timezone to avoid shifting
            const [y, m, d] = dateStr.split('-').map(Number);
            const date = new Date(y, m - 1, d, 0, 0, 0, 0);
            return date.getTime();
          });
        }
      }

      if (creatingTask) {
        await createTask({
          sessionToken: sessionToken ?? undefined,
          title: editTitle,
          description: editDescription || undefined,
          taskType: editTaskType,
          deadlineAt,
          rangeStartDate,
          rangeEndDate,
          scheduledAt,
          recurrencePattern: editRecurrencePattern || undefined,
          recurrenceDaysOfWeek: editRecurrenceDaysOfWeek.length > 0 ? editRecurrenceDaysOfWeek : undefined,
          recurrenceWeekInterval: editRecurrenceWeekInterval > 1 ? editRecurrenceWeekInterval : undefined,
          recurrenceSpecificDates,
          recurrenceStartDate,
          recurrenceEndDate,
          recurrenceDayOfMonth: editRecurrenceDayOfMonth > 1 ? editRecurrenceDayOfMonth : undefined,
          recurrenceMonth: editRecurrenceMonth > 0 ? editRecurrenceMonth : undefined,
          recurrenceDayOfYear: editRecurrenceDayOfYear > 1 ? editRecurrenceDayOfYear : undefined,
          tagIds: editTagIds,
          folderId: editFolderId,
        });
        toast({
          title: "Task created",
          description: "Your task has been created.",
        });
      } else if (editingTask) {
        await updateTask({
          sessionToken: sessionToken ?? undefined,
          id: editingTask,
          title: editTitle,
          description: editDescription || undefined,
          taskType: editTaskType,
          deadlineAt,
          rangeStartDate,
          rangeEndDate,
          scheduledAt,
          recurrencePattern: editRecurrencePattern || undefined,
          recurrenceDaysOfWeek: editRecurrenceDaysOfWeek.length > 0 ? editRecurrenceDaysOfWeek : undefined,
          recurrenceWeekInterval: editRecurrenceWeekInterval > 1 ? editRecurrenceWeekInterval : undefined,
          recurrenceSpecificDates,
          recurrenceStartDate,
          recurrenceEndDate,
          recurrenceDayOfMonth: editRecurrenceDayOfMonth > 1 ? editRecurrenceDayOfMonth : undefined,
          recurrenceMonth: editRecurrenceMonth > 0 ? editRecurrenceMonth : undefined,
          recurrenceDayOfYear: editRecurrenceDayOfYear > 1 ? editRecurrenceDayOfYear : undefined,
          tagIds: editTagIds,
          folderId: editFolderId,
        });
        toast({
          title: "Task updated",
          description: "Your task has been updated.",
        });
      }

      setEditingTask(null);
      setCreatingTask(false);
    } catch (error) {
      toast({
        title: "Error",
        description: creatingTask ? "Failed to create task" : "Failed to update task",
        variant: "destructive",
      });
    }
  };

  // Delete task
  const handleDelete = async () => {
    if (!deleteDialog.taskId) return;

    try {
      await deleteTask({ sessionToken: sessionToken ?? undefined, id: deleteDialog.taskId });
      setDeleteDialog({ open: false, taskId: null });
      toast({
        title: "Task deleted",
        description: "The task has been deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllCompleted = async () => {
    try {
      const result = await deleteAllCompleted({ sessionToken: sessionToken ?? undefined });
      setDeleteAllCompletedDialog(false);
      toast({
        title: "Completed tasks deleted",
        description: `${result.deletedCount} completed task${result.deletedCount === 1 ? "" : "s"} deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete completed tasks",
        variant: "destructive",
      });
    }
  };

  // Format task date/time display
  const formatTaskDateTime = (task: typeof tasks[0]) => {
    if (task.taskType === "deadline" && task.deadlineAt) {
      const date = new Date(task.deadlineAt);
      return `Due ${format(date, "MMM d, yyyy")}${date.getHours() !== 23 || date.getMinutes() !== 59 ? ` at ${format(date, "h:mm a")}` : ""}`;
    }
    if (task.taskType === "date_range" && task.rangeStartDate && task.rangeEndDate) {
      const start = new Date(task.rangeStartDate);
      const end = new Date(task.rangeEndDate);
      return `${format(start, "MMM d")} → ${format(end, "MMM d, yyyy")}`;
    }
    if (task.taskType === "scheduled_time" && task.scheduledAt) {
      const date = new Date(task.scheduledAt);
      return `${format(date, "MMM d, yyyy")} @ ${format(date, "h:mm a")}`;
    }
    return null;
  };

  // Week view data
  const weekDays = useMemo(() => {
    const now = new Date();
    let weekStart = startOfWeek(now, { weekStartsOn: 0 });
    let weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    
    // If viewing next week, add 7 days
    if (activeView === "next_week") {
      weekStart = addDays(weekStart, 7);
      weekEnd = addDays(weekEnd, 7);
    }
    
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [activeView]);

  // Get all tasks for week view
  const weekTasks = useQuery(
    api.tasks.list,
    sessionToken && (activeView === "this_week" || activeView === "next_week") ? { sessionToken: sessionToken ?? undefined, view: activeView, timeContext } : "skip"
  ) || [];

  const tasksByDay = useMemo(() => {
    const grouped: Record<string, typeof weekTasks> = {};
    const now = Date.now();
    
    weekDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayStartTime = dayStart.getTime();
      const dayEndTime = dayStartTime + 24 * 60 * 60 * 1000 - 1;
      
      grouped[dayKey] = weekTasks.filter((task) => {
        // For today/tomorrow, use computed state
        if (isToday(day)) {
          // Import the helper function logic or compute inline
          if (task.pinnedToday) return true;
          if (task.isCompleted) return false;
          
          if (task.taskType === "deadline" && task.deadlineAt) {
            const deadlineDay = new Date(task.deadlineAt);
            deadlineDay.setHours(0, 0, 0, 0);
            return deadlineDay.getTime() === dayStartTime;
          }
          if (task.taskType === "scheduled_time" && task.scheduledAt) {
            const scheduledDay = new Date(task.scheduledAt);
            scheduledDay.setHours(0, 0, 0, 0);
            return scheduledDay.getTime() === dayStartTime;
          }
          if (task.taskType === "date_range" && task.rangeStartDate && task.rangeEndDate) {
            const start = new Date(task.rangeStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(task.rangeEndDate);
            end.setHours(23, 59, 59, 999);
            return dayStartTime >= start.getTime() && dayStartTime <= end.getTime();
          }
        }
        
        if (isTomorrow(day)) {
          if (task.pinnedTomorrow) return true;
          if (task.isCompleted) return false;
          
          if (task.taskType === "deadline" && task.deadlineAt) {
            const deadlineDay = new Date(task.deadlineAt);
            deadlineDay.setHours(0, 0, 0, 0);
            const dayBefore = new Date(deadlineDay);
            dayBefore.setDate(dayBefore.getDate() - 1);
            return dayBefore.getTime() === dayStartTime;
          }
          if (task.taskType === "scheduled_time" && task.scheduledAt) {
            const scheduledDay = new Date(task.scheduledAt);
            scheduledDay.setHours(0, 0, 0, 0);
            const dayBefore = new Date(scheduledDay);
            dayBefore.setDate(dayBefore.getDate() - 1);
            return dayBefore.getTime() === dayStartTime;
          }
          if (task.taskType === "date_range" && task.rangeStartDate && task.rangeEndDate) {
            const start = new Date(task.rangeStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(task.rangeEndDate);
            end.setHours(23, 59, 59, 999);
            const dayBeforeStart = new Date(start);
            dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
            const endMinusOne = new Date(end);
            endMinusOne.setDate(endMinusOne.getDate() - 1);
            return dayStartTime >= dayBeforeStart.getTime() && dayStartTime <= endMinusOne.getTime();
          }
        }
        
        // For other days, check if task date matches
        // Date range tasks should show on ALL days within their range
        if (task.taskType === "date_range" && task.rangeStartDate && task.rangeEndDate) {
          if (task.isCompleted) return false;
          const start = new Date(task.rangeStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(task.rangeEndDate);
          end.setHours(23, 59, 59, 999);
          // Show on this day if the day falls within the range
          return dayStartTime >= start.getTime() && dayStartTime <= end.getTime();
        }
        
        if (task.deadlineAt) {
          const deadline = new Date(task.deadlineAt);
          return isSameDay(deadline, day);
        }
        if (task.scheduledAt) {
          const scheduled = new Date(task.scheduledAt);
          return isSameDay(scheduled, day);
        }
        // Already handled date_range above, so skip here
        return false;
      });
    });
    return grouped;
  }, [weekTasks, weekDays]);

  const isDialogOpen = !!editingTask || creatingTask;

  // Flatten folder hierarchy for lookups
  const flattenFolders = useMemo(() => {
    const result: Array<{ _id: Id<"folders">; name: string }> = [];
    const traverse = (folderList: typeof folders) => {
      folderList.forEach((folder) => {
        result.push({ _id: folder._id, name: folder.name });
        if (folder.children && folder.children.length > 0) {
          traverse(folder.children);
        }
      });
    };
    traverse(folders);
    return result;
  }, [folders]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Tasks
            </h1>
            <p className="text-foreground/70 text-base sm:text-lg">
              Manage your tasks and deadlines with time-light organization
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setDeleteAllCompletedDialog(true)}
              variant="outline"
              className="font-black uppercase tracking-wider border-foreground/20 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors w-full sm:w-auto"
              style={{ fontWeight: '900' }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Delete Completed</span>
              <span className="sm:hidden">Delete Done</span>
            </Button>
            <Button
              onClick={handleCreate}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors w-full sm:w-auto"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>


        {/* Tabs */}
        <AdminTabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as TaskView)}
          tabs={[
            { value: "dashboard", label: "Dashboard" },
            { value: "this_week", label: "This Week" },
            { value: "next_week", label: "Next Week" },
            { value: "someday", label: "Someday" },
            { value: "bank", label: "Bank" },
            { value: "overdue", label: "Overdue" },
          ]}
          maxWidth="full"
          gridCols={6}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            {(activeView === "this_week" || activeView === "next_week") && (
              <div className="flex items-center gap-2 border border-foreground/10 rounded-lg p-1 bg-foreground/5">
                <button
                  onClick={() => setWeekViewMode("list")}
                  className={`p-2 rounded transition-all ${weekViewMode === "list" ? "bg-accent text-background shadow-sm" : "hover:bg-foreground/10 text-foreground/60"}`}
                  style={weekViewMode === "list" ? { backgroundColor: '#FFA617' } : {}}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setWeekViewMode("week")}
                  className={`p-2 rounded transition-all ${weekViewMode === "week" ? "bg-accent text-background shadow-sm" : "hover:bg-foreground/10 text-foreground/60"}`}
                  style={weekViewMode === "week" ? { backgroundColor: '#FFA617' } : {}}
                  aria-label="Week view"
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <TabsContent value={activeView} className="mt-0">
            <TooltipProvider>
              {activeView === "dashboard" ? (
                <DashboardView
                  todayTasks={todayTasks}
                  tomorrowTasks={tomorrowTasks}
                  folders={flattenFolders}
                  allTags={allTags}
                  timeContext={timeContext}
                  onToggleComplete={handleToggleComplete}
                  onTogglePinToday={handleTogglePinToday}
                  onTogglePinTomorrow={handleTogglePinTomorrow}
                  onEdit={(task) => handleEdit(getTaskId(task))}
                  onDelete={(task) => setDeleteDialog({ open: true, taskId: getTaskId(task) })}
                  onCompleteAllFuture={async (task) => {
                    if (task.isRecurringInstance && task.parentTaskId) {
                      await completeAllFutureOccurrences({ sessionToken: sessionToken ?? undefined, parentTaskId: task.parentTaskId });
                      toast({ title: "Completed", description: "All future occurrences completed" });
                    }
                  }}
                  formatTaskDateTime={formatTaskDateTime}
                  todayQuickAddText={todayQuickAddText}
                  onTodayQuickAddTextChange={setTodayQuickAddText}
                  onQuickAddToday={handleQuickAddToday}
                  tomorrowQuickAddText={tomorrowQuickAddText}
                  onTomorrowQuickAddTextChange={setTomorrowQuickAddText}
                  onQuickAddTomorrow={handleQuickAddTomorrow}
                />
              ) : activeView === "bank" || activeView === "someday" ? (
              <BankView
                tasks={tasks}
                folders={folders}
                flattenFolders={flattenFolders}
                allTags={allTags}
                selectedFolderId={selectedFolderId}
                onFolderSelect={setSelectedFolderId}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterNotInFolder={filterNotInFolder}
                onFilterNotInFolderChange={setFilterNotInFolder}
                filterNotTagged={filterNotTagged}
                onFilterNotTaggedChange={setFilterNotTagged}
                expandedFolders={expandedFolders}
                onToggleExpand={(id) => {
                  const newExpanded = new Set(expandedFolders);
                  if (newExpanded.has(id)) {
                    newExpanded.delete(id);
                  } else {
                    newExpanded.add(id);
                  }
                  setExpandedFolders(newExpanded);
                }}
                onToggleComplete={handleToggleComplete}
                onTogglePinToday={handleTogglePinToday}
                onTogglePinTomorrow={handleTogglePinTomorrow}
                onEdit={(task) => handleEdit(getTaskId(task))}
                onDelete={(task) => setDeleteDialog({ open: true, taskId: getTaskId(task) })}
                onCompleteAllFuture={async (task) => {
                  if (task.isRecurringInstance && task.parentTaskId) {
                    await completeAllFutureOccurrences({ sessionToken: sessionToken ?? undefined, parentTaskId: task.parentTaskId });
                    toast({ title: "Completed", description: "All future occurrences completed" });
                  }
                }}
                formatTaskDateTime={formatTaskDateTime}
              />
            ) : (activeView === "this_week" || activeView === "next_week") && weekViewMode === "week" ? (
              <WeekView tasks={weekTasks} weekDays={weekDays} tasksByDay={tasksByDay} />
            ) : (
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <Card className="border border-foreground/10 bg-foreground/5">
                    <CardContent className="py-16 text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                      <p className="text-lg font-black uppercase tracking-wider text-foreground/60 mb-2" style={{ fontWeight: '900' }}>
                        No tasks in this view
                      </p>
                      <p className="text-sm text-foreground/50">
                        {activeView === "this_week" && weekViewMode === "list" && "Tasks for this week will appear here"}
                        {activeView === "next_week" && weekViewMode === "list" && "Tasks for next week will appear here"}
                        {activeView === "overdue" && "Overdue tasks will appear here"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
                        {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          onToggleComplete={() => handleToggleComplete(task)}
                          onTogglePinToday={() => handleTogglePinToday(task)}
                          onTogglePinTomorrow={() => handleTogglePinTomorrow(task)}
                          onEdit={() => handleEdit(getTaskId(task))}
                          onDelete={() => setDeleteDialog({ open: true, taskId: getTaskId(task) })}
                          onCompleteAllFuture={task.isRecurringInstance && task.parentTaskId ? async () => {
                            await completeAllFutureOccurrences({ sessionToken: sessionToken ?? undefined, parentTaskId: task.parentTaskId });
                            toast({ title: "Completed", description: "All future occurrences completed" });
                          } : undefined}
                          formatDateTime={formatTaskDateTime(task)}
                          folders={flattenFolders}
                          allTags={allTags}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              )}
            </TooltipProvider>
          </TabsContent>
        </AdminTabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingTask(null);
            setCreatingTask(false);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 sm:p-0">
            <div className="overflow-y-auto p-4 sm:p-6 flex-1" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-wider text-xl" style={{ fontWeight: '900' }}>
                {creatingTask ? "Create New Task" : "Edit Task"}
              </DialogTitle>
              <DialogDescription className="text-foreground/70">
                {creatingTask ? "Add a new task with details and scheduling" : "Update task details and settings"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-6 mt-2">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Title *
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Task title"
                  className="border-foreground/20 focus:border-accent/40 bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Description
                </label>
                <div className="group">
                  <ResizableTextarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Optional description or notes"
                    minRows={4}
                    maxRows={20}
                    className="pr-8"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Task Type
                </label>
                <Select value={editTaskType} onValueChange={(v) => setEditTaskType(v as any)}>
                  <SelectTrigger className="border-foreground/20 focus:border-accent/40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="date_range">Date Range</SelectItem>
                    <SelectItem value="scheduled_time">Scheduled Time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editTaskType === "deadline" && (
                <div className="space-y-4 p-5 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                      Deadline Date *
                    </label>
                    <CustomDatePicker
                      value={editDeadlineDate}
                      onChange={setEditDeadlineDate}
                      placeholder="Select deadline date"
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  {editDeadlineDate && (
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                        Time (optional)
                      </label>
                      <CustomTimePicker
                        value={editDeadlineTime}
                        onChange={setEditDeadlineTime}
                        placeholder="Select time"
                      />
                    </div>
                  )}
                </div>
              )}

              {editTaskType === "date_range" && (
                <div className="space-y-4 p-5 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                      Start Date *
                    </label>
                    <CustomDatePicker
                      value={editRangeStartDate}
                      onChange={handleRangeStartDateChange}
                      placeholder="Select start date"
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                      End Date *
                    </label>
                    <CustomDatePicker
                      value={editRangeEndDate}
                      onChange={setEditRangeEndDate}
                      placeholder="Select end date"
                      min={editRangeStartDate || format(new Date(), "yyyy-MM-dd")}
                      rangeStartDate={editRangeStartDate}
                    />
                  </div>
                </div>
              )}

              {editTaskType === "scheduled_time" && (
                <div className="space-y-4 p-5 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                      Date *
                    </label>
                    <CustomDatePicker
                      value={editScheduledDate}
                      onChange={setEditScheduledDate}
                      placeholder="Select date"
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  {editScheduledDate && (
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                        Time *
                      </label>
                      <CustomTimePicker
                        value={editScheduledTime}
                        onChange={setEditScheduledTime}
                        placeholder="Select time"
                      />
                    </div>
                  )}
                </div>
              )}

              {editTaskType === "recurring" && (
                <RecurrenceSelector
                  pattern={editRecurrencePattern}
                  onPatternChange={setEditRecurrencePattern}
                  daysOfWeek={editRecurrenceDaysOfWeek}
                  onDaysOfWeekChange={setEditRecurrenceDaysOfWeek}
                  weekInterval={editRecurrenceWeekInterval}
                  onWeekIntervalChange={setEditRecurrenceWeekInterval}
                  specificDates={editRecurrenceSpecificDates}
                  onSpecificDatesChange={setEditRecurrenceSpecificDates}
                  startDate={editRecurrenceStartDate}
                  onStartDateChange={setEditRecurrenceStartDate}
                  endDate={editRecurrenceEndDate}
                  onEndDateChange={setEditRecurrenceEndDate}
                  dayOfMonth={editRecurrenceDayOfMonth}
                  onDayOfMonthChange={setEditRecurrenceDayOfMonth}
                  month={editRecurrenceMonth}
                  onMonthChange={setEditRecurrenceMonth}
                  dayOfYear={editRecurrenceDayOfYear}
                  onDayOfYearChange={setEditRecurrenceDayOfYear}
                />
              )}

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Tags
                </label>
                <TagInput
                  tags={editTagIds}
                  onTagsChange={setEditTagIds}
                  availableTags={allTags}
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Folder
                </label>
                <FolderSelectorNested
                  folderId={editFolderId}
                  onFolderChange={setEditFolderId}
                  availableFolders={folders}
                  sessionToken={sessionToken ?? undefined}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 sm:pt-6 border-t border-foreground/10">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingTask(null);
                    setCreatingTask(false);
                  }}
                  className="font-black uppercase tracking-wider border-foreground/20 hover:border-accent/40 w-full sm:w-auto"
                  style={{ fontWeight: '900' }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTask} 
                  disabled={!editTitle.trim()}
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50 w-full sm:w-auto"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  {creatingTask ? "Create Task" : "Save Changes"}
                </Button>
              </div>
            </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, taskId: deleteDialog.taskId })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="font-black uppercase tracking-wider"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete All Completed Dialog */}
        <AlertDialog open={deleteAllCompletedDialog} onOpenChange={setDeleteAllCompletedDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase tracking-wider text-xl" style={{ fontWeight: '900' }}>
                Delete All Completed Tasks
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/70 pt-2">
                This will permanently delete all tasks marked as completed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <AlertDialogCancel 
                className="font-black uppercase tracking-wider border-foreground/20 hover:border-foreground/40 w-full sm:w-auto" 
                style={{ fontWeight: '900' }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAllCompleted}
                className="font-black uppercase tracking-wider w-full sm:w-auto"
                style={{ backgroundColor: '#dc2626', fontWeight: '900' }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Completed
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Carryover Dialog - Midnight Reset */}
        <Dialog open={carryoverDialogOpen} onOpenChange={setCarryoverDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-wider text-lg" style={{ fontWeight: '900' }}>
                New day, old tasks
              </DialogTitle>
              <DialogDescription className="text-foreground/70">
                Hey, you didn&apos;t do these yesterday. Now you&apos;ve got a bit more on your plate today.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
              {carryoverTasks.map((task) => (
                <div
                  key={String(task._id)}
                  className="flex items-start justify-between gap-3 rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground wrap-break-word">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-foreground/60 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-foreground/20"
                            onClick={async () => {
                              await handleToggleComplete(task);
                              markTaskAsDealtWith(task);
                              setCarryoverTasks(carryoverTasks.filter((t) => t._id !== task._id));
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Complete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-foreground/20"
                            onClick={async () => {
                              await handleTogglePinToday(task);
                              markTaskAsDealtWith(task);
                              setCarryoverTasks(carryoverTasks.filter((t) => t._id !== task._id));
                            }}
                          >
                            <Sun className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Today</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-foreground/20"
                            onClick={async () => {
                              await handleTogglePinTomorrow(task);
                              markTaskAsDealtWith(task);
                              setCarryoverTasks(carryoverTasks.filter((t) => t._id !== task._id));
                            }}
                          >
                            <Moon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tomorrow</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-foreground/20"
                            onClick={() => {
                              markTaskAsDealtWith(task);
                              setEditingTask(getTaskId(task));
                              setCarryoverDialogOpen(false);
                            }}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Reschedule</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-red-500 text-red-600"
                            onClick={() => {
                              markTaskAsDealtWith(task);
                              setDeleteDialog({ open: true, taskId: getTaskId(task) });
                              setCarryoverTasks(carryoverTasks.filter((t) => t._id !== task._id));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
            {/* Batch actions */}
            {carryoverTasks.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row justify-between gap-3">
                <div className="text-xs text-foreground/60">
                  These tasks are now treated as <span className="font-semibold text-red-600">overdue</span> and still appear in Today until you move, complete, or delete them.
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-black uppercase tracking-wider border-foreground/20"
                    style={{ fontWeight: '900' }}
                    onClick={async () => {
                      // Batch mark all carryover as complete and dealt with
                      for (const t of carryoverTasks) {
                        await handleToggleComplete(t);
                        markTaskAsDealtWith(t);
                      }
                      setCarryoverDialogOpen(false);
                    }}
                  >
                    Mark All Done
                  </Button>
                  <Button
                    size="sm"
                    className="font-black uppercase tracking-wider"
                    style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                    onClick={() => {
                      // Mark all carryover tasks as dealt with
                      for (const t of carryoverTasks) {
                        markTaskAsDealtWith(t);
                      }
                      setCarryoverDialogOpen(false);
                    }}
                  >
                    Deal With It Later
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Bank View Component with Navigation and Filtering
function BankView({
  tasks,
  folders,
  flattenFolders,
  allTags,
  selectedFolderId,
  onFolderSelect,
  selectedTags,
  onTagsChange,
  searchQuery,
  onSearchChange,
  filterNotInFolder,
  onFilterNotInFolderChange,
  filterNotTagged,
  onFilterNotTaggedChange,
  expandedFolders,
  onToggleExpand,
  onToggleComplete,
  onTogglePinToday,
  onTogglePinTomorrow,
  onEdit,
  onDelete,
  onCompleteAllFuture,
  formatTaskDateTime,
}: {
  tasks: any[];
  folders: any[];
  flattenFolders: Array<{ _id: Id<"folders">; name: string }>;
  allTags: string[];
  selectedFolderId?: Id<"folders">;
  onFolderSelect: (folderId: Id<"folders"> | undefined) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterNotInFolder: boolean;
  onFilterNotInFolderChange: (value: boolean) => void;
  filterNotTagged: boolean;
  onFilterNotTaggedChange: (value: boolean) => void;
  expandedFolders: Set<Id<"folders">>;
  onToggleExpand: (id: Id<"folders">) => void;
  onToggleComplete: (task: any) => void;
  onTogglePinToday: (task: any) => void;
  onTogglePinTomorrow: (task: any) => void;
  onEdit: (task: any) => void;
  onDelete: (task: any) => void;
  onCompleteAllFuture: (task: any) => void;
  formatTaskDateTime: (task: any) => string | null;
}) {
  const hasActiveFilters = selectedFolderId || selectedTags.length > 0 || searchQuery.trim().length > 0 || filterNotInFolder || filterNotTagged;

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    onFolderSelect(undefined);
    onTagsChange([]);
    onSearchChange("");
    onFilterNotInFolderChange(false);
    onFilterNotTaggedChange(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
      {/* Sidebar - Folder Navigation & Filters */}
      <div className="lg:col-span-1 space-y-6">
        {/* Folder Navigation */}
        <Card className="border border-foreground/10 bg-foreground/5">
          <CardHeader className="pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ fontWeight: '900' }}>
              <Folder className="h-4 w-4 text-accent" />
              Folders
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
            {/* All Tasks Button */}
            <button
              onClick={() => onFolderSelect(undefined)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group",
                !selectedFolderId
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground border border-transparent"
              )}
            >
              <Home className="h-4 w-4 shrink-0" />
              <span className={cn("font-medium", !selectedFolderId && "font-bold")}>
                All Tasks
              </span>
            </button>

            {/* Not in a folder checkbox */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={filterNotInFolder}
                onCheckedChange={(checked) => onFilterNotInFolderChange(checked === true)}
                className="border-foreground/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
              />
              <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors font-medium">
                Not in a folder
              </span>
            </label>

            {/* Divider */}
            <div className="border-t border-foreground/10" />

            {/* Folder Navigation Tree */}
            <FolderNavigation
              folders={folders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              showAllTasks={false}
            />
          </CardContent>
        </Card>

        {/* Tag Filters */}
        <Card className="border border-foreground/10 bg-foreground/5">
          <CardHeader className="pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ fontWeight: '900' }}>
              <TagIcon className="h-4 w-4 text-accent" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
            <div className="pb-3 border-b border-foreground/10">
              <label className="flex items-center gap-2 cursor-pointer group">
                <Checkbox
                  checked={filterNotTagged}
                  onCheckedChange={(checked) => onFilterNotTaggedChange(checked === true)}
                  className="border-foreground/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
                <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors font-medium">
                  Not tagged
                </span>
              </label>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
              {allTags.length === 0 ? (
                <p className="text-xs text-foreground/40 text-center py-4">No tags yet</p>
              ) : (
                allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${
                      selectedTags.includes(tag)
                        ? "bg-accent/20 text-accent border-accent/30 shadow-sm"
                        : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground border-transparent hover:border-foreground/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TagIcon className={`h-3.5 w-3.5 ${selectedTags.includes(tag) ? "text-accent" : "text-foreground/50"}`} />
                      <span className="font-medium">{tag}</span>
                      {selectedTags.includes(tag) && (
                        <XIcon className="h-3.5 w-3.5 ml-auto text-accent" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Search & Tasks */}
      <div className="lg:col-span-3 space-y-6">
        {/* Search Bar */}
        <Card className="border border-foreground/10 bg-foreground/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search tasks by title or description..."
                  className="pl-10 border-foreground/20 focus:border-accent/40 bg-background"
                />
              </div>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="font-black uppercase tracking-wider border-foreground/20 hover:border-accent/40 whitespace-nowrap"
                  style={{ fontWeight: '900' }}
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 p-4 bg-foreground/5 border border-foreground/10 rounded-lg">
            <span className="text-xs font-black uppercase tracking-wider text-foreground/60 mr-1" style={{ fontWeight: '900' }}>
              Active Filters:
            </span>
            {selectedFolderId && (
              <Badge 
                variant="secondary" 
                className="text-xs font-black uppercase tracking-wider border-foreground/20 bg-background hover:bg-foreground/5 transition-colors" 
                style={{ fontWeight: '900' }}
              >
                <Folder className="h-3 w-3 mr-1.5" />
                {flattenFolders.find((f) => f._id === selectedFolderId)?.name || "Folder"}
                <button
                  onClick={() => onFolderSelect(undefined)}
                  className="ml-2 hover:text-foreground transition-colors"
                  aria-label="Remove folder filter"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs font-black uppercase tracking-wider border-foreground/20 bg-background hover:bg-foreground/5 transition-colors"
                style={{ fontWeight: '900' }}
              >
                <TagIcon className="h-3 w-3 mr-1.5" />
                {tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="ml-2 hover:text-foreground transition-colors"
                  aria-label={`Remove ${tag} filter`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {searchQuery && (
              <Badge 
                variant="secondary" 
                className="text-xs font-black uppercase tracking-wider border-foreground/20 bg-background hover:bg-foreground/5 transition-colors" 
                style={{ fontWeight: '900' }}
              >
                <Search className="h-3 w-3 mr-1.5" />
                "{searchQuery}"
                <button
                  onClick={() => onSearchChange("")}
                  className="ml-2 hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterNotInFolder && (
              <Badge 
                variant="secondary" 
                className="text-xs font-black uppercase tracking-wider border-foreground/20 bg-background hover:bg-foreground/5 transition-colors" 
                style={{ fontWeight: '900' }}
              >
                <Folder className="h-3 w-3 mr-1.5" />
                Not in a folder
                <button
                  onClick={() => onFilterNotInFolderChange(false)}
                  className="ml-2 hover:text-foreground transition-colors"
                  aria-label="Remove not in folder filter"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterNotTagged && (
              <Badge 
                variant="secondary" 
                className="text-xs font-black uppercase tracking-wider border-foreground/20 bg-background hover:bg-foreground/5 transition-colors" 
                style={{ fontWeight: '900' }}
              >
                <TagIcon className="h-3 w-3 mr-1.5" />
                Not tagged
                <button
                  onClick={() => onFilterNotTaggedChange(false)}
                  className="ml-2 hover:text-foreground transition-colors"
                  aria-label="Remove not tagged filter"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card className="border border-foreground/10 bg-foreground/5">
              <CardContent className="py-16 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                <p className="text-lg font-black uppercase tracking-wider text-foreground/60 mb-2" style={{ fontWeight: '900' }}>
                  No tasks found
                </p>
                <p className="text-sm text-foreground/50 mb-6">
                  {hasActiveFilters 
                    ? "Try adjusting your filters or search query"
                    : "Create a new task to get started"
                  }
                </p>
                {hasActiveFilters && (
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    size="sm"
                    className="font-black uppercase tracking-wider border-foreground/20 hover:border-accent/40"
                    style={{ fontWeight: '900' }}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                </p>
              </div>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onToggleComplete={() => onToggleComplete(task)}
                    onTogglePinToday={() => onTogglePinToday(task)}
                    onTogglePinTomorrow={() => onTogglePinTomorrow(task)}
                    onEdit={() => onEdit(task)}
                    onDelete={() => onDelete(task)}
                    onCompleteAllFuture={() => onCompleteAllFuture(task)}
                    formatDateTime={formatTaskDateTime(task)}
                    folders={flattenFolders}
                    allTags={allTags}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ tasks, weekDays, tasksByDay }: { tasks: any[]; weekDays: Date[]; tasksByDay: Record<string, any[]> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 sm:gap-4">
      {weekDays.map((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const dayTasks = tasksByDay[dayKey] || [];
        const isDayToday = isToday(day);
        const isDayTomorrow = isTomorrow(day);

        return (
          <Card 
            key={dayKey} 
            className={`border transition-all ${isDayToday ? "border-accent/40 bg-accent/5 shadow-sm" : "border-foreground/10 bg-foreground/5"} hover:border-accent/20`}
          >
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider mb-1" style={{ fontWeight: '900' }}>
                {format(day, "EEE")}
              </CardTitle>
              <p className={`text-xs font-medium ${isDayToday ? "text-accent" : "text-foreground/60"}`}>
                {format(day, "MMM d")}
              </p>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2">
              {dayTasks.length === 0 ? (
                <p className="text-xs text-foreground/40 text-center py-6">No tasks</p>
              ) : (
                dayTasks.map((task) => (
                  <div
                    key={task._id}
                    className={`p-2 sm:p-2.5 rounded-lg border text-xs transition-all ${
                      task.isCompleted 
                        ? "opacity-50 border-foreground/10 bg-foreground/5" 
                        : "border-foreground/20 bg-background hover:border-accent/40 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      {task.isCompleted ? (
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-foreground/40 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium leading-snug text-xs ${task.isCompleted ? "line-through text-foreground/60" : ""}`}>
                          {task.title}
                        </p>
                        {task.taskType === "scheduled_time" && task.scheduledAt && (
                          <p className="text-foreground/60 mt-0.5 sm:mt-1 font-medium text-xs">
                            {format(new Date(task.scheduledAt), "h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Dashboard View Component
function DashboardView({
  todayTasks,
  tomorrowTasks,
  folders,
  allTags,
  timeContext,
  onToggleComplete,
  onTogglePinToday,
  onTogglePinTomorrow,
  onEdit,
  onDelete,
  onCompleteAllFuture,
  formatTaskDateTime,
  todayQuickAddText,
  onTodayQuickAddTextChange,
  onQuickAddToday,
  tomorrowQuickAddText,
  onTomorrowQuickAddTextChange,
  onQuickAddTomorrow,
}: {
  todayTasks: any[];
  tomorrowTasks: any[];
  folders: Array<{ _id: Id<"folders">; name: string }>;
  allTags: string[];
  timeContext: { now: number; todayStart: number; tomorrowStart: number; weekStart: number; nextWeekStart: number };
  onToggleComplete: (task: any) => void;
  onTogglePinToday: (task: any) => void;
  onTogglePinTomorrow: (task: any) => void;
  onEdit: (task: any) => void;
  onDelete: (task: any) => void;
  onCompleteAllFuture: (task: any) => void;
  formatTaskDateTime: (task: any) => string | null;
  todayQuickAddText: string;
  onTodayQuickAddTextChange: (text: string) => void;
  onQuickAddToday: () => void;
  tomorrowQuickAddText: string;
  onTomorrowQuickAddTextChange: (text: string) => void;
  onQuickAddTomorrow: () => void;
}) {
  // Calculate today and tomorrow dates for display
  const todayDate = new Date(timeContext.todayStart);
  const tomorrowDate = new Date(timeContext.tomorrowStart);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Today Container */}
      <Card className="border border-foreground/10 bg-transparent">
        <CardHeader className="pb-4 px-5 sm:px-6 pt-5 sm:pt-6 border-b border-foreground/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-2 sm:p-2.5 rounded-lg bg-accent/20 border border-accent/30 shadow-sm shrink-0">
                <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-foreground truncate" style={{ fontWeight: '900' }}>
                  Today
                </h2>
                <p className="text-xs font-medium text-foreground/60">
                  {format(todayDate, "EEEE, MMMM d")}
                </p>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="text-xs font-black uppercase tracking-wider border-foreground/20 bg-background shrink-0" 
              style={{ fontWeight: '900' }}
            >
              {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {/* Quick Add for Today */}
          <div className="mb-4 pb-4 border-b border-foreground/10">
            <div className="flex gap-2">
              <Input
                value={todayQuickAddText}
                onChange={(e) => onTodayQuickAddTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onQuickAddToday();
                  }
                }}
                placeholder="Quick add task..."
                className="flex-1 h-10 border-foreground/20 focus:border-accent/40 bg-background text-sm placeholder:text-foreground/50"
              />
              <Button 
                onClick={onQuickAddToday} 
                disabled={!todayQuickAddText.trim()}
                className="font-black uppercase tracking-wider h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all text-xs"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
            </div>
          </div>

          {todayTasks.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-foreground/30 mb-4" />
              <p className="text-sm font-black uppercase tracking-wider text-foreground/60 mb-2" style={{ fontWeight: '900' }}>
                No tasks for today
              </p>
              <p className="text-xs text-foreground/50">
                Add tasks to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onToggleComplete={() => onToggleComplete(task)}
                  onTogglePinToday={() => onTogglePinToday(task)}
                  onTogglePinTomorrow={() => onTogglePinTomorrow(task)}
                  onEdit={() => onEdit(task)}
                  onDelete={() => onDelete(task)}
                  onCompleteAllFuture={() => onCompleteAllFuture(task)}
                  formatDateTime={formatTaskDateTime(task)}
                  folders={folders}
                  allTags={allTags}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tomorrow Container */}
      <Card className="border border-foreground/10 bg-transparent">
        <CardHeader className="pb-4 px-5 sm:px-6 pt-5 sm:pt-6 border-b border-foreground/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-2 sm:p-2.5 rounded-lg bg-accent/20 border border-accent/30 shadow-sm shrink-0">
                <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-foreground truncate" style={{ fontWeight: '900' }}>
                  Tomorrow
                </h2>
                <p className="text-xs font-medium text-foreground/60">
                  {format(tomorrowDate, "EEEE, MMMM d")}
                </p>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="text-xs font-black uppercase tracking-wider border-foreground/20 bg-background shrink-0" 
              style={{ fontWeight: '900' }}
            >
              {tomorrowTasks.length} {tomorrowTasks.length === 1 ? "task" : "tasks"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {/* Quick Add for Tomorrow */}
          <div className="mb-4 pb-4 border-b border-foreground/10">
            <div className="flex gap-2">
              <Input
                value={tomorrowQuickAddText}
                onChange={(e) => onTomorrowQuickAddTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onQuickAddTomorrow();
                  }
                }}
                placeholder="Quick add task..."
                className="flex-1 h-10 border-foreground/20 focus:border-accent/40 bg-background text-sm placeholder:text-foreground/50"
              />
              <Button 
                onClick={onQuickAddTomorrow} 
                disabled={!tomorrowQuickAddText.trim()}
                className="font-black uppercase tracking-wider h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all text-xs"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
            </div>
          </div>

          {tomorrowTasks.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarClock className="mx-auto h-12 w-12 text-foreground/30 mb-4" />
              <p className="text-sm font-black uppercase tracking-wider text-foreground/60 mb-2" style={{ fontWeight: '900' }}>
                No tasks for tomorrow
              </p>
              <p className="text-xs text-foreground/50">
                Tasks will appear here the day before their deadline
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tomorrowTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onToggleComplete={() => onToggleComplete(task)}
                  onTogglePinToday={() => onTogglePinToday(task)}
                  onTogglePinTomorrow={() => onTogglePinTomorrow(task)}
                  onEdit={() => onEdit(task)}
                  onDelete={() => onDelete(task)}
                  onCompleteAllFuture={() => onCompleteAllFuture(task)}
                  formatDateTime={formatTaskDateTime(task)}
                  folders={folders}
                  allTags={allTags}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  onToggleComplete,
  onTogglePinToday,
  onTogglePinTomorrow,
  onEdit,
  onDelete,
  onCompleteAllFuture,
  formatDateTime,
  folders,
  allTags,
}: {
  task: any; // task.computedState is present
  onToggleComplete: () => void;
  onTogglePinToday: () => void;
  onTogglePinTomorrow: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCompleteAllFuture?: () => void;
  formatDateTime: string | null;
  folders: Array<{ _id: Id<"folders">; name: string }>;
  allTags: string[];
}) {
  const folder = task.folderId ? folders.find((f) => f._id === task.folderId) : null;
  const isOverdue = task.computedState?.isOverdue;

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "border transition-all",
          task.isCompleted
            ? "opacity-60 border-foreground/10 bg-foreground/5"
            : isOverdue
              ? "border-red-500/80 bg-background ring-1 ring-red-500/60"
              : "border-foreground/10 hover:border-accent/40 bg-background"
        )}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-start gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleComplete}
                    className="mt-0.5 shrink-0 transition-transform hover:scale-110 active:scale-95 touch-manipulation p-1 -m-1"
                    aria-label={task.isCompleted ? "Mark incomplete" : "Mark complete"}
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 sm:h-5 sm:w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 sm:h-5 sm:w-5 text-foreground/40 hover:text-accent transition-colors" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{task.isCompleted ? "Mark incomplete" : "Mark complete"}</p>
                </TooltipContent>
              </Tooltip>
              {task.isRecurringInstance && !task.isCompleted && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (task.parentTaskId && onCompleteAllFuture && window.confirm("Complete all future occurrences? This will stop generating new instances.")) {
                          onCompleteAllFuture();
                        }
                      }}
                      className="mt-0.5 shrink-0 transition-all hover:bg-accent/10 rounded p-1 -m-1 touch-manipulation"
                      aria-label="Complete all future occurrences"
                    >
                      <CheckCircle2 className="h-4 w-4 sm:h-4 sm:w-4 text-foreground/40 hover:text-accent" strokeWidth={3} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Complete all future</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-base leading-snug ${task.isCompleted ? "line-through text-foreground/60" : "text-foreground"}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <div className="mt-2">
                    <p 
                      className="text-sm text-foreground/60 leading-relaxed whitespace-pre-line line-clamp-3"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {task.description}
                    </p>
                  </div>
                )}
                {formatDateTime && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-foreground/70">
                    {task.taskType === "deadline" && <Calendar className="h-4 w-4 text-foreground/50" />}
                    {task.taskType === "date_range" && <CalendarRange className="h-4 w-4 text-foreground/50" />}
                    {task.taskType === "scheduled_time" && <Clock className="h-4 w-4 text-foreground/50" />}
                    <span>{formatDateTime}</span>
                  </div>
                )}
                {(task.tagIds && task.tagIds.length > 0) || folder ? (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {task.tagIds && task.tagIds.length > 0 && task.tagIds.map((tagId: string) => (
                      <Badge 
                        key={tagId} 
                        variant="secondary" 
                        className="text-xs font-black uppercase tracking-wider border-foreground/20 bg-background"
                        style={{ fontWeight: '900' }}
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tagId}
                      </Badge>
                    ))}
                    {folder && (
                      <Badge variant="outline" className="text-xs border-foreground/20 bg-background">
                        <Folder className="h-3 w-3 mr-1" />
                        {folder.name}
                      </Badge>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pt-0.5">
                {isOverdue && !task.isCompleted && !task.pinnedToday && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onTogglePinToday}
                        className="p-2.5 sm:p-2 rounded-lg transition-all bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 hover:text-orange-700 touch-manipulation border border-orange-500/30"
                        aria-label="Acknowledge overdue"
                      >
                        <AlertCircle className="h-4 w-4 sm:h-4 sm:w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">Acknowledge</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onTogglePinToday}
                      className={`p-2.5 sm:p-2 rounded-lg transition-all hover:bg-foreground/5 touch-manipulation ${task.pinnedToday ? "text-accent bg-accent/10" : "text-foreground/40"}`}
                      aria-label="Pin to Today"
                    >
                      {task.pinnedToday ? (
                        <CalendarDays className="h-4 w-4 sm:h-4 sm:w-4 text-accent" />
                      ) : (
                        <CalendarDays className="h-4 w-4 sm:h-4 sm:w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{task.pinnedToday ? "Unpin from Today" : "Pin to Today"}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onTogglePinTomorrow}
                      className={`p-2.5 sm:p-2 rounded-lg transition-all hover:bg-foreground/5 touch-manipulation ${task.pinnedTomorrow ? "text-accent bg-accent/10" : "text-foreground/40"}`}
                      aria-label="Pin to Tomorrow"
                    >
                      {task.pinnedTomorrow ? (
                        <CalendarClock className="h-4 w-4 sm:h-4 sm:w-4 text-accent" />
                      ) : (
                        <CalendarClock className="h-4 w-4 sm:h-4 sm:w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{task.pinnedTomorrow ? "Unpin from Tomorrow" : "Pin to Tomorrow"}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onEdit}
                      className="p-2.5 sm:p-2 rounded-lg transition-all hover:bg-foreground/5 text-foreground/60 hover:text-accent touch-manipulation"
                      aria-label="Edit task"
                    >
                      <Edit2 className="h-4 w-4 sm:h-4 sm:w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Edit task</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onDelete}
                      className="p-2.5 sm:p-2 rounded-lg transition-all hover:bg-red-500/10 text-red-600 hover:text-red-700 touch-manipulation"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4 sm:h-4 sm:w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Delete task</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
