"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { resolveBranding } from "@/lib/brand-presets";
import { Plus, Calendar, Clock, Users, Mail, Phone, MessageSquare, Download, Search } from "lucide-react";
import { PagesUsingRequest } from "@/components/pages-using-token";
import { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

export default function SchedulingPage() {
  const { adminEmail, sessionToken } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "past">("all");
  
  // Set active tab based on pathname or query parameter
  useEffect(() => {
    if (pathname === "/admin/scheduling/bookings") {
      setActiveTab("bookings");
      // Redirect to main scheduling page but keep bookings tab active
      router.replace("/admin/scheduling?tab=bookings");
    } else {
      const tabParam = searchParams.get("tab");
      if (tabParam === "bookings") {
        setActiveTab("bookings");
      } else {
        setActiveTab("requests");
      }
    }
  }, [pathname, router, searchParams]);

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "bookings") {
      router.push("/admin/scheduling?tab=bookings");
    } else {
      router.push("/admin/scheduling");
    }
  };

  const requests = useQuery(
    api.scheduling.listRequests, 
    adminEmail ? { email: adminEmail } : "skip"
  );

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

  const openRequests = requests?.filter((r) => r.status === "open") || [];
  const closedRequests = requests?.filter((r) => r.status === "closed") || [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Scheduling
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Create Calendly-style booking requests and track responses. First-come-first-served, no overlapping picks.
          </p>
        </div>
        {activeTab === "requests" && (
          <Link href="/admin/scheduling/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </Link>
        )}
        {activeTab === "bookings" && (
          <Button onClick={handleExport} className="font-bold uppercase tracking-wider" disabled={filteredBookings.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="requests" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Requests
          </TabsTrigger>
          <TabsTrigger 
            value="bookings" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            All Bookings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          {/* Info Banner */}
          <Card className="mb-8 sm:mb-12 border border-accent/30 bg-accent/5">
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm text-foreground/80 leading-relaxed">
                <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Scheduling Requests</strong> allow you to send booking invitations to multiple recipients. 
                Each recipient gets a unique link to select a time slot. Once a slot is booked, overlapping slots become unavailable for others. 
                You can also create shareable links without specific recipients.
              </p>
            </CardContent>
          </Card>

      {/* Stats */}
      <div className="mb-8 sm:mb-12 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Open Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-foreground" style={{ fontWeight: '900' }}>
              {openRequests.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-foreground" style={{ fontWeight: '900' }}>
              {requests?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-foreground" style={{ fontWeight: '900' }}>
              {closedRequests.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Requests */}
      {openRequests.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h2 className="mb-6 sm:mb-8 text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Open Booking Requests
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {openRequests.map((req) => {
              const brand = resolveBranding(req.brandingPreset, req.brandingOverrides);
              const hexToRgba = (hex: string, alpha: number): string => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };
              return (
                <Link key={req._id} href={`/admin/scheduling/${req._id}`} className="block h-full">
                  <Card 
                    className="border transition-all hover:shadow-lg cursor-pointer h-full flex flex-col"
                    style={{
                      borderColor: hexToRgba(brand.accent, 0.3),
                      backgroundColor: hexToRgba(brand.primary, 0.05),
                    }}
                  >
                    <CardContent className="p-6 sm:p-8 flex flex-col flex-1 relative">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: hexToRgba(brand.accent, 0.2),
                            borderColor: hexToRgba(brand.accent, 0.4),
                            color: brand.accent,
                            border: '1px solid'
                          }}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          {req.status}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-4 flex-1">
                        <h3 className="font-black uppercase tracking-wider text-lg sm:text-xl" style={{ fontWeight: '900', color: brand.text }}>
                          {req.title}
                        </h3>
                        {req.description && (
                          <p className="text-sm sm:text-base leading-relaxed line-clamp-3 whitespace-pre-line" style={{ color: hexToRgba(brand.text, 0.7) }}>
                            {req.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs sm:text-sm mt-auto pt-4">
                          <div className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: hexToRgba(brand.text, 0.1),
                              borderColor: hexToRgba(brand.text, 0.2),
                              color: hexToRgba(brand.text, 0.8),
                              border: '1px solid'
                            }}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {req.durationMinutes} min
                          </div>
                          <div className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: hexToRgba(brand.text, 0.1),
                              borderColor: hexToRgba(brand.text, 0.2),
                              color: hexToRgba(brand.text, 0.8),
                              border: '1px solid'
                            }}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {req.recipientEmails.length} recipient{req.recipientEmails.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <PagesUsingRequest 
                          requestId={req._id} 
                          adminEmail={adminEmail || undefined}
                          textColor={hexToRgba(brand.text, 0.7)}
                        />
                        {brand.logoUrl && (
                          <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8">
                            <Image
                              src={brand.logoUrl}
                              alt={brand.name}
                              width={80}
                              height={30}
                              className="h-5 w-auto object-contain opacity-60"
                              style={{ filter: 'brightness(0) invert(1)' }}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Closed Requests */}
      {closedRequests.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h2 className="mb-6 sm:mb-8 text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Closed Requests
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {closedRequests.map((req) => {
              const brand = resolveBranding(req.brandingPreset, req.brandingOverrides);
              const hexToRgba = (hex: string, alpha: number): string => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };
              return (
                <Link key={req._id} href={`/admin/scheduling/${req._id}`} className="block h-full">
                  <Card 
                    className="border transition-all h-full flex flex-col opacity-75"
                    style={{
                      borderColor: hexToRgba(brand.accent, 0.2),
                      backgroundColor: hexToRgba(brand.primary, 0.03),
                    }}
                  >
                    <CardContent className="p-6 sm:p-8 flex flex-col flex-1 relative">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: hexToRgba(brand.text, 0.08),
                            borderColor: hexToRgba(brand.text, 0.15),
                            color: hexToRgba(brand.text, 0.5),
                            border: '1px solid'
                          }}
                        >
                          Closed
                        </div>
                      </div>
                      <div className="flex flex-col space-y-4 flex-1">
                        <h3 className="font-black uppercase tracking-wider text-lg sm:text-xl" style={{ fontWeight: '900', color: hexToRgba(brand.text, 0.6) }}>
                          {req.title}
                        </h3>
                        {req.description && (
                          <p className="text-sm sm:text-base leading-relaxed line-clamp-3 whitespace-pre-line" style={{ color: hexToRgba(brand.text, 0.5) }}>
                            {req.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs sm:text-sm mt-auto pt-4">
                          <div className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: hexToRgba(brand.text, 0.08),
                              borderColor: hexToRgba(brand.text, 0.15),
                              color: hexToRgba(brand.text, 0.6),
                              border: '1px solid'
                            }}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {req.durationMinutes} min
                          </div>
                        </div>
                        <PagesUsingRequest 
                          requestId={req._id} 
                          adminEmail={adminEmail || undefined}
                          textColor={hexToRgba(brand.text, 0.5)}
                        />
                        {brand.logoUrl && (
                          <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8">
                            <Image
                              src={brand.logoUrl}
                              alt={brand.name}
                              width={80}
                              height={30}
                              className="h-5 w-auto object-contain opacity-60"
                              style={{ filter: 'brightness(0) invert(1)' }}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {requests && requests.length === 0 && (
        <Card className="border border-foreground/20">
          <CardContent className="py-16 text-center">
            <Calendar className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
            <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
              No booking requests yet.
            </p>
            <p className="mb-8 text-sm text-foreground/70">
              Create your first booking request to send Calendly-style invitations
            </p>
            <Link href="/admin/scheduling/new">
              <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Booking Request
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          {allBookings === undefined ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-foreground/60 mb-4">Loading bookings...</p>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}




