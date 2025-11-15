# Permanenter Cloudflare Tunnel Setup

## Übersicht

Dieser Guide richtet einen permanenten Cloudflare Tunnel ein, sodass deine Shopify App immer unter der gleichen URL erreichbar ist - perfekt für lokale Entwicklung!

## Vorteile

- ✅ URL ändert sich NIE mehr
- ✅ Komplett kostenlos (mit Cloudflare Account)
- ✅ Professionelle Domain (dev-temply.deinedomain.com)
- ✅ Läuft permanent im Hintergrund
- ✅ Keine Limits
- ✅ Bessere Performance als temporäre Tunnel

## Voraussetzungen

- [x] Cloudflare Account mit eigener Domain
- [ ] Cloudflare Zero Trust Account (kostenlos)
- [ ] cloudflared CLI installiert

---

## Setup Schritte

### 1. cloudflared CLI installieren

```bash
# macOS
brew install cloudflared

# Oder Download von:
# https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

Prüfe die Installation:
```bash
cloudflared --version
```

### 2. Cloudflare Zero Trust Dashboard Setup

1. Gehe zu: https://one.dash.cloudflare.com/
2. Falls noch nicht vorhanden: Erstelle ein Zero Trust Account (kostenlos)
3. Gehe zu: **Access** → **Tunnels**
4. Klicke auf **Create a tunnel**

### 3. Tunnel erstellen

Im Cloudflare Dashboard:

1. **Name**: `temply-dev` (oder einen anderen Namen)
2. **Environment**: `macOS`
3. Kopiere den Tunnel Token (sieht aus wie: `eyJhIjoiXXXXXXX...`)
4. **WICHTIG**: Speichere diesen Token sicher!

### 4. Tunnel lokal verbinden

```bash
# Ersetze TOKEN mit deinem Tunnel Token
cloudflared tunnel --token TOKEN
```

**Wichtig**: Lasse dieses Terminal-Fenster offen oder richte einen Service ein (siehe unten).

### 5. Public Hostname einrichten

Zurück im Cloudflare Dashboard:

1. Gehe zum erstellten Tunnel
2. Klicke auf **Public Hostname** → **Add a public hostname**
3. Konfiguration:
   - **Subdomain**: `dev-temply` (oder dein Wunschname)
   - **Domain**: Wähle deine Domain aus
   - **Type**: `HTTP`
   - **URL**: `localhost:57099` (Standard Shopify CLI Port, kann variieren)
4. Klicke **Save**

Deine URL ist jetzt: `https://dev-temply.deinedomain.com`

### 6. DNS automatisch konfiguriert

Cloudflare erstellt automatisch einen CNAME Record für deine Subdomain. Prüfe das in:
- Cloudflare Dashboard → Deine Domain → **DNS** → **Records**

### 7. Shopify App Konfiguration anpassen

Jetzt müssen wir die Shopify App auf deine permanente URL umstellen.

**WICHTIG**: Ersetze `dev-temply.deinedomain.com` mit deiner echten Domain!

Die `shopify.app.toml` wurde bereits vorbereitet. Du musst nur noch die Domain anpassen.

### 8. Shopify Partner Dashboard aktualisieren

1. Gehe zu: https://partners.shopify.com/
2. **Apps** → **Temply-dev-2**
3. **Configuration** → **App URL**
4. Aktualisiere:
   - **App URL**: `https://dev-temply.deinedomain.com`
   - **Allowed redirection URL(s)**:
     - `https://dev-temply.deinedomain.com/api/auth`
     - `https://dev-temply.deinedomain.com/auth/callback`
5. **Save**

---

## Automatischer Start

### Option 1: Terminal im Hintergrund laufen lassen

```bash
# In einem separaten Terminal-Fenster
cloudflared tunnel --token YOUR_TOKEN
```

### Option 2: Als macOS Service einrichten (empfohlen)

Erstelle eine plist Datei für automatischen Start:

```bash
# Config Datei erstellen
nano ~/.cloudflared/config.yml
```

Füge ein (Token anpassen!):
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /Users/DEIN_USERNAME/.cloudflared/YOUR_TUNNEL_ID.json
```

Dann:
```bash
# Service installieren
cloudflared service install

# Service starten
sudo launchctl start com.cloudflare.cloudflared
```

### Option 3: Mit dem dev.sh Script

Das `dev.sh` Script startet automatisch:
1. Den Cloudflare Tunnel (falls nicht läuft)
2. Den Shopify Dev-Server

```bash
./dev.sh
```

---

## Verwendung

### Normal starten

```bash
# Mit dem Script
./dev.sh

# Oder manuell
shopify app dev
```

### Tunnel Status prüfen

```bash
# Läuft der Tunnel?
ps aux | grep cloudflared

# Cloudflare Dashboard prüfen
# https://one.dash.cloudflare.com/ → Tunnels
```

### Port herausfinden

Der Shopify CLI nutzt dynamische Ports. Schau im Terminal nach:
```
React Router │   ➜  Local:   http://localhost:XXXXX/
```

Falls der Port sich ändert, musst du im Cloudflare Dashboard den Public Hostname aktualisieren.

---

## Troubleshooting

### "Tunnel not found" Error

```bash
# Tunnel neu authentifizieren
cloudflared tunnel login

# Liste alle Tunnels
cloudflared tunnel list
```

### Port ist falsch

1. Starte `shopify app dev`
2. Notiere den Port (z.B. `57099`)
3. Cloudflare Dashboard → Tunnel → Public Hostname → Bearbeiten
4. Ändere `localhost:PORT` zum richtigen Port

### App lädt nicht / Weiße Seite

1. Prüfe dass der Tunnel läuft: `cloudflared tunnel list`
2. Prüfe dass die URLs in `shopify.app.toml` korrekt sind
3. Lösche Browser Cache
4. Lösche `.shopify/` Ordner: `rm -rf .shopify`
5. Starte neu: `shopify app dev`

### URLs im Partner Dashboard falsch

Gehe zu: https://partners.shopify.com/
- Apps → Temply-dev-2 → Configuration
- Aktualisiere alle URLs auf deine Domain

---

## Alternative: Quick Setup mit ngrok

Falls Cloudflare Tunnel zu komplex ist:

```bash
# ngrok installieren
brew install ngrok

# Account erstellen auf ngrok.com
# Auth Token holen

# Token setzen
ngrok config add-authtoken YOUR_TOKEN

# Feste Domain bekommen (kostenlos)
ngrok http 57099

# Die URL bleibt dann stabil!
```

---

## Cheat Sheet

```bash
# Tunnel starten
cloudflared tunnel --token TOKEN

# Tunnel als Service
cloudflared service install
sudo launchctl start com.cloudflare.cloudflared

# App entwickeln
./dev.sh

# Status prüfen
cloudflared tunnel list
ps aux | grep cloudflared

# Logs ansehen
cloudflared tunnel logs
```

---

## Nächste Schritte

1. ✅ cloudflared installieren
2. ✅ Tunnel im Cloudflare Dashboard erstellen
3. ✅ Token kopieren und Tunnel starten
4. ✅ Public Hostname einrichten
5. ✅ Domain in shopify.app.toml eintragen
6. ✅ Shopify Partner Dashboard aktualisieren
7. ✅ `./dev.sh` ausführen
8. ✅ App testen!

---

**Erstellt:** 2025-11-15  
**Status:** Setup-Anleitung - Bereit zur Verwendung

Bei Fragen oder Problemen: Siehe Troubleshooting Section oben!

