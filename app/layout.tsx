import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Geist, Geist_Mono, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { Toaster } from "@/components/ui/toaster";
import { LenisProvider } from "@/components/LenisProvider";
import { getSeoSettings, getStorageUrl } from "@/lib/convex-http";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Default fallback values (used when settings are not configured)
const DEFAULT_TITLE = "Alex Grosse";
const DEFAULT_DESCRIPTION = "Pro Photo";

// Get the site URL for metadataBase
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  // These settings can change at runtime (admin updates). Avoid serving stale OG tags.
  noStore();

  // Fetch SEO settings from Convex (gracefully handles failures)
  const seo = await getSeoSettings();
  
  // Get the OG image URL if a storage key is set
  const ogImageUrl = seo.seoOgImageStorageKey 
    ? await getStorageUrl(seo.seoOgImageStorageKey)
    : null;
  
  // Build metadata from settings
  const title = seo.seoTitle || DEFAULT_TITLE;
  const description = seo.seoDescription || DEFAULT_DESCRIPTION;
  const socialDescription = seo.seoSocialDescription || description;
  const siteName = seo.seoSiteName || "";
  
  // Only include social images when we have a valid, publicly accessible URL.
  // (Emitting `null` here causes scrapers to ignore the tag.)
  const altText = siteName ? `${siteName} — ${socialDescription}` : socialDescription;
  const openGraphImages = ogImageUrl
    ? [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: altText,
        },
      ]
    : undefined;
  const twitterImages = ogImageUrl ? [ogImageUrl] : undefined;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/favicon.ico",
    },
    openGraph: {
      title,
      description: socialDescription,
      ...(siteName ? { siteName } : {}),
      ...(openGraphImages ? { images: openGraphImages } : {}),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: socialDescription,
      ...(twitterImages ? { images: twitterImages } : {}),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${robotoMono.variable} antialiased`}
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
