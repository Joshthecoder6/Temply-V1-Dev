# 🧪 Webhook Testing Guide - Temply Live App

## Problem
Die Shopify CLI kann Webhooks nicht direkt triggern wegen mehrerer TOML-Konfigurationen.

## ✅ Lösung 1: Über das Shopify Partner Dashboard (EMPFOHLEN)

### Vorbereitung
1. Öffne die Heroku Logs in einem Terminal:
   ```bash
   heroku logs --tail --app temply-app
   ```

### GDPR Webhooks testen

#### 1. **customers/data_request**
1. Gehe zu: https://partners.shopify.com/
2. Apps → Temply-Live → App auswählen
3. Installiere die App auf einem Test-Shop (falls noch nicht geschehen)
4. Im Test-Shop: Settings → Customer Privacy
5. Wähle einen Test-Kunden aus
6. Klicke auf "Request customer data"
7. ✅ Überprüfe Heroku Logs - du solltest sehen:
   ```
   🔔 WEBHOOK RECEIVED: customers/data_request
   ✅ HMAC Verification: SUCCESS
   📦 Payload: { customer: { ... } }
   ```

#### 2. **customers/redact**
1. Im gleichen Test-Shop: Settings → Customer Privacy
2. Wähle einen Test-Kunden aus
3. Klicke auf "Erase customer data"
4. ✅ Überprüfe Heroku Logs

#### 3. **shop/redact**
⚠️ **Hinweis**: Dieser Webhook wird NUR ausgelöst:
- 48 Stunden NACH App-Deinstallation
- Wenn der Shop GDPR-Datenrichtlinien befolgt
- Wenn der Shop seine Daten komplett löscht

**Test-Alternative**: 
- Deinstalliere die App von einem Test-Shop
- Warte 48h (oder simuliere es im Partner Dashboard)

---

## ✅ Lösung 2: CLI mit spezifischer Config

Wenn du die CLI verwenden möchtest, spezifiziere die Config explizit:

```bash
# Für Production
shopify app webhook trigger \
  --topic=customers/data_request \
  --config=shopify.app.production.toml

# Für Dev
shopify app webhook trigger \
  --topic=customers/data_request \
  --config=shopify.app.toml
```

---

## ✅ Lösung 3: App neu installieren (Schnelltest)

### app/scopes_update Webhook testen
1. Ändere die Scopes in `shopify.app.production.toml`:
   ```toml
   scopes = "write_themes,read_themes,write_content,read_content,read_products"
   ```
   (füge `read_products` hinzu)

2. Deploye auf Heroku:
   ```bash
   git add shopify.app.production.toml
   git commit -m "Test: Add read_products scope"
   git push heroku main
   ```

3. Aktualisiere die App im Shopify Admin des Test-Shops
4. Der Webhook sollte automatisch ausgelöst werden
5. ✅ Überprüfe Heroku Logs

6. Entferne den Scope wieder:
   ```toml
   scopes = "write_themes,read_themes,write_content,read_content"
   ```

---

## 📊 Was du in den Logs sehen solltest

### ✅ Erfolgreicher Webhook:
```
================================================================================
🔔 [2025-11-14T12:34:56.789Z] WEBHOOK RECEIVED: customers/data_request
================================================================================
📍 URL: https://temply-app-c64b60ec6f1d.herokuapp.com/webhooks/customers/data_request
🔧 Method: POST
📋 Headers: {
  "x-shopify-topic": "customers/data_request",
  "x-shopify-hmac-sha256": "...",
  "x-shopify-shop-domain": "your-shop.myshopify.com"
}
✅ HMAC Verification: SUCCESS
🏪 Shop: your-shop.myshopify.com
📬 Topic: customers/data_request
📦 Payload: {
  "shop_id": 12345,
  "shop_domain": "your-shop.myshopify.com",
  "customer": {
    "id": 67890,
    "email": "test@example.com"
  }
}
👤 Session exists: true
📝 Processing data request for customer: test@example.com
✅ Data request processed successfully
================================================================================
```

### ❌ Fehlgeschlagener Webhook (HMAC Error):
```
🔔 WEBHOOK RECEIVED: customers/data_request
❌ HMAC Verification: FAILED
❌ Error: Invalid HMAC signature
```

---

## 🎯 Schnell-Checklist

- [ ] Heroku Logs laufen (`heroku logs --tail --app temply-app`)
- [ ] Test-Shop vorhanden mit installierter App
- [ ] `customers/data_request` getestet
- [ ] `customers/redact` getestet
- [ ] `app/scopes_update` getestet (optional)
- [ ] `shop/redact` dokumentiert (wird nach 48h ausgelöst)
- [ ] Alle Webhooks zeigen "HMAC Verification: SUCCESS" ✅

---

## 🔍 Debugging

### Webhook kommt nicht an?
1. Überprüfe die URLs in `shopify.app.production.toml`
2. Überprüfe, ob die App auf Heroku läuft: `heroku ps --app temply-app`
3. Überprüfe Heroku-Fehler: `heroku logs --tail --app temply-app`

### HMAC Verification schlägt fehl?
1. Überprüfe, ob die `SHOPIFY_API_SECRET` in Heroku korrekt gesetzt ist
2. Vergleiche mit dem Secret im Shopify Partner Dashboard
3. Stelle sicher, dass keine Middleware den Request-Body modifiziert

### Webhook-Registrierung fehlt?
1. Überprüfe in der Shopify Admin: Settings → Apps and sales channels → Temply-Live → Configuration
2. Die Webhooks sollten alle dort aufgelistet sein
3. Falls nicht, führe aus: `shopify app deploy --config=shopify.app.production.toml`

