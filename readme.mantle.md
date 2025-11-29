# Mantle Integration - Dokumentation

Diese Dokumentation beschreibt die vollständige Integration der Mantle API für Subscription-Management in der Shopify App.

## Übersicht

Die Mantle-Integration ermöglicht es, Shopify-Shops als Kunden in Mantle zu identifizieren und Subscription-Checkout-Links zu erstellen. Die Integration wird auf der Pricing-Seite (`/app/pricing`) und der Onboarding-Seite (`/app/onboarding`) verwendet.

## Architektur

### Dateistruktur

```
app/
├── lib/
│   └── mantle.server.ts          # Mantle API Client Helper Functions
└── routes/
    ├── app.api.subscribe.tsx     # Subscription Action Route (POST /app/api/subscribe)
    ├── app.pricing.tsx           # Pricing Page mit Subscribe-Buttons
    └── app.onboarding.tsx        # Onboarding Page mit Pricing-Step
```

## Environment Variables

Die folgenden Environment Variables müssen gesetzt sein:

```bash
MANTLE_API_KEY=<your-mantle-api-key>
MANTLE_APP_ID=<your-mantle-app-id>
SHOPIFY_APP_URL=<your-app-url>  # Optional, Fallback: temply-developer.joshuajeske.de
APP_URL_HOST=<your-host-domain>  # Optional
```

## API Endpoints

### Base URL
```
https://appapi.heymantle.com/v1
```

### Wichtige Endpoints

1. **POST /v1/identify** - Kunde identifizieren/erstellen
2. **GET /v1/plans** - Verfügbare Pläne abrufen
3. **POST /v1/subscriptions** - Subscription-Checkout erstellen

## Implementierung

### 1. Mantle API Client (`app/lib/mantle.server.ts`)

#### Headers

**App-Level Headers** (für `/identify` und `/plans` ohne Customer Token):
```typescript
{
  'X-Mantle-App-Id': process.env.MANTLE_APP_ID,
  'X-Mantle-App-Api-Key': process.env.MANTLE_API_KEY,
  'Content-Type': 'application/json'
}
```

**Customer-Level Headers** (für `/plans` und `/subscriptions` mit Customer Token):
```typescript
{
  'X-Mantle-App-Id': process.env.MANTLE_APP_ID,
  'X-Mantle-Customer-Api-Token': customerApiToken,
  'Content-Type': 'application/json'
}
```

#### Funktion: `identifyCustomer()`

**Zweck:** Identifiziert oder erstellt einen Kunden in Mantle.

**Request Body für Shopify Apps:**
```json
{
  "platform": "shopify",
  "platformId": "<MANTLE_APP_ID>",
  "myshopifyDomain": "<STORE_DOMAIN>",
  "customer_id": "<STORE_DOMAIN>",
  "email": "<STORE_DOMAIN>@shopify.com",
  "name": "<STORE_DOMAIN>",
  "metadata": {
    "shop": "<STORE_DOMAIN>",
    "source": "pricing_page" | "onboarding_page"
  }
}
```

**Wichtig:** 
- `platformId` muss die `MANTLE_APP_ID` sein (nicht die Shop-Domain!)
- `myshopifyDomain` ist die Shop-Domain (z.B. "shop.myshopify.com")
- `customer_id` ist ebenfalls die Shop-Domain

**Response:**
```json
{
  "apiToken": "<customer-api-token>",
  // oder
  "customerApiToken": "<customer-api-token>",
  "id": "<customer-id>",
  "email": "<email>",
  "name": "<name>"
}
```

