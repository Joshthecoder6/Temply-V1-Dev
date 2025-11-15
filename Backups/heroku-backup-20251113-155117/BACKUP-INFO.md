# Heroku Production Backup

**Erstellt am:** 13. November 2025, 15:51:17 Uhr
**Heroku App:** temply-live

## 📦 Gesicherte Dateien:

### 1. Datenbank
- **heroku-production.dump** (12 KB)
  - PostgreSQL Datenbank Dump
  - Enthält alle Templates, Sessions, Settings, etc.

### 2. Konfigurationsdateien
- **shopify.app.production.toml** - Shopify App Konfiguration
- **schema.production.prisma** - Prisma Datenbank Schema
- **package.json** - Node.js Dependencies

## 🔄 Wiederherstellung

### Datenbank wiederherstellen:
```bash
# Lokal importieren (SQLite)
pg_restore -d your_database heroku-production.dump

# Auf Heroku wiederherstellen
heroku pg:backups:restore 'heroku-production.dump' DATABASE_URL --app temply-live
```

### Files wiederherstellen:
```bash
cp shopify.app.production.toml ../../
cp schema.production.prisma ../../prisma/
cp package.json ../../
```

## 📝 Hinweis:
Dieses Backup wurde erstellt, bevor das neue "Complete Product Page Bundle" Template in die Produktion eingefügt wurde.

