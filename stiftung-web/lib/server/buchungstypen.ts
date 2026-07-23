// Journal-Typen (Spec §7). Die Richtung der Bewegung ist im Typ kodiert;
// betragCent ist immer >= 0.
export const BUCHUNGSTYPEN = [
  'spende',                    // Zuwendung A an Einrichtung: VK +, Anteilskauf
  'soli_spende',               // Zuwendung A an Soli: Soli-VK +
  'erstbefuellung',            // Soli → Einrichtungs-Depot (Spec §3.0)
  'direktausschuettung_eingang', // Zuwendung B: durchlaufender Posten auf VK (Spec §3.1)
  'auszahlungslauf',           // monatliche Sammel-Auszahlung: VK − (je Einrichtung eine Zeile)
  'sweep',                     // VK → ETF (Spec §3.2)
  'soli_sweep',                // Soli-VK → Soli-Depot
  'kurs_einrichtungsdepot',    // Marktsimulation: ETF-Marktwert-Delta (kein Geldfluss)
  'kurs_soli',                 // Marktsimulation: Soli-Depot-Delta
  'schliessung',               // Einrichtungs-Depot → Soli (Spec §3.3)
  'soli_konsolidierung',       // Soli-VK → Soli-Depot am Stichtag (Kaskaden-Vorbereitung)
  'kaskade_auffuellen',        // Schritt 2: ETF ↔ VK (betrag = |Differenz|, Richtung s. Kaskadenlauf)
  'kaskade_direktspende',      // Schritt 3: Auszahlung an Einrichtung
  'kaskade_abgabe',            // Schritt 4: Einr.-Depot → Soli
  'kaskade_management',        // Schritt 5: Soli ↔ Management (betrag = |Bewegung|)
  'kaskade_umverteilung',      // Schritt 6: Soli → Einr.-Depot
] as const;

export type Buchungstyp = (typeof BUCHUNGSTYPEN)[number];
