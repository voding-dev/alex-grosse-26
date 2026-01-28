import type { Metadata } from "next";
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
const DEFAULT_TITLE = "Your Site Name";
const DEFAULT_DESCRIPTION = "Your site description";

// Get the site URL for metadataBase
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
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
  
  // Use custom OG image or fall back to default
  const ogImage = ogImageUrl || "/og-image-main.png";
  const altText = siteName ? `${siteName} — ${socialDescription}` : socialDescription;

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
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: altText,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: socialDescription,
      images: [ogImage],
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
