import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // GDPR: Shop/redact
  // Shopify sendet diesen Webhook 48h nach App-Deinstallation
  // Alle Shop-Daten müssen gelöscht werden
  // Dokumentation: https://shopify.dev/docs/apps/build/privacy-law-compliance
  
  try {
    console.log(`Starting data deletion for shop: ${shop}`);

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

    console.log(`✅ Successfully deleted all data for shop: ${shop}`);
    console.log(`Total deleted: ${deletedSessions.count + deletedSections.count + deletedSettings.count} records`);

    return new Response(JSON.stringify({ 
      success: true,
      shop,
      deleted: {
        sessions: deletedSessions.count,
        sections: deletedSections.count,
        settings: deletedSettings.count
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error(`Error processing shop redaction for ${shop}:`, error);
    
    return new Response(JSON.stringify({ 
      error: "Failed to process shop redaction",
      shop,
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

