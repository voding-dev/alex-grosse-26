"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { format } from "date-fns";
import { Mail, Phone, Calendar, Clock, MessageSquare, Download, Search } from "lucide-react";
import { useState, useMemo } from "react";

export default function BookingsPage() {
  const { adminEmail, sessionToken } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "past">("all");
  
  // Query all bookings across all schedulers
  const allBookings = useQuery(
    api.scheduling.getAllBookings,
    (adminEmail || sessionToken) ? { 
      email: adminEmail || undefined,
      sessionToken: sessionToken || undefined,
    } : "skip"
  );
  
  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    if (!allBookings) return [];
    
    let filtered = allBookings;
    
    // Filter by status
    const now = Date.now();
    if (filterStatus === "upcoming") {
      filtered = filtered.filter((b: any) => b.slotStart > now);
    } else if (filterStatus === "past") {
      filtered = filtered.filter((b: any) => b.slotStart <= now);
    }
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((b: any) => 
        b.bookingName?.toLowerCase().includes(query) ||
        b.bookingEmail?.toLowerCase().includes(query) ||
        b.requestTitle?.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a: any, b: any) => b.slotStart - a.slotStart);
  }, [allBookings, searchQuery, filterStatus]);
  
  // Export to CSV
  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Phone", "Date", "Time", "Scheduler", "Notes"].join(","),
      ...filteredBookings.map((b: any) => [
        b.bookingName || "",
        b.bookingEmail || "",
        b.bookingPhone || "",
        format(new Date(b.slotStart), "yyyy-MM-dd"),
        format(new Date(b.slotStart), "HH:mm") + " - " + format(new Date(b.slotEnd), "HH:mm"),
        b.requestTitle || "",
        (b.bookingNotes || "").replace(/"/g, '""'),
      ].map(field => `"${field}"`).join(",")),
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (allBookings === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-foreground/60 mb-4">Loading bookings...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900' }}>
            All Bookings
          </h1>
          <p className="text-foreground/70">
            View and manage all booking information across all schedulers
          </p>
        </div>
        <Button onClick={handleExport} className="font-bold uppercase tracking-wider" disabled={filteredBookings.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="mb-6 border border-foreground/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <Input
                placeholder="Search by name, email, or scheduler..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className="font-bold uppercase tracking-wider h-11"
              >
                All
              </Button>
              <Button
                variant={filterStatus === "upcoming" ? "default" : "outline"}
                onClick={() => setFilterStatus("upcoming")}
                className="font-bold uppercase tracking-wider h-11"
              >
                Upcoming
              </Button>
              <Button
                variant={filterStatus === "past" ? "default" : "outline"}
                onClick={() => setFilterStatus("past")}
                className="font-bold uppercase tracking-wider h-11"
              >
                Past
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking: any) => {
            const isUpcoming = booking.slotStart > Date.now();
            const slotDate = new Date(booking.slotStart);
            const slotEnd = new Date(booking.slotEnd);
            
            return (
              <Card key={booking.inviteId} className="border border-foreground/20 hover:border-accent/50 transition-all">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Booking Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900' }}>
                            {booking.bookingName || "Unnamed"}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-sm text-foreground/70">
                            {booking.bookingEmail && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                <a href={`mailto:${booking.bookingEmail}`} className="hover:text-accent">
                                  {booking.bookingEmail}
                                </a>
                              </div>
                            )}
                            {booking.bookingPhone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                <a href={`tel:${booking.bookingPhone}`} className="hover:text-accent">
                                  {booking.bookingPhone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={isUpcoming ? "default" : "secondary"} className="font-bold uppercase tracking-wider">
                          {isUpcoming ? "Upcoming" : "Past"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                              Date & Time
                            </div>
                            <div className="font-medium">
                              {format(slotDate, "EEEE, MMMM d, yyyy")}
                            </div>
                            <div className="text-sm text-foreground/70">
                              {format(slotDate, "h:mm a")} - {format(slotEnd, "h:mm a")}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                              Scheduler
                            </div>
                            <div className="font-medium">{booking.requestTitle}</div>
                            {booking.requestDescription && (
                              <div className="text-sm text-foreground/70 mt-1">{booking.requestDescription}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {booking.bookingNotes && (
                        <div className="flex items-start gap-3 pt-2 border-t border-foreground/10">
                          <MessageSquare className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                              Notes
                            </div>
                            <div className="text-sm text-foreground/80">{booking.bookingNotes}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
              <p className="font-bold uppercase tracking-wider mb-2">No bookings found</p>
              <p className="text-sm text-foreground/60">
                {searchQuery ? "Try adjusting your search" : "No bookings match your filters"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

