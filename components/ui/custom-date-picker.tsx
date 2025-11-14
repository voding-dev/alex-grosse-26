"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, isAfter, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CustomDatePickerProps {
  value: string; // yyyy-mm-dd format
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string; // yyyy-mm-dd format
  max?: string; // yyyy-mm-dd format
  className?: string;
  rangeStartDate?: string; // yyyy-mm-dd format - for showing range selection
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  min,
  max,
  className,
  rangeStartDate,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value + "T00:00:00") : new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value + "T00:00:00"));
    } else if (rangeStartDate && isOpen) {
      // If no value but rangeStartDate is set and popover is open, navigate to start date month
      setCurrentMonth(new Date(rangeStartDate + "T00:00:00"));
    }
  }, [value, rangeStartDate, isOpen]);

  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const minDate = min ? new Date(min + "T00:00:00") : null;
  const maxDate = max ? new Date(max + "T00:00:00") : null;
  const rangeStart = rangeStartDate ? new Date(rangeStartDate + "T00:00:00") : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(monthStart);
  
  // Create calendar grid with empty cells for days before month start
  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  daysInMonth.forEach((day) => {
    calendarDays.push(day);
  });

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    onChange(dateStr);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  // Check if a date is in the range between start date and hovered/selected date
  const isInRange = (date: Date) => {
    if (!rangeStart) return false;
    
    // Use hovered date if available (for preview), otherwise use selected date
    const endDate = hoveredDate || selectedDate;
    if (!endDate) return false;
    
    const dateTime = new Date(date);
    dateTime.setHours(0, 0, 0, 0);
    
    const rangeStartTime = rangeStart.getTime();
    const rangeEndTime = endDate.getTime();
    const dateTimeValue = dateTime.getTime();
    
    // Ensure we compare dates correctly (start should be <= end)
    const actualStart = Math.min(rangeStartTime, rangeEndTime);
    const actualEnd = Math.max(rangeStartTime, rangeEndTime);
    
    // Check if date is between actualStart and actualEnd (inclusive)
    return dateTimeValue >= actualStart && dateTimeValue <= actualEnd;
  };

  // Check if a date is the start of the range
  const isRangeStart = (date: Date) => {
    if (!rangeStart) return false;
    return isSameDay(date, rangeStart);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Clear hover state when popover closes
  useEffect(() => {
    if (!isOpen) {
      setHoveredDate(null);
    }
  }, [isOpen]);

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
          <Calendar className="mr-2 h-4 w-4" />
          {value ? format(new Date(value + "T00:00:00"), "MMM dd, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start" sideOffset={8}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-base font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-xs font-bold uppercase tracking-wider text-center text-foreground/60 py-2"
                style={{ fontWeight: '900' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={idx} className="h-10" />;
              }

              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isDisabled = isDateDisabled(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const inRange = isInRange(date);
              const isStart = isRangeStart(date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => !isDisabled && handleDateSelect(date)}
                  onMouseEnter={() => !isDisabled && rangeStart && setHoveredDate(date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  disabled={isDisabled}
                  className={cn(
                    "h-10 w-10 rounded border text-sm font-bold uppercase tracking-wider transition-colors relative",
                    !isCurrentMonth && "text-foreground/30",
                    isDisabled && "opacity-30 cursor-not-allowed",
                    // Range highlighting
                    inRange && !isSelected && "bg-accent/20 border-accent/40",
                    isStart && !isSelected && "bg-accent/30 border-accent/60 ring-2 ring-accent/30",
                    // Normal states
                    !isDisabled && !isSelected && !inRange && !isStart && "border-foreground/20 hover:border-accent/50 hover:bg-accent/10",
                    isSelected && "border-accent bg-accent text-background z-10",
                    isCurrentMonth && !isSelected && !isDisabled && "text-foreground"
                  )}
                  style={isSelected ? {} : { fontWeight: '900' }}
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="mt-4 pt-4 border-t border-foreground/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const todayStr = format(today, "yyyy-MM-dd");
                if (!isDateDisabled(today)) {
                  onChange(todayStr);
                  setIsOpen(false);
                }
              }}
              className="w-full font-bold uppercase tracking-wider text-xs"
              style={{ fontWeight: '900' }}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
    </Popover>
  );
}



