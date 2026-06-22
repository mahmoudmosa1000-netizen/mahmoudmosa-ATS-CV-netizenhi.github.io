// ═══════════════════════════════════════════════════════════════
//  CV BUILDER — combined-pdf.js
//  Erstellt EIN PDF aus zwei Teilen:
//    Seite(n) 1–N: visuelles Design-CV (wie gewohnt, html2canvas)
//    Seite(n) N+1…: maschinenlesbare ATS-Textversion (pdf-lib),
//                    klar gekennzeichnet mit einem Hinweis-Label
//
//  Vorteil: Nutzer reichen nur EINE Datei ein — sieht für einen
//  Menschen gut aus UND ist für ein ATS vollständig auslesbar,
//  unabhängig davon, wie die Design-Seiten strukturiert sind.
// ═══════════════════════════════════════════════════════════════

async function downloadCombinedPDF() {
  await ensurePDFLib();

  const d = collectData();
  if (!d.name && !d.role && !d.exp?.length) {
    showToast('⚠ Bitte zuerst Daten eingeben.');
    return;
  }

  showToast('⏳ Kombiniertes PDF wird erstellt…');

  try {
    // ── SCHRITT 1: Visuelles Design-PDF generieren (Rohbytes) ──
    const designBytes = await generateDesignPDFBytes();

    // ── SCHRITT 2: In pdf-lib laden, um Seiten anzuhängen ──
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.load(designBytes);

    // ── SCHRITT 3: ATS-Textseiten anhängen (mit Hinweis-Label) ──
    await buildATSContentPages(doc, { appendLabel: true });

    // ── SCHRITT 4: Seitenzahlen über ALLE Seiten + Metadaten ──
    await addPageNumbers(doc);
    addATSMetadata(doc, d);

    // ── SCHRITT 5: Speichern & Download ──
    const filename = (d.name || 'Lebenslauf').replace(/\s+/g, '_') + '_CV.pdf';
    await savePDFDocAs(doc, filename);

    showToast('✓ CV erstellt — mit Design-Ansicht & ATS-Anhang in einer Datei!');

  } catch (err) {
    console.error('[Combined-PDF] Fehler:', err);
    showToast('❌ Fehler: ' + (err.message || String(err)));
  }
}
