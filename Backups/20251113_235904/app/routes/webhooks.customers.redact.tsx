import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // GDPR: Customers/redact
  // Shopify sendet diesen Webhook wenn Kundendaten gelöscht werden müssen
  // Dies passiert wenn ein Kunde sein Recht auf Löschung geltend macht
  // Dokumentation: https://shopify.dev/docs/apps/build/privacy-law-compliance
  
  try {
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;
    
    console.log(`Redact request for customer: ${customerEmail} (ID: ${customerId})`);

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

    console.log(`Redaction complete for customer ${customerEmail} in shop ${shop}`);

    return new Response(JSON.stringify({ 
      success: true,
      shop,
      message: "No customer-specific data to redact. Temply stores only shop-level data."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error(`Error processing redaction for ${shop}:`, error);
    
    return new Response(JSON.stringify({ 
      error: "Failed to process redaction request",
      shop 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

