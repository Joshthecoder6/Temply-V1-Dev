# Webhook-Dokumentation - Temply Live App

**Letzte Aktualisierung:** 14. November 2025  
**App:** Temply-Live  
**Heroku:** temply-live-882b514b992d.herokuapp.com

---

## 📋 Übersicht

Die Temply-App implementiert **5 Webhooks**, davon sind **3 obligatorische Compliance-Webhooks** für GDPR/Datenschutz und **2 funktionale App-Webhooks**.

Alle Webhooks sind mit **HMAC-Signatur-Verifizierung** ausgestattet und erfüllen die Shopify App Store Anforderungen.

---

## 🔐 Compliance-Webhooks (Obligatorisch)

### 1. Customers Data Request
**Zweck:** GDPR-konform auf Datenauskunftsanfragen von Kunden reagieren

**Datei:** `app/routes/webhooks.customers.data_request.tsx`  
**Webhook Topic:** `customers/data_request`  
**URI:** `/webhooks/customers/data_request`

**Wann wird er ausgelöst?**
- Wenn ein Kunde über den Shopify Admin seine Daten anfordert
- Teil der GDPR/DSGVO-Compliance

**Was macht er?**
1. Empfängt Anfrage mit Kunden-ID und E-Mail
2. Sammelt alle gespeicherten Daten für diesen Kunden
3. Gibt strukturierte JSON-Response mit Dateninformation zurück
4. Temply speichert keine direkten Kundendaten → Response: "No customer data stored"

**Response bei Erfolg (200):**
```json
{
  "shop": "example.myshopify.com",
  "message": "Temply stores no direct customer data. All data is shop-level only.",
  "stored_data_types": [
    "Shop sessions (authentication tokens)",
    "Shop settings and templates",
    "No customer personal information is stored"
  ]
}
```

**Response bei ungültiger HMAC (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid HMAC signature"
}
```

**HMAC-Verifizierung:** ✅ Implementiert via `authenticate.webhook()`

---

### 2. Customers Redact
**Zweck:** GDPR-konform Kundendaten löschen auf Anfrage

**Datei:** `app/routes/webhooks.customers.redact.tsx`  
**Webhook Topic:** `customers/redact`  
**URI:** `/webhooks/customers/redact`

**Wann wird er ausgelöst?**
- Wenn ein Kunde sein "Recht auf Löschung" geltend macht
- Teil der GDPR/DSGVO-Compliance

**Was macht er?**
1. Empfängt Löschanfrage mit Kunden-ID und E-Mail
2. Sucht nach kundenspezifischen Daten in der Datenbank
3. Löscht potenzielle Session-Daten mit dieser E-Mail (Sicherheitsmaßnahme)
4. Gibt Bestätigung zurück

**Datenbank-Operationen:**
```typescript
await db.session.deleteMany({
  where: {
    shop,
    email: customerEmail
  }
});
```

**Response bei Erfolg (200):**
```json
{
  "success": true,
  "shop": "example.myshopify.com",
  "message": "No customer-specific data to redact. Temply stores only shop-level data."
}
```

**Response bei ungültiger HMAC (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid HMAC signature"
}
```

**HMAC-Verifizierung:** ✅ Implementiert via `authenticate.webhook()`

---

### 3. Shop Redact
**Zweck:** Alle Shop-Daten 48h nach App-Deinstallation löschen

**Datei:** `app/routes/webhooks.shop.redact.tsx`  
**Webhook Topic:** `shop/redact`  
**URI:** `/webhooks/shop/redact`

**Wann wird er ausgelöst?**
- **48 Stunden** nach App-Deinstallation
- Automatisch von Shopify getriggert
- Teil der GDPR/DSGVO-Compliance

**Was macht er?**
1. Empfängt Shop-Domain
2. Löscht **ALLE** Shop-spezifischen Daten aus der Datenbank:
   - Sessions (Authentication Tokens)
   - Social Proof Sections
   - App Settings
3. Templates bleiben erhalten (sind global, nicht shop-spezifisch)

**Datenbank-Operationen:**
```typescript
// 1. Sessions löschen
await db.session.deleteMany({ where: { shop } });

// 2. Social Proof Sections löschen
await db.socialProofSection.deleteMany({ where: { shop } });

// 3. App Settings löschen
await db.appSettings.deleteMany({ where: { shop } });
```

**Response bei Erfolg (200):**
```json
{
  "success": true,
  "shop": "example.myshopify.com",
  "deleted": {
    "sessions": 2,
    "sections": 5,
    "settings": 1
  }
}
```

