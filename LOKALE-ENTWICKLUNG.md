# 💻 Lokale Entwicklung - Temply App

**Erstellt:** 2025-11-15  
**Modus:** Nur lokale Entwicklung  
**Production:** Geschützt und unangetastet

---

## 🔒 Production Schutz

Die Live-Version ist komplett geschützt:

- ✅ Heroku Remote umbenannt: `heroku-live-NICHT-ANFASSEN`
- ✅ Production Configs gesichert in: `production-configs-NICHT-ANFASSEN/`
- ✅ Kein versehentliches Pushen möglich
- ✅ Komplettes Backup erstellt: `production-backup-20251115-134532/`

### ⚠️ WICHTIG:
**NIEMALS** zur Production pushen ohne explizite Freigabe!

---

## 🚀 Lokale Entwicklung starten

### 1. Lokalen Dev-Server starten:

```bash
# Shopify CLI Dev-Server (empfohlen)
shopify app dev

# Oder direkt mit npm
npm run dev
```

### 2. App-Konfiguration:

- **Config:** `shopify.app.toml` 
- **Client ID:** 5bc41dbb1e7083796b65b705882a9d55
- **App Name:** Temply-dev-2
- **Tunnel:** Cloudflare (automatisch)

### 3. Datenbank:

- **Typ:** SQLite (lokal)
- **Datei:** `prisma/dev.sqlite`
- **Schema:** `prisma/schema.prisma`

```bash
# Prisma Client neu generieren
npx prisma generate

# Migrationen anwenden
npx prisma migrate deploy

# Datenbank seeden (Templates laden)
npm run db:seed
```

---

## 📁 Projekt-Struktur

```
├── app/                          # React Router App
│   ├── routes/                   # App Routes
│   │   ├── app._index.tsx       # Dashboard
│   │   ├── app.funnels.tsx      # Funnel/Template Manager
│   │   └── app.help.tsx         # Hilfe-Seite
│   ├── lib/                     # Server-Side Libraries
│   └── shopify.server.ts        # Shopify API
│
├── prisma/                       # Datenbank
│   ├── schema.prisma            # SQLite Schema (DEV)
│   ├── schema.production.prisma # PostgreSQL Schema (PRODUCTION)
│   ├── migrations/              # DB Migrations
│   └── templates/               # Liquid Templates
│
├── extensions/                   # Shopify Theme Extensions
│   └── social-proof-sections/
│       └── blocks/              # Liquid Blocks
│
├── production-configs-NICHT-ANFASSEN/  # ⚠️ PRODUCTION FILES
└── production-backup-*/         # Backups
```

---

## 🛠️ Nützliche Befehle

### Entwicklung:
```bash
shopify app dev              # Dev-Server starten
npm run dev                  # Alternative
```

### Datenbank:
```bash
npx prisma studio            # Datenbank GUI öffnen
npx prisma generate          # Client generieren
npx prisma migrate dev       # Neue Migration erstellen
npm run db:seed              # Templates laden
```

### Code:
```bash
npm run typecheck            # TypeScript prüfen
npm run lint                 # ESLint ausführen
npm run build                # Production Build
```

---

## 🔗 URLs & Links

### Lokal:
- **App:** https://<cloudflare-tunnel>.trycloudflare.com
- **Dev Store:** josh-app-test-2.myshopify.com

### Production (NICHT ANFASSEN):
- **Heroku:** https://temply-live.herokuapp.com
- **GitHub Backup:** https://github.com/Joshthecoder6/Temply-Live

---

## 📝 Entwicklungs-Workflow

1. **Feature entwickeln:**
   ```bash
   # Lokalen Dev-Server starten
   shopify app dev
   
   # Code ändern in app/, extensions/, etc.
   # Hot-Reload läuft automatisch
   ```

2. **Datenbank ändern:**
   ```bash
   # Schema in prisma/schema.prisma anpassen
   
   # Migration erstellen
   npx prisma migrate dev --name feature_name
   
   # Client neu generieren
   npx prisma generate
   ```

3. **Testen:**
   - Öffne den Cloudflare-Tunnel Link
   - Login mit josh-app-test-2 Store
   - Features testen

4. **Committen:**
   ```bash
   git add .
   git commit -m "Feature: Beschreibung"
   ```

---

## ⚠️ WICHTIGE HINWEISE

### ❌ NICHT TUN:
- Zur Production deployen ohne Freigabe
- `heroku-live-NICHT-ANFASSEN` Remote verwenden
- Production Configs bearbeiten
- Live-Datenbank anfassen

### ✅ IMMER TUN:
- Lokal entwickeln und testen
- Änderungen committen
- Bei Fragen fragen!

---

## 🆘 Troubleshooting

### Problem: "Database locked"
```bash
# Alle Node-Prozesse beenden
pkill node

# Neu starten
shopify app dev
```

### Problem: "Prisma Client out of sync"
```bash
npx prisma generate
```

### Problem: Tunnel-Fehler
```bash
# Shopify CLI neu starten
shopify app dev
# Neue Tunnel-URL wird automatisch generiert
```

---

**Happy Coding! 🚀**

*Letzte Aktualisierung: 2025-11-15*

