import docx
import sys
import os
from pathlib import Path

def konvertiere_docx_zu_md(docx_pfad, md_pfad):
    """
    Liest eine .docx-Datei und konvertiert ihren Inhalt (Überschriften,
    Absätze, Listen und Tabellen) in eine Markdown-Datei.
    """
    try:
        # Dokument laden
        doc = docx.Document(docx_pfad)
        md_inhalt = []

        print(f"  -> Verarbeite '{docx_pfad.name}'...")

        # Iteriere durch die Elemente des Dokuments (Absätze und Tabellen)
        for element in doc.element.body:
            if isinstance(element, docx.oxml.text.paragraph.CT_P):
                paragraph = docx.text.paragraph.Paragraph(element, doc)
                
                # Überschriften erkennen (Standard-Stile 'Heading 1' bis 'Heading 6')
                if paragraph.style.name.startswith('Heading'):
                    try:
                        level = int(paragraph.style.name.split(' ')[-1])
                        md_inhalt.append('#' * level + ' ' + paragraph.text)
                    except ValueError:
                        # Fallback für nicht-nummerierte Überschriften
                        md_inhalt.append('# ' + paragraph.text)
                
                # Listen erkennen (Standard-Stile 'List Bullet' und 'List Paragraph')
                elif paragraph.style.name.startswith('List'):
                    # Formatierten Text (fett/kursiv) extrahieren
                    list_item_text = ''
                    for run in paragraph.runs:
                        text = run.text
                        if run.bold:
                            text = f'**{text}**'
                        if run.italic:
                            text = f'*{text}*'
                    list_item_text += text

                    # Ungeordnete Liste
                    md_inhalt.append(f'* {list_item_text}')
                    
                # Normaler Absatz
                elif paragraph.text.strip():
                    # Formatierten Text (fett/kursiv) extrahieren
                    paragraph_text = ''
                    for run in paragraph.runs:
                        text = run.text
                        if run.bold:
                            text = f'**{text}**'
                        if run.italic:
                            text = f'*{text}*'
                        paragraph_text += text
                    md_inhalt.append(paragraph_text)
                
                # Fügt einen leeren Absatz hinzu für die korrekte Formatierung
                md_inhalt.append('')

            elif isinstance(element, docx.oxml.table.CT_Tbl):
                table = docx.table.Table(element, doc)
                
                # Tabellenkopf
                header_cells = [f"| {cell.text.strip()} " for cell in table.rows[0].cells]
                md_inhalt.append("".join(header_cells) + "|")

                # Trennlinie für den Tabellenkopf
                separator = ["|---"] * len(table.columns)
                md_inhalt.append("".join(separator) + "|")

                # Tabellenzeilen
                for row in table.rows[1:]:
                    row_cells = [f"| {cell.text.strip()} " for cell in row.cells]
                    md_inhalt.append("".join(row_cells) + "|")
                
                md_inhalt.append('')


        # Schreibe den konvertierten Inhalt in die .md-Datei
        with open(md_pfad, 'w', encoding='utf-8') as f:
            f.write('\n'.join(md_inhalt))
        print(f"  -> Erfolgreich gespeichert als '{md_pfad.name}'.")

    except Exception as e:
        print(f"Fehler bei der Verarbeitung von {docx_pfad.name}: {e}")


def main():
    """
    Hauptfunktion, die die Kommandozeilenargumente verarbeitet
    und die Konvertierung für alle .docx-Dateien im Ordner startet.
    """
    # Überprüfen, ob ein Ordnerpfad übergeben wurde
    if len(sys.argv) < 2:
        print("Fehler: Bitte gib einen Ordnerpfad als Argument an.")
        print("Beispiel: python konvertieren.py /pfad/zu/meinen/dokumenten")
        sys.exit(1)

    ordner_pfad = Path(sys.argv[1])

    # Überprüfen, ob der Pfad existiert und ein Ordner ist
    if not ordner_pfad.is_dir():
        print(f"Fehler: Der angegebene Pfad '{ordner_pfad}' ist kein gültiger Ordner.")
        sys.exit(1)

    print(f"Suche nach .docx-Dateien im Ordner: '{ordner_pfad}'...")

    # Alle .docx-Dateien im Ordner finden
    docx_dateien = list(ordner_pfad.glob('*.docx'))

    if not docx_dateien:
        print("Keine .docx-Dateien in diesem Ordner gefunden.")
        return

    # Jede gefundene Datei konvertieren
    for docx_datei in docx_dateien:
        # Den Zieldateinamen erstellen (.md anstelle von .docx)
        md_datei_pfad = docx_datei.with_suffix('.md')
        konvertiere_docx_zu_md(docx_datei, md_datei_pfad)

    print("\nKonvertierung abgeschlossen.")


if __name__ == '__main__':
    main()