**Code:**
```67:163:app/lib/mantle.server.ts
export async function identifyCustomer(
  customerId: string,
  customerData?: {
    email?: string;
    name?: string;
    metadata?: Record<string, any>;
    myshopifyDomain?: string;
  }
): Promise<MantleCustomer> {
  try {
    const headers = getMantleAppHeaders();
    const appId = process.env.MANTLE_APP_ID;
    
    if (!appId) {
      throw new Error('MANTLE_APP_ID is required for identifying customers');
    }
    
    // Mantle API expects platform, platformId (MANTLE_APP_ID), myshopifyDomain, and customer_id for Shopify apps
    // Based on API documentation: https://appapi.heymantle.dev/reference/post_identify
    // For Shopify apps:
    // - platform must be "shopify"
    // - platformId must be MANTLE_APP_ID (same as X-Mantle-App-Id header)
    // - myshopifyDomain is the shop domain (e.g., "shop.myshopify.com")
    // - customer_id is the shop domain
    const myshopifyDomain = customerData?.myshopifyDomain || customerId;
    
    const body = {
      platform: 'shopify',
      platformId: appId, // Must be MANTLE_APP_ID, not shop domain
      myshopifyDomain: myshopifyDomain,
      customer_id: customerId,
      email: customerData?.email || `${customerId}@shopify.com`,
      name: customerData?.name || customerId,
      ...(customerData?.metadata && { metadata: customerData.metadata }),
    };

    // Based on Mantle API documentation: https://appapi.heymantle.dev/reference/post_identify
    // The correct endpoint is POST /v1/identify
    const endpoint = `${MANTLE_API_BASE_URL}/identify`;
    
    console.log('Mantle identify request:', {
      url: endpoint,
      headers: { ...headers, 'X-Mantle-App-Api-Key': headers['X-Mantle-App-Api-Key'] ? '[REDACTED]' : undefined },
      body,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mantle API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        endpoint,
      });
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Mantle identify response:', data);
    
    // Handle different response structures
    if (data.customer) {
      return {
        id: data.customer.id || customerId,
        customerApiToken: data.customer.customerApiToken || data.customer.apiToken || '',
        email: data.customer.email,
        name: data.customer.name,
        metadata: data.customer.metadata,
      };
    }
    if (data.customerApiToken || data.apiToken) {
      return { 
        id: data.id || customerId, 
        customerApiToken: data.customerApiToken || data.apiToken || '', 
        email: data.email,
        name: data.name,
        metadata: data.metadata,
      };
    }
    return { 
      id: data.id || customerId, 
      customerApiToken: data.customerApiToken || data.apiToken || '', 
      email: data.email,
      name: data.name,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error('Error identifying customer in Mantle:', error);
    throw error;
  }
}
```

#### Funktion: `getPlans()`

**Zweck:** Ruft verfügbare Pläne von Mantle ab.

**Code:**
```168:190:app/lib/mantle.server.ts
export async function getPlans(customerApiToken?: string): Promise<MantlePlan[]> {
  try {
    const headers = customerApiToken 
      ? getMantleCustomerHeaders(customerApiToken)
      : getMantleAppHeaders();

    const response = await fetch(`${MANTLE_API_BASE_URL}/plans`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.plans || [];
  } catch (error) {
    console.error('Error fetching plans from Mantle:', error);
    throw error;
  }
}
```

#### Funktion: `createSubscriptionCheckout()`

**Zweck:** Erstellt einen Subscription-Checkout-Link für einen Kunden.

**Request Body:**
```json
{
  "plan_id": "<plan-id>",
  "return_url": "<return-url>"  // Optional
}
```

**Response:**
```json
{
  "confirmationUrl": "<checkout-url>",
  // oder andere Varianten:
  "confirmation_url": "<checkout-url>",
  "checkout_url": "<checkout-url>",
  "url": "<checkout-url>"
}
```

