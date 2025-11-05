"use client";

import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Add contact form mutation to Convex
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Message sent",
        description: "We'll get back to you soon.",
      });
      setFormData({ name: "", email: "", phone: "", message: "" });
    }, 1000);
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-background pt-16">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="mb-16">
            <h1 className="mb-8 text-3xl font-light tracking-wide">Contact</h1>
            <div className="space-y-6 text-foreground/80 leading-relaxed">
              <p>
                At Ian Courtright Creative, I create high-quality visual work for use in marketing and advertising. I believe the creative process is a collaborative effort and work in unison with my clients to create visual assets.
              </p>
              <p>
                I choose to work with clients who value quality and professionalism. My services are designed to help achieve the vision my clients have for their brand needs.
              </p>
              <p>
                I use my creative talents to deliver exceptional work that helps my clients elevate their brand and generate a return on their investment.
              </p>
            </div>
          </div>

          <div className="mb-16 space-y-2 text-sm">
            <p className="text-foreground/80">IAN@IANCOURTRIGHT.COM</p>
            <p className="text-foreground/80">PHONE NUMBER</p>
            <div className="flex gap-4">
              <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">INSTAGRAM</a>
              <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">BEHANCE</a>
            </div>
          </div>

          <div className="mb-16">
            <h2 className="mb-8 text-xl font-light tracking-wide">Get in Touch</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-2 border-foreground/20 bg-background"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-2 border-foreground/20 bg-background"
                />
              </div>

              <div>
                <Label htmlFor="phone">Contact Number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-2 border-foreground/20 bg-background"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="mt-2 flex w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="border border-foreground/20 bg-background hover:bg-foreground/5"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
