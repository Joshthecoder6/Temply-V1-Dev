import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { useState } from "react";
import { useFetcher } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const action = formData.get("action");

  // List existing webhooks
  if (action === "list") {
    try {
      const response = await fetch(
        `https://${session.shop}/admin/api/2025-10/webhooks.json`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": session.accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      
      return { 
        action: "list",
        webhooks: data.webhooks || [],
        shop: session.shop 
      };
    } catch (error) {
      return { 
        action: "list",
        error: error instanceof Error ? error.message : "Unknown error",
        shop: session.shop 
      };
    }
  }

  // Register webhooks
  const appUrl = process.env.SHOPIFY_APP_URL || "https://temply-live-882b514b992d.herokuapp.com";

  // All 5 webhooks: 2 regular + 3 GDPR compliance
  const webhooks = [
    {
      topic: "app/uninstalled",
      address: `${appUrl}/webhooks/app/uninstalled`,
      type: "regular",
    },
    {
      topic: "app/scopes_update",
      address: `${appUrl}/webhooks/app/scopes_update`,
      type: "regular",
    },
    {
      topic: "customers/data_request",
      address: `${appUrl}/webhooks/customers/data_request`,
      type: "gdpr",
    },
    {
      topic: "customers/redact",
      address: `${appUrl}/webhooks/customers/redact`,
      type: "gdpr",
    },
    {
      topic: "shop/redact",
      address: `${appUrl}/webhooks/shop/redact`,
      type: "gdpr",
    },
  ];

  const results = [];

  // First, get existing webhooks
  let existingWebhooks: any[] = [];
  try {
    const listResponse = await fetch(
      `https://${session.shop}/admin/api/2025-10/webhooks.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json",
        },
      }
    );
    const listData = await listResponse.json();
    existingWebhooks = listData.webhooks || [];
  } catch (e) {
    // Continue even if listing fails
  }

  for (const webhook of webhooks) {
    try {
      console.log(`\n🔧 Registriere Webhook: ${webhook.topic} (${webhook.type})`);
      
      // Check if webhook already exists
      const exists = existingWebhooks.find((w: any) => w.topic === webhook.topic);
      
      if (exists) {
        console.log(`ℹ️ Webhook ${webhook.topic} bereits registriert (ID: ${exists.id})`);
        results.push({
          topic: webhook.topic,
          type: webhook.type,
          status: "info",
          message: `Webhook bereits registriert (ID: ${exists.id})`,
          id: exists.id,
        });
        continue;
      }

      console.log(`📤 Sende Registrierungs-Request für ${webhook.topic}`);
      
      // Try to register webhook
      const response = await fetch(
        `https://${session.shop}/admin/api/2025-10/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": session.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: {
              topic: webhook.topic,
              address: webhook.address,
              format: "json",
            },
          }),
        }
      );

      const data = await response.json();
      console.log(`📦 Response für ${webhook.topic}:`, JSON.stringify(data, null, 2));

      if (response.ok && data.webhook) {
        console.log(`✅ Webhook ${webhook.topic} erfolgreich registriert (ID: ${data.webhook.id})`);
        results.push({
          topic: webhook.topic,
          type: webhook.type,
          status: "success",
          id: data.webhook.id,
          address: data.webhook.address,
        });
      } else {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (data.errors) {
          if (typeof data.errors === 'string') {
            errorMessage = data.errors;
          } else if (typeof data.errors === 'object' && !Array.isArray(data.errors)) {
            errorMessage = Object.entries(data.errors)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join('; ');
          }
        }
        
        console.log(`❌ Fehler beim Registrieren von ${webhook.topic}: ${errorMessage}`);
        results.push({
          topic: webhook.topic,
          type: webhook.type,
          status: "error",
          message: errorMessage,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.log(`❌ Exception beim Registrieren von ${webhook.topic}: ${errorMsg}`);
      results.push({
        topic: webhook.topic,
        type: webhook.type,
        status: "error",
        message: errorMsg,
      });
    }
  }

  console.log(`\n📊 Registrierung abgeschlossen. Ergebnisse:`, JSON.stringify(results, null, 2));

  return { action: "register", results, shop: session.shop };
};

