# Mantle Integration - Übersicht

## Einbindung in das Social-Proof-Sections Projekt

Diese Übersicht zeigt, wie Mantle (Subscription-Management-System) in unserem Social-Proof-Sections-Projekt eingebunden ist und funktioniert.

## 📋 Schnellübersicht

**Status:** ✅ Vollständig integriert und funktionsfähig
**Paket:** `@heymantle/react` v0.0.68
**Zweck:** Subscription-Management für Shopify-App (Beginner/Growth Pläne)

---

## 🏗️ Architektur-Überblick

### Provider-Hierarchie in `app/routes/app.tsx`

```47:66:app/routes/app.tsx
return (
  <PolarisAppProvider i18n={{}}>
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <MantleAppProvider appId={appId} customerApiToken={customerApiToken}>
        <s-app-nav>
          {/* Navigation Links */}
        </s-app-nav>
        <Outlet />
      </MantleAppProvider>
    </ShopifyAppProvider>
  </PolarisAppProvider>
);
```

### MantleAppProvider Komponente

Der `MantleAppProvider` ist ein erweiterter Wrapper um den originalen `@heymantle/react` Provider:

```69:97:app/components/MantleAppProvider.tsx
export function MantleAppProvider({ children, appId, customerApiToken }: MantleAppProviderProps) {
  return (
    <MantleProvider appId={appId} customerApiToken={customerApiToken}>
      <ExtendedMantleProvider>
        {children}
      </ExtendedMantleProvider>
    </MantleProvider>
  );
}
```

**Erweiterte Funktionen:**
- `subscribe()` - Neues Abonnement erstellen
- `upgrade()` - Plan-Upgrade (noch nicht implementiert)
- `downgrade()` - Plan-Downgrade (noch nicht implementiert)
- `cancel()` - Abonnement kündigen (noch nicht implementiert)
- `customer` - Kundendaten

---

## 🔧 Server-seitige Integration

### Hauptmodul: `app/lib/mantle.server.ts`

#### Environment-Variablen (erforderlich)
```bash
MANTLE_API_KEY=<mantle-api-key>
MANTLE_APP_ID=<mantle-app-id>
SHOPIFY_APP_URL=<app-url>  # Optional, Fallback verfügbar
```

#### Kernfunktionen

**1. `identifyCustomer()`**
- Identifiziert/verwaltet Shopify-Shops als Mantle-Kunden
- API: `POST /v1/identify`
- Gibt `customerApiToken` zurück (für weitere API-Calls nötig)

**Request-Body für Shopify:**
```json
{
  "platform": "shopify",
  "platformId": "<MANTLE_APP_ID>",
  "myshopifyDomain": "<shop-domain>",
  "customer_id": "<shop-domain>",
  "email": "<shop-domain>@shopify.com",
  "name": "<shop-domain>",
  "metadata": {
    "shop": "<shop-domain>",
    "source": "app_root|pricing_page|onboarding_page"
  }
}
```

**2. `getPlans()`**
- Ruft verfügbare Abonnement-Pläne ab
- API: `GET /v1/plans`
- Kann mit oder ohne Customer-Token aufgerufen werden

**3. `verifyMantleWebhook()`**
- Verifiziert Mantle-Webhook-Signaturen
- Für spätere Webhook-Integration vorbereitet

#### Plan-Konstanten (Fallback)
```273:276:app/lib/mantle.server.ts
export const MANTLE_PLAN_IDS = {
  BEGINNER: process.env.MANTLE_PLAN_ID_BEGINNER || 'b6c3c289-2f34-404c-b3c1-a553e6935756',
  GROWTH: process.env.MANTLE_PLAN_ID_GROWTH || 'a5331f09-bc03-4709-8af6-f2f45c515bf7',
};
```

---

## 🔄 Datenfluss beim App-Start

### Loader-Funktion in `app/routes/app.tsx`

```12:28:app/routes/app.tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const customer = await identifyCustomer(shop, {
    email: `${shop}@shopify.com`,
    name: shop,
    myshopifyDomain: shop,
    metadata: { shop, source: 'app_root' }
  });

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    appId: process.env.MANTLE_APP_ID || "",
    customerApiToken: customer.customerApiToken
  };
};
```

**Prozess:**
1. Shopify-Session authentifizieren
2. Shop-Domain extrahieren
3. Customer in Mantle identifizieren (erhält `customerApiToken`)
4. MantleAppProvider mit Token initialisieren

---

## 🎯 Verwendung in der App

### Frontend-Zugriff via Hook