**Response bei ungültiger HMAC (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid HMAC signature"
}
```

**HMAC-Verifizierung:** ✅ Implementiert via `authenticate.webhook()`

---

## ⚙️ Funktionale App-Webhooks

### 4. App Uninstalled
**Zweck:** Sofortige Bereinigung bei App-Deinstallation

**Datei:** `app/routes/webhooks.app.uninstalled.tsx`  
**Webhook Topic:** `app/uninstalled`  
**URI:** `/webhooks/app/uninstalled`

**Wann wird er ausgelöst?**
- Sofort wenn ein Merchant die App deinstalliert
- Vor dem `shop/redact` Webhook (der kommt 48h später)

**Was macht er?**
1. Empfängt Shop-Domain
2. Löscht Session-Daten für diesen Shop
3. Kann mehrfach getriggert werden → prüft ob Session existiert

**Datenbank-Operationen:**
```typescript
if (session) {
  await db.session.deleteMany({ where: { shop } });
}
```

**Response bei Erfolg (200):**
```json
{
  "success": true,
  "shop": "example.myshopify.com",
  "message": "App uninstalled webhook processed"
}
```

**Response bei ungültiger HMAC (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid HMAC signature"
}
```

**HMAC-Verifizierung:** ✅ Implementiert via `authenticate.webhook()`

**Hinweis:** Dieser Webhook kann mehrfach aufgerufen werden. Die Session könnte bereits gelöscht sein → defensive Programmierung mit `if (session)` Check.

---

### 5. App Scopes Update
**Zweck:** OAuth-Scopes aktualisieren wenn sich Berechtigungen ändern

**Datei:** `app/routes/webhooks.app.scopes_update.tsx`  
**Webhook Topic:** `app/scopes_update`  
**URI:** `/webhooks/app/scopes_update`

**Wann wird er ausgelöst?**
- Wenn die App ihre OAuth-Scopes ändert
- Wenn ein Merchant neue Berechtigungen gewährt/entzieht
- Nach App-Update mit geänderten Scopes

**Was macht er?**
1. Empfängt neue Scope-Liste von Shopify
2. Aktualisiert die Session mit den neuen Scopes
3. Speichert Scope-String in der Datenbank

**Datenbank-Operationen:**
```typescript
if (session) {
  await db.session.update({   
    where: { id: session.id },
    data: { scope: current.toString() }
  });
}
```

**Response bei Erfolg (200):**
```json
{
  "success": true,
  "shop": "example.myshopify.com",
  "message": "Scopes updated successfully",
  "scopes": ["write_themes", "read_themes", "write_content", "read_content"]
}
```

**Response bei ungültiger HMAC (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid HMAC signature"
}
```

**HMAC-Verifizierung:** ✅ Implementiert via `authenticate.webhook()`

---

## 🔒 HMAC-Signatur-Verifizierung

### Was ist HMAC?
HMAC (Hash-based Message Authentication Code) ist ein Sicherheitsmechanismus, der sicherstellt, dass Webhook-Anfragen wirklich von Shopify kommen.

### Wie funktioniert es?
1. Shopify sendet bei jedem Webhook einen `X-Shopify-Hmac-Sha256` Header
2. Dieser Header enthält einen Hash des Request-Bodies mit dem App Secret
3. Die App verifiziert diese Signatur mit `authenticate.webhook(request)`
4. Bei ungültiger Signatur: Error wird geworfen

### Implementierung
Alle Webhooks nutzen das Shopify SDK für automatische HMAC-Verifizierung:

```typescript
try {
  const { shop, payload, topic } = await authenticate.webhook(request);
  // ... Webhook-Logik ...
} catch (error) {
  // HMAC-Verifizierung fehlgeschlagen
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
```

### Shopify Anforderung
Laut [Shopify Dokumentation](https://shopify.dev/docs/apps/build/privacy-law-compliance):
> "If a mandatory compliance webhook sends a request with an invalid Shopify HMAC header, then the app must return a 401 Unauthorized HTTP status."

✅ **Alle 5 Webhooks erfüllen diese Anforderung!**

---

## 📝 Webhook-Konfiguration

### Development (shopify.app.toml)
```toml
[webhooks]
api_version = "2025-10"

[[webhooks.subscriptions]]
topics = [ "app/uninstalled" ]
uri = "/webhooks/app/uninstalled"

[[webhooks.subscriptions]]
topics = [ "app/scopes_update" ]
uri = "/webhooks/app/scopes_update"

[[webhooks.subscriptions]]
compliance_topics = ["customers/data_request"]
uri = "/webhooks/customers/data_request"

[[webhooks.subscriptions]]
compliance_topics = ["customers/redact"]
uri = "/webhooks/customers/redact"

[[webhooks.subscriptions]]
compliance_topics = ["shop/redact"]
uri = "/webhooks/shop/redact"
```

### Production (shopify.app.production.toml)
Identische Konfiguration wie Development