**Code:**
```199:268:app/lib/mantle.server.ts
export async function createSubscriptionCheckout(
  customerId: string,
  planName: string,
  customerApiToken: string,
  returnUrl?: string
): Promise<string> {
  try {
    // First, get the plan ID by name using customer token
    const plans = await getPlans(customerApiToken);
    const plan = plans.find(p => p.name === planName);

    if (!plan) {
      throw new Error(`Plan "${planName}" not found in Mantle. Available plans: ${plans.map(p => p.name).join(', ')}`);
    }

    console.log('Creating subscription checkout:', {
      planId: plan.id,
      planName: plan.name,
      returnUrl,
    });

    // Create subscription using customer token - Mantle API expects /subscriptions endpoint
    const requestBody: any = {
      plan_id: plan.id,
    };
    
    if (returnUrl) {
      requestBody.return_url = returnUrl;
    }

    const response = await fetch(`${MANTLE_API_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: getMantleCustomerHeaders(customerApiToken),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mantle subscription API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Mantle subscription response:', data);

    // Handle different response structures - Mantle returns confirmationUrl
    const confirmationUrl = 
      data.confirmationUrl || 
      data.confirmation_url || 
      data.subscription?.confirmationUrl || 
      data.subscription?.confirmation_url ||
      data.checkout_url || 
      data.url || 
      '';

    if (!confirmationUrl) {
      console.error('No confirmation URL in Mantle response:', data);
      throw new Error('Mantle API did not return a confirmation URL');
    }

    return confirmationUrl;
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    throw error;
  }
}
```

#### Plan Constants

```273:276:app/lib/mantle.server.ts
export const MANTLE_PLANS = {
  BEGINNER: 'Beginner Plan',
  GROWTH: 'Growth Plan',
} as const;
```

### 2. Subscription Action Route (`app/routes/app.api.subscribe.tsx`)

**Route:** `POST /app/api/subscribe`

**Form Data:**
- `plan`: "beginner" oder "growth"
- `source`: "pricing" oder "onboarding" (für Return-URL)

**Flow:**
1. Authentifizierung der Shopify Session
2. Plan-Typ validieren
3. Kunde in Mantle identifizieren (`identifyCustomer`)
4. Subscription-Checkout erstellen (`createSubscriptionCheckout`)
5. Redirect zur Mantle Confirmation-URL

**Code:**
```12:118:app/routes/app.api.subscribe.tsx
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);

    console.log('Subscribe action - Session:', {
      shop: session?.shop,
      hasSession: !!session,
      url: request.url,
    });

    if (!session?.shop) {
      console.error('Subscribe action - No shop in session');
      return Response.json({ error: "Unauthorized - No shop in session" }, { status: 401 });
    }

    const formData = await request.formData();
    const planType = formData.get("plan") as string;
    const source = formData.get("source") as string || "pricing"; // Track where the request came from

    console.log('Subscribe action - Plan selection:', {
      planType,
      source,
    });

    if (!planType || (planType !== "beginner" && planType !== "growth")) {
      return Response.json({ error: "Invalid plan type. Must be 'beginner' or 'growth'" }, { status: 400 });
    }

    // Map plan type to Mantle plan name
    const mantlePlanName = planType === "beginner" 
      ? MANTLE_PLANS.BEGINNER 
      : MANTLE_PLANS.GROWTH;

    console.log('Subscribe action - Identifying customer in Mantle:', {
      shop: session.shop,
      planName: mantlePlanName,
    });

    // Identify customer in Mantle (using shop domain as customer ID)
    // For Shopify apps, Mantle requires:
    // - platformId: MANTLE_APP_ID (set automatically in identifyCustomer)
    // - myshopifyDomain: shop domain from session
    const customer = await identifyCustomer(session.shop, {
      email: `${session.shop}@shopify.com`,
      name: session.shop,
      myshopifyDomain: session.shop, // Required for Shopify platform
      metadata: {
        shop: session.shop,
        source: source === "onboarding" ? "onboarding_page" : "pricing_page",
      },
    });

    if (!customer.customerApiToken) {
      console.error('Subscribe action - No customer API token received from Mantle');
      return Response.json({ error: "Failed to get customer API token from Mantle" }, { status: 500 });
    }

    console.log('Subscribe action - Customer identified:', {
      customerId: customer.id,
      hasToken: !!customer.customerApiToken,
    });

    // Create subscription checkout link
    const appUrl = process.env.SHOPIFY_APP_URL || 
      (process.env.APP_URL_HOST ? `https://${process.env.APP_URL_HOST}` : null) ||
      "https://temply-developer.joshuajeske.de";
    
    // Determine return URL based on source
    const returnUrl = source === "onboarding" 
      ? `${appUrl}/app/onboarding?success=true`
      : `${appUrl}/app/pricing?success=true`;
    
    console.log('Subscribe action - Creating subscription checkout:', {
      planName: mantlePlanName,
      returnUrl,
    });
    
    const confirmationUrl = await createSubscriptionCheckout(
      session.shop,
      mantlePlanName,
      customer.customerApiToken,
      returnUrl
    );

    if (!confirmationUrl) {
      console.error('Subscribe action - No confirmation URL received from Mantle');
      return Response.json({ error: "Failed to create checkout link - no confirmation URL received" }, { status: 500 });
    }

    console.log('Subscribe action - Subscription created successfully, redirecting to:', confirmationUrl);

    // Redirect to Mantle confirmation page
    return redirect(confirmationUrl);
  } catch (error) {
    console.error("Error creating Mantle subscription:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json(
      { 
        error: error instanceof Error ? error.message : "Failed to create subscription",
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
};
```

### 3. Frontend Integration

#### Pricing Page (`app/routes/app.pricing.tsx`)

Die Pricing-Seite enthält Subscribe-Buttons für beide Pläne. Jeder Button sendet ein Form mit:
- `plan`: "beginner" oder "growth"
- `source`: "pricing"

**Beispiel Button:**
```typescript
<Form action="/app/api/subscribe" method="post">
  <input type="hidden" name="plan" value="beginner" />
  <input type="hidden" name="source" value="pricing" />
  <Button submit>Subscribe</Button>
</Form>
```

#### Onboarding Page (`app/routes/app.onboarding.tsx`)

Die Onboarding-Seite hat einen Pricing-Step (Step 1) mit ähnlichen Subscribe-Buttons, aber mit:
- `source`: "onboarding"

**Beispiel Button:**
```typescript
<Form action="/app/api/subscribe" method="post">
  <input type="hidden" name="plan" value="beginner" />
  <input type="hidden" name="source" value="onboarding" />
  <Button submit>Subscribe</Button>
</Form>
```

## Flow-Diagramm

```
User klickt "Subscribe" Button
    ↓
POST /app/api/subscribe
    ↓
1. Shopify Session authentifizieren
    ↓
2. Plan-Typ validieren (beginner/growth)
    ↓
3. identifyCustomer() aufrufen
    ├─ POST /v1/identify
    ├─ Body: platform, platformId, myshopifyDomain, customer_id, email, name, metadata
    └─ Response: customerApiToken
    ↓
4. createSubscriptionCheckout() aufrufen
    ├─ GET /v1/plans (mit customerApiToken)
    ├─ Plan-ID finden
    ├─ POST /v1/subscriptions
    │   ├─ Body: plan_id, return_url
    │   └─ Response: confirmationUrl
    └─ Redirect zu confirmationUrl
    ↓
User wird zu Mantle Checkout weitergeleitet
    ↓
Nach erfolgreichem Checkout: Redirect zu returnUrl
    ├─ /app/pricing?success=true (wenn source=pricing)
    └─ /app/onboarding?success=true (wenn source=onboarding)
```

## Bekannte Probleme & Lösungen

### Problem 1: "Unsupported platform" Error
**Ursache:** `platform` Feld fehlte im Request Body.

**Lösung:** `platform: 'shopify'` zum Body hinzugefügt.

### Problem 2: "Missing or invalid platformId and/or myshopifyDomain parameters"
**Ursache:** 
- `platformId` war die Shop-Domain statt `MANTLE_APP_ID`
- `myshopifyDomain` fehlte

**Lösung:** 
- `platformId: process.env.MANTLE_APP_ID` gesetzt
- `myshopifyDomain: session.shop` hinzugefügt

### Problem 3: returnUrl ist "https://undefined/..."
**Ursache:** `process.env.APP_URL_HOST` war undefined und wurde trotzdem verwendet.

**Lösung:** Fallback-Logik verbessert:
```typescript
const appUrl = process.env.SHOPIFY_APP_URL || 
  (process.env.APP_URL_HOST ? `https://${process.env.APP_URL_HOST}` : null) ||
  "https://temply-developer.joshuajeske.de";
```

### Problem 4: getPlans() gibt 500 Error
**Status:** Noch nicht gelöst. Die Mantle API gibt einen 500 Internal Server Error zurück, wenn `/v1/plans` mit Customer Token aufgerufen wird.

**Mögliche Ursachen:**
- Customer Token ist ungültig
- Plan-Konfiguration in Mantle fehlt
- API-Endpoint erwartet andere Parameter

**Nächste Schritte:**
- Mantle API-Dokumentation für `/v1/plans` prüfen
- Alternative: Plan-IDs direkt verwenden statt über `/plans` abzurufen

## Testing

### Lokales Testing

1. Environment Variables setzen:
```bash
export MANTLE_API_KEY="your-key"
export MANTLE_APP_ID="your-app-id"
export SHOPIFY_APP_URL="https://your-app-url.com"
```

2. Dev-Server starten:
```bash
npm run dev
```

3. Pricing-Seite öffnen und "Subscribe" Button klicken

4. Logs prüfen:
- `Mantle identify request` - Request-Details
- `Mantle identify response` - Response mit apiToken
- `Creating subscription checkout` - Plan-Lookup
- `Mantle subscription response` - Confirmation URL

### Erwartete Logs (Erfolgreich)

```
Subscribe action - Session: { shop: 'shop.myshopify.com', hasSession: true }
Subscribe action - Plan selection: { planType: 'beginner', source: 'pricing' }
Mantle identify request: { url: '...', body: { platform: 'shopify', platformId: '...', ... } }
Mantle identify response: { apiToken: '...' }
Subscribe action - Customer identified: { customerId: '...', hasToken: true }
Creating subscription checkout: { planId: '...', planName: 'Beginner Plan', returnUrl: '...' }
Mantle subscription response: { confirmationUrl: '...' }
Subscribe action - Subscription created successfully, redirecting to: ...
```

## API Dokumentation

- **Mantle API Docs:** https://appapi.heymantle.dev/docs
- **Identify Endpoint:** https://appapi.heymantle.dev/reference/post_identify
- **Plans Endpoint:** https://appapi.heymantle.dev/reference/get_plans
- **Subscriptions Endpoint:** https://appapi.heymantle.dev/reference/post_subscriptions

## Wichtige Hinweise

1. **platformId muss MANTLE_APP_ID sein** - nicht die Shop-Domain!
2. **myshopifyDomain ist die Shop-Domain** - z.B. "shop.myshopify.com"
3. **Customer Token wird nach identify() zurückgegeben** - muss für weitere API-Calls verwendet werden
4. **returnUrl wird basierend auf `source` Parameter gesetzt** - "pricing" → `/app/pricing?success=true`, "onboarding" → `/app/onboarding?success=true`
5. **Alle API-Calls sind server-side** - keine Client-seitigen API-Keys nötig

## Changelog

- **2024-11-XX**: Initiale Integration
  - `identifyCustomer()` implementiert
  - `createSubscriptionCheckout()` implementiert
  - Pricing & Onboarding Seiten integriert
  - `platformId` und `myshopifyDomain` Parameter hinzugefügt
  - returnUrl Fallback-Logik verbessert

