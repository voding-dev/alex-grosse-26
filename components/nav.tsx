"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen]);

  return (
    <>
      {/* Header with rotated menu/contact */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-accent">
        <div className="flex h-24 items-center justify-between px-6">
          {/* Menu text on left */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="text-base font-black uppercase tracking-wider text-white transition-opacity hover:opacity-80 py-2"
            style={{ fontWeight: '900' }}
          >
            menu
          </button>
          
          {/* Center logo - Wordmark */}
          <Link href="/" className="flex items-center justify-center">
            <Image
              src="/wordmark-alexgrosse-white.svg"
              alt="Alex Grosse"
              width={180}
              height={45}
              className="h-10 w-auto object-contain"
            />
          </Link>
          
          {/* Contact text on right */}
          <a
            href="/#contact"
            className="text-base font-black uppercase tracking-wider text-white transition-opacity hover:opacity-80 py-2"
            style={{ fontWeight: '900' }}
          >
            contact
          </a>
        </div>
      </header>

      {/* Full-screen Light Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/10 px-6 py-6">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center">
                <Image
                  src="/smallbrandmark-alexgrosse-dark.svg"
                  alt="Alex Grosse"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  style={{ filter: 'brightness(0) saturate(100%) invert(33%) sepia(15%) saturate(1200%) hue-rotate(50deg) brightness(95%) contrast(90%)' }}
                />
              </Link>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="transition-opacity hover:opacity-80"
                style={{ color: '#586034' }}
                aria-label="Close menu"
              >
                <X className="h-8 w-8 stroke-[3]" />
              </button>
            </div>
            
            {/* Menu Links */}
            <nav className="flex flex-1 flex-col items-center justify-center gap-6">
              <a
                href="/#portfolio"
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-wide text-black transition-opacity hover:opacity-60"
                style={{ fontWeight: '900' }}
              >
                Portfolios
              </a>
              <a
                href="/#projects"
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-wide text-black transition-opacity hover:opacity-60"
                style={{ fontWeight: '900' }}
              >
                Projects
              </a>
              <a
                href="/#about"
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-wide text-black transition-opacity hover:opacity-60"
                style={{ fontWeight: '900' }}
              >
                About Me
              </a>
              <a
                href="/#contact"
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-wide text-black transition-opacity hover:opacity-60"
                style={{ fontWeight: '900' }}
              >
                Contact
              </a>
              <Link
                href="/create-pdf"
                onClick={() => setIsMenuOpen(false)}
                className="mt-4 px-8 py-4 text-xl font-black uppercase tracking-wide text-white transition-all hover:scale-105 hover:shadow-lg rounded-sm"
                style={{ fontWeight: '900', backgroundColor: '#586034' }}
              >
                Create PDF
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
