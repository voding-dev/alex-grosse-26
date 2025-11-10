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
    
    if (!sendId) {
      // Return a 1x1 transparent pixel even if sendId is missing
      return new NextResponse(
        Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64"
        ),
        {
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }
    
    // Find the send record
    const convex = getConvexClient();
    const send = await convex.query(api.emailMarketing.getSend, {
      id: sendId as any,
    });
    
    if (send) {
      const now = Date.now();
      
      // Update send record with open tracking (only if not already opened)
      if (!send.opened) {
        await convex.mutation(api.emailMarketing.updateSend, {
          id: sendId as any,
          opened: true,
          openedCount: (send.openedCount || 0) + 1,
          lastOpenedAt: now,
          updatedAt: now,
        });
        
        // Create open event
        await convex.mutation(api.emailMarketing.createEvent, {
          sendId: sendId as any,
          type: "opened",
          metadata: {
            timestamp: now,
          },
        });
        
        // Check for journeys with campaign_opened trigger
        const journeys = await convex.query(api.emailMarketing.listJourneys, {});
        const openedJourneys = journeys.filter(
          (j: any) => j.status === "active" && j.entryTrigger === "campaign_opened"
        );
        
        // Check if this campaign matches any journey's entry trigger data
        for (const journey of openedJourneys) {
          if (!journey.entryTriggerData || journey.entryTriggerData.campaignId === send.campaignId) {
            // Use enrollOnTrigger mutation (public mutation for webhooks)
            try {
              await convex.mutation(api.emailMarketing.enrollOnTrigger, {
                journeyId: journey._id,
                contactId: send.contactId,
                triggerData: {
                  campaignId: send.campaignId,
                  sendId: send._id,
                },
              });
            } catch (error) {
              // Silently fail if already enrolled or other error
              console.log("Journey enrollment error:", error);
            }
          }
        }
      } else {
        // Already opened, but increment count
        await convex.mutation(api.emailMarketing.updateSend, {
          id: sendId as any,
          openedCount: (send.openedCount || 0) + 1,
          lastOpenedAt: now,
          updatedAt: now,
        });
      }
    }
    
    // Return a 1x1 transparent pixel
    return new NextResponse(
      Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      ),
      {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Error processing open tracking:", error);
    // Return a 1x1 transparent pixel even on error
    return new NextResponse(
      Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      ),
      {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}

