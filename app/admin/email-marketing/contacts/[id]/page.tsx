"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Send, Eye, MousePointerClick, X, AlertTriangle, User, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const id = params.id as string;

  const contact = useQuery(
    api.emailMarketing.getContact,
    adminEmail ? { id: id as any } : ("skip" as const)
  );

  const sends = useQuery(
    api.emailMarketing.getContactSends,
    adminEmail ? { contactId: id as any } : ("skip" as const)
  ) || [];

  const updateContact = useMutation(api.emailMarketing.updateContact);
  const deleteContact = useMutation(api.emailMarketing.deleteContact);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    tags: contact?.tags || [],
    status: contact?.status || "subscribed",
  });

  if (!contact) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center">
          <p className="text-foreground/60">Loading contact...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!adminEmail) return;

    try {
      await updateContact({
        id: contact._id,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        tags: formData.tags,
        status: formData.status as any,
        adminEmail,
      });
      toast({
        title: "Contact updated",
        description: "Contact information has been updated.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update contact.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!adminEmail || !confirm("Are you sure you want to delete this contact?")) return;

    try {
      await deleteContact({ id: contact._id, email: adminEmail });
      toast({
        title: "Contact deleted",
        description: "Contact has been deleted.",
      });
      router.push("/admin/email-marketing");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete contact.",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const totalSends = sends.length;
  const opened = sends.filter(s => s.opened).length;
  const clicked = sends.filter(s => s.clicked).length;
  const unsubscribed = sends.filter(s => s.unsubscribed).length;
  const bounced = sends.filter(s => s.bounced).length;
  const spam = sends.filter(s => s.markedAsSpam).length;
  const totalOpens = sends.reduce((sum, s) => sum + (s.openedCount || 0), 0);
  const totalClicks = sends.reduce((sum, s) => sum + (s.clickedCount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <Link
            href="/admin/email-marketing"
            className="text-sm font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground mb-4 inline-block"
          >
            ← Back to Email Marketing
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Contact Details
          </h1>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="font-black uppercase tracking-wider"
          >
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="font-black uppercase tracking-wider"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label htmlFor="email" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={contact.email}
                    disabled
                    className="font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="firstName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                    Status
                  </Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-background text-foreground font-medium"
                  >
                    <option value="subscribed">Subscribed</option>
                    <option value="unsubscribed">Unsubscribed</option>
                    <option value="bounced">Bounced</option>
                    <option value="spam">Spam</option>
                  </select>
                </div>
                <Button
                  onClick={handleSave}
                  className="w-full font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-foreground/40" />
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Email
                    </p>
                    <p className="text-lg font-bold text-foreground">{contact.email}</p>
                  </div>
                </div>
                {(contact.firstName || contact.lastName) && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-foreground/40" />
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                        Name
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "—"}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-foreground/40" />
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Status
                    </p>
                    <span
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded inline-block ${
                        contact.status === "subscribed"
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : contact.status === "unsubscribed"
                          ? "bg-red-500/20 text-red-500 border border-red-500/30"
                          : contact.status === "bounced"
                          ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                          : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                      }`}
                    >
                      {contact.status}
                    </span>
                  </div>
                </div>
                {contact.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-foreground/40 mt-1" />
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-2">
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t border-foreground/10 space-y-1 text-xs text-foreground/50">
                  <div>Created {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}</div>
                  {contact.updatedAt !== contact.createdAt && (
                    <div>Updated {formatDistanceToNow(new Date(contact.updatedAt), { addSuffix: true })}</div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Email Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-foreground/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="h-4 w-4 text-foreground/40" />
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                    Total Sends
                  </p>
                </div>
                <p className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                  {totalSends}
                </p>
              </div>
              <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-accent" />
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                    Opens
                  </p>
                </div>
                <p className="text-2xl font-black text-accent" style={{ fontWeight: '900' }}>
                  {opened}
                </p>
                {totalSends > 0 && (
                  <p className="text-xs text-foreground/60 mt-1">
                    {((opened / totalSends) * 100).toFixed(1)}% open rate
                  </p>
                )}
              </div>
              <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointerClick className="h-4 w-4 text-accent" />
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                    Clicks
                  </p>
                </div>
                <p className="text-2xl font-black text-accent" style={{ fontWeight: '900' }}>
                  {clicked}
                </p>
                {totalSends > 0 && (
                  <p className="text-xs text-foreground/60 mt-1">
                    {((clicked / totalSends) * 100).toFixed(1)}% click rate
                  </p>
                )}
              </div>
              <div className="p-4 border border-foreground/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-foreground/40" />
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                    Total Opens
                  </p>
                </div>
                <p className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                  {totalOpens}
                </p>
              </div>
            </div>

            {(unsubscribed > 0 || bounced > 0 || spam > 0) && (
              <div className="pt-4 border-t border-foreground/10 space-y-2">
                {unsubscribed > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500" />
                      <span className="font-bold uppercase tracking-wider text-foreground/60">
                        Unsubscribed
                      </span>
                    </div>
                    <span className="font-black text-red-500">{unsubscribed}</span>
                  </div>
                )}
                {bounced > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="font-bold uppercase tracking-wider text-foreground/60">
                        Bounced
                      </span>
                    </div>
                    <span className="font-black text-orange-500">{bounced}</span>
                  </div>
                )}
                {spam > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold uppercase tracking-wider text-foreground/60">
                        Marked as Spam
                      </span>
                    </div>
                    <span className="font-black text-yellow-500">{spam}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email History */}
      <Card className="mt-6 border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sends.length === 0 ? (
            <div className="py-8 text-center">
              <Mail className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
              <p className="text-foreground/60">No emails sent to this contact yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sends.map((send: any) => (
                <div key={send._id} className="p-4 border border-foreground/10 rounded-lg hover:border-accent/50 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link href={`/admin/email-marketing/campaigns/${send.campaignId}`}>
                        <p className="font-bold text-foreground hover:text-accent transition-colors">
                          {send.campaign?.name || "Unknown Campaign"}
                        </p>
                      </Link>
                      <p className="text-sm text-foreground/60 mt-1">{send.campaign?.subject || ""}</p>
                      <div className="flex gap-4 mt-3 text-xs text-foreground/60">
                        <span>
                          {send.sentAt ? formatDistanceToNow(new Date(send.sentAt), { addSuffix: true }) : "Not sent"}
                        </span>
                        {send.lastOpenedAt && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Last opened: {formatDistanceToNow(new Date(send.lastOpenedAt), { addSuffix: true })}
                          </span>
                        )}
                        {send.lastClickedAt && (
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="h-3 w-3" />
                            Last clicked: {formatDistanceToNow(new Date(send.lastClickedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <span
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded block ${
                          send.status === "delivered"
                            ? "bg-green-500/20 text-green-500 border border-green-500/30"
                            : send.status === "bounced"
                            ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                            : "bg-accent/20 text-accent border border-accent/30"
                        }`}
                      >
                        {send.status}
                      </span>
                      <div className="flex gap-2 text-xs text-foreground/60">
                        {send.opened && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {send.openedCount || 0}
                          </span>
                        )}
                        {send.clicked && (
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="h-3 w-3" />
                            {send.clickedCount || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



