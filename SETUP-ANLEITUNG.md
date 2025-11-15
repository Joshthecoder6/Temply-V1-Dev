# 🚀 Schnellstart - Permanenter Dev Tunnel

Diese Anleitung führt dich durch das Setup eines permanenten Cloudflare Tunnels für deine Shopify App.

**Ziel**: Eine stabile URL die sich nie mehr ändert!

---

## ⏱️ Zeitaufwand: 10-15 Minuten

---

## Schritt 1: cloudflared installieren (2 Minuten)

```bash
brew install cloudflared
```

Prüfe die Installation:
```bash
cloudflared --version
```

---

## Schritt 2: Cloudflare Tunnel erstellen (5 Minuten)

### 2.1 Cloudflare Zero Trust öffnen

Gehe zu: **https://one.dash.cloudflare.com/**

Falls du noch keinen Zero Trust Account hast:
- Klicke auf "Get Started"
- Wähle den kostenlosen Plan
- Folge dem Setup

### 2.2 Neuen Tunnel erstellen

1. Sidebar: **Access** → **Tunnels**
2. Klicke **Create a tunnel**
3. Wähle **Cloudflared**
4. Name: `temply-dev`
5. Klicke **Save tunnel**

### 2.3 Token kopieren

1. Wähle **macOS** als Environment
2. Kopiere den kompletten Token (sieht aus wie `eyJhIjoiXXXXXXX...`)
3. **Speichere diesen Token** - du brauchst ihn gleich!

### 2.4 Public Hostname einrichten

1. Im selben Dialog: **Public Hostname** Tab
2. Klicke **Add a public hostname**
3. Fülle aus:
   - **Subdomain**: `dev-temply` (oder dein Wunschname)
   - **Domain**: Wähle deine Domain
   - **Type**: `HTTP`
   - **URL**: `localhost:3000` (Port, kann später angepasst werden)
4. Klicke **Save hostname**

✅ Deine permanente URL ist jetzt: `https://dev-temply.deinedomain.com`

---

## Schritt 3: Lokale Konfiguration (3 Minuten)

### 3.1 dev.sh bearbeiten

Öffne: `dev.sh`

Ändere:
```bash
TUNNEL_TOKEN="YOUR_CLOUDFLARE_TUNNEL_TOKEN_HERE"
```
Zu (füge deinen Token ein):
```bash
TUNNEL_TOKEN="eyJhIjoiXXXXXXX..."
```

Ändere:
```bash
APP_DOMAIN="YOUR_DOMAIN_HERE"
```
Zu (füge deine Domain ein):
```bash
APP_DOMAIN="dev-temply.deinedomain.com"
```

Speichere die Datei.

### 3.2 shopify.app.toml aktualisieren

Öffne: `shopify.app.toml`

Ersetze **ALLE** `YOUR_DOMAIN_HERE` mit deiner echten Domain:
- `application_url = "https://dev-temply.deinedomain.com"`
- In `redirect_urls` auch

Oder kopiere das Template:
```bash
cp shopify.app.toml.template shopify.app.toml
# Dann bearbeite shopify.app.toml und ersetze YOUR_DOMAIN_HERE
```

---

## Schritt 4: Shopify Partner Dashboard (2 Minuten)

1. Gehe zu: **https://partners.shopify.com/**
2. **Apps** → **Temply-dev-2** → **Configuration**
3. Aktualisiere:
   - **App URL**: `https://dev-temply.deinedomain.com`
   - **Allowed redirection URL(s)**:
     - `https://dev-temply.deinedomain.com/api/auth`
     - `https://dev-temply.deinedomain.com/auth/callback`
4. Klicke **Save**

---

## Schritt 5: Testen! (1 Minute)

```bash
./dev.sh
```

Das Script startet automatisch:
1. ✅ Cloudflare Tunnel
2. ✅ Shopify Dev-Server

Öffne: **https://dev-temply.deinedomain.com**

Die App sollte jetzt laden! 🎉

---

## Port anpassen (falls nötig)

Wenn der Shopify CLI einen anderen Port nutzt:

1. Schau im Terminal nach:
   ```
   React Router │   ➜  Local:   http://localhost:XXXXX/
   ```
2. Notiere den Port (z.B. `57099`)
3. Cloudflare Dashboard → Tunnel → Public Hostname → Bearbeiten
4. Ändere `localhost:3000` zu `localhost:XXXXX`
5. Save

---

## 🎯 Fertig!

Deine App läuft jetzt auf einer permanenten URL!

**Vorteile:**
- ✅ URL ändert sich nie mehr
- ✅ Keine Probleme mit wechselnden Tunnels
- ✅ Professionelle Domain
- ✅ Kostenlos

**Tägliche Nutzung:**

```bash
./dev.sh
```

Das war's! 🚀

---

## Probleme?

Siehe: `TUNNEL-SETUP.md` für detaillierte Troubleshooting-Hilfe.

---

**Erstellt**: 2025-11-15  
**Für**: Temply Dev App - Lokale Entwicklung

