# App Embed Guide - Social Proof Notifications

## 🎯 Was ist ein App Embed?

Ein App Embed ist eine Theme App Extension, die einmal aktiviert wird und dann **automatisch auf allen Seiten** deines Shops erscheint. Im Gegensatz zu Sections, die manuell zu jeder Seite hinzugefügt werden müssen.

## ✨ Features des Social Proof Embeds

### 1. Trust Badge Bar
Zeigt Vertrauenssignale prominent auf allen Seiten an:
- ✅ Kostenloser Versand
- ✅ 30 Tage Rückgaberecht
- ✅ Sichere Zahlung
- ✅ TÜV-geprüft
- ... (beliebig anpassbar)

**Position:**
- Normal (im Content-Flow)
- Fixiert oben (bleibt beim Scrollen sichtbar)

### 2. Recent Sales Notifications
Popup-Benachrichtigungen, die Social Proof zeigen:
- "🎉 Sarah aus Berlin hat gerade gekauft"
- "👀 Michael aus München schaut sich dieses Produkt an"
- "⭐ Lisa aus Hamburg hat 5 Sterne gegeben"

**Konfigurierbar:**
- Position (links/rechts unten)
- Anzeigedauer (3-10 Sekunden)
- Intervall zwischen Notifications (10-60 Sekunden)
- Verzögerung beim ersten Laden
- Eigene Texte

## 🚀 Aktivierung

### Methode 1: Direkt-Link (Empfohlen)
1. Klicke im App-Dashboard auf **"App Embed aktivieren"**
2. Der Theme Editor öffnet sich mit dem App Embed bereits vorausgewählt
3. Aktiviere den Toggle-Switch
4. Passe die Einstellungen an

### Methode 2: Manuell
1. Öffne den Theme Editor
2. Klicke links unten auf **"App embeds"**
3. Finde **"Social Proof Embed"**
4. Aktiviere den Toggle-Switch

## ⚙️ Einstellungen

### Allgemein
- **App Embed aktivieren** - Master-Switch für das gesamte Embed

### Trust Badge Bar
| Einstellung | Beschreibung | Standard |
|------------|--------------|----------|
| Anzeigen | Trust Bar ein/ausschalten | Aus |
| Titel | Text vor den Badges | "Vertrauenswürdig:" |
| Badges | Kommagetrennte Liste | "Kostenloser Versand, ..." |
| Position | Normal oder fixiert oben | Normal |
| Hintergrund | Farbe | #f8f9fa |
| Textfarbe | Farbe | #333333 |
| Icon-Farbe | Checkmark-Farbe | #28a745 |
| Schriftgröße | 11-18px | 13px |
| Padding | 8-30px | 12px |

### Social Proof Notifications
| Einstellung | Beschreibung | Standard |
|------------|--------------|----------|
| Anzeigen | Notifications ein/aus | Ein |
| Text 1-3 | Notification-Texte | Demo-Texte |
| Position | Links/Rechts | Links |
| Abstand unten | 10-100px | 20px |
| Abstand Seite | 10-50px | 20px |
| Hintergrund | Farbe | #ffffff |
| Textfarbe | Farbe | #333333 |
| Icon-BG | Farbe | #28a745 |
| Border Radius | 0-20px | 8px |
| Anzeigedauer | 3-10s | 5s |
| Intervall | 10-60s | 15s |
| Verzögerung | 0-10s | 3s |

## 💡 Best Practices

### Trust Badge Bar
- ✅ Nutze 3-5 Badges (nicht zu viele)
- ✅ Kurze, prägnante Texte
- ✅ Relevante Vertrauenssignale für deine Zielgruppe
- ✅ Teste fixierte vs. normale Position
- ❌ Vermeide zu viele Farben

### Social Proof Notifications
- ✅ Realistische Zeitangaben ("vor 2 Minuten")
- ✅ Verschiedene Notification-Typen mischen
- ✅ Nicht zu aufdringlich (15-20s Intervall)
- ✅ Auf Mobile-Ansicht achten
- ❌ Nicht zu häufig zeigen (nervt Kunden)

## 🎨 Design-Tipps

### Trust Badge Bar Styles

**Minimalistisch:**
```
Hintergrund: #ffffff
Text: #1a1a1a
Icons: #000000
Position: Normal
```

**Auffällig:**
```
Hintergrund: #28a745
Text: #ffffff
Icons: #ffffff
Position: Fixiert oben
```

**Elegant:**
```
Hintergrund: #f8f9fa
Text: #333333
Icons: #28a745
Position: Normal
Border: Dünn
```

### Notification Styles

**Modern:**
```
Hintergrund: #ffffff
Text: #333333
Icon-BG: #28a745
Border Radius: 12px
Shadow: Mittel
```

**Minimalistisch:**
```
Hintergrund: #000000
Text: #ffffff
Icon-BG: #ffffff (mit schwarzem Icon)
Border Radius: 4px
```

## 🔧 Integration mit echten Daten

Aktuell verwendet das App Embed Demo-Daten. Um echte Daten zu integrieren:

### Schritt 1: API Endpoint erstellen
```typescript
// app/routes/api.recent-sales.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  
  // Lade letzte Orders von Shopify
  const orders = await admin.graphql(`
    query {
      orders(first: 10, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            createdAt
            customer {
              firstName
              defaultAddress {
                city
              }
            }
          }
        }
      }
    }
  `);
  
  return json(orders);
}
```

### Schritt 2: JavaScript im App Embed anpassen
```liquid
<script>
  fetch('/apps/proxy/recent-sales')
    .then(r => r.json())
    .then(data => {
      // Zeige echte Daten statt Demo-Daten
    });
</script>
```

### Schritt 3: App Proxy einrichten
In `shopify.app.toml`:
```toml
[app_proxy]
url = "https://your-app-url.com"
subpath = "apps"
prefix = "apps"
```

## 📱 Mobile Optimierung

Das App Embed ist bereits mobile-optimiert:
- Notifications passen sich der Bildschirmbreite an
- Trust Bar stapelt sich vertikal auf kleinen Screens
- Touch-freundliche Close-Buttons

## 🐛 Troubleshooting

### App Embed erscheint nicht
1. ✅ Ist das Embed aktiviert im Theme Editor?
2. ✅ Ist der Master-Switch "App Embed aktivieren" an?
3. ✅ Cache geleert / Inkognito-Modus testen

### Notifications zeigen nicht
1. ✅ Ist "Notifications anzeigen" aktiviert?
2. ✅ JavaScript-Fehler in der Browser-Console?
3. ✅ Warte die initiale Verzögerung ab (Standard: 3s)

### Trust Bar zu breit
1. Reduziere die Anzahl der Badges
2. Kürzere Texte verwenden
3. Kleinere Schriftgröße wählen

### Performance-Probleme
1. Erhöhe das Notification-Intervall
2. Reduziere die Anzahl der gleichzeitigen Effekte
3. Verwende einfachere Animationen

## 🚀 Erweiterte Features (Roadmap)

- [ ] A/B Testing für Notification-Texte
- [ ] Geo-Targeting (verschiedene Messages je nach Land)
- [ ] Zeitbasiertes Triggering (nur zu bestimmten Zeiten)
- [ ] Produktspezifische Notifications
- [ ] Analytics & Click-Tracking
- [ ] Customer Segmentierung
- [ ] Multi-Language Support
- [ ] Integration mit Review-Apps

---

**Viel Erfolg mit deinem Social Proof App Embed! 🎉**

Bei Fragen: siehe SETUP.md für weitere Informationen.

