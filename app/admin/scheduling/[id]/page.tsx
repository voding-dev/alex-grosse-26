"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExternalLink, Copy, Pencil, Trash2, Calendar, Clock, Users, Mail, Phone, MessageSquare, Link2, CheckCircle2, User } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function SchedulingRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params?.id as any;
  const { adminEmail, sessionToken } = useAdminAuth();
  const { toast } = useToast();

  const data = useQuery(api.scheduling.getRequest, requestId ? { 
    id: requestId, 
    email: adminEmail || undefined,
    sessionToken: sessionToken || undefined
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
  const [editSlotStart, setEditSlotStart] = useState('');
  const [editSlotEnd, setEditSlotEnd] = useState('');
  const [addSlotStart, setAddSlotStart] = useState('');
  const [addSlotEnd, setAddSlotEnd] = useState('');

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
                onClick={async () => {
                  if (!request?._id) return;
                  if (!confirm('Delete this booking request? This removes all slots and invites.')) return;
                  try {
                    await removeRequest({ id: request._id, email: adminEmail || undefined });
                    toast({ title: 'Deleted', description: 'Booking request removed successfully' });
                    window.location.href = '/admin/scheduling';
                  } catch (e: any) {
                    toast({ title: 'Error', description: e.message || 'Failed to delete', variant: 'destructive' });
                  }
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
                          onClick={async () => {
                            if (!confirm('Cancel this booking? The slot will become available again.')) return;
                            try {
                              await cancelBooking({ slotId: s._id, email: adminEmail || undefined });
                              toast({ title: 'Booking cancelled', description: 'Slot is now available' });
                            } catch (e: any) {
                              toast({ title: 'Error', description: e.message || 'Failed to cancel booking', variant: 'destructive' });
                            }
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
                                      setEditSlotStart(new Date(s.start).toISOString().slice(0, 16));
                                      setEditSlotEnd(new Date(s.end).toISOString().slice(0, 16));
                                    }}
                                    disabled={isBooked}
                                  >
                                    <Pencil className="h-3 w-3 mr-1" /> Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    onClick={async () => {
                                      if (!confirm('Delete this time slot?')) return;
                                      try {
                                        await removeSlot({ id: s._id, email: adminEmail || undefined });
                                        toast({ title: 'Deleted', description: 'Time slot removed' });
                                      } catch (e: any) {
                                        toast({ title: 'Error', description: e.message || 'Failed to delete slot', variant: 'destructive' });
                                      }
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
      {editingSlotId && (() => {
        const slot = slots.find((s: any) => s._id === editingSlotId);
        if (!slot) return null;
        
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-2 border-accent/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  Edit Time Slot
                </CardTitle>
                <CardDescription>Update the start and end time for this slot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                    Start Time *
                  </Label>
                  <Input
                    type="datetime-local"
                    value={editSlotStart}
                    onChange={(e) => setEditSlotStart(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                    End Time *
                  </Label>
                  <Input
                    type="datetime-local"
                    value={editSlotEnd}
                    onChange={(e) => setEditSlotEnd(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 font-bold uppercase tracking-wider"
                    onClick={() => {
                      setEditingSlotId(null);
                      setEditSlotStart('');
                      setEditSlotEnd('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                    style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                    onClick={async () => {
                      try {
                        const startMs = new Date(editSlotStart).getTime();
                        const endMs = new Date(editSlotEnd).getTime();
                        if (endMs <= startMs) {
                          toast({ title: 'Error', description: 'End time must be after start time', variant: 'destructive' });
                          return;
                        }
                        await updateSlot({
                          id: slot._id,
                          start: startMs,
                          end: endMs,
                          email: adminEmail || undefined,
                        });
                        setEditingSlotId(null);
                        setEditSlotStart('');
                        setEditSlotEnd('');
                        toast({ title: 'Updated', description: 'Time slot updated successfully' });
                      } catch (e: any) {
                        toast({ title: 'Error', description: e.message || 'Failed to update slot', variant: 'destructive' });
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Add Slot Modal */}
      {showAddSlot && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-2 border-accent/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Add New Time Slot
              </CardTitle>
              <CardDescription>Create a new available time slot for this request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Start Time *
                </Label>
                <Input
                  type="datetime-local"
                  value={addSlotStart}
                  onChange={(e) => setAddSlotStart(e.target.value)}
                  className="h-12 text-base"
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  End Time *
                </Label>
                <Input
                  type="datetime-local"
                  value={addSlotEnd}
                  onChange={(e) => setAddSlotEnd(e.target.value)}
                  className="h-12 text-base"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 font-bold uppercase tracking-wider"
                  onClick={() => {
                    setShowAddSlot(false);
                    setAddSlotStart('');
                    setAddSlotEnd('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                  onClick={async () => {
                    if (!requestId || !addSlotStart || !addSlotEnd) return;
                    try {
                      const startMs = new Date(addSlotStart).getTime();
                      const endMs = new Date(addSlotEnd).getTime();
                      if (endMs <= startMs) {
                        toast({ title: 'Error', description: 'End time must be after start time', variant: 'destructive' });
                        return;
                      }
                      await createSlot({
                        requestId,
                        start: startMs,
                        end: endMs,
                        email: adminEmail || undefined,
                      });
                      setShowAddSlot(false);
                      setAddSlotStart('');
                      setAddSlotEnd('');
                      toast({ title: 'Created', description: 'Time slot added successfully' });
                    } catch (e: any) {
                      toast({ title: 'Error', description: e.message || 'Failed to create slot', variant: 'destructive' });
                    }
                  }}
                >
                  Create Slot
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


