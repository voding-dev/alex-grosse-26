"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { resolveBranding } from "@/lib/brand-presets";
import { Loader2, CheckCircle2, Mail, Clock, User, Phone, MessageSquare, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

function formatRange(startMs: number, endMs: number) {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const sameDay = start.toDateString() === end.toDateString();
  const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `${dateStr} • ${startTime} – ${endTime}` : `${dateStr} ${startTime} → ${end.toLocaleDateString()} ${endTime}`;
}

function formatDate(dateMs: number) {
  return new Date(dateMs).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function BookingInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token as string;
  const { toast } = useToast();
  const router = useRouter();
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [bookedSlotId, setBookedSlotId] = useState<string | null>(null);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<any | null>(null);
  const [bookingInfo, setBookingInfo] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const inviteData = useQuery(api.scheduling.getInviteByToken, token ? { token } : "skip");
  const slots = useQuery(api.scheduling.listAvailableSlots, token ? { token } : "skip");
  const selectSlot = useMutation(api.scheduling.selectSlot);

  const handleSelectClick = (slot: any) => {
    setSelectedSlotForBooking(slot);
  };

  const handleCloseModal = () => {
    setSelectedSlotForBooking(null);
    setBookingInfo({ name: "", email: "", phone: "", notes: "" });
  };

  const handleSubmitBooking = async () => {
    if (!selectedSlotForBooking) return;
    
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
        token, 
        slotId: slotId as any,
        bookingName: bookingInfo.name,
        bookingEmail: bookingInfo.email,
        bookingPhone: bookingInfo.phone || undefined,
        bookingNotes: bookingInfo.notes || undefined,
      });
      setBookedSlotId(slotId);
      handleCloseModal();
      toast({ title: "Booked!", description: "Your time has been reserved." });
      router.refresh();
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

  if (inviteData === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 bg-background">
        <div className="mx-auto max-w-2xl w-full">
          <Card className="border border-foreground/20">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="text-lg font-black uppercase tracking-wider mb-4" style={{ fontWeight: '900' }}>
                Invalid or Expired Invite
              </div>
              <p className="text-sm text-foreground/70">
                This booking link is no longer valid. Please contact the organizer for a new invitation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const request = inviteData?.request;
  const invite = inviteData?.invite;
  const brand = resolveBranding(request?.brandingPreset as any, request?.brandingOverrides as any);
  
  // Calculate how many slots this invite has booked
  const bookedSlotsCount = slots?.filter((s: any) => 
    s.bookedByInviteId === invite?._id
  ).length || 0;
  const maxSelections = request?.maxSelectionsPerPerson ?? 1;
  const canBookMore = bookedSlotsCount < maxSelections;
  const remainingSelections = maxSelections - bookedSlotsCount;

  // Loading state
  if (inviteData === undefined || slots === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12" style={{ backgroundColor: brand.primary }}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: brand.accent }} />
          <div className="text-sm sm:text-base opacity-80" style={{ color: brand.text }}>
            Loading booking information...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: brand.primary, color: brand.text }}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-16 space-y-8 sm:space-y-12">
        {/* Header Section */}
        <div className="space-y-6 sm:space-y-8">
          {brand.logoUrl && (
            <div className="flex items-center justify-center sm:justify-start pb-2">
              <img src={brand.logoUrl} alt="brand" className="h-8 sm:h-10 w-auto opacity-90" />
            </div>
          )}
          
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-center sm:text-left leading-tight" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: brand.text }}>
              {request?.title || "Booking"}
            </h1>
            {request?.description && (
              <div className="text-base sm:text-lg leading-relaxed opacity-90 max-w-2xl text-center sm:text-left" style={{ whiteSpace: 'pre-line', color: brand.text }}>
                {request.description}
              </div>
            )}
          </div>
        </div>

        {/* Already Booked Message */}
        {bookedSlotsCount > 0 && maxSelections === 1 && (
          <div 
            className="rounded-lg border-2 p-6"
            style={{ 
              borderColor: brand.accent,
              backgroundColor: hexToRgba(brand.accent, 0.12)
            }}
          >
            <div className="text-sm sm:text-base font-medium leading-relaxed" style={{ color: brand.text }}>
              You already selected a time. If you need to change it, contact the organizer.
            </div>
          </div>
        )}
        
        {/* Multiple Selections Info */}
        {maxSelections > 1 && bookedSlotsCount > 0 && (
          <div 
            className="rounded-lg border-2 p-6 flex items-start gap-4"
            style={{ 
              borderColor: hexToRgba(brand.accent, 0.4),
              backgroundColor: hexToRgba(brand.accent, 0.08)
            }}
          >
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: brand.accent }} />
            <div className="flex-1 space-y-2">
              <div className="text-base sm:text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900', color: brand.text }}>
                Your Bookings ({bookedSlotsCount} of {maxSelections})
              </div>
              <div className="text-sm sm:text-base opacity-80 leading-relaxed" style={{ color: brand.text }}>
                {canBookMore ? (
                  <>You can select {remainingSelections} more slot{remainingSelections !== 1 ? 's' : ''}.</>
                ) : (
                  <>You have reached the maximum number of selections ({maxSelections}).</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Organizer & Duration Info */}
        {(request?.organizerEmail || request?.durationMinutes) && (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm sm:text-base opacity-80" style={{ color: brand.text }}>
            {request?.organizerEmail && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>Organizer: <a href={`mailto:${request.organizerEmail}`} className="underline hover:opacity-70 transition-opacity">{request.organizerEmail}</a></span>
              </div>
            )}
            {request?.durationMinutes && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>Duration: {request.durationMinutes} minutes</span>
              </div>
            )}
          </div>
        )}

        {/* Success Confirmation */}
        {bookedSlotId && slots && (() => {
          const bookedSlot = slots.find(s => s._id === bookedSlotId);
          return bookedSlot ? (
            <div 
              className="rounded-lg border-2 p-6 sm:p-8 flex items-start gap-4"
              style={{ 
                borderColor: brand.accent,
                backgroundColor: hexToRgba(brand.accent, 0.15)
              }}
            >
              <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: brand.accent }} />
              <div className="flex-1 space-y-3">
                <div className="text-lg sm:text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: brand.text }}>
                  Booking Confirmed!
                </div>
                <div className="text-base sm:text-lg font-medium" style={{ color: brand.text }}>
                  {formatRange(bookedSlot.start, bookedSlot.end)}
                </div>
                <div className="text-sm sm:text-base opacity-90 leading-relaxed" style={{ color: brand.text }}>
                  Your time slot has been reserved. You should receive a confirmation email shortly.
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Available Times Section */}
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xl sm:text-2xl font-black uppercase tracking-wider text-center sm:text-left" style={{ fontWeight: '900', color: brand.text }}>
              Available Times
            </div>
            {maxSelections > 1 && (
              <div className="text-sm sm:text-base opacity-80 text-center sm:text-right" style={{ color: brand.text }}>
                You can select up to <strong>{maxSelections}</strong> slot{maxSelections !== 1 ? 's' : ''}. 
                {canBookMore ? (
                  <> You have <strong>{remainingSelections}</strong> selection{remainingSelections !== 1 ? 's' : ''} remaining.</>
                ) : (
                  <> You have reached the maximum number of selections.</>
                )}
              </div>
            )}
          </div>
          
          {slots?.length ? (
            <div className="space-y-8">
              {sortedDateGroups.map(([dateKey, dateSlots]) => {
                const dateObj = new Date(dateSlots[0].start);
                return (
                  <div key={dateKey} className="space-y-4">
                    {/* Date Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900', color: brand.text }}>
                        {formatDateShort(dateObj.getTime())}
                      </div>
                      <div className="text-base sm:text-lg font-bold uppercase tracking-wider opacity-60" style={{ color: brand.text }}>
                        {formatWeekday(dateObj.getTime())}
                      </div>
                    </div>
                    
                    {/* Time Slots Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
                              style={{ 
                                borderColor: isBookedByMe 
                                  ? brand.accent 
                                  : isBooked 
                                    ? hexToRgba(brand.accent, 0.3)
                                    : canSelectThis 
                                      ? hexToRgba(brand.accent, 0.4)
                                      : hexToRgba(brand.accent, 0.2),
                                backgroundColor: isBookedByMe 
                                  ? hexToRgba(brand.accent, 0.2)
                                  : isBooked 
                                    ? hexToRgba(brand.accent, 0.05)
                                    : hexToRgba(brand.accent, 0.08)
                              }}
                              onClick={() => canSelectThis && handleSelectClick(s)}
                            >
                              {isBookedByMe && (
                                <div className="absolute -top-2 -right-2">
                                  <div className="rounded-full bg-accent p-1" style={{ backgroundColor: brand.accent }}>
                                    <CheckCircle2 className="h-4 w-4 text-black" />
                                  </div>
                                </div>
                              )}
                              <div className="space-y-2">
                                <div className="text-lg sm:text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: brand.text }}>
                                  {formatTime(s.start, s.end)}
                                </div>
                                {isBookedByMe && (
                                  <div className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: brand.accent }}>
                                    Booked by You
                                  </div>
                                )}
                                {!isBooked && canSelectThis && (
                                  <div className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: brand.text }}>
                                    Click to book
                                  </div>
                                )}
                                {!canSelectThis && !isBooked && (
                                  <div className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: brand.text }}>
                                    Unavailable
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
            <div 
              className="rounded-lg border-2 p-8 sm:p-12 text-center"
              style={{ 
                borderColor: hexToRgba(brand.accent, 0.4),
                backgroundColor: hexToRgba(brand.accent, 0.08)
              }}
            >
              <div className="text-base sm:text-lg opacity-80" style={{ color: brand.text }}>
                No available times. Please contact the organizer at {request?.organizerEmail || 'the provided email'}.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Information Modal */}
      <Dialog open={selectedSlotForBooking !== null} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent 
          className="max-w-2xl border-2 p-6 sm:p-8 [&>button]:hidden"
          style={{
            borderColor: hexToRgba(brand.accent, 0.4),
            backgroundColor: brand.primary,
            color: brand.text
          }}
        >
          {/* Custom close button with branding */}
          <button
            onClick={handleCloseModal}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none z-10"
            style={{ 
              color: brand.text,
            }}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          <DialogHeader className="space-y-3 pb-4 border-b mb-6" style={{ borderColor: hexToRgba(brand.accent, 0.3) }}>
            <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900', color: brand.text }}>
              Booking Information
            </DialogTitle>
            {selectedSlotForBooking && (
              <DialogDescription className="text-base sm:text-lg opacity-90 leading-relaxed" style={{ color: brand.text }}>
                Please provide your information to complete the booking for{' '}
                <strong className="font-bold">{formatRange(selectedSlotForBooking.start, selectedSlotForBooking.end)}</strong>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: brand.text }}>
                <User className="inline h-4 w-4 mr-2" style={{ color: brand.accent }} />
                Name *
              </Label>
              <Input
                className="h-12 text-base"
                value={bookingInfo.name}
                onChange={(e) => setBookingInfo({ ...bookingInfo, name: e.target.value })}
                placeholder="Your full name"
                required
                style={{ 
                  backgroundColor: hexToRgba(brand.accent, 0.1), 
                  borderColor: hexToRgba(brand.accent, 0.3), 
                  color: brand.text 
                }}
              />
            </div>
            
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: brand.text }}>
                <Mail className="inline h-4 w-4 mr-2" style={{ color: brand.accent }} />
                Email *
              </Label>
              <Input
                type="email"
                className="h-12 text-base"
                value={bookingInfo.email}
                onChange={(e) => setBookingInfo({ ...bookingInfo, email: e.target.value })}
                placeholder="your@email.com"
                required
                style={{ 
                  backgroundColor: hexToRgba(brand.accent, 0.1), 
                  borderColor: hexToRgba(brand.accent, 0.3), 
                  color: brand.text 
                }}
              />
            </div>
            
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: brand.text }}>
                <Phone className="inline h-4 w-4 mr-2" style={{ color: brand.accent }} />
                Phone
              </Label>
              <Input
                type="tel"
                className="h-12 text-base"
                value={bookingInfo.phone}
                onChange={(e) => setBookingInfo({ ...bookingInfo, phone: e.target.value })}
                placeholder="(555) 123-4567"
                style={{ 
                  backgroundColor: hexToRgba(brand.accent, 0.1), 
                  borderColor: hexToRgba(brand.accent, 0.3), 
                  color: brand.text 
                }}
              />
            </div>
            
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: brand.text }}>
                <MessageSquare className="inline h-4 w-4 mr-2" style={{ color: brand.accent }} />
                Notes
              </Label>
              <Textarea
                className="text-base min-h-[120px]"
                value={bookingInfo.notes}
                onChange={(e) => setBookingInfo({ ...bookingInfo, notes: e.target.value })}
                placeholder="Any additional information or special requests..."
                rows={5}
                style={{ 
                  backgroundColor: hexToRgba(brand.accent, 0.1), 
                  borderColor: hexToRgba(brand.accent, 0.3), 
                  color: brand.text 
                }}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t" style={{ borderColor: hexToRgba(brand.accent, 0.3) }}>
            <Button
              onClick={handleCloseModal}
              variant="outline"
              className="flex-1 sm:flex-none font-bold uppercase tracking-wider h-12 px-6 sm:px-8 rounded-lg"
              style={{ 
                borderColor: hexToRgba(brand.accent, 0.4),
                color: brand.text,
                backgroundColor: 'transparent'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitBooking}
              disabled={bookingSlotId !== null}
              className="flex-1 sm:flex-none font-black uppercase tracking-wider h-12 px-6 sm:px-8 rounded-lg"
              style={{ 
                backgroundColor: brand.accent, 
                color: '#000',
                fontWeight: '900'
              }}
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
    </div>
  );
}


