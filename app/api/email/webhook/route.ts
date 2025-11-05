import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Resend webhook events: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained, email.unsubscribed
    const { type, data } = body;
    
    if (!type || !data) {
      return NextResponse.json({ error: "Invalid webhook data" }, { status: 400 });
    }
    
    // Find the send record by Resend email ID
    const sends = await convex.query(api.emailMarketing.getSendsByResendId, {
      resendEmailId: data.email_id,
    });
    
    if (sends.length === 0) {
      console.log(`No send found for Resend email ID: ${data.email_id}`);
      return NextResponse.json({ received: true });
    }
    
    const send = sends[0];
    const now = Date.now();
    
    // Create event
    await convex.mutation(api.emailMarketing.createEvent, {
      sendId: send._id,
      type: type.replace("email.", "") as any,
      metadata: data,
    });
    
    // Update send record based on event type
    const updates: any = {
      updatedAt: now,
    };
    
    if (type === "email.delivered") {
      updates.status = "delivered";
      updates.deliveredAt = now;
    } else if (type === "email.opened") {
      updates.opened = true;
      updates.openedCount = (send.openedCount || 0) + 1;
      updates.lastOpenedAt = now;
    } else if (type === "email.clicked") {
      updates.clicked = true;
      updates.clickedCount = (send.clickedCount || 0) + 1;
      updates.lastClickedAt = now;
    } else if (type === "email.bounced") {
      updates.status = "bounced";
      updates.bounced = true;
      updates.bouncedAt = now;
      updates.bounceReason = data.bounce_type || data.error || "Unknown";
      
      // Also update contact status
      const contact = await convex.query(api.emailMarketing.getContact, {
        id: send.contactId,
      });
      if (contact) {
        await convex.mutation(api.emailMarketing.updateContact, {
          id: send.contactId,
          status: "bounced",
        });
      }
    } else if (type === "email.complained") {
      updates.markedAsSpam = true;
      updates.markedAsSpamAt = now;
      
      // Update contact status
      const contact = await convex.query(api.emailMarketing.getContact, {
        id: send.contactId,
      });
      if (contact) {
        await convex.mutation(api.emailMarketing.updateContact, {
          id: send.contactId,
          status: "spam",
        });
      }
    } else if (type === "email.unsubscribed") {
      updates.unsubscribed = true;
      updates.unsubscribedAt = now;
      
      // Update contact status
      const contact = await convex.query(api.emailMarketing.getContact, {
        id: send.contactId,
      });
      if (contact) {
        await convex.mutation(api.emailMarketing.updateContact, {
          id: send.contactId,
          status: "unsubscribed",
        });
      }
    }
    
    await convex.mutation(api.emailMarketing.updateSend, {
      id: send._id,
      ...updates,
    });
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