export default function RegisterWebhooks() {
  const fetcher = useFetcher<typeof action>();
  const [showResults, setShowResults] = useState(false);

  const handleRegister = () => {
    const formData = new FormData();
    formData.append("action", "register");
    fetcher.submit(formData, { method: "post" });
    setShowResults(true);
  };

  const handleList = () => {
    const formData = new FormData();
    formData.append("action", "list");
    fetcher.submit(formData, { method: "post" });
    setShowResults(true);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px", fontWeight: "600" }}>
        Webhook-Verwaltung
      </h1>

      <div style={{
        background: "#fff4e5",
        border: "1px solid #ffd79d",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "24px",
      }}>
        <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
          Diese Seite zeigt alle registrierten Webhooks an und ermöglicht die Registrierung
          der mandatory compliance webhooks für die App Store Submission.
        </p>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={handleList}
          disabled={fetcher.state === "submitting"}
          style={{
            padding: "12px 24px",
            background: fetcher.state === "submitting" ? "#666" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: fetcher.state === "submitting" ? "not-allowed" : "pointer",
          }}
        >
          {fetcher.state === "submitting" && fetcher.formData?.get("action") === "list" 
            ? "Lade..." 
            : "Webhooks anzeigen"}
        </button>

        <button
          onClick={handleRegister}
          disabled={fetcher.state === "submitting"}
          style={{
            padding: "12px 24px",
            background: fetcher.state === "submitting" ? "#666" : "#000",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: fetcher.state === "submitting" ? "not-allowed" : "pointer",
          }}
        >
          {fetcher.state === "submitting" && fetcher.formData?.get("action") === "register"
            ? "Registriere..." 
            : "Alle 5 Webhooks registrieren"}
        </button>
      </div>

      {showResults && fetcher.data && (
        <div style={{
          background: "white",
          border: "1px solid #e1e3e5",
          borderRadius: "8px",
          padding: "20px",
        }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px", fontWeight: "600" }}>
            {fetcher.data.action === "list" ? "Registrierte Webhooks" : "Registrierungs-Ergebnisse"} 
            {" "}für Shop: {fetcher.data.shop}
          </h2>

          {fetcher.data.action === "list" && fetcher.data.webhooks && (
            <>
              {fetcher.data.webhooks.length === 0 ? (
                <p style={{ color: "#666", fontSize: "14px" }}>Keine Webhooks registriert.</p>
              ) : (
                fetcher.data.webhooks.map((webhook: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      padding: "12px",
                      marginBottom: "12px",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <strong>{webhook.topic}</strong>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: "12px", color: "#666", wordBreak: "break-all" }}>
                      <strong>Adresse:</strong> {webhook.address}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px", color: "#666" }}>
                      <strong>Format:</strong> {webhook.format} | <strong>ID:</strong> {webhook.id}
                    </p>
                  </div>
                ))
              )}
            </>
          )}

          {fetcher.data.action === "register" && fetcher.data.results && (
            <>
              {fetcher.data.results.map((result: any, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: "12px",
                    marginBottom: "12px",
                    background: result.status === "success" 
                      ? "#f0fdf4" 
                      : result.status === "info" 
                        ? "#f0f9ff" 
                        : "#fef2f2",
                    border: `1px solid ${
                      result.status === "success" 
                        ? "#86efac" 
                        : result.status === "info"
                          ? "#bae6fd"
                          : "#fca5a5"
                    }`,
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "18px" }}>
                      {result.status === "success" ? "✅" : result.status === "info" ? "ℹ️" : "❌"}
                    </span>
                    <strong>{result.topic}</strong>
                  </div>
                  
                  {(result.status === "success" || result.status === "info") && result.id && (
                    <p style={{ margin: "4px 0 0 26px", fontSize: "12px", color: result.status === "success" ? "#16a34a" : "#0369a1" }}>
                      ID: {result.id}
                    </p>
                  )}
                  
                  {result.message && (
                    <p style={{ margin: "4px 0 0 26px", fontSize: "12px", color: result.status === "error" ? "#dc2626" : "#0369a1" }}>
                      {result.message}
                    </p>
                  )}
                </div>
              ))}

              <div style={{
                marginTop: "20px",
                padding: "12px",
                background: "#fff4e5",
                border: "1px solid #ffd79d",
                borderRadius: "6px",
              }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#92400e", lineHeight: "1.5" }}>
                  ℹ️ <strong>Hinweis:</strong> Alle 5 Webhooks werden hier registriert:
                </p>
                <ul style={{ margin: "8px 0 0 20px", fontSize: "13px", color: "#92400e" }}>
                  <li><strong>Regular:</strong> app/uninstalled, app/scopes_update</li>
                  <li><strong>GDPR Compliance:</strong> customers/data_request, customers/redact, shop/redact</li>
                </ul>
                <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#92400e", lineHeight: "1.5" }}>
                  Falls die GDPR-Webhooks über die REST API nicht registriert werden können, sind sie bereits in der 
                  shopify.app.production.toml als "compliance_topics" definiert und sollten automatisch aktiv sein.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

