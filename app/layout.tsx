import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { Toaster } from "@/components/ui/toaster";
import { LenisProvider } from "@/components/LenisProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ian Courtright — Creative Direction, Photo, Video, Design",
  description: "Book me. Get it done right.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Ian Courtright — Creative Direction, Photo, Video, Design",
    description: "Creative Leadership That Drives Growth",
    images: [
      {
        url: "/og-image-main.png",
        width: 1200,
        height: 630,
        alt: "Ian Courtright — Creative Leadership That Drives Growth",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ian Courtright — Creative Direction, Photo, Video, Design",
    description: "Creative Leadership That Drives Growth",
    images: ["/og-image-main.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <LenisProvider>
            {children}
          </LenisProvider>
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
