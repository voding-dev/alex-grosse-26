import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Initialize Convex client for server-side use
const getConvexClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  return new ConvexHttpClient(url);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qrId = searchParams.get("id");

    if (!qrId) {
      return new NextResponse("Missing QR code ID", { status: 400 });
    }

    const convex = getConvexClient();

    // Get the QR code
    const qrCode = await convex.query(api.qr_codes.get, { id: qrId as any });

    if (!qrCode) {
      return new NextResponse("QR code not found", { status: 404 });
    }

    // Collect analytics data
    const userAgent = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || "";
    
    // Try to get IP from headers (Cloudflare, Vercel, etc.)
    const ipAddress =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      null;

    // Try to get geo data from headers (Cloudflare)
    const country = request.headers.get("cf-ipcountry") || null;
    const city = request.headers.get("cf-ipcity") || null;

    // Determine device type from user agent
    let deviceType = "Desktop";
    if (/mobile/i.test(userAgent)) deviceType = "Mobile";
    else if (/tablet/i.test(userAgent)) deviceType = "Tablet";

    // Log scan (non-blocking - don't await to ensure fast redirect)
    convex
      .mutation(api.qr_codes.logScan, {
        qr_code_id: qrId as any,
        user_agent: userAgent || undefined,
        ip_address: ipAddress || undefined,
        referer: referer || undefined,
        country: country || undefined,
        city: city || undefined,
        device_type: deviceType || undefined,
      })
      .catch((error) => {
        // Error logging scan - non-blocking, continue with redirect
        // In production, log to error tracking service (e.g., Sentry)
      });

    // Redirect to destination URL
    const redirectUrl = qrCode.destination_url || qrCode.content;

    if (!redirectUrl) {
      return new NextResponse("No destination URL configured", { status: 400 });
    }

    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (error) {
    // Error in QR redirect handler
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

