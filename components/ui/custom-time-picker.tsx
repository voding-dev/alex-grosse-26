"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CustomTimePickerProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomTimePicker({
  value,
  onChange,
  placeholder = "Select time",
  className,
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Convert 24-hour to 12-hour for display
  const get12HourFormat = (hour24: number) => {
    if (hour24 === 0) return 12;
    if (hour24 > 12) return hour24 - 12;
    return hour24;
  };
  
  const initialHour24 = value ? parseInt(value.split(':')[0]) : 12;
  const [hours, setHours] = useState<number>(get12HourFormat(initialHour24));
  const [minutes, setMinutes] = useState<number>(value ? parseInt(value.split(':')[1]) : 0);
  const [period, setPeriod] = useState<"AM" | "PM">(value ? (parseInt(value.split(':')[0]) >= 12 ? "PM" : "AM") : "PM");
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h24, m] = value.split(':').map(Number);
      setHours(get12HourFormat(h24));
      setMinutes(m);
      setPeriod(h24 >= 12 ? "PM" : "AM");
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      // Scroll to selected values
      setTimeout(() => {
        const selectedHour = hoursRef.current?.querySelector(`[data-hour="${hours}"]`);
        const selectedMinute = minutesRef.current?.querySelector(`[data-minute="${minutes}"]`);
        selectedHour?.scrollIntoView({ block: "center", behavior: "smooth" });
        selectedMinute?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, hours, minutes]);

  // Prevent page scrolling when popover is open, but allow column scrolling
  useEffect(() => {
    if (!isOpen) return;

    const hoursContainer = hoursRef.current;
    const minutesContainer = minutesRef.current;

    // Prevent page scrolling when hovering over the popover (but allow column scrolling)
    const preventPageScroll = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      const target = wheelEvent.target as HTMLElement;
      
      // Check if we're inside a scrollable column - if so, allow native scrolling
      if (hoursContainer?.contains(target) || minutesContainer?.contains(target)) {
        // Let the column handle its own scrolling - don't prevent
        return;
      }
      
      // If we're not in a scrollable column, prevent page scroll
      const popoverContent = document.querySelector('[data-radix-popper-content-wrapper]');
      if (popoverContent && popoverContent.contains(target)) {
        wheelEvent.preventDefault();
        wheelEvent.stopPropagation();
      }
    };

    // Only prevent page scroll on the popover content, not on document with capture
    const popoverContent = document.querySelector('[data-radix-popper-content-wrapper]');
    if (popoverContent) {
      popoverContent.addEventListener('wheel', preventPageScroll, { passive: false });
    }

    return () => {
      if (popoverContent) {
        popoverContent.removeEventListener('wheel', preventPageScroll);
      }
    };
  }, [isOpen]);

  // Prevent page scrolling on touch when popover is open, but allow column scrolling
  useEffect(() => {
    if (!isOpen) return;

    const hoursContainer = hoursRef.current;
    const minutesContainer = minutesRef.current;

    // Prevent page scroll on touch when over popover (but allow column scrolling)
    const preventPageTouchScroll = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const target = touchEvent.target as HTMLElement;
      
      // Check if we're inside a scrollable column - if so, allow native scrolling
      if (hoursContainer?.contains(target) || minutesContainer?.contains(target)) {
        // Let the column handle its own scrolling - don't prevent
        return;
      }
      
      // If we're not in a scrollable column, prevent page scroll
      const popoverContent = document.querySelector('[data-radix-popper-content-wrapper]');
      if (popoverContent && popoverContent.contains(target)) {
        touchEvent.preventDefault();
      }
    };

    // Prevent page scroll on touch when over popover
    const popoverContent = document.querySelector('[data-radix-popper-content-wrapper]');
    if (popoverContent) {
      popoverContent.addEventListener('touchmove', preventPageTouchScroll, { passive: false });
    }

    return () => {
      if (popoverContent) {
        popoverContent.removeEventListener('touchmove', preventPageTouchScroll);
      }
    };
  }, [isOpen]);

  const formatTime = (h: number, m: number, p: "AM" | "PM"): string => {
    let hour24 = h;
    if (p === "PM" && h !== 12) hour24 = h + 12;
    if (p === "AM" && h === 12) hour24 = 0;
    return `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleTimeChange = (newHours: number, newMinutes: number, newPeriod: "AM" | "PM") => {
    setHours(newHours);
    setMinutes(newMinutes);
    setPeriod(newPeriod);
    onChange(formatTime(newHours, newMinutes, newPeriod));
  };

  const displayValue = value 
    ? (() => {
        const [h, m] = value.split(':').map(Number);
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const period = h >= 12 ? "PM" : "AM";
        return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
      })()
    : placeholder;

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const scrollToValue = (container: HTMLDivElement | null, value: number, type: "hour" | "minute") => {
    if (!container) return;
    const element = container.querySelector(`[data-${type}="${value}"]`) as HTMLElement;
    if (element) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full h-12 text-base justify-start text-left font-normal border-foreground/20 hover:border-accent/50 focus:border-accent/50",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 bg-background border-foreground/20 shadow-xl" 
        align="start" 
        sideOffset={8}
      >
        <div className="flex items-stretch">
          {/* Hours */}
          <div className="flex flex-col border-r border-foreground/10 flex-1 relative">
            <div className="text-xs font-black uppercase tracking-wider text-foreground/70 py-2.5 px-2 border-b border-foreground/10 w-full text-center bg-foreground/5" style={{ fontWeight: '900' }}>
              HOUR
            </div>
            {/* Scroll indicator - top */}
            <div className="absolute top-8 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
            <div
              ref={hoursRef}
              className="h-56 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-foreground/30 scrollbar-track-transparent relative"
              style={{ 
                scrollbarWidth: 'thin', 
                overscrollBehavior: 'contain', 
                touchAction: 'pan-y',
                WebkitOverflowScrolling: 'touch'
              }}
              onWheel={(e) => {
                // Allow native scrolling - don't prevent
                e.stopPropagation();
              }}
            >
              {/* Selection indicator */}
              <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 pointer-events-none border-y-2 border-accent/40 bg-accent/10 z-0 rounded-sm" />
              
              {hourOptions.map((hour) => {
                const isSelected = hour === hours;
                return (
                  <button
                    key={hour}
                    type="button"
                    data-hour={hour}
                    onClick={() => handleTimeChange(hour, minutes, period)}
                    className={cn(
                      "relative z-10 w-full py-3 text-sm font-black uppercase tracking-wider transition-all duration-200",
                      isSelected
                        ? "bg-accent text-black scale-[1.05] shadow-md font-bold"
                        : "text-foreground hover:bg-foreground/5 hover:text-accent/80"
                    )}
                    style={isSelected ? { fontWeight: '900' } : { fontWeight: '900' }}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
            {/* Scroll indicator - bottom */}
            <div className="absolute bottom-12 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
          </div>

          {/* Minutes */}
          <div className="flex flex-col border-r border-foreground/10 flex-1 relative">
            <div className="text-xs font-black uppercase tracking-wider text-foreground/70 py-2.5 px-2 border-b border-foreground/10 w-full text-center bg-foreground/5" style={{ fontWeight: '900' }}>
              MINUTE
            </div>
            {/* Scroll indicator - top */}
            <div className="absolute top-8 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
            <div
              ref={minutesRef}
              className="h-56 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-foreground/30 scrollbar-track-transparent relative"
              style={{ 
                scrollbarWidth: 'thin', 
                overscrollBehavior: 'contain', 
                touchAction: 'pan-y',
                WebkitOverflowScrolling: 'touch'
              }}
              onWheel={(e) => {
                // Allow native scrolling - don't prevent
                e.stopPropagation();
              }}
            >
              {/* Selection indicator */}
              <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 pointer-events-none border-y-2 border-accent/40 bg-accent/10 z-0 rounded-sm" />
              
              {minuteOptions.map((minute) => {
                const isSelected = minute === minutes;
                return (
                  <button
                    key={minute}
                    type="button"
                    data-minute={minute}
                    onClick={() => handleTimeChange(hours, minute, period)}
                    className={cn(
                      "relative z-10 w-full py-3 text-sm font-black uppercase tracking-wider transition-all duration-200",
                      isSelected
                        ? "bg-accent text-black scale-[1.05] shadow-md font-bold"
                        : "text-foreground hover:bg-foreground/5 hover:text-accent/80"
                    )}
                    style={isSelected ? { fontWeight: '900' } : { fontWeight: '900' }}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
            {/* Scroll indicator - bottom */}
            <div className="absolute bottom-12 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
          </div>

          {/* AM/PM */}
          <div className="flex flex-col flex-1">
            <div className="text-xs font-black uppercase tracking-wider text-foreground/70 py-2.5 px-2 border-b border-foreground/10 w-full text-center bg-foreground/5" style={{ fontWeight: '900' }}>
              PERIOD
            </div>
            <div
              ref={periodRef}
              className="h-56 flex flex-col justify-center gap-3 px-3"
            >
              {(["AM", "PM"] as const).map((p) => {
                const isSelected = p === period;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleTimeChange(hours, minutes, p)}
                    className={cn(
                      "w-full py-3.5 text-sm font-black uppercase tracking-wider transition-all duration-200 rounded-md",
                      isSelected
                        ? "bg-accent text-black scale-[1.05] shadow-md font-bold"
                        : "text-foreground hover:bg-foreground/5 hover:text-accent/80 border border-foreground/20 hover:border-accent/30"
                    )}
                    style={isSelected ? { fontWeight: '900' } : { fontWeight: '900' }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-foreground/10 bg-foreground/5">
          <Button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full font-black uppercase tracking-wider h-10 bg-accent text-black hover:bg-accent/90 shadow-md hover:shadow-lg transition-all"
            style={{ fontWeight: '900' }}
          >
            DONE
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

