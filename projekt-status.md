# Projekt Status: Deutsche Bildungsstiftung Website

**Stand:** 2025-01-24 | **Version:** Demo V3.2 (Precision Calculator + Debug-Fix)
**Repository:** https://github.com/tobias-de-taillez/stiftung  
**Live Demo:** https://stiftung.vercel.app

---

## 🎯 **Mission & Kernkonzept**

Die Deutsche Bildungsstiftung schafft **finanzielle Unabhängigkeit** für Bildungseinrichtungen durch nachhaltigen Kapitalaufbau. 

**Finanzmodell:**
- 7% Brutto-Rendite (ETF-basiert)
- 1% jährliche Ausschüttung  
- 6% Netto-Wachstumsrate
- **Formel:** Benötigtes Kapital = Gewünschter Jahresbetrag / 0.01

---

## 🏗️ **Technische Architektur (Aktueller Stand)**

### **Frontend (Vanilla Stack)**
- **HTML5** mit semantischen Tags & Schema.org Markup
- **CSS3** mit CSS Variables & Responsive Design  
- **Vanilla JavaScript (ES6+)** - Single Page Application
- **PWA-Features:** Service Worker, Manifest, Offline-Fähigkeit

### **Deployment & CI/CD**
- **Hosting:** Vercel (automatisches Deployment)
- **Workflow:** Git Push → Vercel Pipeline → Live Update
- **Domain:** https://stiftung.vercel.app

### **Performance-Optimierungen**
- ✅ Critical CSS Inline + External CSS
- ✅ Resource Preloading  
- ✅ Service Worker Caching
- ✅ Semantisches HTML für SEO
- ✅ Accessibility (ARIA, Keyboard Navigation)

---

## 🧮 **Spendenrechner-Evolution**

### **V3.2 - Float Precision Calculator (AKTUELL)**
- ✅ **Mathematische Präzision:** Logarithmische Formel statt Integer-Jahre
- ✅ **Flexible Spendenfrequenz:** Einmalig/Monatlich/Jährlich  
- ✅ **Präzise Zeitanzeige:** "2 Jahre und 3 Monate" statt Approximationen
- ✅ **Debug-System:** Umfassendes Logging und Auto-Reparatur
- ✅ **URL-Navigation-Fix:** Direkter Aufruf von School-Detail-Seiten

### **Berechnungslogik:**
```javascript
// Baseline ohne Spenden: ln(FV/PV) / ln(1+i)
// Mit Spenden: Simulation mit float-Jahren
// Zeitformat: Jahre → Monate → Tage Konvertierung
```

---

## 🔧 **Aktuelle Bug-Fixes (V3.2)**

### **Problem:** Dropdown-Selektor fehlte bei direkter Navigation
- **Ursache:** `showSchoolDetail()` wurde nicht aufgerufen bei URL-Navigation
- **Lösung:** Auto-Load beim Hash-Change + Diagnostic-System
- **Status:** ✅ **Behoben** (2025-01-24)

### **Problem:** Ungenaue Zeitberechnungen  
- **Ursache:** Integer-Jahre statt float-basierte Mathematik
- **Lösung:** Logarithmische Baseline + präzise Konvertierung
- **Status:** ✅ **Behoben** (2025-01-24)

---

## 📊 **Demo-Schulen (6 Test-Einrichtungen)**

| Schule | Stadt | Schüler | Aktueller Fonds | Ziel-Kapital |
|--------|-------|---------|-----------------|--------------|
| Grundschule Sonnenhügel | Berlin | 250 | €50.000 | €250.000 |
| Gymnasium Neustadt | Hamburg | 800 | €450.000 | €1.200.000 |
| Kita Wirbelwind | München | 60 | €15.000 | €120.000 |
| Realschule am Fluss | Köln | 450 | €120.000 | €450.000 |
| Gesamtschule Westend | Dortmund | 1.200 | €300.000 | €600.000 |
| Förderschule Pestalozzi | Bremen | 90 | €80.000 | €225.000 |

---

## 🚀 **Nächste Entwicklungsschritte**

### **Kurzfristig (Q1 2025)**
- [ ] **Backend-Integration:** Node.js/Express für echte Datenbank
- [ ] **Payment-System:** Stripe/PayPal Integration für echte Spenden
- [ ] **Admin-Dashboard:** Schul-Verwaltung und Fonds-Tracking
- [ ] **Email-System:** Spenden-Bestätigungen und Updates

### **Mittelfristig (Q2 2025)**  
- [ ] **User-Accounts:** Spender-Profile und Donation-History
- [ ] **Advanced Analytics:** Detaillierte Fortschritts-Visualisierungen
- [ ] **Multi-Sprachen:** English/Französisch für internationale Expansion
- [ ] **Mobile App:** React Native für iOS/Android

### **Langfristig (Q3-Q4 2025)**
- [ ] **KI-Integration:** Personalisierte Spenden-Empfehlungen
- [ ] **Blockchain:** Transparente Fonds-Verfolgung
- [ ] **API-Ecosystem:** Partner-Integration für Schulverwaltungs-Software

---

## 🛠️ **Backend-Tools (Geplant)**

- **Runtime:** Node.js 18+ mit Express.js
- **Datenbank:** PostgreSQL mit Prisma ORM  
- **Authentication:** Auth0 oder Firebase Auth
- **Payments:** Stripe für sichere Zahlungsabwicklung
- **Email:** SendGrid für automatisierte Kommunikation
- **Monitoring:** Sentry für Error-Tracking
- **Analytics:** Mixpanel für User-Behavior Tracking

---

## 📚 **Dokumentation & Literatur**

Das Projekt basiert auf wissenschaftlicher Forschung zu:
- Return on Investment in frühkindlicher Bildung
- Nachhaltigen Finanzierungsmodellen für Bildungseinrichtungen  
- ETF-basierten Stiftungsstrategien

**Relevante Studien:** Siehe `/literatur/` Ordner

---

## 🔄 **Automatisierte Workflows**

### **Rule #1:** Dokumentations-Updates
Bei jeder Code-Änderung wird diese `projekt-status.md` automatisch mitaktualisiert.

### **Rule #2:** Kontinuierliches Deployment  
```bash
git commit -m "message" 
git push origin main  # → Vercel Deployment triggert automatisch
```

---

## 📈 **Erfolgs-Metriken (Demo-Phase)**

- ✅ **Website Performance:** 95+ Lighthouse Score
- ✅ **Accessibility:** WCAG 2.1 AA konform
- ✅ **SEO:** Vollständiges Schema.org Markup
- ✅ **PWA:** Installierbar, Offline-fähig
- ✅ **Browser Support:** Chrome, Firefox, Safari, Edge
- ✅ **Mobile Optimierung:** Responsive auf allen Geräten

---

**Letztes Update:** 2025-01-24 16:30 CET | **Nächster Review:** 2025-02-01 