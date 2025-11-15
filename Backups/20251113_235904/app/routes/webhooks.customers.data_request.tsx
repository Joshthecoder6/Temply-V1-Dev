import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // GDPR: Customers/data_request
  // Shopify sendet diesen Webhook wenn ein Kunde seine Daten anfordert
  // Dokumentation: https://shopify.dev/docs/apps/build/privacy-law-compliance
  
  try {
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;
    
    console.log(`Data request for customer: ${customerEmail} (ID: ${customerId})`);

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

    console.log(`Responding with data for ${shop}:`, shopData);

    // Gebe die Daten als JSON zurück
    return new Response(JSON.stringify(shopData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error(`Error processing data request for ${shop}:`, error);
    
    return new Response(JSON.stringify({ 
      error: "Failed to process data request",
      shop 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

