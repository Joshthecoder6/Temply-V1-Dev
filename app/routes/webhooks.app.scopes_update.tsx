import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔔 [${timestamp}] WEBHOOK RECEIVED: app/scopes_update`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    // Log raw request details
    console.log(`📍 URL: ${request.url}`);
    console.log(`🔧 Method: ${request.method}`);
    console.log(`📋 Headers:`, Object.fromEntries(request.headers.entries()));
    
    const { payload, session, topic, shop } = await authenticate.webhook(request);

    console.log(`✅ HMAC Verification: SUCCESS`);
    console.log(`🏪 Shop: ${shop}`);
    console.log(`📬 Topic: ${topic}`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
    console.log(`👤 Session exists:`, !!session);

    const current = payload.current as string[];
    
    if (session) {
      await db.session.update({   
        where: {
          id: session.id
        },
        data: {
          scope: current.toString(),
        },
      });
      console.log(`✅ Updated scopes for ${shop}: ${current.toString()}`);
    } else {
      console.log(`ℹ️ No session found for ${shop} - scopes not updated`);
    }

    const response = { 
      success: true,
      shop,
      message: "Scopes updated successfully",
      scopes: current
    };
    
    console.log(`✅ Response (200):`, JSON.stringify(response, null, 2));
    console.log(`${'='.repeat(80)}\n`);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    // Bei HMAC-Validierungs-Fehler MUSS 401 Unauthorized zurückgegeben werden
    console.error(`❌ HMAC Verification: FAILED`);
    console.error(`❌ Error:`, error);
    console.error(`❌ Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.log(`${'='.repeat(80)}\n`);
    
    return new Response(JSON.stringify({ 
      error: "Unauthorized",
      message: "Invalid HMAC signature"
    }), {
      status: 401,
      headers: { 
        "Content-Type": "application/json",
        "WWW-Authenticate": "HMAC-SHA256"
      }
    });
  }
};
