"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, Mail, Clock, User, Phone, MessageSquare, X } from "lucide-react";

function formatRange(startMs: number, endMs: number) {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const sameDay = start.toDateString() === end.toDateString();
  const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `${dateStr} • ${startTime} – ${endTime}` : `${dateStr} ${startTime} → ${end.toLocaleDateString()} ${endTime}`;
}

function formatTime(startMs: number, endMs: number) {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${startTime} – ${endTime}`;
}

function formatDateShort(dateMs: number) {
  return new Date(dateMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatWeekday(dateMs: number) {
  return new Date(dateMs).toLocaleDateString(undefined, { weekday: 'short' });
}

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingToken: string | null | undefined;
}

export function BookingModal({ open, onOpenChange, bookingToken }: BookingModalProps) {
  const { toast } = useToast();
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<any | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [bookedSlotId, setBookedSlotId] = useState<string | null>(null);
  const [bookingInfo, setBookingInfo] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const inviteData = useQuery(
    api.scheduling.getInviteByToken,
    bookingToken ? { token: bookingToken } : "skip"
  );
  const slots = useQuery(
    api.scheduling.listAvailableSlots,
    bookingToken ? { token: bookingToken } : "skip"
  );
  const selectSlot = useMutation(api.scheduling.selectSlot);

  const handleCloseModal = () => {
    setSelectedSlotForBooking(null);
    setBookingInfo({ name: "", email: "", phone: "", notes: "" });
    onOpenChange(false);
  };

  const handleSelectClick = (slot: any) => {
    setSelectedSlotForBooking(slot);
  };

  const handleSubmitBooking = async () => {
    if (!selectedSlotForBooking || !bookingToken) return;
    
    if (!bookingInfo.name || !bookingInfo.email) {
      toast({ 
        title: "Missing information", 
        description: "Name and email are required.", 
        variant: "destructive" 
      });
      return;
    }

    const slotId = selectedSlotForBooking._id;
    setBookingSlotId(slotId);
    try {
      await selectSlot({ 
        token: bookingToken, 
        slotId: slotId as any,
        bookingName: bookingInfo.name,
        bookingEmail: bookingInfo.email,
        bookingPhone: bookingInfo.phone || undefined,
        bookingNotes: bookingInfo.notes || undefined,
      });
      setBookedSlotId(slotId);
      setSelectedSlotForBooking(null);
      setBookingInfo({ name: "", email: "", phone: "", notes: "" });
      toast({ title: "Booked!", description: "Your time has been reserved." });
    } catch (err: any) {
      toast({ title: "Unable to book", description: err.message || "Please try another time.", variant: "destructive" });
    } finally {
      setBookingSlotId(null);
    }
  };

  // Group slots by date and sort within each group
  const groupedSlots = slots?.reduce((acc: Record<string, any[]>, slot) => {
    const dateKey = new Date(slot.start).toLocaleDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {}) || {};
  
  // Sort slots within each date group by time, then sort date groups chronologically
  Object.keys(groupedSlots).forEach(dateKey => {
    groupedSlots[dateKey].sort((a, b) => a.start - b.start);
  });
  
  const sortedDateGroups = Object.entries(groupedSlots).sort(([dateA], [dateB]) => {
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  const request = inviteData?.request;
  const invite = inviteData?.invite;

  // Calculate how many slots this invite has booked
  const bookedSlotsCount = slots?.filter((s: any) => 
    s.bookedByInviteId === invite?._id
  ).length || 0;
  const maxSelections = request?.maxSelectionsPerPerson ?? 1;
  const canBookMore = bookedSlotsCount < maxSelections;

  // If no token or invalid invite, show error
  if (!bookingToken || inviteData === null) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Booking Unavailable
            </DialogTitle>
            <DialogDescription className="text-base">
              This booking link is no longer valid. Please contact the organizer for assistance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Loading state
  if (inviteData === undefined || slots === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Loading...
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              {request?.title || "Book a Session"}
            </DialogTitle>
            {request?.description && (
              <DialogDescription className="text-base leading-relaxed">
                {request.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Success Confirmation */}
          {bookedSlotId && slots && (() => {
            const bookedSlot = slots.find(s => s._id === bookedSlotId);
            return bookedSlot ? (
              <div className="rounded-lg border-2 border-accent bg-accent/15 p-6 flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-0.5 text-accent" />
                <div className="flex-1 space-y-3">
                  <div className="text-lg sm:text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Booking Confirmed!
                  </div>
                  <div className="text-base sm:text-lg font-medium">
                    {formatRange(bookedSlot.start, bookedSlot.end)}
                  </div>
                  <div className="text-sm sm:text-base opacity-90 leading-relaxed">
                    Your time slot has been reserved. You should receive a confirmation email shortly.
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Available Times Section */}
          {!bookedSlotId && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-xl sm:text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  Available Times
                </div>
                {maxSelections > 1 && (
                  <div className="text-sm sm:text-base opacity-80">
                    You can select up to <strong>{maxSelections}</strong> slot{maxSelections !== 1 ? 's' : ''}. 
                    {canBookMore ? (
                      <> You have <strong>{maxSelections - bookedSlotsCount}</strong> selection{maxSelections - bookedSlotsCount !== 1 ? 's' : ''} remaining.</>
                    ) : (
                      <> You have reached the maximum number of selections.</>
                    )}
                  </div>
                )}
              </div>
              
              {slots?.length ? (
                <div className="space-y-6">
                  {sortedDateGroups.map(([dateKey, dateSlots]) => {
                    const dateObj = new Date(dateSlots[0].start);
                    return (
                      <div key={dateKey} className="space-y-4">
                        {/* Date Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
                            {formatDateShort(dateObj.getTime())}
                          </div>
                          <div className="text-base sm:text-lg font-bold uppercase tracking-wider opacity-60">
                            {formatWeekday(dateObj.getTime())}
                          </div>
                        </div>
                        
                        {/* Time Slots Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {dateSlots.map((s) => {
                            const isBooking = bookingSlotId === s._id;
                            const isBookedByMe = s.bookedByInviteId === invite?._id;
                            const isBooked = bookedSlotId === s._id || isBookedByMe || (invite?.selectedSlotId && invite.selectedSlotId === s._id);
                            const canSelectThis = canBookMore && !isBooked && s.status === "available";
                            return (
                              <div key={s._id}>
                                {/* Time Slot Card */}
                                <div 
                                  className={`relative rounded-lg border-2 p-4 transition-all cursor-pointer ${
                                    isBookedByMe 
                                      ? 'border-accent shadow-lg scale-105' 
                                      : isBooked 
                                        ? 'border-foreground/30 opacity-60 cursor-not-allowed' 
                                        : canSelectThis 
                                          ? 'hover:shadow-lg hover:scale-105 hover:border-accent/60' 
                                          : 'opacity-60 cursor-not-allowed'
                                  }`}
                                  onClick={() => canSelectThis && handleSelectClick(s)}
                                >
                                  {isBookedByMe && (
                                    <div className="absolute -top-2 -right-2">
                                      <div className="rounded-full bg-accent p-1">
                                        <CheckCircle2 className="h-4 w-4 text-black" />
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <div className="text-lg sm:text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                                      {formatTime(s.start, s.end)}
                                    </div>
                                    {isBookedByMe && (
                                      <div className="text-xs font-bold uppercase tracking-wider opacity-80 text-accent">
                                        Booked by You
                                      </div>
                                    )}
                                    {!isBooked && canSelectThis && (
                                      <div className="text-xs font-bold uppercase tracking-wider opacity-60">
                                        Click to book
                                      </div>
                                    )}
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
              ) : (
                <div className="rounded-lg border-2 border-accent/40 bg-accent/8 p-8 text-center">
                  <div className="text-base sm:text-lg opacity-80">
                    No available times. Please contact the organizer at {request?.organizerEmail || 'the provided email'}.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Booking Information Modal */}
          <Dialog open={selectedSlotForBooking !== null} onOpenChange={(open) => !open && setSelectedSlotForBooking(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
                  Booking Information
                </DialogTitle>
                {selectedSlotForBooking && (
                  <DialogDescription className="text-base sm:text-lg opacity-90 leading-relaxed">
                    Please provide your information to complete the booking for{' '}
                    <strong className="font-bold">{formatRange(selectedSlotForBooking.start, selectedSlotForBooking.end)}</strong>
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    <User className="inline h-4 w-4 mr-2 text-accent" />
                    Name *
                  </Label>
                  <Input
                    className="h-12 text-base"
                    value={bookingInfo.name}
                    onChange={(e) => setBookingInfo({ ...bookingInfo, name: e.target.value })}
                    placeholder="Your full name"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    <Mail className="inline h-4 w-4 mr-2 text-accent" />
                    Email *
                  </Label>
                  <Input
                    type="email"
                    className="h-12 text-base"
                    value={bookingInfo.email}
                    onChange={(e) => setBookingInfo({ ...bookingInfo, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    <Phone className="inline h-4 w-4 mr-2 text-accent" />
                    Phone
                  </Label>
                  <Input
                    type="tel"
                    className="h-12 text-base"
                    value={bookingInfo.phone}
                    onChange={(e) => setBookingInfo({ ...bookingInfo, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    <MessageSquare className="inline h-4 w-4 mr-2 text-accent" />
                    Notes
                  </Label>
                  <Textarea
                    className="text-base min-h-[120px]"
                    value={bookingInfo.notes}
                    onChange={(e) => setBookingInfo({ ...bookingInfo, notes: e.target.value })}
                    placeholder="Any additional information or special requests..."
                    rows={5}
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t">
                <Button
                  onClick={() => setSelectedSlotForBooking(null)}
                  variant="outline"
                  className="flex-1 sm:flex-none font-bold uppercase tracking-wider h-12 px-6 sm:px-8 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitBooking}
                  disabled={bookingSlotId !== null}
                  className="flex-1 sm:flex-none font-black uppercase tracking-wider h-12 px-6 sm:px-8 rounded-lg bg-accent text-black"
                  style={{ fontWeight: '900' }}
                >
                  {bookingSlotId !== null ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

