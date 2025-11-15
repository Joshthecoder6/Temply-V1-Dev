# Shopify Dev Tunnel - Lokale Entwicklung

## Warum Shopify Dev Tunnel?

Der Shopify Dev Tunnel ist die beste Option für lokale Entwicklung:

✅ **Stabile URL** - Ändert sich nicht bei jedem Start
✅ **Bessere Performance** - Direkt von Shopify verwaltet
✅ **Keine Drittanbieter** - Keine ngrok/Cloudflare Accounts nötig
✅ **Automatische Konfiguration** - Shopify CLI macht alles

## Starten

```bash
shopify app dev
```

Der CLI wird automatisch:
1. Einen Shopify Dev Tunnel erstellen
2. Die URLs in shopify.app.toml aktualisieren
3. Die App starten

## Tunnel-Methode ändern

Falls der CLI nach der Tunnel-Methode fragt:
```
? How would you like to expose your local development server?
  > Shopify managed tunnel (recommended)
    Cloudflare tunnel
    ngrok tunnel
```

Wähle: **Shopify managed tunnel**

## URL-Format

Deine App wird unter einer stabilen Shopify-URL erreichbar sein:
```
https://<your-tunnel>.shopify.app
```

Diese URL bleibt konsistent zwischen den Sessions!

## Troubleshooting

### "Tunnel already in use"
```bash
# Stoppe alle aktiven Shopify-Prozesse
pkill -f "shopify"

# Starte neu
shopify app dev
```

### Cache-Probleme
```bash
# Lösche Dev-Cache
rm -rf .shopify/dev-bundle*

# Starte neu
shopify app dev
```

---

**Stand:** 2025-11-15  
**Tunnel:** Shopify Dev Tunnel (empfohlen)

