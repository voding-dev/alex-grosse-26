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
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    
    if (!token) {
      return new NextResponse(
        "<html><body><h1>Invalid unsubscribe link</h1></body></html>",
        { 
          status: 400,
          headers: { "Content-Type": "text/html" }
        }
      );
    }
    
    // Get send record by ID (token is the send ID)
    const convex = getConvexClient();
    const send = await convex.query(api.emailMarketing.getSend, {
      id: token as any,
    });
    
    if (!send) {
      return new NextResponse(
        "<html><body><h1>Unsubscribe link not found</h1></body></html>",
        { 
          status: 404,
          headers: { "Content-Type": "text/html" }
        }
      );
    }
    
    // Update send and contact
    await convex.mutation(api.emailMarketing.updateSend, {
      id: send._id,
      unsubscribed: true,
      unsubscribedAt: Date.now(),
    });
    
    await convex.mutation(api.emailMarketing.updateContact, {
      id: send.contactId,
      status: "unsubscribed",
    });
    
    // Create event
    await convex.mutation(api.emailMarketing.createEvent, {
      sendId: send._id,
      type: "unsubscribed",
    });
    
    return new NextResponse(
      "<html><body><h1>You have been unsubscribed</h1><p>You will no longer receive emails from us.</p></body></html>",
      { 
        status: 200,
        headers: { "Content-Type": "text/html" }
      }
    );
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return new NextResponse(
      "<html><body><h1>Error processing unsubscribe</h1></body></html>",
      { 
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
}