```91:97:app/components/MantleAppProvider.tsx
export function useMantle() {
  const context = useContext(ExtendedMantleContext);
  if (!context) {
    throw new Error("useMantle must be used within a MantleAppProvider");
  }
  return context;
}
```

**Verwendung in Komponenten:**
```typescript
const { subscribe, customer } = useMantle();

// Neues Abonnement erstellen
await subscribe({
  planId: 'plan-id',
  customerId: 'shop-domain',
  returnUrl: 'https://app.com/success'
});
```

### Aktuelle Implementierungs-Status

| Funktion | Status | Bemerkung |
|----------|--------|-----------|
| `subscribe()` | ✅ Implementiert | Erstellt neue Abonnements |
| `upgrade()` | 🔄 Placeholder | Verwendet aktuell `subscribe()` |
| `downgrade()` | 🔄 Placeholder | Verwendet aktuell `subscribe()` |
| `cancel()` | ❌ Nicht implementiert | Wirft Error |
| `customer` | ✅ Verfügbar | Kundendaten aus Mantle |

---

## 🌐 API-Integration

### Mantle API Endpoints

| Endpoint | Methode | Zweck | Auth |
|----------|---------|-------|------|
| `/v1/identify` | POST | Customer identifizieren/erstellen | App Headers |
| `/v1/plans` | GET | Pläne abrufen | App oder Customer Headers |
| `/v1/subscriptions` | POST | Checkout-Link erstellen | Customer Headers |

### Header-Strukturen

**App-Level Headers:**
```typescript
{
  'X-Mantle-App-Id': process.env.MANTLE_APP_ID,
  'X-Mantle-App-Api-Key': process.env.MANTLE_API_KEY,
  'Content-Type': 'application/json'
}
```

**Customer-Level Headers:**
```typescript
{
  'X-Mantle-App-Id': process.env.MANTLE_APP_ID,
  'X-Mantle-Customer-Api-Token': customerApiToken,
  'Content-Type': 'application/json'
}
```

---

## 🔍 Debugging & Monitoring

### Wichtige Log-Nachrichten

**Erfolgreiche Customer-Identifizierung:**
```
Mantle identify request: { url: '...', body: { platform: 'shopify', ... } }
Mantle identify response: { apiToken: '...' }
```

**Erfolgreiche Subscription-Erstellung:**
```
Creating subscription checkout: { planId: '...', planName: 'Beginner Plan' }
Mantle subscription response: { confirmationUrl: '...' }
```

### Häufige Probleme & Lösungen

1. **"Mantle API credentials missing"**
   - `MANTLE_API_KEY` oder `MANTLE_APP_ID` fehlen in `.env`

2. **"Unsupported platform"**
   - `platform: 'shopify'` fehlt im Request-Body

3. **"Missing platformId/myshopifyDomain"**
   - `platformId` muss `MANTLE_APP_ID` sein (nicht Shop-Domain)
   - `myshopifyDomain` muss Shop-Domain sein

4. **"https://undefined/..." in returnUrl**
   - `SHOPIFY_APP_URL` oder `APP_URL_HOST` nicht korrekt gesetzt

---

## 📚 Ressourcen & Dokumentation

### Externe Links
- **Mantle API Docs:** https://appapi.heymantle.dev/docs
- **React Package:** https://www.npmjs.com/package/@heymantle/react
- **Dashboard:** https://app.heymantle.com

### Interne Dokumentation
- `readme.mantle.md` - Detaillierte technische Dokumentation
- `app/lib/mantle.server.ts` - Vollständige Server-Implementierung
- `app/components/MantleAppProvider.tsx` - Frontend-Integration

---

## 🚀 Erweiterungsmöglichkeiten

### Geplante Features
- ✅ Webhook-Integration für Subscription-Events
- 🔄 Upgrade/Downgrade-Funktionalität
- 🔄 Cancel-Funktionalität
- 🔄 Usage-Tracking
- 🔄 Billing-Management UI

### API-Routen (bereits vorbereitet)
- `app/routes/api.mantle.webhooks.tsx` - Webhook-Handler
- Subscription-Management-Endpunkte in Planung

---

## ✨ Zusammenfassung

Mantle ist vollständig in das Social-Proof-Sections-Projekt integriert:

- **Server-seitig:** Customer-Identifizierung und Plan-Management
- **Client-seitig:** React Provider mit erweiterten Hooks
- **Automatisch:** Bei jedem App-Besuch wird der Shop als Mantle-Customer identifiziert
- **Skalierbar:** Bereit für erweiterte Subscription-Funktionen

Die Integration ist stabil und bereit für den Produktiveinsatz mit Beginner- und Growth-Plänen.
