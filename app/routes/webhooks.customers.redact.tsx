import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // GDPR: Customers/redact
  // Shopify sendet diesen Webhook wenn Kundendaten gelöscht werden müssen
  // Dies passiert wenn ein Kunde sein Recht auf Löschung geltend macht
  // Dokumentation: https://shopify.dev/docs/apps/build/privacy-law-compliance
  
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔔 [${timestamp}] WEBHOOK RECEIVED: customers/redact`);
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

    // Temply speichert keine direkten Kundendaten
    // Alle Daten sind Shop-Level (Sessions, Templates, Settings)
    // Es gibt keine kundenspezifischen Daten zu löschen
    
    // Zur Sicherheit: Prüfe ob es irgendwelche Sessions mit dieser Customer-Email gibt
    // (sollte nicht vorkommen, da Sessions nur Shop Owner Daten speichern)
    if (customerEmail) {
      const deletedSessions = await db.session.deleteMany({
        where: {
          shop,
          email: customerEmail
        }
      });

      if (deletedSessions.count > 0) {
        console.log(`Deleted ${deletedSessions.count} session(s) for customer ${customerEmail}`);
      }
    }

    const response = { 
      success: true,
      shop,
      message: "No customer-specific data to redact. Temply stores only shop-level data."
    };
    
    console.log(`✅ Redaction complete for customer ${customerEmail} in shop ${shop}`);
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

