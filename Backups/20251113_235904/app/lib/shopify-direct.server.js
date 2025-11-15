// app/lib/shopify-direct.server.js

export async function shopifyGraphQL(query, variables = {}, shop, accessToken) {
  if (!shop || !accessToken) {
    throw new Error("Shop and Access Token are required!");
  }

  console.log("🔑 Using session access token for shop:", shop);
  
  const response = await fetch(`https://${shop}/admin/api/2025-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("❌ Shopify API Error:", error);
    throw new Error(`Shopify API Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    console.error("❌ GraphQL Errors:", data.errors);
    throw new Error(data.errors[0].message);
  }

  return data.data;
}

// Helper für REST API calls
export async function shopifyREST(endpoint, shop, accessToken, options = {}) {
  if (!shop || !accessToken) {
    throw new Error("Shop and Access Token are required!");
  }

  const url = `https://${shop}/admin/api/2025-10/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
      ...options.headers,
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("❌ REST API Error:", error);
    throw new Error(`Shopify REST API Error: ${response.status}`);
  }

  return response.json();
}