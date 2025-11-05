"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { resolveBranding } from "@/lib/brand-presets";
import { Plus, Calendar, Clock, Users } from "lucide-react";

export default function SchedulingPage() {
  const { adminEmail } = useAdminAuth();
  const requests = useQuery(
    api.scheduling.listRequests, 
    adminEmail ? { email: adminEmail } : "skip"
  );

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
        <Link href="/admin/scheduling/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

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
    </div>
  );
}




