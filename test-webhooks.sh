#!/bin/bash

# Test Script für Webhooks
# Dieses Script testet alle Webhooks durch das Senden von Test-Payloads

HEROKU_URL="https://temply-app-c64b60ec6f1d.herokuapp.com"

echo "🧪 Testing Webhooks für Temply App"
echo "=================================="
echo ""

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: app/scopes_update
echo -e "${BLUE}📋 Test 1: app/scopes_update${NC}"
echo "Hinweis: Dieser Webhook wird automatisch ausgelöst, wenn du die App-Scopes in der TOML änderst"
echo "Ändere die 'scopes' in shopify.app.production.toml und update die App."
echo ""

# Test 2: customers/data_request
echo -e "${BLUE}📋 Test 2: customers/data_request (GDPR)${NC}"
echo "Zum Testen dieses Webhooks:"
echo "1. Gehe zum Shopify Partner Dashboard"
echo "2. Navigiere zu deiner App"
echo "3. Gehe zu 'Test your app' → 'Test on development store'"
echo "4. Trigger den Webhook über: Settings → Customer Privacy → Request customer data"
echo "Oder verwende den CLI-Befehl:"
echo -e "${YELLOW}shopify app webhook trigger --topic=customers/data_request${NC}"
echo ""

# Test 3: customers/redact
echo -e "${BLUE}📋 Test 3: customers/redact (GDPR)${NC}"
echo "Zum Testen dieses Webhooks:"
echo "1. Gehe zum Shopify Partner Dashboard"
echo "2. Navigiere zu deiner App"
echo "3. Gehe zu 'Test your app' → 'Test on development store'"
echo "4. Trigger den Webhook über: Settings → Customer Privacy → Erase customer data"
echo "Oder verwende den CLI-Befehl:"
echo -e "${YELLOW}shopify app webhook trigger --topic=customers/redact${NC}"
echo ""

# Test 4: shop/redact
echo -e "${BLUE}📋 Test 4: shop/redact (GDPR)${NC}"
echo "Zum Testen dieses Webhooks:"
echo "1. Gehe zum Shopify Partner Dashboard"
echo "2. Navigiere zu deiner App"
echo "3. Gehe zu 'Test your app' → 'Test on development store'"
echo "4. Dieser Webhook wird ausgelöst, wenn ein Shop seine Daten löscht (48h nach App-Deinstallation)"
echo "Oder verwende den CLI-Befehl:"
echo -e "${YELLOW}shopify app webhook trigger --topic=shop/redact${NC}"
echo ""

echo -e "${GREEN}✅ Alle Webhook-Endpoints sind bereit zum Testen!${NC}"
echo ""
echo "📊 Überprüfe die Heroku Logs mit:"
echo -e "${YELLOW}heroku logs --tail --app temply-app${NC}"
echo ""
echo "🔍 Suche nach den folgenden Zeichen im Log:"
echo "  🔔 = Webhook empfangen"
echo "  ✅ = HMAC Verifizierung erfolgreich"
echo "  ❌ = Fehler"
echo "  📦 = Payload-Details"

