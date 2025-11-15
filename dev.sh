#!/bin/bash

# ============================================
# Temply Dev - Startup Script
# ============================================
# Startet Cloudflare Tunnel + Shopify Dev Server
# Für permanente, stabile Dev-URL
# ============================================

set -e  # Exit on error

echo "🚀 Temply Dev - Starting..."
echo ""

# ============================================
# KONFIGURATION - HIER ANPASSEN!
# ============================================
TUNNEL_TOKEN="eyJhIjoiYzIzYTkxODExNmQ3ZWIzYmZiNmU2MWZkMjA0OTEwMzAiLCJ0IjoiMWE0MzU3ZmYtYzFkNC00MjY1LWI2N2MtMDc0OTM1N2VkYTk1IiwicyI6Ik5XRTNZamczTnpZdE5ERXlOQzAwTjJVMExXSXdaV0l0WmpjNVpEZ3dZamxoWkdFMiJ9"
# ODER: Wenn du den Tunnel als Service installiert hast, lasse das leer
# TUNNEL_TOKEN=""

# Deine Domain (z.B. dev-temply.deinedomain.com)
APP_DOMAIN="temply-developer.joshuajeske.de"
# ============================================

# Prüfe ob cloudflared installiert ist
if ! command -v cloudflared &> /dev/null; then
    echo "⚠️  cloudflared ist nicht installiert!"
    echo ""
    echo "Installiere mit:"
    echo "  brew install cloudflared"
    echo ""
    echo "Oder siehe: TUNNEL-SETUP.md"
    exit 1
fi

# Prüfe ob Tunnel Token gesetzt ist
if [ "$TUNNEL_TOKEN" = "YOUR_CLOUDFLARE_TUNNEL_TOKEN_HERE" ]; then
    echo "⚠️  TUNNEL_TOKEN nicht gesetzt!"
    echo ""
    echo "Bitte bearbeite dev.sh und setze:"
    echo "  TUNNEL_TOKEN=\"dein-token-hier\""
    echo ""
    echo "Oder installiere den Tunnel als Service (siehe TUNNEL-SETUP.md)"
    echo ""
    
    # Prüfe ob Tunnel Service läuft
    if pgrep -x "cloudflared" > /dev/null; then
        echo "✅ Cloudflare Tunnel läuft bereits als Service!"
        TUNNEL_RUNNING=true
    else
        echo "❌ Kein Tunnel gefunden. Setup nötig!"
        echo "Siehe: TUNNEL-SETUP.md"
        exit 1
    fi
else
    TUNNEL_RUNNING=false
fi

# Prüfe ob Domain gesetzt ist
if [ "$APP_DOMAIN" = "YOUR_DOMAIN_HERE" ]; then
    echo "⚠️  APP_DOMAIN nicht gesetzt!"
    echo ""
    echo "Bitte bearbeite dev.sh und setze:"
    echo "  APP_DOMAIN=\"dev-temply.deinedomain.com\""
    exit 1
fi

# ============================================
# Tunnel starten (falls nicht als Service)
# ============================================

if [ "$TUNNEL_RUNNING" = false ]; then
    echo "📡 Starte Cloudflare Tunnel..."
    
    # Prüfe ob Tunnel bereits läuft
    if pgrep -x "cloudflared" > /dev/null; then
        echo "✅ Tunnel läuft bereits!"
    else
        # Starte Tunnel im Hintergrund
        cloudflared tunnel --token "$TUNNEL_TOKEN" > /tmp/cloudflared.log 2>&1 &
        TUNNEL_PID=$!
        
        echo "✅ Tunnel gestartet (PID: $TUNNEL_PID)"
        echo "   Logs: /tmp/cloudflared.log"
        
        # Warte kurz bis Tunnel bereit ist
        sleep 3
    fi
fi

echo ""
echo "============================================"
echo "🌐 App URL: https://$APP_DOMAIN"
echo "📡 Port: 3000 (fixiert)"
echo "============================================"
echo ""

# Setze PORT Environment Variable
export PORT=3000

# ============================================
# Shopify Dev Server starten
# ============================================

echo "🛠️  Starte Shopify Dev Server..."
echo ""

# Lösche alten Cache für frischen Start
rm -rf .shopify/dev-bundle* 2>/dev/null

# WICHTIG: Unset SHOPIFY_APP_URL damit Vite die PORT Variable respektiert
unset SHOPIFY_APP_URL

# Starte Shopify CLI
# Die URLs in shopify.app.toml zeigen auf unseren Cloudflare Tunnel
shopify app dev --no-update

# Cleanup bei Exit
trap "echo ''; echo '🛑 Stopping...'; kill $TUNNEL_PID 2>/dev/null; exit" INT TERM

