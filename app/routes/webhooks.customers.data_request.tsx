import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // GDPR: Customers/data_request
  // Shopify sendet diesen Webhook wenn ein Kunde seine Daten anfordert
  // Dokumentation: https://shopify.dev/docs/apps/build/privacy-law-compliance
  
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔔 [${timestamp}] WEBHOOK RECEIVED: customers/data_request`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    // Log raw request details
    console.log(`📍 URL: ${request.url}`);
    console.log(`🔧 Method: ${request.method}`);
    console.log(`📋 Headers:`, Object.fromEntries(request.headers.entries()));
    
    // Versuche die Webhook-Authentifizierung
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`✅ HMAC Verification: SUCCESS`);
    console.log(`🏪 Shop: ${shop}`);
    console.log(`📬 Topic: ${topic}`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
    
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;
    
    console.log(`👤 Customer ID: ${customerId}`);
    console.log(`📧 Customer Email: ${customerEmail}`);

    // Temply speichert keine direkten Kundendaten in der Datenbank
    // Wir speichern nur:
    // - Shop-Level: Sessions, Templates, AppSettings, SocialProofSections
    // - Keine Kundendaten außer was in Sessions gespeichert ist (Shop Owner Info)

    // Sammle alle relevanten Daten für diesen Shop
    const shopData = {
      shop,
      message: "Temply stores no direct customer data. All data is shop-level only.",
      stored_data_types: [
        "Shop sessions (authentication tokens)",
        "Shop settings and templates",
        "No customer personal information is stored"
      ]
    };

    console.log(`✅ Response (200):`, JSON.stringify(shopData, null, 2));
    console.log(`${'='.repeat(80)}\n`);

    // Gebe die Daten als JSON zurück
    return new Response(JSON.stringify(shopData), {
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

