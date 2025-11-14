"use client";

import { useState, useEffect } from "react";
import { Repeat, Calendar, CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type RecurrencePattern = "daily" | "weekly" | "monthly" | "yearly" | "specific_dates" | null;

interface RecurrenceSelectorProps {
  pattern: RecurrencePattern;
  onPatternChange: (pattern: RecurrencePattern) => void;
  // Daily/Weekly
  daysOfWeek: number[];
  onDaysOfWeekChange: (days: number[]) => void;
  // Weekly
  weekInterval: number;
  onWeekIntervalChange: (interval: number) => void;
  // Specific dates
  specificDates: string[];
  onSpecificDatesChange: (dates: string[]) => void;
  // Start/End dates
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  // Monthly
  dayOfMonth: number;
  onDayOfMonthChange: (day: number) => void;
  // Yearly
  month: number;
  onMonthChange: (month: number) => void;
  dayOfYear: number;
  onDayOfYearChange: (day: number) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const MONTHS = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
];

export function RecurrenceSelector({
  pattern,
  onPatternChange,
  daysOfWeek,
  onDaysOfWeekChange,
  weekInterval,
  onWeekIntervalChange,
  specificDates,
  onSpecificDatesChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  dayOfMonth,
  onDayOfMonthChange,
  month,
  onMonthChange,
  dayOfYear,
  onDayOfYearChange,
}: RecurrenceSelectorProps) {
  const [newDateInput, setNewDateInput] = useState("");

  const handleDayToggle = (day: number) => {
    if (daysOfWeek.includes(day)) {
      onDaysOfWeekChange(daysOfWeek.filter((d) => d !== day));
    } else {
      onDaysOfWeekChange([...daysOfWeek, day].sort());
    }
  };

  const handleAddSpecificDate = () => {
    if (newDateInput && !specificDates.includes(newDateInput)) {
      onSpecificDatesChange([...specificDates, newDateInput].sort());
      setNewDateInput("");
    }
  };

  const handleRemoveSpecificDate = (dateToRemove: string) => {
    onSpecificDatesChange(specificDates.filter((d) => d !== dateToRemove));
  };

  // Generate day options for month (1-31)
  const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-4 p-5 border border-foreground/10 rounded-lg bg-foreground/5">
      <div className="flex items-center gap-2 pb-2 border-b border-foreground/10">
        <Repeat className="h-4 w-4 text-accent" />
        <label className="text-xs font-black uppercase tracking-wider text-foreground/70" style={{ fontWeight: '900' }}>
          Recurrence Pattern
        </label>
      </div>

      <div>
        <Select value={pattern || ""} onValueChange={(v) => onPatternChange(v as RecurrencePattern || null)}>
          <SelectTrigger className="border-foreground/20 focus:border-accent/40 bg-background">
            <SelectValue placeholder="Select recurrence pattern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="specific_dates">Specific Dates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pattern && (
        <div className="space-y-4 pt-2 border-t border-foreground/10">
          {/* Start Date */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
              Start Date *
            </label>
            <CustomDatePicker
              value={startDate}
              onChange={onStartDateChange}
              placeholder="Select start date"
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          {/* End Date (Optional) */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
              End Date (Optional)
            </label>
            <CustomDatePicker
              value={endDate}
              onChange={onEndDateChange}
              placeholder="No end date"
              min={startDate || format(new Date(), "yyyy-MM-dd")}
              rangeStartDate={startDate}
            />
          </div>

          {/* Daily Pattern */}
          {pattern === "daily" && (
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={cn(
                      "px-3 py-1.5 rounded border text-xs font-black uppercase tracking-wider transition-all",
                      daysOfWeek.includes(day.value)
                        ? "border-accent bg-accent text-background"
                        : "border-foreground/20 hover:border-accent/50 hover:bg-accent/10 text-foreground"
                    )}
                    style={{ fontWeight: '900' }}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Pattern */}
          {pattern === "weekly" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Every N Weeks
                </label>
                <Select value={weekInterval.toString()} onValueChange={(v) => onWeekIntervalChange(parseInt(v))}>
                  <SelectTrigger className="border-foreground/20 focus:border-accent/40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? "week" : "weeks"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayToggle(day.value)}
                      className={cn(
                        "px-3 py-1.5 rounded border text-xs font-black uppercase tracking-wider transition-all",
                        daysOfWeek.includes(day.value)
                          ? "border-accent bg-accent text-background"
                          : "border-foreground/20 hover:border-accent/50 hover:bg-accent/10 text-foreground"
                      )}
                      style={{ fontWeight: '900' }}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Monthly Pattern */}
          {pattern === "monthly" && (
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                Day of Month
              </label>
              <Select value={dayOfMonth.toString()} onValueChange={(v) => onDayOfMonthChange(parseInt(v))}>
                <SelectTrigger className="border-foreground/20 focus:border-accent/40 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthDays.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Yearly Pattern */}
          {pattern === "yearly" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Month
                </label>
                <Select value={month.toString()} onValueChange={(v) => onMonthChange(parseInt(v))}>
                  <SelectTrigger className="border-foreground/20 focus:border-accent/40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Day of Month
                </label>
                <Select value={dayOfYear.toString()} onValueChange={(v) => onDayOfYearChange(parseInt(v))}>
                  <SelectTrigger className="border-foreground/20 focus:border-accent/40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthDays.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Day {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Specific Dates Pattern */}
          {pattern === "specific_dates" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                  Add Specific Date
                </label>
                <div className="flex gap-2">
                  <CustomDatePicker
                    value={newDateInput}
                    onChange={setNewDateInput}
                    placeholder="Select date"
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecificDate}
                    disabled={!newDateInput || specificDates.includes(newDateInput)}
                    className="px-4 py-2 rounded border border-accent bg-accent text-background text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-all"
                    style={{ fontWeight: '900' }}
                  >
                    Add
                  </button>
                </div>
              </div>
              {specificDates.length > 0 && (
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-foreground/70 mb-2.5 block" style={{ fontWeight: '900' }}>
                    Selected Dates ({specificDates.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {specificDates.map((date) => (
                      <div
                        key={date}
                        className="flex items-center gap-2 px-3 py-1.5 rounded border border-foreground/20 bg-background"
                      >
                        <span className="text-xs font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                          {format(new Date(date + "T00:00:00"), "MMM dd, yyyy")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecificDate(date)}
                          className="text-foreground/50 hover:text-foreground transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

