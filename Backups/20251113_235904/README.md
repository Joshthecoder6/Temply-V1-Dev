# Temply Live App Backup

**Backup Created:** 2024-11-13 23:59:04

## Version Information
- **Heroku Version:** v66
- **Theme Extension Version:** v11
- **Commit:** 2155c2c - "Remove section warning banners and make app embed warning consistent across Dashboard and Funnels"

## Contents
- All application source files (app/, prisma/, public/, extensions/)
- Configuration files (shopify.app.production.toml, package.json, etc.)
- Database dump (database.dump)

## Restore Instructions

### Files:
Copy files from this backup directory to your project root.

### Database:
```bash
# Restore to local SQLite (development)
# This is a PostgreSQL dump, you'll need to convert or restore to a PostgreSQL instance

# Restore to Heroku
heroku pg:backups:restore 'path/to/database.dump' DATABASE_URL --app temply-live --confirm temply-live
```

## Notes
- This backup was created before implementing:
  1. Unified warning banners across Dashboard and Funnels
  2. Changed "Install Theme" to "Install Funnel" button text
