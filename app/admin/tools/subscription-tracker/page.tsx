"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  Search,
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { TagInput } from "@/components/notes/tag-input";

// Helper function to get due date status color
function getDueDateStatus(nextDueDate: number): {
  color: string;
  bgColor: string;
  label: string;
} {
  const now = Date.now();
  const daysUntilDue = differenceInDays(nextDueDate, now);
  
  if (nextDueDate < now) {
    return {
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
      label: "Overdue",
    };
  } else if (daysUntilDue <= 7) {
    return {
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
      label: "Due Soon",
    };
  } else if (daysUntilDue <= 14) {
    return {
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
      label: "Upcoming",
    };
  } else {
    return {
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
      label: "Up to Date",
    };
  }
}

// Format currency
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function SubscriptionTrackerPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<"subscriptions" | "payment-methods">("subscriptions");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "paused" | "archived" | "overdue" | "dueSoon">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"nextDueDate" | "amount" | "name" | "createdAt">("nextDueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Subscription dialogs
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Id<"subscriptions"> | null>(null);
  const [subscriptionFormData, setSubscriptionFormData] = useState({
    name: "",
    amount: "",
    currency: "USD",
    billingCycle: "monthly" as "monthly" | "yearly" | "quarterly" | "weekly",
    startDate: "",
    paymentMethodId: "none" as string | Id<"subscriptionPaymentMethods"> | "none" | undefined,
    notes: "",
    tags: [] as string[],
  });
  
  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSubscriptionForPayment, setSelectedSubscriptionForPayment] = useState<Id<"subscriptions"> | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    paidDate: "",
    amount: "",
    paymentMethodId: "none" as string | Id<"subscriptionPaymentMethods"> | "none" | undefined,
    notes: "",
  });
  
  // Payment method dialogs
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<Id<"subscriptionPaymentMethods"> | null>(null);
  const [paymentMethodFormData, setPaymentMethodFormData] = useState({
    name: "",
    color: "#22c55e",
    isDefault: false,
    sortOrder: 0,
  });
  
  // Delete confirmations
  const [deleteSubscriptionId, setDeleteSubscriptionId] = useState<Id<"subscriptions"> | null>(null);
  const [deletePaymentMethodId, setDeletePaymentMethodId] = useState<Id<"subscriptionPaymentMethods"> | null>(null);
  
  // View details
  const [viewingSubscriptionId, setViewingSubscriptionId] = useState<Id<"subscriptions"> | null>(null);
  
  // Queries
  const stats = useQuery(api.subscriptions.subscriptionsGetStats) || {
    total: 0,
    active: 0,
    paused: 0,
    archived: 0,
    overdue: 0,
    dueSoon: 0,
    totalMonthly: 0,
  };
  
  const paymentMethods = useQuery(api.subscriptions.paymentMethodsListSorted) || [];
  const allSubscriptionTags = useQuery(api.subscriptions.getAllSubscriptionTags) || [];
  
  const subscriptions = useQuery(
    api.subscriptions.subscriptionsList,
    {
      status: filterStatus === "all" ? undefined : filterStatus === "overdue" || filterStatus === "dueSoon" ? "active" : filterStatus,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
    }
  ) || [];
  
  const overdueSubscriptions = useQuery(api.subscriptions.subscriptionsGetOverdue) || [];
  const upcomingSubscriptions = useQuery(api.subscriptions.subscriptionsGetUpcoming, { days: 7 }) || [];
  
  // Preview payment calculation (uses backend logic for consistency)
  const paymentAmount = paymentFormData.amount ? parseFloat(paymentFormData.amount) : undefined;
  const previewPayment = useQuery(
    api.subscriptions.subscriptionPreviewPayment,
    selectedSubscriptionForPayment && paymentAmount && !isNaN(paymentAmount) && paymentAmount > 0
      ? {
          id: selectedSubscriptionForPayment,
          amount: paymentAmount,
        }
      : selectedSubscriptionForPayment
      ? {
          id: selectedSubscriptionForPayment,
        }
      : "skip"
  );
  
  // Filter subscriptions based on overdue/dueSoon
  const filteredSubscriptions = useMemo(() => {
    if (filterStatus === "overdue") {
      return subscriptions.filter((sub) => {
        const now = Date.now();
        return sub.status === "active" && sub.nextDueDate < now;
      });
    } else if (filterStatus === "dueSoon") {
      return subscriptions.filter((sub) => {
        const now = Date.now();
        const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
        return sub.status === "active" && sub.nextDueDate >= now && sub.nextDueDate <= sevenDaysFromNow;
      });
    }
    return subscriptions;
  }, [subscriptions, filterStatus]);
  
  const viewingSubscription = useQuery(
    api.subscriptions.subscriptionsGet,
    viewingSubscriptionId ? { id: viewingSubscriptionId } : "skip"
  );
  
  const paymentHistory = useQuery(
    api.subscriptions.paymentsList,
    viewingSubscriptionId ? { subscriptionId: viewingSubscriptionId } : "skip"
  ) || [];
  
  // Mutations
  const createSubscription = useMutation(api.subscriptions.subscriptionCreate);
  const updateSubscription = useMutation(api.subscriptions.subscriptionUpdate);
  const updateSubscriptionStatus = useMutation(api.subscriptions.subscriptionUpdateStatus);
  const markAsPaid = useMutation(api.subscriptions.subscriptionMarkAsPaid);
  const removeSubscription = useMutation(api.subscriptions.subscriptionRemove);
  
  const createPaymentMethod = useMutation(api.subscriptions.paymentMethodCreate);
  const updatePaymentMethod = useMutation(api.subscriptions.paymentMethodUpdate);
  const removePaymentMethod = useMutation(api.subscriptions.paymentMethodRemove);
  
  // Handlers
  const handleOpenSubscriptionDialog = (subscriptionId?: Id<"subscriptions">) => {
    if (subscriptionId) {
      const sub = subscriptions.find((s) => s._id === subscriptionId);
      if (sub) {
        setEditingSubscription(subscriptionId);
        setSubscriptionFormData({
          name: sub.name,
          amount: sub.amount.toString(),
          currency: sub.currency,
          billingCycle: sub.billingCycle,
          startDate: format(new Date(sub.startDate), "yyyy-MM-dd"),
          paymentMethodId: sub.paymentMethodId || "none",
          notes: sub.notes || "",
          tags: sub.tags || [],
        });
      }
    } else {
      setEditingSubscription(null);
        setSubscriptionFormData({
          name: "",
          amount: "",
          currency: "USD",
          billingCycle: "monthly",
          startDate: format(new Date(), "yyyy-MM-dd"),
          paymentMethodId: "none",
          notes: "",
          tags: [],
        });
    }
    setSubscriptionDialogOpen(true);
  };
  
  const handleSaveSubscription = async () => {
    if (!subscriptionFormData.name || !subscriptionFormData.amount || !subscriptionFormData.startDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (name, amount, start date)",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const amount = parseFloat(subscriptionFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Amount must be a positive number",
          variant: "destructive",
        });
        return;
      }
      
      // Parse date string (yyyy-mm-dd) as local date, not UTC
      // This prevents timezone issues that shift the date back by one day
      const [year, month, day] = subscriptionFormData.startDate.split('-').map(Number);
      const startDate = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
      const startDateTimestamp = startDate.getTime();
      
      if (editingSubscription) {
        await updateSubscription({
          id: editingSubscription,
          name: subscriptionFormData.name,
          amount,
          currency: subscriptionFormData.currency,
          billingCycle: subscriptionFormData.billingCycle,
          startDate: startDateTimestamp,
          paymentMethodId: subscriptionFormData.paymentMethodId && subscriptionFormData.paymentMethodId !== "none"
            ? (subscriptionFormData.paymentMethodId as Id<"subscriptionPaymentMethods">)
            : undefined,
          notes: subscriptionFormData.notes || undefined,
          tags: subscriptionFormData.tags.length > 0 ? subscriptionFormData.tags : undefined,
        });
        
        toast({
          title: "Subscription Updated",
          description: "Subscription has been updated successfully",
        });
      } else {
        await createSubscription({
          name: subscriptionFormData.name,
          amount,
          currency: subscriptionFormData.currency,
          billingCycle: subscriptionFormData.billingCycle,
          startDate: startDateTimestamp,
          paymentMethodId: subscriptionFormData.paymentMethodId && subscriptionFormData.paymentMethodId !== "none"
            ? (subscriptionFormData.paymentMethodId as Id<"subscriptionPaymentMethods">)
            : undefined,
          notes: subscriptionFormData.notes || undefined,
          tags: subscriptionFormData.tags || undefined,
        });
        
        toast({
          title: "Subscription Created",
          description: "Subscription has been created successfully",
        });
      }
      
      setSubscriptionDialogOpen(false);
      setEditingSubscription(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save subscription",
        variant: "destructive",
      });
    }
  };
  
  const handleOpenPaymentDialog = (subscriptionId: Id<"subscriptions">) => {
    const sub = subscriptions.find((s) => s._id === subscriptionId);
    if (sub) {
      setSelectedSubscriptionForPayment(subscriptionId);
      setPaymentFormData({
        paidDate: format(new Date(), "yyyy-MM-dd"),
        amount: sub.amount.toString(),
        paymentMethodId: sub.paymentMethodId || "none",
        notes: "",
      });
      setPaymentDialogOpen(true);
    }
  };
  
  const handleMarkAsPaid = async () => {
    if (!selectedSubscriptionForPayment || !paymentFormData.paidDate) {
      toast({
        title: "Validation Error",
        description: "Please select a subscription and payment date",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const paidDate = new Date(paymentFormData.paidDate);
      const paidDateTimestamp = paidDate.getTime();
      
      const amount = paymentFormData.amount
        ? parseFloat(paymentFormData.amount)
        : undefined;
      
      if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
        toast({
          title: "Validation Error",
          description: "Amount must be a positive number",
          variant: "destructive",
        });
        return;
      }
      
      const result = await markAsPaid({
        id: selectedSubscriptionForPayment,
        paidDate: paidDateTimestamp,
        amount,
        paymentMethodId: paymentFormData.paymentMethodId && paymentFormData.paymentMethodId !== "none"
          ? (paymentFormData.paymentMethodId as Id<"subscriptionPaymentMethods">)
          : undefined,
        notes: paymentFormData.notes || undefined,
      });
      
      // Format periods text
      const sub = subscriptions.find((s) => s._id === selectedSubscriptionForPayment);
      const billingCycle = sub?.billingCycle || "monthly";
      const cycleSingular = billingCycle === "monthly" ? "month" : 
                           billingCycle === "yearly" ? "year" : 
                           billingCycle === "quarterly" ? "quarter" : "week";
      const cyclePlural = billingCycle === "monthly" ? "months" : 
                         billingCycle === "yearly" ? "years" : 
                         billingCycle === "quarterly" ? "quarters" : "weeks";
      
      const periodsText = result.periodsCovered === 1 
        ? `1 ${cycleSingular}` 
        : `${result.periodsCovered} ${cyclePlural}`;
      
      // Build description with balance info
      let description = `$${result.paymentAmount.toFixed(2)}`;
      if (result.balanceApplied > 0) {
        description += ` + $${result.balanceApplied.toFixed(2)} balance`;
      }
      description += ` covers ${periodsText}`;
      if (result.newBalance > 0) {
        description += `. New balance: $${result.newBalance.toFixed(2)}`;
      }
      description += `. Next due: ${format(new Date(result.nextDueDate), "MMM d, yyyy")}`;
      
      toast({
        title: "Payment Recorded",
        description,
      });
      
      setPaymentDialogOpen(false);
      setSelectedSubscriptionForPayment(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  };
  
  const handleOpenPaymentMethodDialog = (methodId?: Id<"subscriptionPaymentMethods">) => {
    if (methodId) {
      const method = paymentMethods.find((m) => m._id === methodId);
      if (method) {
        setEditingPaymentMethod(methodId);
        setPaymentMethodFormData({
          name: method.name,
          color: method.color,
          isDefault: method.isDefault || false,
          sortOrder: method.sortOrder || 0,
        });
      }
    } else {
      setEditingPaymentMethod(null);
      setPaymentMethodFormData({
        name: "",
        color: "#22c55e",
        isDefault: false,
        sortOrder: paymentMethods.length,
      });
    }
    setPaymentMethodDialogOpen(true);
  };
  
  const handleSavePaymentMethod = async () => {
    if (!paymentMethodFormData.name || !paymentMethodFormData.color) {
      toast({
        title: "Validation Error",
        description: "Please fill in name and color",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (editingPaymentMethod) {
        await updatePaymentMethod({
          id: editingPaymentMethod,
          name: paymentMethodFormData.name,
          color: paymentMethodFormData.color,
          isDefault: paymentMethodFormData.isDefault,
          sortOrder: paymentMethodFormData.sortOrder,
        });
        
        toast({
          title: "Payment Method Updated",
          description: "Payment method has been updated successfully",
        });
      } else {
        await createPaymentMethod({
          name: paymentMethodFormData.name,
          color: paymentMethodFormData.color,
          isDefault: paymentMethodFormData.isDefault,
          sortOrder: paymentMethodFormData.sortOrder,
        });
        
        toast({
          title: "Payment Method Created",
          description: "Payment method has been created successfully",
        });
      }
      
      setPaymentMethodDialogOpen(false);
      setEditingPaymentMethod(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save payment method",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteSubscription = async () => {
    if (!deleteSubscriptionId) return;
    
    try {
      await removeSubscription({ id: deleteSubscriptionId });
      toast({
        title: "Subscription Deleted",
        description: "Subscription has been deleted successfully",
      });
      setDeleteSubscriptionId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription",
        variant: "destructive",
      });
    }
  };
  
  const handleDeletePaymentMethod = async () => {
    if (!deletePaymentMethodId) return;
    
    try {
      await removePaymentMethod({ id: deletePaymentMethodId });
      toast({
        title: "Payment Method Deleted",
        description: "Payment method has been deleted successfully",
      });
      setDeletePaymentMethodId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment method",
        variant: "destructive",
      });
    }
  };
  
  const handleSort = (column: "nextDueDate" | "amount" | "name" | "createdAt") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };
  
  const getSortIcon = (column: "nextDueDate" | "amount" | "name" | "createdAt") => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-foreground/40" />;
    }
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-accent" />
      : <ArrowDown className="h-3 w-3 ml-1 text-accent" />;
  };
  
  // Status management handlers
  const handleArchiveSubscription = async (id: Id<"subscriptions">) => {
    try {
      await updateSubscriptionStatus({ id, status: "archived" });
      toast({
        title: "Subscription Archived",
        description: "The subscription has been archived.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to archive subscription",
        variant: "destructive",
      });
    }
  };

  const handleRestoreSubscription = async (id: Id<"subscriptions">) => {
    try {
      await updateSubscriptionStatus({ id, status: "active" });
      toast({
        title: "Subscription Restored",
        description: "The subscription has been restored to active.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to restore subscription",
        variant: "destructive",
      });
    }
  };

  const handlePauseSubscription = async (id: Id<"subscriptions">) => {
    try {
      await updateSubscriptionStatus({ id, status: "paused" });
      toast({
        title: "Subscription Paused",
        description: "The subscription has been paused.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to pause subscription",
        variant: "destructive",
      });
    }
  };

  const handleActivateSubscription = async (id: Id<"subscriptions">) => {
    try {
      await updateSubscriptionStatus({ id, status: "active" });
      toast({
        title: "Subscription Activated",
        description: "The subscription has been activated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to activate subscription",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Subscription Tracker
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Track and manage all your recurring payments
          </p>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border border-foreground/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <CreditCard className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50" style={{ fontWeight: '900' }}>
                Total
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
              {stats.total}
            </div>
            <p className="text-xs text-foreground/40">
              Subscriptions
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-foreground/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <DollarSign className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50" style={{ fontWeight: '900' }}>
                Monthly
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
              {formatCurrency(stats.totalMonthly)}
            </div>
            <p className="text-xs text-foreground/40">
              Total per month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-foreground/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50" style={{ fontWeight: '900' }}>
                Overdue
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
              {stats.overdue}
            </div>
            <p className="text-xs text-foreground/40">
              Need attention
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-foreground/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50" style={{ fontWeight: '900' }}>
                Due Soon
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
              {stats.dueSoon}
            </div>
            <p className="text-xs text-foreground/40">
              Next 7 days
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "subscriptions" | "payment-methods")} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger
            value="subscriptions"
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Subscriptions
          </TabsTrigger>
          <TabsTrigger
            value="payment-methods"
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Payment Methods
          </TabsTrigger>
        </TabsList>
        
        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          {/* Filters and Actions */}
          <Card className="border border-foreground/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search subscriptions..."
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="dueSoon">Due Soon</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={() => handleOpenSubscriptionDialog()} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Subscriptions List */}
          {filteredSubscriptions.length === 0 ? (
            <Card className="border border-foreground/20">
              <CardContent className="p-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
                <p className="text-foreground/60">
                  {searchQuery || filterStatus !== "all"
                    ? "No subscriptions match your filters"
                    : "No subscriptions yet. Add your first subscription to get started."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubscriptions.map((subscription) => {
                const status = getDueDateStatus(subscription.nextDueDate);
                const paymentMethod = subscription.paymentMethod;
                
                return (
                  <Card
                    key={subscription._id}
                    className={`border-2 transition-all hover:shadow-md ${status.bgColor}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-black uppercase tracking-tight text-foreground mb-1" style={{ fontWeight: '900' }}>
                            {subscription.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                              {formatCurrency(subscription.amount, subscription.currency)}
                            </span>
                            <span className="text-sm text-foreground/60">
                              /{subscription.billingCycle === "monthly" ? "mo" : subscription.billingCycle === "yearly" ? "yr" : subscription.billingCycle === "quarterly" ? "qtr" : "wk"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {subscription.status === "active" && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-bold uppercase">
                              Active
                            </span>
                          )}
                          {subscription.status === "paused" && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 text-xs font-bold uppercase">
                              Paused
                            </span>
                          )}
                          {subscription.status === "archived" && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase">
                              Archived
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-foreground/60" />
                          <span className="text-sm text-foreground/80">
                            Due: {format(new Date(subscription.nextDueDate), "MMM d, yyyy")}
                          </span>
                        </div>
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${status.color} ${status.bgColor}`}>
                          {status.label}
                        </span>
                      </div>
                      
                      {paymentMethod && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: paymentMethod.color }}
                          />
                          <span className="text-sm text-foreground/60">
                            {paymentMethod.name}
                          </span>
                        </div>
                      )}
                      
                      {(subscription.balance || 0) > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            Balance: {formatCurrency(subscription.balance || 0, subscription.currency)}
                          </span>
                        </div>
                      )}
                      
                      {subscription.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {subscription.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-foreground/5 text-xs text-foreground/60"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-2 pt-2 border-t border-foreground/10">
                        <div className="flex items-center gap-2">
                          {subscription.status === "active" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPaymentDialog(subscription._id)}
                              className="flex-1"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setViewingSubscriptionId(subscription._id);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenSubscriptionDialog(subscription._id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteSubscriptionId(subscription._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscription.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePauseSubscription(subscription._id)}
                                className="flex-1"
                              >
                                Pause
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleArchiveSubscription(subscription._id)}
                                className="flex-1"
                              >
                                Archive
                              </Button>
                            </>
                          )}
                          {subscription.status === "paused" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleActivateSubscription(subscription._id)}
                                className="flex-1"
                              >
                                Activate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleArchiveSubscription(subscription._id)}
                                className="flex-1"
                              >
                                Archive
                              </Button>
                            </>
                          )}
                          {subscription.status === "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestoreSubscription(subscription._id)}
                              className="flex-1"
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                    Payment Methods
                  </CardTitle>
                  <CardDescription>
                    Manage your payment methods and their colors
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenPaymentMethodDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Method
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
                  <p className="text-foreground/60 mb-4">
                    No payment methods yet. Add your first payment method to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paymentMethods.map((method) => (
                    <Card key={method._id} className="border border-foreground/10">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full border-2 border-foreground/20"
                              style={{ backgroundColor: method.color }}
                            />
                            <div>
                              <h3 className="font-bold text-foreground">{method.name}</h3>
                              {method.isDefault && (
                                <span className="text-xs text-foreground/60">Default</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPaymentMethodDialog(method._id)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletePaymentMethodId(method._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? "Edit Subscription" : "Add Subscription"}
            </DialogTitle>
            <DialogDescription>
              {editingSubscription
                ? "Update subscription details"
                : "Add a new recurring payment to track"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={subscriptionFormData.name}
                  onChange={(e) =>
                    setSubscriptionFormData({ ...subscriptionFormData, name: e.target.value })
                  }
                  placeholder="e.g., Netflix"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={subscriptionFormData.amount}
                  onChange={(e) =>
                    setSubscriptionFormData({ ...subscriptionFormData, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={subscriptionFormData.currency}
                  onValueChange={(value) =>
                    setSubscriptionFormData({ ...subscriptionFormData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle *</Label>
                <Select
                  value={subscriptionFormData.billingCycle}
                  onValueChange={(value) =>
                    setSubscriptionFormData({
                      ...subscriptionFormData,
                      billingCycle: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <CustomDatePicker
                  value={subscriptionFormData.startDate}
                  onChange={(value) =>
                    setSubscriptionFormData({ ...subscriptionFormData, startDate: value })
                  }
                  placeholder="Select start date"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={subscriptionFormData.paymentMethodId || "none"}
                  onValueChange={(value) =>
                    setSubscriptionFormData({
                      ...subscriptionFormData,
                      paymentMethodId: value === "none" ? undefined : (value as Id<"subscriptionPaymentMethods">),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method._id} value={method._id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                tags={subscriptionFormData.tags}
                onTagsChange={(tags) => setSubscriptionFormData({ ...subscriptionFormData, tags })}
                availableTags={allSubscriptionTags}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={subscriptionFormData.notes}
                onChange={(e) =>
                  setSubscriptionFormData({ ...subscriptionFormData, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubscription}>
              {editingSubscription ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Mark as Paid Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Record a payment and advance the due date based on amount paid
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Subscription Info */}
            {selectedSubscriptionForPayment && (() => {
              const sub = subscriptions.find((s) => s._id === selectedSubscriptionForPayment);
              if (!sub) return null;
              
              // Calculate payment amount
              const paymentAmount = paymentFormData.amount ? parseFloat(paymentFormData.amount) : sub.amount;
              const validPaymentAmount = paymentAmount && !isNaN(paymentAmount) && paymentAmount > 0 ? paymentAmount : sub.amount;
              
              // Use backend preview endpoint for consistent calculation
              // Fallback values while loading
              const periodsCovered = previewPayment?.periodsCovered ?? 0;
              const newBalance = previewPayment?.newBalance ?? 0;
              const previewNextDue = previewPayment?.nextDueDate ? new Date(previewPayment.nextDueDate) : new Date(sub.nextDueDate);
              const currentBalance = previewPayment?.currentBalance ?? (sub.balance || 0);
              const totalAvailable = validPaymentAmount + currentBalance;
              
              const cycleSingular = sub.billingCycle === "monthly" ? "month" : 
                                   sub.billingCycle === "yearly" ? "year" : 
                                   sub.billingCycle === "quarterly" ? "quarter" : "week";
              const cyclePlural = sub.billingCycle === "monthly" ? "months" : 
                                 sub.billingCycle === "yearly" ? "years" : 
                                 sub.billingCycle === "quarterly" ? "quarters" : "weeks";
              const periodsText = periodsCovered === 1 
                ? `1 ${cycleSingular}` 
                : periodsCovered === 0
                ? "0 periods (partial payment)"
                : `${periodsCovered} ${cyclePlural}`;
              
              return (
                <Card className="border border-foreground/10 bg-foreground/5">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/60">Current Due Date:</span>
                      <span className="text-sm font-bold">{format(new Date(sub.nextDueDate), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/60">Subscription Amount:</span>
                      <span className="text-sm font-bold">{formatCurrency(sub.amount, sub.currency)} / {sub.billingCycle}</span>
                    </div>
                    {currentBalance > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground/60">Current Balance:</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(currentBalance, sub.currency)}</span>
                      </div>
                    )}
                    {paymentFormData.amount && !isNaN(parseFloat(paymentFormData.amount)) && parseFloat(paymentFormData.amount) > 0 && (
                      <>
                        <div className="border-t border-foreground/10 pt-2 mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-foreground/60">Payment Amount:</span>
                            <span className="text-sm font-bold text-accent">{formatCurrency(validPaymentAmount, sub.currency)}</span>
                          </div>
                          {currentBalance > 0 && (
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-foreground/60">Total Available:</span>
                              <span className="text-sm font-bold">{formatCurrency(totalAvailable, sub.currency)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground/60">Covers:</span>
                            <span className="text-sm font-bold">{periodsText}</span>
                          </div>
                          {periodsCovered > 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-foreground/60">Next Due Date:</span>
                              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                {format(previewNextDue, "MMM d, yyyy")}
                              </span>
                            </div>
                          )}
                          {periodsCovered === 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-foreground/60">Next Due Date:</span>
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                {format(new Date(sub.nextDueDate), "MMM d, yyyy")} (unchanged)
                              </span>
                            </div>
                          )}
                          {newBalance > 0 && (
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-foreground/10">
                              <span className="text-sm text-foreground/60">New Balance:</span>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(newBalance, sub.currency)}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
            
            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <CustomDatePicker
                value={paymentFormData.paidDate}
                onChange={(value) =>
                  setPaymentFormData({ ...paymentFormData, paidDate: value })
                }
                placeholder="Select payment date"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Amount (leave empty to use subscription amount)</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentFormData.amount}
                onChange={(e) =>
                  setPaymentFormData({ ...paymentFormData, amount: e.target.value })
                }
                placeholder="Auto"
              />
              <p className="text-xs text-foreground/60">
                Enter any amount to prepay multiple periods. The system will calculate how many periods this covers.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentFormData.paymentMethodId || "none"}
                onValueChange={(value) =>
                  setPaymentFormData({
                    ...paymentFormData,
                    paymentMethodId: value === "none" ? undefined : (value as Id<"subscriptionPaymentMethods">),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method._id} value={method._id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={paymentFormData.notes}
                onChange={(e) =>
                  setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                }
                placeholder="Payment notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid}>Mark as Paid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit Payment Method Dialog */}
      <Dialog open={paymentMethodDialogOpen} onOpenChange={setPaymentMethodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPaymentMethod ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
            <DialogDescription>
              {editingPaymentMethod
                ? "Update payment method details"
                : "Create a new payment method with a custom color"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={paymentMethodFormData.name}
                onChange={(e) =>
                  setPaymentMethodFormData({ ...paymentMethodFormData, name: e.target.value })
                }
                placeholder="e.g., Cash, Red Card, Blue Card"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Color *</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={paymentMethodFormData.color}
                  onChange={(e) =>
                    setPaymentMethodFormData({ ...paymentMethodFormData, color: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  value={paymentMethodFormData.color}
                  onChange={(e) =>
                    setPaymentMethodFormData({ ...paymentMethodFormData, color: e.target.value })
                  }
                  placeholder="#22c55e"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={paymentMethodFormData.isDefault}
                onChange={(e) =>
                  setPaymentMethodFormData({
                    ...paymentMethodFormData,
                    isDefault: e.target.checked,
                  })
                }
                className="rounded"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentMethodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePaymentMethod}>
              {editingPaymentMethod ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Subscription Details Dialog */}
      <Dialog open={!!viewingSubscriptionId} onOpenChange={(open) => !open && setViewingSubscriptionId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingSubscription?.name || "Subscription Details"}</DialogTitle>
            <DialogDescription>
              Subscription details and payment history
            </DialogDescription>
          </DialogHeader>
          
          {viewingSubscription && (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-foreground/60">Amount</Label>
                    <p className="text-lg font-bold">
                      {formatCurrency(viewingSubscription.amount, viewingSubscription.currency)} / {viewingSubscription.billingCycle}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-foreground/60">Next Due Date</Label>
                    <p className="text-lg font-bold">
                      {format(new Date(viewingSubscription.nextDueDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-foreground/60">Status</Label>
                    <p className="text-lg font-bold uppercase">{viewingSubscription.status}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-foreground/60">Payment Method</Label>
                    <div className="flex items-center gap-2">
                      {viewingSubscription.paymentMethod && (
                        <>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: viewingSubscription.paymentMethod.color }}
                          />
                          <p className="text-lg font-bold">{viewingSubscription.paymentMethod.name}</p>
                        </>
                      )}
                      {!viewingSubscription.paymentMethod && (
                        <p className="text-lg font-bold text-foreground/60">None</p>
                      )}
                    </div>
                  </div>
                  {(viewingSubscription.balance || 0) > 0 && (
                    <div className="col-span-2">
                      <Label className="text-xs text-foreground/60">Current Balance</Label>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(viewingSubscription.balance || 0, viewingSubscription.currency)}
                      </p>
                    </div>
                  )}
                </div>
                
                {viewingSubscription.notes && (
                  <div>
                    <Label className="text-xs text-foreground/60">Notes</Label>
                    <p className="text-sm text-foreground/80">{viewingSubscription.notes}</p>
                  </div>
                )}
                
                {viewingSubscription.tags.length > 0 && (
                  <div>
                    <Label className="text-xs text-foreground/60">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {viewingSubscription.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-foreground/5 text-xs text-foreground/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-bold">Payment History</Label>
                    <Button
                      size="sm"
                      onClick={() => {
                        setViewingSubscriptionId(null);
                        handleOpenPaymentDialog(viewingSubscription._id);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Payment
                    </Button>
                  </div>
                  
                  {paymentHistory.length === 0 ? (
                    <p className="text-sm text-foreground/60 text-center py-8">
                      No payment history yet
                    </p>
                  ) : (
                    <div className="border border-foreground/10 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Periods</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentHistory.map((payment) => {
                            // Calculate periods covered for this payment
                            const periodsCovered = Math.floor(payment.amount / viewingSubscription.amount);
                            const cycleSingular = viewingSubscription.billingCycle === "monthly" ? "month" : 
                                                 viewingSubscription.billingCycle === "yearly" ? "year" : 
                                                 viewingSubscription.billingCycle === "quarterly" ? "quarter" : "week";
                            const cyclePlural = viewingSubscription.billingCycle === "monthly" ? "months" : 
                                               viewingSubscription.billingCycle === "yearly" ? "years" : 
                                               viewingSubscription.billingCycle === "quarterly" ? "quarters" : "weeks";
                            const periodsText = periodsCovered === 1 
                              ? `1 ${cycleSingular}` 
                              : `${periodsCovered} ${cyclePlural}`;
                            
                            return (
                              <TableRow key={payment._id}>
                                <TableCell>
                                  {format(new Date(payment.paidDate), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(payment.amount, viewingSubscription.currency)}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm font-medium">
                                    {periodsText}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {payment.paymentMethod ? (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: payment.paymentMethod.color }}
                                      />
                                      <span>{payment.paymentMethod.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-foreground/60">None</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {payment.notes || <span className="text-foreground/60">—</span>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
          )}
          
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setViewingSubscriptionId(null)}>
              Close
            </Button>
            {viewingSubscription && (
              <>
                {viewingSubscription.status === "active" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handlePauseSubscription(viewingSubscription._id)}
                    >
                      Pause
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleArchiveSubscription(viewingSubscription._id)}
                    >
                      Archive
                    </Button>
                  </>
                )}
                {viewingSubscription.status === "paused" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleActivateSubscription(viewingSubscription._id)}
                    >
                      Activate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleArchiveSubscription(viewingSubscription._id)}
                    >
                      Archive
                    </Button>
                  </>
                )}
                {viewingSubscription.status === "archived" && (
                  <Button
                    variant="outline"
                    onClick={() => handleRestoreSubscription(viewingSubscription._id)}
                  >
                    Restore
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setViewingSubscriptionId(null);
                    handleOpenSubscriptionDialog(viewingSubscription._id);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Subscription Confirmation */}
      <AlertDialog open={!!deleteSubscriptionId} onOpenChange={(open) => !open && setDeleteSubscriptionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription? This will also delete all payment history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubscription} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Payment Method Confirmation */}
      <AlertDialog open={!!deletePaymentMethodId} onOpenChange={(open) => !open && setDeletePaymentMethodId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment method? It cannot be deleted if it's being used by subscriptions or payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePaymentMethod} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

