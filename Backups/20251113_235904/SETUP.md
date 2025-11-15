# Social Proof Sections - Setup Guide

## 🚀 Schnellstart

### 1. App starten

```bash
npm run dev
```

### 2. Theme Extension deployen

Die Theme Extension wird automatisch mit `npm run dev` geladen und ist im Theme Editor verfügbar.

## 📁 Projekt-Struktur

```
social-proof-sections/
├── app/
│   ├── routes/
│   │   ├── app._index.tsx      # Dashboard
│   │   ├── app.sections.tsx    # Sections-Verwaltung
│   │   ├── app.settings.tsx    # Einstellungen
│   │   └── app.tsx             # Layout mit Navigation
│   └── ...
├── extensions/
│   └── social-proof-theme/
│       ├── blocks/
│       │   ├── app-embed.liquid              # App Embed (Notifications)
│       │   └── featured-testimonials.liquid  # Testimonials Section
│       ├── locales/
│       │   ├── de.default.json
│       │   └── en.default.json
│       └── shopify.extension.toml
└── prisma/
    └── schema.prisma           # Datenbank-Schema
```

## 🎯 App Embed - Social Proof Notifications

Das App Embed wurde erstellt und zeigt automatisch auf allen Seiten:

### Features
- ✅ **Trust Badge Bar** - Zeigt Vertrauenssignale wie "Kostenloser Versand", "Sicherer Checkout" etc.
- ✅ **Recent Sales Notifications** - Popup-Benachrichtigungen über kürzliche Käufe
- ✅ Vollständig anpassbar (Farben, Position, Timing)
- ✅ Mobile-optimiert
- ✅ Konfigurierbares Intervall und Anzeigedauer

### Aktivierung

1. Klicke im Dashboard auf **"App Embed aktivieren"**
2. Im Theme Editor erscheint der **"App embeds"** Bereich
3. Aktiviere **"Social Proof Embed"**
4. Passe die Einstellungen an (Farben, Texte, Timing)

**Oder manuell:**
1. Öffne den Theme Editor
2. Klicke auf **"App embeds"** (links unten)
3. Aktiviere **"Social Proof Embed"**

## 🎨 Featured Testimonials Section

Die Section wurde erfolgreich erstellt und enthält:

### Features
- ✅ Testimonial-Blöcke mit Zitat, Autor und Position
- ✅ Sternebewertungen (1-5 Sterne)
- ✅ Vollständig anpassbar im Theme Editor
- ✅ Responsive Grid-Layout
- ✅ Hover-Effekte
- ✅ Deutsche Übersetzungen

### Anpassbare Einstellungen
- Überschrift & Unterüberschrift
- Farben (Hintergrund, Text, Sterne, etc.)
- Kartendesign (Rahmen, Radius, Abstände)
- Text-Ausrichtung
- Padding oben/unten

### Verwendung im Theme Editor

1. Klicke im Dashboard auf **"App Embed aktivieren"** oder **"Theme Editor öffnen"**
2. **Für App Embed:** Aktiviere unter "App embeds" das **"Social Proof Embed"**
3. **Für Testimonials Section:**
   - Navigiere zu einer beliebigen Seite
   - Klicke auf **"Add section"**
   - Wähle **"Featured Testimonials"** aus der Liste
   - Füge Testimonial-Blöcke hinzu und passe sie an

## 🗄️ Datenbank

### Modelle

**SocialProofSection**
- Speichert Social Proof Sections
- Tracking von Views, Clicks und Conversions
- Flexibles JSON-basiertes Content-System

**AppSettings**
- Globale App-Einstellungen pro Shop
- Anzeige-Konfiguration
- Animation und Position

### Migration ausführen

Die Migration wurde bereits ausgeführt. Bei Änderungen am Schema:

```bash
npx prisma migrate dev --name beschreibung_der_aenderung
```

## 🛠️ Nächste Schritte

1. **CRUD-Funktionen implementieren**
   - Sections erstellen, bearbeiten, löschen
   - Einstellungen speichern

2. **App Embed mit echten Daten verbinden**
   - Recent Sales von Shopify API laden
   - Live-Statistiken in Notifications anzeigen
   - Customer-Daten (anonymisiert) integrieren

3. **Weitere Section-Typen hinzufügen**
   - Product Reviews Carousel
   - Statistik-Zähler
   - Featured In (Presse-Logos)
   - Video Testimonials

4. **Analytics Dashboard**
   - Views und Conversions tracken
   - A/B Testing für verschiedene Texte
   - Grafiken und Charts hinzufügen

5. **Theme Extension erweitern**
   - App Blocks für flexible Platzierung
   - Mehr Animations-Optionen
   - Integration mit Shopify Reviews

## 📝 Entwicklungs-Tipps

### Theme Editor Link

Die App enthält einen Button zum direkten Öffnen des Theme Editors:

```tsx
<s-button
  href={`https://${shop}/admin/themes/current/editor?context=apps`}
  target="_blank"
>
  Theme Editor öffnen
</s-button>
```

### Debugging

- Shopify CLI logs: Terminal wo `npm run dev` läuft
- App logs: Browser DevTools Console
- GraphQL Playground: `https://{shop}/admin/api/graphql.json`

### Prisma Studio

Datenbank GUI zum Anschauen und Bearbeiten von Daten:

```bash
npx prisma studio
```

## 🔗 Nützliche Links

- [Shopify App Docs](https://shopify.dev/docs/apps)
- [Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Polaris Components](https://shopify.dev/docs/api/app-home/using-polaris-components)
- [Liquid Reference](https://shopify.dev/docs/api/liquid)
- [Prisma Docs](https://www.prisma.io/docs)

## 🐛 Troubleshooting

### Extension wird nicht im Theme Editor angezeigt

1. Stelle sicher, dass `npm run dev` läuft
2. Aktualisiere den Theme Editor
3. Prüfe die Extension-Logs im Terminal

### Datenbank-Fehler

```bash
# Datenbank zurücksetzen
npx prisma migrate reset

# Prisma Client neu generieren
npx prisma generate
```

### TypeScript-Fehler

```bash
# Type definitions aktualisieren
npm run typecheck
```

## 📦 Deployment

```bash
# App deployen
npm run deploy

# Extension deployen (wird automatisch mit der App deployed)
```

---

**Viel Erfolg mit deiner Social Proof Sections App! 🎉**

