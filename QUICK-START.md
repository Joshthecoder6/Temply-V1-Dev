# ⚡ Quick Start - Permanenter Tunnel

**Problem gelöst**: Keine wechselnden Tunnel-URLs mehr! Keine weißen Seiten mehr!

---

## 🎯 Was du bekommst

Eine **permanente URL** für deine Shopify App:
- Beispiel: `https://dev-temply.deinedomain.com`
- Ändert sich **NIE** mehr
- Funktioniert **immer**
- **Kostenlos** mit deinem Cloudflare Account

---

## 📋 Was du brauchst

- ✅ Cloudflare Account mit eigener Domain (hast du bereits!)
- ⏱️ 10-15 Minuten Zeit
- ☕ Einen Kaffee (optional)

---

## 🚀 Setup in 5 Schritten

### 1. cloudflared installieren

```bash
brew install cloudflared
```

### 2. Tunnel erstellen

1. Gehe zu: https://one.dash.cloudflare.com/
2. **Access** → **Tunnels** → **Create a tunnel**
3. Name: `temply-dev`
4. Kopiere den Token
5. **Public Hostname** einrichten:
   - Subdomain: `dev-temply`
   - Domain: Deine Domain auswählen
   - Type: `HTTP`
   - URL: `localhost:3000`

### 3. Lokale Config

**Bearbeite `dev.sh`:**
```bash
TUNNEL_TOKEN="dein-token-hier"
APP_DOMAIN="dev-temply.deinedomain.com"
```

**Bearbeite `shopify.app.toml`:**
Ersetze alle `YOUR_DOMAIN_HERE` mit deiner Domain.

### 4. Shopify Partner Dashboard

https://partners.shopify.com/ → Apps → Temply-dev-2 → Configuration

Setze überall deine neue Domain ein.

### 5. Starten!

```bash
./dev.sh
```

✅ **Fertig!** Die App läuft auf `https://dev-temply.deinedomain.com`

---

## 📚 Mehr Details?

- **Schritt-für-Schritt**: Siehe `SETUP-ANLEITUNG.md`
- **Detailliert**: Siehe `TUNNEL-SETUP.md`
- **Probleme**: Siehe Troubleshooting in `TUNNEL-SETUP.md`

---

## 💡 Tägliche Verwendung

```bash
./dev.sh
```

Das war's! Der Tunnel + Dev-Server starten automatisch.

---

## 🆘 Schnelle Hilfe

### App lädt nicht?

```bash
# 1. Prüfe ob Tunnel läuft
ps aux | grep cloudflared

# 2. Prüfe den Port im Terminal
# Wenn anders als 3000: Cloudflare Dashboard → Port anpassen

# 3. Cache löschen & neu starten
rm -rf .shopify
./dev.sh
```

### Token vergessen?

Cloudflare Dashboard → Tunnels → dein Tunnel → Configure → Erneut anzeigen

### Falsche Domain?

Bearbeite:
1. `dev.sh` → `APP_DOMAIN`
2. `shopify.app.toml` → alle URLs
3. Shopify Partner Dashboard → App URLs

---

**Das war's!** Viel Erfolg! 🎉

Bei Fragen: Siehe detaillierte Dokumentation oder frage nach!

