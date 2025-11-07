"use client";

import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/nav";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-background pt-20">
        {/* Orange accent bar matching nav */}
        <div className="h-1 bg-accent" />
        
        {/* 404 Content */}
        <section className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6">
          <div className="text-center">
            
            {/* 404 Number - Large and bold */}
            <h1 
              className="mb-4 text-8xl font-black text-accent sm:text-9xl md:text-[20rem]"
              style={{ fontWeight: '900', lineHeight: '0.9' }}
            >
              404
            </h1>
            
            {/* Error Message */}
            <p 
              className="mb-2 text-xl font-black uppercase tracking-wider text-foreground sm:text-2xl md:text-3xl"
              style={{ fontWeight: '900' }}
            >
              This page didn't make the edit
            </p>
            <p className="mb-12 text-base text-foreground/70 sm:text-lg md:text-xl">
              The page you're looking for doesn't exist or has been moved.
            </p>
            
            {/* Navigation Buttons */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="group flex items-center gap-2 rounded-sm border-2 border-accent bg-accent px-8 py-4 text-base font-black uppercase tracking-wider text-white transition-all hover:bg-transparent hover:text-accent sm:text-lg"
                style={{ fontWeight: '900' }}
              >
                <Home className="h-5 w-5" />
                Go Home
              </Link>
              <button
                onClick={() => window.history.back()}
                className="group flex items-center gap-2 rounded-sm border-2 border-foreground/20 bg-transparent px-8 py-4 text-base font-black uppercase tracking-wider text-foreground transition-all hover:border-foreground/40 hover:bg-foreground/5 sm:text-lg"
                style={{ fontWeight: '900' }}
              >
                <ArrowLeft className="h-5 w-5" />
                Go Back
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

