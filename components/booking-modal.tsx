"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle2, Mail, Clock, User, Phone, MessageSquare, X, Calendar } from "lucide-react";
import { BookingDayPicker } from "@/components/booking-day-picker";
import { isSameDay } from "date-fns";

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<any | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [bookedSlotId, setBookedSlotId] = useState<string | null>(null);
  const [bookingInfo, setBookingInfo] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const bookingFormContentRef = useRef<HTMLDivElement>(null);

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
    setSelectedDate(null);
    setSelectedSlotForBooking(null);
    setBookingInfo({ name: "", email: "", phone: "", notes: "" });
    onOpenChange(false);
  };

  const handleSelectClick = (slot: any) => {
    setSelectedSlotForBooking(slot);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlotForBooking(null);
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

  // Get unique dates that have available slots
  const availableDates = slots
    ? Array.from(new Set(slots.map((slot: any) => new Date(slot.start).toDateString())))
        .map((dateStr) => new Date(dateStr))
        .sort((a, b) => a.getTime() - b.getTime())
    : [];

  // Get slots for selected date
  const selectedDateSlots = selectedDate
    ? slots?.filter((slot: any) => isSameDay(new Date(slot.start), selectedDate)).sort((a: any, b: any) => a.start - b.start) || []
    : [];

  const request = inviteData?.request;
  const invite = inviteData?.invite;

  // Calculate how many slots this invite has booked
  const bookedSlotsCount = slots?.filter((s: any) => 
    s.bookedByInviteId === invite?._id
  ).length || 0;
  const maxSelections = request?.maxSelectionsPerPerson ?? 1;
  const canBookMore = bookedSlotsCount < maxSelections;

  // Prevent page scrolling when modal is open, but allow modal content scrolling
  useEffect(() => {
    if (!open) return;

    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;

    return () => {
      // Restore body styles
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      
      // Restore scroll position
      if (originalPosition === 'fixed') {
        window.scrollTo(0, parseInt(originalTop || '0') * -1);
      }
    };
  }, [open]);

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
        <DialogContent 
          className="max-w-4xl w-[95vw] sm:w-full h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden m-0 sm:m-4 rounded-lg sm:rounded-lg"
          style={{ maxHeight: '95vh' }}
        >
          {/* Fixed Header */}
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-foreground/10 flex-shrink-0">
            <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              {request?.title || "Book a Session"}
            </DialogTitle>
            {request?.description && (
              <DialogDescription className="text-sm sm:text-base leading-relaxed mt-2">
                {request.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Scrollable Content Area */}
          <div 
            ref={scrollableContentRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 min-h-0"
            style={{ 
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              scrollbarWidth: 'thin'
            }}
          >

            {/* Success Confirmation */}
            {bookedSlotId && slots && (() => {
              const bookedSlot = slots.find(s => s._id === bookedSlotId);
              return bookedSlot ? (
                <div className="rounded-xl border-2 border-accent/50 bg-gradient-to-br from-accent/20 to-accent/10 p-4 sm:p-6 md:p-8 flex items-start gap-3 sm:gap-4 shadow-lg">
                  <div className="flex-shrink-0">
                    <div className="rounded-full bg-accent p-2 sm:p-3">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                    <div className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                      Booking Confirmed!
                    </div>
                    <div className="text-base sm:text-lg md:text-xl font-bold text-foreground/90 break-words">
                      {formatRange(bookedSlot.start, bookedSlot.end)}
                    </div>
                    <div className="text-xs sm:text-sm md:text-base text-foreground/70 leading-relaxed">
                      Your time slot has been reserved. You should receive a confirmation email shortly.
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Day Selection or Time Selection */}
            {!bookedSlotId && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-2">
                  <div className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    {selectedDate ? "Select a Time" : "Select a Date"}
                  </div>
                  {maxSelections > 1 && (
                    <div className="text-xs sm:text-sm text-foreground/70 bg-foreground/5 px-3 py-1.5 rounded-full border border-foreground/10 whitespace-nowrap">
                      You can select up to <strong className="font-bold">{maxSelections}</strong> slot{maxSelections !== 1 ? 's' : ''}. 
                      {canBookMore ? (
                        <> <strong className="font-bold">{maxSelections - bookedSlotsCount}</strong> remaining.</>
                      ) : (
                        <> Maximum reached.</>
                      )}
                    </div>
                  )}
                </div>

                {!selectedDate ? (
                  /* Day Picker */
                  <div className="border border-foreground/20 rounded-lg p-3 sm:p-4 bg-foreground/5">
                    {availableDates.length > 0 ? (
                      <>
                        <BookingDayPicker
                          availableDates={availableDates}
                          selectedDate={selectedDate}
                          onDateSelect={handleDateSelect}
                          minDate={new Date()}
                        />
                        {selectedDate && (
                          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-foreground/10">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSelectedDate(null)}
                              className="w-full font-bold uppercase tracking-wider h-11 sm:h-12"
                            >
                              Change Date
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl border-2 border-foreground/20 bg-foreground/5 p-6 sm:p-8 md:p-12 text-center">
                        <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-foreground/40" />
                        <div className="text-sm sm:text-base md:text-lg text-foreground/70 font-medium">
                          No available dates. Please contact the organizer at{' '}
                          <a href={`mailto:${request?.organizerEmail}`} className="text-accent hover:underline font-bold break-all">
                            {request?.organizerEmail || 'the provided email'}
                          </a>.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Time Slots for Selected Date */
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-foreground/10 gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-accent flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-foreground truncate" style={{ fontWeight: '900' }}>
                            {formatDateShort(selectedDate.getTime())}
                          </div>
                          <div className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider text-foreground/50">
                            {formatWeekday(selectedDate.getTime())}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDate(null)}
                        className="font-bold uppercase tracking-wider h-9 sm:h-10 px-3 sm:px-4 flex-shrink-0"
                      >
                        Change
                      </Button>
                    </div>

                    {selectedDateSlots.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                        {selectedDateSlots.map((s: any) => {
                          const isBooking = bookingSlotId === s._id;
                          const isBookedByMe = s.bookedByInviteId === invite?._id;
                          const isBooked = bookedSlotId === s._id || isBookedByMe || (invite?.selectedSlotId && invite.selectedSlotId === s._id);
                          const canSelectThis = canBookMore && !isBooked && s.status === "available";
                          return (
                            <div key={s._id}>
                              <button
                                type="button"
                                disabled={!canSelectThis}
                                className={`relative w-full rounded-xl border-2 p-3 sm:p-4 md:p-5 transition-all text-left min-h-[80px] sm:min-h-[90px] ${
                                  isBookedByMe 
                                    ? 'border-accent bg-accent/10 shadow-md scale-[1.02] cursor-default' 
                                    : isBooked 
                                      ? 'border-foreground/20 bg-foreground/5 opacity-50 cursor-not-allowed' 
                                      : canSelectThis 
                                        ? 'border-foreground/20 bg-background hover:border-accent/60 hover:bg-accent/5 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer touch-manipulation' 
                                        : 'border-foreground/20 bg-foreground/5 opacity-50 cursor-not-allowed'
                                }`}
                                onClick={() => canSelectThis && handleSelectClick(s)}
                              >
                                {isBookedByMe && (
                                  <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
                                    <div className="rounded-full bg-accent p-1 sm:p-1.5 shadow-md">
                                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-black" />
                                    </div>
                                  </div>
                                )}
                                <div className="space-y-1.5 sm:space-y-2">
                                  <div className={`text-sm sm:text-base md:text-lg font-black uppercase tracking-wider ${
                                    isBookedByMe ? 'text-accent' : isBooked ? 'text-foreground/50' : 'text-foreground'
                                  }`} style={{ fontWeight: '900' }}>
                                    {formatTime(s.start, s.end)}
                                  </div>
                                  {isBookedByMe && (
                                    <div className="text-xs font-bold uppercase tracking-wider text-accent">
                                      Booked by You
                                    </div>
                                  )}
                                  {!isBooked && canSelectThis && (
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                                      Available
                                    </div>
                                  )}
                                  {isBooked && !isBookedByMe && (
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground/40">
                                      Unavailable
                                    </div>
                                  )}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border-2 border-foreground/20 bg-foreground/5 p-6 sm:p-8 md:p-12 text-center">
                        <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-foreground/40" />
                        <div className="text-sm sm:text-base md:text-lg text-foreground/70 font-medium mb-3 sm:mb-4">
                          No available times for this date.
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedDate(null)}
                          className="font-bold uppercase tracking-wider h-11 sm:h-12 px-6 sm:px-8"
                        >
                          Select Another Date
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-foreground/10 flex-shrink-0">
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="outline"
              className="w-full sm:w-auto font-bold uppercase tracking-wider h-11 sm:h-12 px-6 sm:px-8 rounded-lg border-foreground/20 hover:bg-foreground/5"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Information Modal */}
          <Dialog open={selectedSlotForBooking !== null} onOpenChange={(open) => !open && setSelectedSlotForBooking(null)}>
            <DialogContent 
              className="max-w-2xl w-[95vw] sm:w-full h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden m-0 sm:m-4 rounded-lg sm:rounded-lg"
              style={{ maxHeight: '95vh' }}
            >
              {/* Fixed Header */}
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-foreground/10 flex-shrink-0">
                <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
                  Booking Information
                </DialogTitle>
                {selectedSlotForBooking && (
                  <DialogDescription className="text-sm sm:text-base md:text-lg mt-2 leading-relaxed break-words">
                    Please provide your information to complete the booking for{' '}
                    <strong className="font-bold text-foreground">{formatRange(selectedSlotForBooking.start, selectedSlotForBooking.end)}</strong>
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Scrollable Content */}
              <div 
                ref={bookingFormContentRef}
                className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 min-h-0"
                style={{ 
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  scrollbarWidth: 'thin'
                }}
              >
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <Label className="text-xs sm:text-sm font-black uppercase tracking-wider mb-2 block flex items-center gap-2" style={{ fontWeight: '900' }}>
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
                      Name *
                    </Label>
                    <Input
                      className="h-11 sm:h-12 text-base border-foreground/20 focus:border-accent/50"
                      value={bookingInfo.name}
                      onChange={(e) => setBookingInfo({ ...bookingInfo, name: e.target.value })}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs sm:text-sm font-black uppercase tracking-wider mb-2 block flex items-center gap-2" style={{ fontWeight: '900' }}>
                      <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
                      Email *
                    </Label>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className="h-11 sm:h-12 text-base border-foreground/20 focus:border-accent/50"
                      value={bookingInfo.email}
                      onChange={(e) => setBookingInfo({ ...bookingInfo, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs sm:text-sm font-black uppercase tracking-wider mb-2 block flex items-center gap-2" style={{ fontWeight: '900' }}>
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
                      Phone
                    </Label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className="h-11 sm:h-12 text-base border-foreground/20 focus:border-accent/50"
                      value={bookingInfo.phone}
                      onChange={(e) => setBookingInfo({ ...bookingInfo, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs sm:text-sm font-black uppercase tracking-wider mb-2 block flex items-center gap-2" style={{ fontWeight: '900' }}>
                      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
                      Notes
                    </Label>
                    <Textarea
                      className="text-base min-h-[100px] sm:min-h-[120px] border-foreground/20 focus:border-accent/50 resize-none"
                      value={bookingInfo.notes}
                      onChange={(e) => setBookingInfo({ ...bookingInfo, notes: e.target.value })}
                      placeholder="Any additional information or special requests..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-foreground/10 flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={() => setSelectedSlotForBooking(null)}
                  variant="outline"
                  className="w-full sm:flex-none font-bold uppercase tracking-wider h-11 sm:h-12 px-6 sm:px-8 rounded-lg border-foreground/20 hover:bg-foreground/5 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitBooking}
                  disabled={bookingSlotId !== null || !bookingInfo.name || !bookingInfo.email}
                  className="w-full sm:flex-none font-black uppercase tracking-wider h-11 sm:h-12 px-6 sm:px-8 rounded-lg bg-accent text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all order-1 sm:order-2"
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
    </>
  );
}

