"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, getDay, isToday, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingDayPickerProps {
  availableDates: Date[]; // Dates that have available slots
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  className?: string;
}

export function BookingDayPicker({
  availableDates,
  selectedDate,
  onDateSelect,
  minDate,
  className,
}: BookingDayPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

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

  const handlePrevMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    if (minDate && prevMonth < startOfMonth(minDate)) {
      return;
    }
    setCurrentMonth(prevMonth);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    // Check if this date has any available slots
    const hasSlots = availableDates.some((d) => isSameDay(d, date));
    return !hasSlots;
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePrevMonth}
          disabled={minDate ? startOfMonth(currentMonth) <= startOfMonth(minDate) : false}
          className="h-9 w-9 sm:h-10 sm:w-10 p-0 hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
          <div className="text-base sm:text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            {format(currentMonth, "MMMM yyyy")}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          className="h-9 w-9 sm:h-10 sm:w-10 p-0 hover:bg-accent/10 touch-manipulation"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-xs font-black uppercase tracking-wider text-center text-foreground/60 py-1 sm:py-2"
            style={{ fontWeight: '900' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((date, idx) => {
          if (!date) {
            return <div key={idx} className="h-10 sm:h-12" />;
          }

          const isAvailable = availableDates.some((d) => isSameDay(d, date));
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isDisabled = isDateDisabled(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isCurrentDay = isToday(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => !isDisabled && onDateSelect(date)}
              disabled={isDisabled}
              className={cn(
                "h-10 sm:h-12 rounded border text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 relative touch-manipulation",
                !isCurrentMonth && "opacity-30",
                isDisabled && "opacity-20 cursor-not-allowed",
                !isDisabled && !isSelected && !isAvailable && "border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5 active:scale-95 text-foreground/60",
                !isDisabled && isAvailable && !isSelected && "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent/60 active:scale-95",
                isSelected && "border-accent bg-accent text-background shadow-lg scale-105",
                isCurrentDay && !isSelected && "ring-2 ring-accent/50",
              )}
              style={{ fontWeight: '900' }}
            >
              {format(date, "d")}
              {isAvailable && !isSelected && (
                <div className="absolute bottom-0.5 sm:bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

