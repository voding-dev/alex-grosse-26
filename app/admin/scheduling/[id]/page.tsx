"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExternalLink, Copy, Pencil, Trash2, Calendar, Clock, Users, Mail, Phone, MessageSquare, Link2, CheckCircle2, User } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PagesUsingRequest } from "@/components/pages-using-token";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { CustomTimePicker } from "@/components/ui/custom-time-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
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

export default function SchedulingRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params?.id as any;
  const { adminEmail, sessionToken, isChecking } = useAdminAuth();
  const { toast } = useToast();

  const data = useQuery(api.scheduling.getRequest, (!isChecking && requestId && adminEmail && sessionToken) ? { 
    id: requestId, 
    email: adminEmail,
    sessionToken: sessionToken
  } : "skip");
  const createPublicInvite = useMutation(api.scheduling.createPublicInvite);
  const updateRequest = useMutation(api.scheduling.updateRequest);
  const removeRequest = useMutation(api.scheduling.removeRequest);
  const updateSlot = useMutation(api.scheduling.updateSlot);
  const removeSlot = useMutation(api.scheduling.removeSlot);
  const cancelBooking = useMutation(api.scheduling.cancelBooking);
  const createSlot = useMutation(api.scheduling.createSlot);
  const [isEditing, setIsEditing] = useState(false as any);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editSlotStartDate, setEditSlotStartDate] = useState('');
  const [editSlotStartTime, setEditSlotStartTime] = useState('');
  const [editSlotEndDate, setEditSlotEndDate] = useState('');
  const [editSlotEndTime, setEditSlotEndTime] = useState('');
  const [addSlotStartDate, setAddSlotStartDate] = useState('');
  const [addSlotStartTime, setAddSlotStartTime] = useState('');
  const [addSlotEndDate, setAddSlotEndDate] = useState('');
  const [addSlotEndTime, setAddSlotEndTime] = useState('');
  const [deleteRequestDialog, setDeleteRequestDialog] = useState(false);
  const [cancelBookingDialog, setCancelBookingDialog] = useState<{ open: boolean; slotId: Id<"schedulingSlots"> | null }>({ open: false, slotId: null });
  const [deleteSlotDialog, setDeleteSlotDialog] = useState<{ open: boolean; slotId: Id<"schedulingSlots"> | null }>({ open: false, slotId: null });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Link copied to clipboard" });
    } catch {}
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCreateShareable = async () => {
    if (!requestId) return;
    try {
      await createPublicInvite({ requestId, email: adminEmail || undefined });
      toast({ title: "Shareable link created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not create link", variant: "destructive" });
    }
  };

  const request = data?.request;
  const slots = data?.slots || [];
  const invites = data?.invites || [];
  const bookedSlots = slots.filter((s: any) => s.status === "booked");
  const availableSlots = slots.filter((s: any) => s.status === "available");
  
  // Get public invite token to check if it exists
  const publicToken = useQuery(
    api.scheduling.getPublicInviteToken,
    request?._id && adminEmail ? { requestId: request._id, email: adminEmail } : "skip"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-12">
      {/* Header Section */}
      <div className="space-y-6">
        <Link href="/admin/scheduling" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Back to Scheduling
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              {request?.title || 'Request'}
            </h1>
            {request?.description && (
              <div className="text-base sm:text-lg text-foreground/80 leading-relaxed max-w-3xl" style={{ whiteSpace: 'pre-line' }}>
                {request.description}
              </div>
            )}
          </div>
          {request && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors" 
                onClick={() => setIsEditing(!isEditing)}
                style={{ fontWeight: '900' }}
              >
                <Pencil className="h-4 w-4 mr-2" /> {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              <Button 
                variant="outline" 
                className="font-black uppercase tracking-wider text-red-500 border-red-500/50 hover:bg-red-500 hover:text-black transition-colors"
                onClick={() => {
                  if (!request?._id) return;
                  setDeleteRequestDialog(true);
                }}
                style={{ fontWeight: '900' }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className={`grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 ${request?.maxSelectionsPerPerson && request.maxSelectionsPerPerson > 1 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Total Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl sm:text-5xl font-black text-foreground flex items-center gap-3" style={{ fontWeight: '900' }}>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
              {slots.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Booked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl sm:text-5xl font-black text-foreground flex items-center gap-3" style={{ fontWeight: '900' }}>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
              {bookedSlots.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl sm:text-5xl font-black text-foreground flex items-center gap-3" style={{ fontWeight: '900' }}>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
              {availableSlots.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl sm:text-5xl font-black text-foreground flex items-center gap-3" style={{ fontWeight: '900' }}>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
              {request?.durationMinutes || 0}m
            </div>
          </CardContent>
        </Card>
        {request?.maxSelectionsPerPerson && request.maxSelectionsPerPerson > 1 && (
          <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
                Max Selections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl sm:text-5xl font-black text-foreground flex items-center gap-3" style={{ fontWeight: '900' }}>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
                {request.maxSelectionsPerPerson}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pages Using This Request */}
      {request && (
        <Card className="border border-foreground/20 hover:border-accent/50 transition-all">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Used On Pages
            </CardTitle>
            <CardDescription className="text-base mt-1">
              Pages that are using this booking request
            </CardDescription>
          </CardHeader>
          <CardContent>
            {publicToken ? (
              <PagesUsingRequest requestId={request._id} adminEmail={adminEmail || undefined} />
            ) : (
              <p className="text-sm text-foreground/60">
                No public invite token found. Create a shareable link to use this request on pages.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {isEditing && request && (
        <Card className="border border-accent/30 bg-accent/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Edit Request
            </CardTitle>
            <CardDescription className="text-base">
              Update the booking request details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const fd = new FormData(form);
                try {
                  await updateRequest({
                    id: request._id,
                    title: (fd.get('title') as string) || undefined,
                    description: (fd.get('description') as string) || undefined,
                    timezone: (fd.get('timezone') as string) || undefined,
                    durationMinutes: Number(fd.get('durationMinutes') || request.durationMinutes),
                    maxSelectionsPerPerson: Number(fd.get('maxSelectionsPerPerson') || request.maxSelectionsPerPerson || 1),
                    email: adminEmail || undefined,
                  });
                  setIsEditing(false);
                  toast({ title: 'Saved', description: 'Request updated successfully' });
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
                }
              }}
            >
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Title *
                </Label>
                <Input name="title" defaultValue={request.title} className="h-12 text-base" required />
              </div>
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Description
                </Label>
                <Textarea 
                  name="description" 
                  defaultValue={request.description || ''} 
                  className="text-base min-h-[100px]" 
                  rows={4}
                  placeholder="Enter description for the booking request..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Timezone
                  </Label>
                  <Input name="timezone" defaultValue={request.timezone || ''} className="h-12 text-base" placeholder="America/New_York" />
                </div>
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Duration (minutes) *
                  </Label>
                  <Input 
                    name="durationMinutes" 
                    type="number" 
                    min={5} 
                    step={5} 
                    defaultValue={request.durationMinutes} 
                    className="h-12 text-base" 
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Max Selections Per Person
                  </Label>
                  <Input 
                    name="maxSelectionsPerPerson" 
                    type="number" 
                    min={1} 
                    step={1} 
                    defaultValue={request.maxSelectionsPerPerson || 1} 
                    className="h-12 text-base" 
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="submit" 
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Save Changes
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="font-bold uppercase tracking-wider hover:bg-foreground/10 transition-colors" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Invites Section */}
      <Card className="border border-foreground/20 hover:border-accent/50 transition-all">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Invites
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Booking links for recipients and shareable links
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors" 
              onClick={handleCreateShareable}
              style={{ fontWeight: '900' }}
            >
              <Link2 className="h-4 w-4 mr-2" /> Create Shareable Link
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {invites.length > 0 ? (
            invites.map((inv: any) => {
              const link = `${baseUrl}/book/${inv.token}`;
              const isBooked = inv.selectedSlotId !== null;
              return (
                <div key={inv._id} className="rounded-lg border border-foreground/20 bg-foreground/5 p-4 sm:p-6 hover:border-accent/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="font-black uppercase tracking-wider text-base text-foreground flex items-center gap-2" style={{ fontWeight: '900' }}>
                          {inv.recipientEmail ? (
                            <>
                              <Mail className="h-4 w-4 text-accent" />
                              {inv.recipientEmail}
                            </>
                          ) : (
                            <>
                              <Link2 className="h-4 w-4 text-accent" />
                              Shareable Link
                            </>
                          )}
                        </div>
                        {isBooked && (
                          <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30" style={{ fontWeight: '900' }}>
                            Booked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-foreground/70 font-mono text-xs sm:text-sm break-all bg-foreground/10 border border-foreground/20 rounded px-3 py-2">
                        <Link2 className="h-3 w-3 flex-shrink-0" />
                        {link}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors" 
                        onClick={() => copy(link)}
                      >
                        <Copy className="h-3 w-3 mr-2" /> Copy
                      </Button>
                      <a href={link} target="_blank" rel="noreferrer" className="inline-flex">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                        >
                          <ExternalLink className="h-3 w-3 mr-2" /> Open
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-foreground/70 text-center py-12">
              <Link2 className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
              <p className="font-bold uppercase tracking-wider mb-2">No invites yet</p>
              <p className="text-sm">Create a shareable link or add recipients when creating the request.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Slots Section */}
      <Card className="border border-foreground/20 hover:border-accent/50 transition-all">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Time Slots
              </CardTitle>
              <CardDescription className="text-base mt-1">
                All available and booked time slots for this request
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
              onClick={() => setShowAddSlot(true)}
              style={{ fontWeight: '900' }}
            >
              <Calendar className="h-4 w-4 mr-2" /> Add Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {slots.length > 0 ? (() => {
            // Group slots by date
            const groupedByDate = slots.reduce((acc: Record<string, any[]>, slot: any) => {
              const dateKey = new Date(slot.start).toLocaleDateString();
              if (!acc[dateKey]) acc[dateKey] = [];
              acc[dateKey].push(slot);
              return acc;
            }, {});
            
            // Sort date groups chronologically
            const sortedDateKeys = Object.keys(groupedByDate).sort((a, b) => 
              new Date(a).getTime() - new Date(b).getTime()
            );
            
            return (
              <div className="space-y-8">
                {sortedDateKeys.map((dateKey) => {
                  const dateSlots = groupedByDate[dateKey];
                  const dateObj = new Date(dateSlots[0].start);
                  return (
                    <div key={dateKey} className="space-y-4">
                      {/* Date Header */}
                      <div className="flex items-center gap-3 pb-3 border-b border-foreground/20">
                        <div className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                          {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-sm sm:text-base font-bold uppercase tracking-wider opacity-60 text-foreground">
                          {dateObj.toLocaleDateString(undefined, { weekday: 'long' })}
                        </div>
                        <div className="flex-1" />
                        <div className="text-xs font-bold uppercase tracking-wider opacity-60 text-foreground">
                          {dateSlots.filter((s: any) => s.status === "booked").length} of {dateSlots.length} booked
                        </div>
                      </div>
                      
                      {/* Time Slots Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {dateSlots.map((s: any) => {
                          const bookingInvite = s.bookedByInviteId ? invites.find((inv: any) => inv._id === s.bookedByInviteId) : null;
                          const isBooked = s.status === "booked";
                          return (
                            <div 
                              key={s._id} 
                              className={`relative rounded-lg border-2 p-4 transition-all ${
                                isBooked 
                                  ? "border-accent/40 bg-accent/5 hover:border-accent/60" 
                                  : "border-foreground/20 bg-foreground/5 hover:border-accent/30"
                              }`}
                            >
                              {isBooked && (
                                <div className="absolute -top-2 -right-2">
                                  <div className="rounded-full bg-accent p-1">
                                    <CheckCircle2 className="h-4 w-4 text-black" />
                                  </div>
                                </div>
                              )}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                                    {new Date(s.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – {new Date(s.end).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                  </div>
                                  <span className={`text-xs font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                                    isBooked 
                                      ? "bg-accent/20 text-accent border border-accent/30" 
                                      : "bg-foreground/10 text-foreground/80 border border-foreground/20"
                                  }`} style={{ fontWeight: '900' }}>
                                    {s.status}
                                  </span>
                                </div>
                  {bookingInvite && isBooked && (
                    <div className="mt-3 pt-3 border-t-2 border-accent/30 space-y-3 bg-accent/5 rounded-lg p-3 -mx-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-xs font-black uppercase tracking-wider text-accent flex items-center gap-2" style={{ fontWeight: '900' }}>
                          <Users className="h-4 w-4" />
                          Booked By
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            setCancelBookingDialog({ open: true, slotId: s._id });
                          }}
                        >
                          Cancel Booking
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {bookingInvite.bookingName && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold uppercase tracking-wider text-foreground/60">Name</div>
                            <div className="text-sm text-foreground font-medium">{bookingInvite.bookingName}</div>
                          </div>
                        )}
                        {bookingInvite.bookingEmail && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Email
                            </div>
                            <a href={`mailto:${bookingInvite.bookingEmail}`} className="text-sm text-accent hover:underline font-medium">
                              {bookingInvite.bookingEmail}
                            </a>
                          </div>
                        )}
                        {bookingInvite.bookingPhone && (
                          <div className="space-y-1">
                            <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              Phone
                            </div>
                            <a href={`tel:${bookingInvite.bookingPhone}`} className="text-sm text-accent hover:underline font-medium">
                              {bookingInvite.bookingPhone}
                            </a>
                          </div>
                        )}
                      </div>
                      {bookingInvite.bookingNotes && (
                        <div className="space-y-1 pt-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Notes
                          </div>
                          <div className="text-sm text-foreground opacity-80 leading-relaxed bg-foreground/10 border border-foreground/20 rounded p-3">
                            {bookingInvite.bookingNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2 border-t border-foreground/10 mt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 h-8 text-xs font-bold uppercase tracking-wider hover:bg-accent/10 hover:text-accent"
                                    onClick={() => {
                                      setEditingSlotId(s._id);
                                      const startDate = new Date(s.start);
                                      const endDate = new Date(s.end);
                                      setEditSlotStartDate(format(startDate, "yyyy-MM-dd"));
                                      setEditSlotStartTime(format(startDate, "HH:mm"));
                                      setEditSlotEndDate(format(endDate, "yyyy-MM-dd"));
                                      setEditSlotEndTime(format(endDate, "HH:mm"));
                                    }}
                                    disabled={isBooked}
                                  >
                                    <Pencil className="h-3 w-3 mr-1" /> Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    onClick={() => {
                                      setDeleteSlotDialog({ open: true, slotId: s._id });
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <div className="text-sm text-foreground/70 text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
              <p className="font-bold uppercase tracking-wider mb-2">No time slots added yet</p>
              <p className="text-sm">Add time slots when creating the booking request.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Slot Modal */}
      <Dialog open={editingSlotId !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingSlotId(null);
          setEditSlotStartDate('');
          setEditSlotStartTime('');
          setEditSlotEndDate('');
          setEditSlotEndTime('');
        }
      }}>
        {editingSlotId && (() => {
          const slot = slots.find((s: any) => s._id === editingSlotId);
          if (!slot) return null;
          
          return (
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
              {/* Fixed Header */}
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-foreground/10 flex-shrink-0">
                <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
                  Edit Time Slot
                </DialogTitle>
                <DialogDescription className="text-base mt-2 leading-relaxed">
                  Update the start and end time for this slot. Changes will affect future bookings.
                </DialogDescription>
              </DialogHeader>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                  {/* Start Time Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-foreground/10">
                      <Clock className="h-5 w-5 text-accent" />
                      <Label className="text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                        Start Time *
                      </Label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-bold uppercase tracking-wider mb-2 block text-foreground/70">
                          Date *
                        </Label>
                        <CustomDatePicker
                          value={editSlotStartDate}
                          onChange={(date) => {
                            setEditSlotStartDate(date);
                            // Auto-set end date if not set or if start date is after end date
                            if (!editSlotEndDate || date > editSlotEndDate) {
                              setEditSlotEndDate(date);
                            }
                          }}
                          placeholder="Select start date"
                          min={format(new Date(), "yyyy-MM-dd")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-bold uppercase tracking-wider mb-2 block text-foreground/70">
                          Time *
                        </Label>
                        <CustomTimePicker
                          value={editSlotStartTime}
                          onChange={(time) => {
                            setEditSlotStartTime(time);
                            // Auto-set end time if not set or if start time is after end time (on same date)
                            if (editSlotStartDate === editSlotEndDate && (!editSlotEndTime || time >= editSlotEndTime)) {
                              // Set end time to 1 hour after start time
                              const [hours, minutes] = time.split(':').map(Number);
                              const endHours = (hours + 1) % 24;
                              const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                              setEditSlotEndTime(endTimeStr);
                            }
                          }}
                          placeholder="Select start time"
                        />
                      </div>
                    </div>
                  </div>

                  {/* End Time Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-foreground/10">
                      <Clock className="h-5 w-5 text-accent" />
                      <Label className="text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                        End Time *
                      </Label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-bold uppercase tracking-wider mb-2 block text-foreground/70">
                          Date *
                        </Label>
                        <CustomDatePicker
                          value={editSlotEndDate}
                          onChange={(date) => setEditSlotEndDate(date)}
                          placeholder="Select end date"
                          min={editSlotStartDate || format(new Date(), "yyyy-MM-dd")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-bold uppercase tracking-wider mb-2 block text-foreground/70">
                          Time *
                        </Label>
                        <CustomTimePicker
                          value={editSlotEndTime}
                          onChange={(time) => setEditSlotEndTime(time)}
                          placeholder="Select end time"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration Preview */}
                  {(editSlotStartDate && editSlotStartTime && editSlotEndDate && editSlotEndTime) && (() => {
                    try {
                      const startDateTime = new Date(`${editSlotStartDate}T${editSlotStartTime}`);
                      const endDateTime = new Date(`${editSlotEndDate}T${editSlotEndTime}`);
                      const durationMs = endDateTime.getTime() - startDateTime.getTime();
                      const durationMinutes = Math.round(durationMs / (1000 * 60));
                      const durationHours = Math.floor(durationMinutes / 60);
                      const remainingMinutes = durationMinutes % 60;
                      
                      if (durationMs <= 0) {
                        return (
                          <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4">
                            <div className="text-sm font-bold uppercase tracking-wider text-red-500">
                              ⚠️ End time must be after start time
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-accent" />
                            <span className="text-sm font-bold uppercase tracking-wider text-foreground/70">
                              Slot Duration
                            </span>
                          </div>
                          <div className="text-lg font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                            {durationHours > 0 ? `${durationHours} hour${durationHours !== 1 ? 's' : ''}` : ''}
                            {durationHours > 0 && remainingMinutes > 0 ? ' ' : ''}
                            {remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}
                            {durationMinutes === 0 ? '0 minutes' : ''}
                          </div>
                          <div className="text-xs text-foreground/60 mt-1">
                            {format(startDateTime, "MMM dd, yyyy 'at' h:mm a")} → {format(endDateTime, "MMM dd, yyyy 'at' h:mm a")}
                          </div>
                        </div>
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              </div>

              {/* Fixed Footer */}
              <DialogFooter className="px-6 py-4 border-t border-foreground/10 flex-shrink-0 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingSlotId(null);
                    setEditSlotStartDate('');
                    setEditSlotStartTime('');
                    setEditSlotEndDate('');
                    setEditSlotEndTime('');
                  }}
                  className="flex-1 sm:flex-none font-bold uppercase tracking-wider h-12 px-6 sm:px-8 rounded-lg border-foreground/20 hover:bg-foreground/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!editSlotStartDate || !editSlotStartTime || !editSlotEndDate || !editSlotEndTime) {
                      toast({ 
                        title: 'Missing information', 
                        description: 'Please fill in all date and time fields', 
                        variant: 'destructive' 
                      });
                      return;
                    }
                    try {
                      const startDateTime = new Date(`${editSlotStartDate}T${editSlotStartTime}`);
                      const endDateTime = new Date(`${editSlotEndDate}T${editSlotEndTime}`);
                      const startMs = startDateTime.getTime();
                      const endMs = endDateTime.getTime();
                      
                      if (isNaN(startMs) || isNaN(endMs)) {
                        toast({ 
                          title: 'Invalid date/time', 
                          description: 'Please select valid dates and times', 
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      if (endMs <= startMs) {
                        toast({ 
                          title: 'Invalid time range', 
                          description: 'End time must be after start time', 
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      await updateSlot({
                        id: slot._id,
                        start: startMs,
                        end: endMs,
                        email: adminEmail || undefined,
                      });
                      setEditingSlotId(null);
                      setEditSlotStartDate('');
                      setEditSlotStartTime('');
                      setEditSlotEndDate('');
                      setEditSlotEndTime('');
                      toast({ 
                        title: 'Success', 
                        description: 'Time slot updated successfully' 
                      });
                    } catch (e: any) {
                      toast({ 
                        title: 'Error', 
                        description: e.message || 'Failed to update slot', 
                        variant: 'destructive' 
                      });
                    }
                  }}
                  disabled={!editSlotStartDate || !editSlotStartTime || !editSlotEndDate || !editSlotEndTime}
                  className="flex-1 sm:flex-none font-black uppercase tracking-wider h-12 px-6 sm:px-8 rounded-lg bg-accent text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ fontWeight: '900' }}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* Add Slot Modal */}
      <Dialog open={showAddSlot} onOpenChange={(open) => {
        setShowAddSlot(open);
        if (!open) {
          setAddSlotStartDate('');
          setAddSlotStartTime('');
          setAddSlotEndDate('');
          setAddSlotEndTime('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Fixed Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-foreground/10 flex-shrink-0">
            <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Add New Time Slot
            </DialogTitle>
            <DialogDescription className="text-base mt-2 leading-relaxed">
              Create a new available time slot for this request. Select the date and time for when the slot starts and ends.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Start Time Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-foreground/10">
                  <Clock className="h-5 w-5 text-accent" />
                  <Label className="text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Start Time *
                  </Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold uppercase tracking-wider mb-2 block text-foreground/70">
                      Date *
                    </Label>
                    <CustomDatePicker
                      value={addSlotStartDate}
                      onChange={(date) => {
                        setAddSlotStartDate(date);
                        // Auto-set end date if not set or if start date is after end date
                        if (!addSlotEndDate || date > addSlotEndDate) {
                          setAddSlotEndDate(date);
                        }
                      }}
                      placeholder="Select start date"
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold uppercase tracking-wider mb-2 block text-foreground/70">
                      Time *
                    </Label>
                    <CustomTimePicker
                      value={addSlotStartTime}
                      onChange={(time) => {
                        setAddSlotStartTime(time);
                        // Auto-set end time if not set or if start time is after end time (on same date)
                        if (addSlotStartDate === addSlotEndDate && (!addSlotEndTime || time >= addSlotEndTime)) {
                          // Set end time to 1 hour after start time
                          const [hours, minutes] = time.split(':').map(Number);
                          const endHours = (hours + 1) % 24;
                          const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                          setAddSlotEndTime(endTimeStr);
                        }
                      }}
                      placeholder="Select start time"
                    />
                  </div>
                </div>
              </div>

              {/* End Time Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-foreground/10">
                  <Clock className="h-5 w-5 text-accent" />
                  <Label className="text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    End Time *
                  </Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold uppercase tracking-wider mb-2 block text-foreground/70">
                      Date *
                    </Label>
                    <CustomDatePicker
                      value={addSlotEndDate}
                      onChange={(date) => setAddSlotEndDate(date)}
                      placeholder="Select end date"
                      min={addSlotStartDate || format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold uppercase tracking-wider mb-2 block text-foreground/70">
                      Time *
                    </Label>
                    <CustomTimePicker
                      value={addSlotEndTime}
                      onChange={(time) => setAddSlotEndTime(time)}
                      placeholder="Select end time"
                    />
                  </div>
                </div>
              </div>

              {/* Duration Preview */}
              {(addSlotStartDate && addSlotStartTime && addSlotEndDate && addSlotEndTime) && (() => {
                try {
                  const startDateTime = new Date(`${addSlotStartDate}T${addSlotStartTime}`);
                  const endDateTime = new Date(`${addSlotEndDate}T${addSlotEndTime}`);
                  const durationMs = endDateTime.getTime() - startDateTime.getTime();
                  const durationMinutes = Math.round(durationMs / (1000 * 60));
                  const durationHours = Math.floor(durationMinutes / 60);
                  const remainingMinutes = durationMinutes % 60;
                  
                  if (durationMs <= 0) {
                    return (
                      <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4">
                        <div className="text-sm font-bold uppercase tracking-wider text-red-500">
                          ⚠️ End time must be after start time
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-accent" />
                        <span className="text-sm font-bold uppercase tracking-wider text-foreground/70">
                          Slot Duration
                        </span>
                      </div>
                      <div className="text-lg font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                        {durationHours > 0 ? `${durationHours} hour${durationHours !== 1 ? 's' : ''}` : ''}
                        {durationHours > 0 && remainingMinutes > 0 ? ' ' : ''}
                        {remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` : ''}
                        {durationMinutes === 0 ? '0 minutes' : ''}
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        {format(startDateTime, "MMM dd, yyyy 'at' h:mm a")} → {format(endDateTime, "MMM dd, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return null;
                }
              })()}
            </div>
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="px-6 py-4 border-t border-foreground/10 flex-shrink-0 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddSlot(false);
                setAddSlotStartDate('');
                setAddSlotStartTime('');
                setAddSlotEndDate('');
                setAddSlotEndTime('');
              }}
              className="flex-1 sm:flex-none font-bold uppercase tracking-wider h-12 px-6 sm:px-8 rounded-lg border-foreground/20 hover:bg-foreground/5"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!requestId || !addSlotStartDate || !addSlotStartTime || !addSlotEndDate || !addSlotEndTime) {
                  toast({ 
                    title: 'Missing information', 
                    description: 'Please fill in all date and time fields', 
                    variant: 'destructive' 
                  });
                  return;
                }
                try {
                  const startDateTime = new Date(`${addSlotStartDate}T${addSlotStartTime}`);
                  const endDateTime = new Date(`${addSlotEndDate}T${addSlotEndTime}`);
                  const startMs = startDateTime.getTime();
                  const endMs = endDateTime.getTime();
                  
                  if (isNaN(startMs) || isNaN(endMs)) {
                    toast({ 
                      title: 'Invalid date/time', 
                      description: 'Please select valid dates and times', 
                      variant: 'destructive' 
                    });
                    return;
                  }
                  
                  if (endMs <= startMs) {
                    toast({ 
                      title: 'Invalid time range', 
                      description: 'End time must be after start time', 
                      variant: 'destructive' 
                    });
                    return;
                  }
                  
                  await createSlot({
                    requestId,
                    start: startMs,
                    end: endMs,
                    email: adminEmail || undefined,
                  });
                  setShowAddSlot(false);
                  setAddSlotStartDate('');
                  setAddSlotStartTime('');
                  setAddSlotEndDate('');
                  setAddSlotEndTime('');
                  toast({ 
                    title: 'Success', 
                    description: 'Time slot added successfully' 
                  });
                } catch (e: any) {
                  toast({ 
                    title: 'Error', 
                    description: e.message || 'Failed to create slot', 
                    variant: 'destructive' 
                  });
                }
              }}
              disabled={!addSlotStartDate || !addSlotStartTime || !addSlotEndDate || !addSlotEndTime}
              className="flex-1 sm:flex-none font-black uppercase tracking-wider h-12 px-6 sm:px-8 rounded-lg bg-accent text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ fontWeight: '900' }}
            >
              Create Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Request Dialog */}
      <AlertDialog open={deleteRequestDialog} onOpenChange={setDeleteRequestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking request? This will remove all slots and invites. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!request?._id) return;
                try {
                  await removeRequest({ id: request._id, email: adminEmail || undefined });
                  toast({ title: 'Deleted', description: 'Booking request removed successfully' });
                  window.location.href = '/admin/scheduling';
                } catch (e: any) {
                  toast({ title: 'Error', description: e.message || 'Failed to delete', variant: 'destructive' });
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Booking Dialog */}
      <AlertDialog open={cancelBookingDialog.open} onOpenChange={(open) => setCancelBookingDialog({ open, slotId: cancelBookingDialog.slotId })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking? The slot will become available again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!cancelBookingDialog.slotId) return;
                try {
                  await cancelBooking({ slotId: cancelBookingDialog.slotId as Id<"schedulingSlots">, email: adminEmail || undefined });
                  toast({ title: 'Booking cancelled', description: 'Slot is now available' });
                  setCancelBookingDialog({ open: false, slotId: null });
                } catch (e: any) {
                  toast({ title: 'Error', description: e.message || 'Failed to cancel booking', variant: 'destructive' });
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Slot Dialog */}
      <AlertDialog open={deleteSlotDialog.open} onOpenChange={(open) => setDeleteSlotDialog({ open, slotId: deleteSlotDialog.slotId })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time slot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteSlotDialog.slotId) return;
                try {
                  await removeSlot({ id: deleteSlotDialog.slotId as Id<"schedulingSlots">, email: adminEmail || undefined });
                  toast({ title: 'Deleted', description: 'Time slot removed' });
                  setDeleteSlotDialog({ open: false, slotId: null });
                } catch (e: any) {
                  toast({ title: 'Error', description: e.message || 'Failed to delete slot', variant: 'destructive' });
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


