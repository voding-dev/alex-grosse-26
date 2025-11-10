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
    const sendId = searchParams.get("sendId");
    const url = searchParams.get("url");
    
    if (!sendId || !url) {
      return NextResponse.json({ error: "Missing sendId or url parameter" }, { status: 400 });
    }
    
    // Decode the URL
    const decodedUrl = decodeURIComponent(url);
    
    // Find the send record
    const convex = getConvexClient();
    const send = await convex.query(api.emailMarketing.getSend, {
      id: sendId as any,
    });
    
    if (!send) {
      // If send not found, just redirect to the URL
      return NextResponse.redirect(decodedUrl);
    }
    
    const now = Date.now();
    
    // Update send record with click tracking
    await convex.mutation(api.emailMarketing.updateSend, {
      id: sendId as any,
      clicked: true,
      clickedCount: (send.clickedCount || 0) + 1,
      lastClickedAt: now,
      updatedAt: now,
    });
    
    // Create click event
    await convex.mutation(api.emailMarketing.createEvent, {
      sendId: sendId as any,
      type: "clicked",
      metadata: {
        url: decodedUrl,
        timestamp: now,
      },
    });
    
    // Check for journeys with campaign_clicked trigger
    const journeys = await convex.query(api.emailMarketing.listJourneys, {});
    const clickedJourneys = journeys.filter(
      (j: any) => j.status === "active" && j.entryTrigger === "campaign_clicked"
    );
    
    // Check if this campaign matches any journey's entry trigger data
    for (const journey of clickedJourneys) {
      if (!journey.entryTriggerData || journey.entryTriggerData.campaignId === send.campaignId) {
        // Use enrollOnTrigger mutation (public mutation for webhooks)
        try {
          await convex.mutation(api.emailMarketing.enrollOnTrigger, {
            journeyId: journey._id,
            contactId: send.contactId,
            triggerData: {
              campaignId: send.campaignId,
              sendId: send._id,
              clickedUrl: decodedUrl,
            },
          });
        } catch (error) {
          // Silently fail if already enrolled or other error
          console.log("Journey enrollment error:", error);
        }
      }
    }
    
    // Redirect to the original URL
    return NextResponse.redirect(decodedUrl);
  } catch (error) {
    console.error("Error processing click tracking:", error);
    // Try to redirect to the URL even if tracking fails
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    if (url) {
      try {
        return NextResponse.redirect(decodeURIComponent(url));
      } catch {
        // If redirect fails, return error
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

