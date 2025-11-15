import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // GDPR: Shop/redact
  // Shopify sendet diesen Webhook 48h nach App-Deinstallation
  // Alle Shop-Daten müssen gelöscht werden
  // Dokumentation: https://shopify.dev/docs/apps/build/privacy-law-compliance
  
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔔 [${timestamp}] WEBHOOK RECEIVED: shop/redact`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    // Log raw request details
    console.log(`📍 URL: ${request.url}`);
    console.log(`🔧 Method: ${request.method}`);
    console.log(`📋 Headers:`, Object.fromEntries(request.headers.entries()));
    
    // Versuche die Webhook-Authentifizierung
    const { shop, topic, payload } = await authenticate.webhook(request);

    console.log(`✅ HMAC Verification: SUCCESS`);
    console.log(`🏪 Shop: ${shop}`);
    console.log(`📬 Topic: ${topic}`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
    console.log(`🗑️  Starting data deletion for shop: ${shop}`);

    // Lösche ALLE Daten für diesen Shop aus der Datenbank
    
    // 1. Lösche alle Sessions
    const deletedSessions = await db.session.deleteMany({
      where: { shop }
    });
    console.log(`Deleted ${deletedSessions.count} session(s)`);

    // 2. Lösche alle Social Proof Sections
    const deletedSections = await db.socialProofSection.deleteMany({
      where: { shop }
    });
    console.log(`Deleted ${deletedSections.count} social proof section(s)`);

    // 3. Lösche App Settings
    const deletedSettings = await db.appSettings.deleteMany({
      where: { shop }
    });
    console.log(`Deleted ${deletedSettings.count} app setting(s)`);

    // Templates sind shop-unabhängig und werden NICHT gelöscht
    // (Es sind globale Template-Definitionen, keine shop-spezifischen Daten)

    const totalDeleted = deletedSessions.count + deletedSections.count + deletedSettings.count;
    const response = { 
      success: true,
      shop,
      deleted: {
        sessions: deletedSessions.count,
        sections: deletedSections.count,
        settings: deletedSettings.count
      }
    };
    
    console.log(`✅ Successfully deleted all data for shop: ${shop}`);
    console.log(`📊 Total deleted: ${totalDeleted} records`);
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

