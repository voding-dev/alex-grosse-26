"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";

export function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Header with rotated menu/contact */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-accent">
        <div className="flex h-20 items-center justify-between px-6">
          {/* Menu text on left */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="text-base font-black uppercase tracking-wider text-white transition-opacity hover:opacity-80 py-2"
            style={{ fontWeight: '900' }}
          >
            menu
          </button>
          
          {/* Center logo - Brandmark */}
          <Link href="/" className="flex items-center justify-center">
            <Image
              src="/ic-brandmark-white.svg"
              alt="Ian Courtright"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
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

      {/* Full-screen Dark Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-6">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center">
                <Image
                  src="/ic-brandmark-orange.svg"
                  alt="Ian Courtright"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              </Link>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-white transition-opacity hover:opacity-80"
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
                className="text-3xl font-black uppercase tracking-wide text-white transition-opacity hover:opacity-80"
                style={{ fontWeight: '900' }}
              >
                Portfolios
              </a>
              <a
                href="/#projects"
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-wide text-white transition-opacity hover:opacity-80"
                style={{ fontWeight: '900' }}
              >
                Projects
              </a>
              <Link
                href="/blog"
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-wide text-white transition-opacity hover:opacity-80"
                style={{ fontWeight: '900' }}
              >
                Blog
              </Link>
              <a
                href="/#about"
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-wide text-white transition-opacity hover:opacity-80"
                style={{ fontWeight: '900' }}
              >
                About Me
              </a>
              <a
                href="/#contact"
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-wide text-white transition-opacity hover:opacity-80"
                style={{ fontWeight: '900' }}
              >
                Contact
              </a>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
