# Project Rules: Deutsche Bildungsstiftung

**Letzte Aktualisierung:** Januar 2025

## 🎯 Grundprinzip
Diese Regeln stellen sicher, dass das Projekt konsistent, nachvollziehbar und gut dokumentiert entwickelt wird.

---

## 📋 Rule #1: Automatische Dokumentations-Updates
**Status:** ✅ AKTIV

### Regel
Bei jeder Code-Änderung durch den AI-Agent muss das `projekt-status.md` File mitaktualisiert werden - spätestens bei einem Git-Commit.

### Was aktualisiert werden muss:
- ✅ **Neue Features** → Status von "❌ TODO" zu "✅ Erledigt"
- ✅ **Architektur-Änderungen** → Technische Architektur Section
- ✅ **Dependencies** → Backend-Tools / Frontend-Updates
- ✅ **Roadmap** → Nächste Schritte entsprechend anpassen
- ✅ **Stand-Updates** → Versionsnummer, Datum, Meilensteine

### Umsetzung:
```bash
# Workflow bei jeder bedeutsamen Änderung:
1. Code-Änderungen durchführen
2. projekt-status.md entsprechend aktualisieren
3. Beide Dateien zusammen committen
4. Commit Message: "feat: [Feature] + update project status"
```

### Kontrolle:
- **AI Memory:** Regel ist im persistenten Memory gespeichert
- **Manual Check:** Bei jedem Commit prüfen
- **Future:** Git Hook für automatische Erinnerung

---

## 🔧 Weitere Rules (Bereit zur Aktivierung)

### Rule #2: Automatisches Deployment
**Status:** ✅ AKTIV

Nach jedem Git Commit muss automatisch ein Git Push ausgeführt werden, damit die Vercel Pipeline triggert und die Website direkt online aktualisiert wird.

**Workflow:**
```bash
1. git commit -m "message"
2. git push origin main  # Automatisch nach jedem Commit
3. Vercel Pipeline → Live Deployment
```

**Grund:** Direkte Integration mit Vercel CI/CD für sofortige Website-Updates.

### Rule #3: Git Commit Standards
```
feat: neue Feature
fix: Bugfix
docs: Dokumentation
style: Code-Formatierung
refactor: Code-Umstrukturierung
test: Tests hinzufügen
chore: Maintenance
```

### Rule #3: Code Review Prinzip
- Jede größere Änderung wird dokumentiert
- Breaking Changes werden im projekt-status.md vermerkt
- Transparenz bei allen Stiftungs-relevanten Features

### Rule #4: Backup & Sicherheit
- Sensitive Daten niemals in Git
- Regelmäßige Backups der Dokumentation
- GDPR-konforme Datenhandhabung

---

## 🚀 Aktivierungsstatus

| Rule | Status | Aktiviert seit | Methode |
|------|--------|---------------|---------|
| #1: Auto-Updates | ✅ AKTIV | Januar 2025 | AI Memory + Manual |
| #2: Auto-Push | ✅ AKTIV | Januar 2025 | AI Memory + Manual |
| #3: Git Standards | 🟡 BEREIT | - | - |
| #4: Code Review | 🟡 BEREIT | - | - |
| #5: Sicherheit | 🟡 BEREIT | - | - |

---

**Nächste Schritte zur vollständigen Aktivierung:**
1. ✅ Memory-System (erledigt)
2. ✅ Dokumentation (erledigt)  
3. ⏳ Git Hooks einrichten
4. ⏳ CI/CD Pipeline für Checks
5. ⏳ Weitere Rules nach Bedarf aktivieren 