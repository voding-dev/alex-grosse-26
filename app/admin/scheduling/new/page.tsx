"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Calendar } from "lucide-react";
import { BRAND_PRESETS, BrandingPresetId } from "@/lib/brand-presets";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { format } from "date-fns";

type SlotDraft = { start: string; end: string };

export default function NewSchedulingRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { adminEmail } = useAdminAuth();
  const createRequest = useMutation(api.scheduling.createRequest);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxSelectionsPerPerson, setMaxSelectionsPerPerson] = useState(1);
  const [slots, setSlots] = useState<SlotDraft[]>([{ start: "", end: "" }]);
  // Branding
  const [brandingPreset, setBrandingPreset] = useState<BrandingPresetId>("ian");
  // Generator state
  const [genStartDate, setGenStartDate] = useState(""); // yyyy-mm-dd
  const [genEndDate, setGenEndDate] = useState("");
  const [genDays, setGenDays] = useState<{[k: string]: boolean}>({ Sun: false, Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false });
  const [genDailyStart, setGenDailyStart] = useState("09:00"); // HH:mm
  const [genDailyEnd, setGenDailyEnd] = useState("17:00");
  const [genInterval, setGenInterval] = useState(60); // minutes between starts

  const addSlot = () => setSlots([...slots, { start: "", end: "" }]);
  const removeSlot = (idx: number) => setSlots(slots.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, key: keyof SlotDraft, value: string) => {
    const next = [...slots];
    next[idx] = { ...next[idx], [key]: value };
    setSlots(next);
  };

  const toggleGenDay = (day: string) => setGenDays((prev) => ({ ...prev, [day]: !prev[day] }));

  function toLocalMs(dateStr: string, timeStr: string): number {
    // dateStr: yyyy-mm-dd, timeStr: HH:mm → local Date ms
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const dt = new Date(y, (m - 1), d, hh, mm, 0, 0);
    return dt.getTime();
  }

  const generateSlots = () => {
    if (!genStartDate || !genEndDate) return;
    const startDate = new Date(genStartDate + "T00:00:00");
    const endDate = new Date(genEndDate + "T00:00:00");
    if (endDate < startDate) return;

    const daysOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const newSlots: SlotDraft[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayKey = daysOrder[d.getDay()];
      if (!genDays[dayKey]) continue;

      // build day windows
      const dayStr = d.toISOString().slice(0,10);
      const dayStartMs = toLocalMs(dayStr, genDailyStart);
      const dayEndMs = toLocalMs(dayStr, genDailyEnd);
      if (dayEndMs <= dayStartMs) continue;

      for (let s = dayStartMs; s + durationMinutes * 60_000 <= dayEndMs; s += genInterval * 60_000) {
        const e = s + durationMinutes * 60_000;
        newSlots.push({
          start: new Date(s).toISOString().slice(0,16), // yyyy-mm-ddTHH:mm
          end: new Date(e).toISOString().slice(0,16),
        });
      }
    }

    if (newSlots.length) {
      setSlots((prev) => [...prev, ...newSlots]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !organizerEmail) {
      toast({ title: "Missing info", description: "Title and organizer email are required", variant: "destructive" });
      return;
    }
    const recipients = recipientEmails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);
    // Recipients are optional - you can create a booking request without recipients
    const parsedSlots = slots
      .filter((s) => s.start && s.end)
      .map((s) => ({ start: new Date(s.start).getTime(), end: new Date(s.end).getTime() }))
      .filter((s) => s.end > s.start);
    if (parsedSlots.length === 0) {
      toast({ title: "No slots", description: "Add at least one valid slot", variant: "destructive" });
      return;
    }

    try {
      const id = await createRequest({
        title,
        description: description || undefined,
        organizerEmail,
        recipientEmails: recipients,
        timezone,
        durationMinutes: Number(durationMinutes),
        maxSelectionsPerPerson: Number(maxSelectionsPerPerson) || 1,
        windowStart: parsedSlots.reduce((min, s) => Math.min(min, s.start), Infinity),
        windowEnd: parsedSlots.reduce((max, s) => Math.max(max, s.end), -Infinity),
        slots: parsedSlots,
        brandingPreset,
        email: adminEmail || undefined,
      });
      toast({ title: "Request created", description: "Share invite links from the request page" });
      router.push(`/admin/scheduling/${id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create request", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/scheduling" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Back to Scheduling
        </Link>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          New Booking Request
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          Create a Calendly-style booking request to send to multiple people. First-come-first-served, no overlapping picks.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Info Banner */}
        <Card className="border border-accent/30 bg-accent/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 text-accent flex-shrink-0" />
              <div className="text-sm text-foreground/80 leading-relaxed">
                <p className="font-black uppercase tracking-wider mb-3 text-foreground" style={{ fontWeight: '900' }}>
                  How this works:
                </p>
                <ol className="ml-4 list-decimal space-y-2">
                  <li>Enter booking details (title, organizer, recipients, duration)</li>
                  <li>Choose a branding preset for the public booking page</li>
                  <li>Add time slots using the generator or manual entry</li>
                  <li>Share invite links with recipients (or create shareable links)</li>
                  <li>Recipients select their preferred time slot (first-come-first-served)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Step 1: Branding Preset */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Step 1: Branding Preset
            </CardTitle>
            <CardDescription className="text-base">
              Choose a lightweight theme for the public booking page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[BRAND_PRESETS.ian, BRAND_PRESETS.styledriven, BRAND_PRESETS.voding].map((p) => {
                const isSelected = brandingPreset === p.id;
                const hexToRgba = (hex: string, alpha: number): string => {
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setBrandingPreset(p.id)}
                    className="rounded-lg border p-6 transition-colors flex items-center justify-center"
                    style={{ 
                      background: p.primary, 
                      color: p.text,
                      borderColor: isSelected ? p.accent : hexToRgba(p.text, 0.2),
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      backgroundColor: isSelected ? hexToRgba(p.accent, 0.1) : p.primary
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = hexToRgba(p.accent, 0.5);
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = hexToRgba(p.text, 0.2);
                      }
                    }}
                  >
                    {p.logoUrl ? (
                      <Image
                        src={p.logoUrl}
                        alt={p.name}
                        width={160}
                        height={60}
                        className="h-12 w-auto object-contain opacity-90"
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                    ) : (
                      <div className="text-sm uppercase font-bold tracking-wider opacity-80">{p.name}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Booking Details */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Step 2: Booking Details
            </CardTitle>
            <CardDescription className="text-base">
              Enter the basic information for this booking request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>Title *</Label>
              <Input className="h-12 text-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="30-min intro call" required />
            </div>
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>Description</Label>
              <Textarea className="text-base" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context, agenda, etc." />
            </div>
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>Organizer Email *</Label>
              <Input className="h-12 text-base" type="email" value={organizerEmail} onChange={(e) => setOrganizerEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>Recipient Emails (comma-separated)</Label>
              <Textarea className="text-base" rows={2} value={recipientEmails} onChange={(e) => setRecipientEmails(e.target.value)} placeholder="a@example.com, b@example.com (optional)" />
              <p className="mt-2 text-xs text-foreground/60">Leave empty to create a booking request without recipients</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>Timezone</Label>
                <Input className="h-12 text-base" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/New_York" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Duration (minutes) *</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="What is duration?" className="text-foreground/60 hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Length of each meeting. Generated slots use this to compute end times.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input className="h-12 text-base" type="number" min={5} step={5} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Max Selections Per Person</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="What is max selections?" className="text-foreground/60 hover:text-foreground">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Maximum number of time slots each person can book. Default is 1.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input className="h-12 text-base" type="number" min={1} step={1} value={maxSelectionsPerPerson} onChange={(e) => setMaxSelectionsPerPerson(Number(e.target.value))} required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Candidate Slots */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Step 3: Candidate Slots
            </CardTitle>
            <CardDescription className="text-base">
              Add potential time slots. Use the generator below for repeating ranges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 border border-foreground/20 rounded-lg p-4 bg-foreground/5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>Slot Generator</div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="How generator works" className="text-foreground/60 hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Choose a date range, weekdays, hours, and an interval. The tool creates slots with your duration starting every interval within those hours.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold uppercase tracking-wider">Start Date</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="What is start date?" className="text-foreground/60 hover:text-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          First day to generate availability for. Only selected weekdays within this range are used.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CustomDatePicker
                    value={genStartDate}
                    onChange={setGenStartDate}
                    placeholder="Select start date"
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold uppercase tracking-wider">End Date</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="What is end date?" className="text-foreground/60 hover:text-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Last day to generate availability for. The range is inclusive.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CustomDatePicker
                    value={genEndDate}
                    onChange={setGenEndDate}
                    placeholder="Select end date"
                    min={genStartDate || format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]).map((d) => (
                  <button type="button" key={d} onClick={() => toggleGenDay(d)} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded border ${genDays[d] ? 'border-accent bg-accent/10 text-accent' : 'border-foreground/20 text-foreground/80'}`}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Daily Start</Label>
                  <Input type="time" value={genDailyStart} onChange={(e) => setGenDailyStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Daily End</Label>
                  <Input type="time" value={genDailyEnd} onChange={(e) => setGenDailyEnd(e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold uppercase tracking-wider">Interval (min)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="What is interval?" className="text-foreground/60 hover:text-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          How often new starts occur. Example: 60 min duration with 30 min interval starts every 30 minutes.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input type="number" min={5} step={5} value={genInterval} onChange={(e) => setGenInterval(Number(e.target.value))} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold uppercase tracking-wider">Duration (min)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="What is duration?" className="text-foreground/60 hover:text-foreground">
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Length of each slot. End time = start + duration.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input type="number" min={5} step={5} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <Button type="button" variant="outline" className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors" onClick={generateSlots}>Generate Slots</Button>
              </div>
            </div>

            {slots.map((s, i) => {
              const startDate = s.start ? s.start.split('T')[0] : '';
              const startTime = s.start ? s.start.split('T')[1] : '';
              const endDate = s.end ? s.end.split('T')[0] : '';
              const endTime = s.end ? s.end.split('T')[1] : '';

              return (
                <div key={i} className="space-y-4 p-4 border border-foreground/20 rounded-lg bg-foreground/5 hover:border-accent/30 transition-colors">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Start Date</Label>
                      <CustomDatePicker
                        value={startDate}
                        onChange={(date) => {
                          const newStart = date + (startTime ? 'T' + startTime : 'T00:00');
                          updateSlot(i, 'start', newStart);
                        }}
                        placeholder="Select start date"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Start Time</Label>
                      <Input 
                        type="time" 
                        value={startTime} 
                        onChange={(e) => {
                          const newStart = (startDate || format(new Date(), "yyyy-MM-dd")) + 'T' + e.target.value;
                          updateSlot(i, 'start', newStart);
                        }} 
                        className="h-12 text-base"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">End Date</Label>
                      <CustomDatePicker
                        value={endDate}
                        onChange={(date) => {
                          const newEnd = date + (endTime ? 'T' + endTime : 'T00:00');
                          updateSlot(i, 'end', newEnd);
                        }}
                        placeholder="Select end date"
                        min={startDate}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">End Time</Label>
                      <Input 
                        type="time" 
                        value={endTime} 
                        onChange={(e) => {
                          const newEnd = (endDate || format(new Date(), "yyyy-MM-dd")) + 'T' + e.target.value;
                          updateSlot(i, 'end', newEnd);
                        }} 
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                  <div>
                    <Button type="button" variant="outline" size="sm" className="font-bold uppercase tracking-wider hover:bg-foreground/10 transition-colors" onClick={() => removeSlot(i)}>Remove</Button>
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="outline" className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors" onClick={addSlot}>Add Slot</Button>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            type="submit" 
            className="w-full sm:flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Create Booking Request
          </Button>
          <Link href="/admin/scheduling" className="w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline"
              className="w-full sm:w-auto font-bold uppercase tracking-wider hover:bg-foreground/10 transition-colors"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}


