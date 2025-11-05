"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Edit, Globe, Smartphone, Tablet, Monitor, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function QRCodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qrCode = useQuery(api.qr_codes.get, { id: id as any });
  const urlHistory = useQuery(api.qr_codes.getUrlHistory, { qr_code_id: id as any }) || [];
  const scans = useQuery(api.qr_codes.getScans, { qr_code_id: id as any, limit: 50 }) || [];

  if (!qrCode) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-center">
          <p className="text-foreground/60 uppercase tracking-wider text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const deviceStats = scans.reduce((acc, scan) => {
    const device = scan.device_type || "Unknown";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryStats = scans.reduce((acc, scan) => {
    const country = scan.country || "Unknown";
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCountries = Object.entries(countryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const downloadSVG = () => {
    const blob = new Blob([qrCode.svg_data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${qrCode.label.replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get redirect URL for dynamic QR codes
  const getConvexRedirectUrl = () => {
    // Check for production site URL first
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
    if (siteUrl && !siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1")) {
      const baseUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
      return `${baseUrl}/api/qr-redirect`;
    }
    
    // Fallback to Convex HTTP actions if available
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return "";
    
    if (convexUrl.includes("localhost") || convexUrl.includes("127.0.0.1")) {
      return ""; // Can't determine public URL in local dev
    }
    
    // Production: Extract deployment ID
    const url = new URL(convexUrl);
    const deploymentId = url.hostname.split(".")[0];
    return `https://${deploymentId}.convex.site/qr-redirect`;
  };
  
  const redirectUrl = qrCode.type === "dynamic" 
    ? `${getConvexRedirectUrl()}?id=${qrCode._id}`
    : qrCode.content;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12">
        <Link href="/admin/qr-codes" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Back to QR Codes
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              {qrCode.label}
            </h1>
            <p className="text-foreground/70 text-lg">
              {qrCode.type === "static" ? "Static QR Code" : "Dynamic QR Code"} • Created {format(new Date(qrCode.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={downloadSVG}
              className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
            >
              <Download className="mr-2 h-4 w-4" />
              Download SVG
            </Button>
            {qrCode.type === "dynamic" && <EditDynamicQRDialog qrCode={qrCode} />}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* QR Code Preview */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              QR Code Preview
            </CardTitle>
            <CardDescription className="text-base">Scan this QR code to test it</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="max-w-[300px] w-full">
                <div
                  dangerouslySetInnerHTML={{ __html: qrCode.svg_data }}
                  className="w-full h-auto [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-full"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            </div>
            {qrCode.type === "dynamic" && (
              <div className="mt-6 rounded-lg border border-accent/30 bg-accent/5 p-4">
                <p className="text-xs font-black uppercase tracking-wider mb-2 text-foreground" style={{ fontWeight: '900' }}>
                  Redirect URL:
                </p>
                <p className="text-xs text-foreground/70 break-all">{redirectUrl}</p>
              </div>
            )}
            {qrCode.type === "static" && qrCode.content && (
              <div className="mt-6 rounded-lg border border-accent/30 bg-accent/5 p-4">
                <p className="text-xs font-black uppercase tracking-wider mb-2 text-foreground" style={{ fontWeight: '900' }}>
                  Content:
                </p>
                <p className="text-xs text-foreground/70 break-all">{qrCode.content}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Quick Stats
            </CardTitle>
            <CardDescription className="text-base">Overview of scan analytics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-5xl font-black text-foreground mb-2" style={{ fontWeight: '900' }}>
                {qrCode.scan_count}
              </p>
              <p className="text-sm text-foreground/60 font-bold uppercase tracking-wider">Total Scans</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(deviceStats).map(([device, count]) => (
                <div key={device} className="text-center">
                  <p className="text-2xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
                    {count}
                  </p>
                  <p className="text-xs text-foreground/60 font-bold uppercase tracking-wider">{device}</p>
                </div>
              ))}
            </div>
            {qrCode.type === "dynamic" && qrCode.destination_url && (
              <div className="pt-6 border-t border-foreground/10">
                <p className="text-xs font-black uppercase tracking-wider mb-2 text-foreground" style={{ fontWeight: '900' }}>
                  Current Destination:
                </p>
                <a
                  href={qrCode.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-accent/80 hover:underline break-all font-medium"
                >
                  {qrCode.destination_url}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Breakdown */}
      {Object.keys(deviceStats).length > 0 && (
        <Card className="mt-6 border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Device Breakdown
            </CardTitle>
            <CardDescription className="text-base">Scans by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(deviceStats)
                .sort(([, a], [, b]) => b - a)
                .map(([device, count]) => {
                  const percentage = ((count / qrCode.scan_count) * 100).toFixed(1);
                  const Icon = device === "Mobile" ? Smartphone : device === "Tablet" ? Tablet : Monitor;
                  return (
                    <div key={device} className="flex items-center gap-4">
                      <div className="text-accent">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold uppercase tracking-wider">{device}</span>
                          <span className="text-xs text-foreground/60 font-medium">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Country Breakdown */}
      {topCountries.length > 0 && (
        <Card className="mt-6 border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Top Countries
            </CardTitle>
            <CardDescription className="text-base">Scans by location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCountries.map(([country, count]) => {
                const percentage = ((count / qrCode.scan_count) * 100).toFixed(1);
                return (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="text-sm font-bold uppercase tracking-wider">{country}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-foreground/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-foreground/60 w-16 text-right font-medium">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* URL Change History (Dynamic Only) */}
      {qrCode.type === "dynamic" && urlHistory.length > 0 && (
        <Card className="mt-6 border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              URL Change History
            </CardTitle>
            <CardDescription className="text-base">Timeline of destination URL changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {urlHistory.map((entry, index) => (
                <div key={entry._id} className="flex items-start gap-4 pb-4 border-b border-foreground/10 last:border-0">
                  <Clock className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground/60 mb-2 font-medium">
                      {format(new Date(entry.changed_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {entry.old_url ? (
                      <div className="space-y-2">
                        <p className="text-xs line-through text-foreground/40">{entry.old_url}</p>
                        <p className="text-sm text-accent font-medium">{entry.new_url}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/80">{entry.new_url}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      {scans.length > 0 && (
        <Card className="mt-6 border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Recent Scans
            </CardTitle>
            <CardDescription className="text-base">Last 50 scans with detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scans.map((scan) => (
                <div
                  key={scan._id}
                  className="flex items-center justify-between rounded-lg border border-foreground/10 bg-foreground/5 p-4 hover:bg-foreground/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-accent">
                      {scan.device_type === "Mobile" && <Smartphone className="h-5 w-5" />}
                      {scan.device_type === "Tablet" && <Tablet className="h-5 w-5" />}
                      {scan.device_type === "Desktop" && <Monitor className="h-5 w-5" />}
                      {!scan.device_type && <Globe className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        {format(new Date(scan.scanned_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        {scan.device_type && (
                          <span className="text-xs text-foreground/60 font-medium uppercase tracking-wider">{scan.device_type}</span>
                        )}
                        {scan.country && (
                          <span className="text-xs text-foreground/60 flex items-center gap-1 font-medium">
                            <MapPin className="h-3 w-3" />
                            {scan.city ? `${scan.city}, ${scan.country}` : scan.country}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {scans.length === 0 && (
        <Card className="mt-6 border border-foreground/20">
          <CardContent className="py-16 text-center">
            <Globe className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
            <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
              No scans yet.
            </p>
            <p className="text-sm text-foreground/70">
              Scan the QR code to see analytics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EditDynamicQRDialog({ qrCode }: { qrCode: any }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(qrCode.label);
  const [destinationUrl, setDestinationUrl] = useState(qrCode.destination_url || "");
  const { toast } = useToast();
  const { adminEmail } = useAdminAuth();
  const updateQRCode = useMutation(api.qr_codes.update);

  const handleUpdate = async () => {
    if (!label.trim() || !destinationUrl.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateQRCode({
        id: qrCode._id,
        label: label.trim(),
        destination_url: destinationUrl.trim(),
        email: adminEmail || undefined,
      });
      toast({
        title: "Success",
        description: "QR code updated successfully!",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error updating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to update QR code",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            Edit Dynamic QR Code
          </DialogTitle>
          <DialogDescription className="text-base">
            Update the label and destination URL. The QR code image will remain the same.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Label htmlFor="edit-label" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
              Label
            </Label>
            <Input
              id="edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <div>
            <Label htmlFor="edit-url" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
              Destination URL
            </Label>
            <Input
              id="edit-url"
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <Button 
            onClick={handleUpdate} 
            className="w-full font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            Update QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

