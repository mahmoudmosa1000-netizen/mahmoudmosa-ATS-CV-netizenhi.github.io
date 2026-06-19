// ═══════════════════════════════════════════════════════════════
//  CV BUILDER — ats-pdf.js
//  Erstellt ein maschinenlesbares, ATS-kompatibles Text-PDF
//  Bibliothek: pdf-lib (kein html2canvas, kein Bild-Rendering)
//  ATS-Regeln:
//    ✓ Reiner Text, keine Grafiken
//    ✓ Einspaltiges Layout
//    ✓ Standardisierte Abschnittsüberschriften
//    ✓ Lesbare Schrift (Helvetica, 9.5–20pt)
//    ✓ Seitenzahlen
//    ✓ Skill-Level als Text, nicht als Balken
//    ✓ Mehrsprachige Abschnittstitel (DE/EN/AR)
// ═══════════════════════════════════════════════════════════════

async function downloadATSPDF() {

  // ── GUARD: pdf-lib lazy laden falls noch nicht vorhanden ──
  if (typeof PDFLib === 'undefined') {
    showToast('⏳ PDF-Bibliothek wird geladen…');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      s.onload  = resolve;
      s.onerror = () => reject(new Error('pdf-lib konnte nicht geladen werden'));
      document.head.appendChild(s);
    });
  }

  const d = collectData();
  if (!d.name && !d.role && !d.exp?.length) {
    showToast('⚠ Bitte zuerst Daten eingeben.');
    return;
  }

  showToast('⏳ ATS-PDF wird erstellt…');

  try {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;

    // ── DOKUMENT ERSTELLEN ───────────────────────
    const doc      = await PDFDocument.create();
    const fontReg  = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // ── SEITEN-KONSTANTEN (A4) ───────────────────
    const PW     = 595.28;   // Seitenbreite in pt
    const PH     = 841.89;   // Seitenhöhe in pt
    const ML     = 52;       // Linker Rand
    const MR     = 52;       // Rechter Rand
    const MT     = 55;       // Oberer Rand
    const MB     = 45;       // Unterer Rand
    const CW     = PW - ML - MR; // Nutzbare Breite

    // ── SCHRIFTGRÖSSEN ──────────────────────────
    const FS = {
      name:    20,
      role:    11.5,
      contact: 9,
      section: 9.5,
      body:    9.5,
      small:   8.5,
    };

    // ── ZEILENABSTÄNDE ──────────────────────────
    const LH = {
      name:       26,
      role:       15,
      contact:    12,
      section:    14,
      body:       13,
      bodySmall:  11.5,
    };

    // ── FARBEN ──────────────────────────────────
    const C = {
      black:   rgb(0.07, 0.07, 0.07),
      dark:    rgb(0.15, 0.15, 0.15),
      gray:    rgb(0.38, 0.38, 0.38),
      light:   rgb(0.55, 0.55, 0.55),
      rule:    rgb(0.25, 0.25, 0.25),
      ruleLight: rgb(0.70, 0.70, 0.70),
    };

    // ── ZUSTAND ─────────────────────────────────
    let page = doc.addPage([PW, PH]);
    let y    = PH - MT;

    // ── SPRACHLABELS ────────────────────────────
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'de';
    const L = {
      de: {
        profile:    'PROFIL',
        goal:       'BERUFLICHES ZIEL',
        experience: 'BERUFSERFAHRUNG',
        education:  'AUSBILDUNG & BILDUNG',
        skills:     'TECHNISCHE KENNTNISSE',
        languages:  'SPRACHKENNTNISSE',
        komps:      'KOMPETENZEN',
        certs:      'ZERTIFIKATE & KURSE',
        projects:   'PROJEKTE',
        extraquals: 'WEITERE QUALIFIKATIONEN',
        hobbies:    'INTERESSEN & HOBBYS',
        license:    'FÜHRERSCHEIN',
        refs:       'REFERENZEN',
        lvl: { native:'Muttersprache', advanced:'Fortgeschritten (C1-C2)', intermediate:'Mittelstufe (B1-B2)', basic:'Grundkenntnisse (A1-A2)' },
        skillLvl: { expert:'Experte', advanced:'Fortgeschritten', intermediate:'Grundkenntnisse', beginner:'Einsteiger' },
        licLabel:   'Klassen',
      },
      en: {
        profile:    'PROFILE SUMMARY',
        goal:       'CAREER OBJECTIVE',
        experience: 'WORK EXPERIENCE',
        education:  'EDUCATION',
        skills:     'TECHNICAL SKILLS',
        languages:  'LANGUAGES',
        komps:      'COMPETENCIES',
        certs:      'CERTIFICATIONS',
        projects:   'PROJECTS',
        extraquals: 'ADDITIONAL QUALIFICATIONS',
        hobbies:    'INTERESTS & HOBBIES',
        license:    "DRIVER'S LICENSE",
        refs:       'REFERENCES',
        lvl: { native:'Native', advanced:'Advanced (C1-C2)', intermediate:'Intermediate (B1-B2)', basic:'Basic (A1-A2)' },
        skillLvl: { expert:'Expert', advanced:'Advanced', intermediate:'Intermediate', beginner:'Beginner' },
        licLabel:   'Classes',
      },
      ar: {
        profile:    'الملف الشخصي',
        goal:       'الهدف المهني',
        experience: 'الخبرة العملية',
        education:  'التعليم والتدريب',
        skills:     'المهارات التقنية',
        languages:  'اللغات',
        komps:      'الكفاءات',
        certs:      'الشهادات والدورات',
        projects:   'المشاريع',
        extraquals: 'مؤهلات إضافية',
        hobbies:    'الاهتمامات والهوايات',
        license:    'رخصة القيادة',
        refs:       'المراجع',
        lvl: { native:'اللغة الأم', advanced:'متقدم (C1-C2)', intermediate:'متوسط (B1-B2)', basic:'مبتدئ (A1-A2)' },
        skillLvl: { expert:'خبير', advanced:'متقدم', intermediate:'متوسط', beginner:'مبتدئ' },
        licLabel:   'الفئات',
      },
    };
    const lbl = L[lang] || L.de;

    // ── HELPERS ──────────────────────────────────

    /** Bereinigt Text für Latin-1-Encoding von pdf-lib */
    function san(str) {
      if (!str) return '';
      return String(str)
        .replace(/[\u2018\u2019\u02BC]/g, "'")
        .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '--')
        .replace(/\u2022/g, '*')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        // Behalte alle Latin-1 Supplement Zeichen (ä,ö,ü,ß etc.)
        .replace(/[^\x00-\xFF]/g, '?');
    }

    /** Zeilenumbruch berechnen */
    function wrap(text, font, size, maxW) {
      const clean = san(text);
      if (!clean) return [];
      const lines = [];
      for (const rawLine of clean.split('\n')) {
        const words = rawLine.split(' ').filter(w => w !== '');
        if (!words.length) { lines.push(''); continue; }
        let cur = '';
        for (const word of words) {
          const test = cur ? cur + ' ' + word : word;
          try {
            if (font.widthOfTextAtSize(test, size) > maxW && cur) {
              lines.push(cur); cur = word;
            } else { cur = test; }
          } catch { cur = test; }
        }
        if (cur) lines.push(cur);
      }
      return lines;
    }

    /** Neue Seite bei Bedarf */
    function checkSpace(needed = LH.body) {
      if (y - needed < MB) {
        page = doc.addPage([PW, PH]);
        y    = PH - MT;
      }
    }

    /** Einzelne Textzeile zeichnen (ohne y zu verschieben) */
    function draw(text, x, yPos, font, size, color) {
      const s = san(text);
      if (!s) return;
      try {
        page.drawText(s, { x, y: yPos, font, size, color });
      } catch (e) {
        // Fallback: Zeichen die nicht encodierbar sind, durch ? ersetzen
        const safe = s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
        if (safe) page.drawText(safe, { x, y: yPos, font, size, color });
      }
    }

    /** Trennlinie */
    function rule(thickness = 0.6, color = C.rule) {
      page.drawLine({
        start: { x: ML, y: y + 3 },
        end:   { x: PW - MR, y: y + 3 },
        thickness, color,
      });
    }

    /** Abschnittsüberschrift */
    function sectionHeader(title) {
      y -= 10;
      checkSpace(LH.section + 12);
      draw(san(title), ML, y, fontBold, FS.section, C.dark);
      y -= (LH.section - 2);
      rule(0.75, C.rule);
      y -= 7;
    }

    /** Absatz mit Zeilenumbruch */
    function paragraph(text, { xOff = 0, indentExtra = 0, font = fontReg, size = FS.body, color = C.gray, lh = LH.body } = {}) {
      if (!text) return;
      const rawLines = san(text).split('\n');
      for (const rawLine of rawLines) {
        const trimmed = rawLine.trim();
        if (!trimmed) { y -= lh * 0.4; continue; }

        // Bullet-Erkennung
        const isBullet = /^[•\-\*]/.test(trimmed);
        let displayText = isBullet
          ? '• ' + trimmed.replace(/^[•\-\*]\s*/, '')
          : trimmed;

        const xBase = ML + xOff;
        const bulletIndent = isBullet ? 10 : 0;
        const availW = CW - xOff - indentExtra;
        const wrapped = wrap(displayText, font, size, availW);

        wrapped.forEach((line, i) => {
          checkSpace(lh + 2);
          const xPos = i === 0 ? xBase : xBase + bulletIndent + 2;
          draw(line, xPos, y, font, size, color);
          y -= lh;
        });
      }
    }

    /** Job/Edu-Kopfzeile: Fett links, Datum rechts */
    function entryHeader(leftText, rightText, boldFont = fontBold, regFont = fontReg) {
      checkSpace(LH.body + 4);
      draw(san(leftText), ML, y, boldFont, FS.body, C.black);
      if (rightText) {
        const rw = regFont.widthOfTextAtSize(san(rightText), FS.small);
        draw(san(rightText), PW - MR - rw, y, regFont, FS.small, C.light);
      }
      y -= (LH.body + 2);
    }

    // ────────────────────────────────────────────────
    // ── INHALT: KOPF-BEREICH ────────────────────────
    // ────────────────────────────────────────────────

    // Name
    if (d.name) {
      checkSpace(LH.name);
      draw(san(d.name), ML, y, fontBold, FS.name, C.black);
      y -= LH.name;
    }

    // Berufsbezeichnung
    if (d.role) {
      checkSpace(LH.role);
      draw(san(d.role), ML, y, fontReg, FS.role, C.gray);
      y -= LH.role;
    }

    // Kontaktzeile 1: E-Mail | Telefon | Adresse | Geburtsdatum
    const contactLine1 = [d.email, d.phone, d.address, d.birth ? `geb. ${d.birth}` : '']
      .filter(Boolean).join('   |   ');
    if (contactLine1) {
      checkSpace(LH.contact);
      draw(san(contactLine1), ML, y, fontReg, FS.contact, C.gray);
      y -= LH.contact;
    }

    // Kontaktzeile 2: Website | LinkedIn
    const webDisplay = d.web ? (d.webLabel && d.webLabel !== 'Website' ? `${d.webLabel}: ${d.web}` : d.web) : '';
    const liDisplay  = d.linkedin ? `LinkedIn: ${san(d.linkedin).replace('https://','').replace('www.','')}` : '';
    const contactLine2 = [webDisplay, liDisplay].filter(Boolean).join('   |   ');
    if (contactLine2) {
      checkSpace(LH.contact);
      draw(san(contactLine2), ML, y, fontReg, FS.contact, C.gray);
      y -= LH.contact;
    }

    // Trennlinie nach Kopf
    y -= 5;
    rule(1.0, C.rule);
    y -= 10;

    // ────────────────────────────────────────────────
    // ── PROFIL ──────────────────────────────────────
    // ────────────────────────────────────────────────
    if (d.summary) {
      sectionHeader(lbl.profile);
      paragraph(d.summary, { color: C.dark, lh: LH.body });
    }

    if (d.goal) {
      sectionHeader(lbl.goal);
      paragraph(d.goal, { color: C.dark });
    }

    // ────────────────────────────────────────────────
    // ── BERUFSERFAHRUNG ─────────────────────────────
    // ────────────────────────────────────────────────
    if (d.exp && d.exp.length > 0) {
      sectionHeader(lbl.experience);
      d.exp.forEach((e, i) => {
        if (i > 0) y -= 7;
        const title = [e.title, e.company].filter(Boolean).join(' | ');
        const dates = [e.from, e.to].filter(Boolean).join(' – ');
        entryHeader(title, dates);
        if (e.desc) paragraph(e.desc, { xOff: 0, color: C.gray });
      });
    }

    // ────────────────────────────────────────────────
    // ── AUSBILDUNG ──────────────────────────────────
    // ────────────────────────────────────────────────
    if (d.edu && d.edu.length > 0) {
      sectionHeader(lbl.education);
      d.edu.forEach((e, i) => {
        if (i > 0) y -= 5;
        const title = [e.degree, e.school].filter(Boolean).join(' | ');
        const dates = [e.from, e.to].filter(Boolean).join(' – ');
        entryHeader(title, dates);
      });
    }

    // ────────────────────────────────────────────────
    // ── TECHNISCHE SKILLS ───────────────────────────
    // ────────────────────────────────────────────────
    if (d.skills && d.skills.length > 0) {
      sectionHeader(lbl.skills);
      const skillLines = d.skills.map(s => {
        const pct = parseInt(s.pct || 50);
        const lvlKey = pct >= 85 ? 'expert'
                     : pct >= 65 ? 'advanced'
                     : pct >= 40 ? 'intermediate'
                     :             'beginner';
        return `${san(s.name)} (${lbl.skillLvl[lvlKey]})`;
      });
      // In Gruppen zu 3 nebeneinander für Lesbarkeit
      const cols = 3;
      for (let row = 0; row < skillLines.length; row += cols) {
        checkSpace(LH.body + 2);
        const group = skillLines.slice(row, row + cols);
        const colW = CW / cols;
        group.forEach((skill, col) => {
          draw(skill, ML + col * colW, y, fontReg, FS.body, C.dark);
        });
        y -= LH.body + 1;
      }
      y -= 2;
    }

    // ────────────────────────────────────────────────
    // ── SPRACHEN ────────────────────────────────────
    // ────────────────────────────────────────────────
    if (d.langs && d.langs.length > 0) {
      sectionHeader(lbl.languages);
      d.langs.forEach(l => {
        checkSpace(LH.body + 2);
        const levelText = lbl.lvl[l.lvl] || l.lvl || '';
        const nameW = fontBold.widthOfTextAtSize(san(l.name), FS.body);
        draw(san(l.name), ML, y, fontBold, FS.body, C.dark);
        if (levelText) {
          draw(' – ' + san(levelText), ML + nameW, y, fontReg, FS.body, C.gray);
        }
        y -= LH.body + 2;
      });
    }

    // ────────────────────────────────────────────────
    // ── KOMPETENZEN ─────────────────────────────────
    // ────────────────────────────────────────────────
    if (d.komps) {
      sectionHeader(lbl.komps);
      paragraph(d.komps, { color: C.dark });
    }

    // ────────────────────────────────────────────────
    // ── ZERTIFIKATE ─────────────────────────────────
    // ────────────────────────────────────────────────
    if (d.certs && d.certs.length > 0) {
      sectionHeader(lbl.certs);
      d.certs.forEach((c, i) => {
        if (i > 0) y -= 4;
        const left = [c.title, c.issuer].filter(Boolean).join(' – ');
        entryHeader(left, c.date);
        if (c.url) {
          checkSpace(LH.bodySmall + 2);
          draw(san(c.url), ML + 8, y, fontReg, FS.small, C.light);
          y -= LH.bodySmall;
        }
      });
    }

    // ────────────────────────────────────────────────
    // ── PROJEKTE ────────────────────────────────────
    // ────────────────────────────────────────────────
    if (d.projects && d.projects.length > 0) {
      sectionHeader(lbl.projects);
      d.projects.forEach((p, i) => {
        if (i > 0) y -= 7;
        const dates = [p.from, p.to].filter(Boolean).join(' – ');
        entryHeader(san(p.title || ''), dates);
        if (p.url) {
          checkSpace(LH.bodySmall + 2);
          draw(san(p.url), ML + 8, y, fontReg, FS.small, C.light);
          y -= LH.bodySmall;
        }
        if (p.desc) paragraph(p.desc, { color: C.gray });
      });
    }

    // ────────────────────────────────────────────────
    // ── WEITERE QUALIFIKATIONEN ─────────────────────
    // ────────────────────────────────────────────────
    if (d.extraquals && d.extraquals.length > 0) {
      sectionHeader(lbl.extraquals);
      d.extraquals.forEach((e, i) => {
        if (i > 0) y -= 3;
        checkSpace(LH.body + 2);
        draw(san(e.title || ''), ML, y, fontBold, FS.body, C.dark);
        y -= LH.body;
        if (e.detail) {
          checkSpace(LH.bodySmall + 2);
          draw(san(e.detail), ML + 8, y, fontReg, FS.small, C.gray);
          y -= LH.bodySmall;
        }
      });
    }

    // ────────────────────────────────────────────────
    // ── INTERESSEN & HOBBYS ─────────────────────────
    // ────────────────────────────────────────────────
    if (d.hobbies) {
      sectionHeader(lbl.hobbies);
      paragraph(d.hobbies, { color: C.dark });
    }

    // ────────────────────────────────────────────────
    // ── FÜHRERSCHEIN ────────────────────────────────
    // ────────────────────────────────────────────────
    if (d.license && d.license.length > 0) {
      sectionHeader(lbl.license);
      const licText = `${lbl.licLabel}: ${d.license.join(', ')}`
        + (d.licenseNote ? '   –   ' + san(d.licenseNote) : '');
      paragraph(licText, { color: C.dark });
    }

    // ────────────────────────────────────────────────
    // ── REFERENZEN ──────────────────────────────────
    // ────────────────────────────────────────────────
    if (d.refs && d.refs.length > 0) {
      sectionHeader(lbl.refs);
      d.refs.forEach((r, i) => {
        if (i > 0) y -= 5;
        const namePos = [r.name, r.pos, r.company].filter(Boolean).join(', ');
        entryHeader(namePos, '');
        const contact = [r.email, r.phone].filter(Boolean).join('   |   ');
        if (contact) {
          checkSpace(LH.bodySmall + 2);
          draw(san(contact), ML + 8, y, fontReg, FS.small, C.gray);
          y -= LH.bodySmall;
        }
        if (r.note) paragraph(r.note, { xOff: 8, color: C.gray });
      });
    }

    // ────────────────────────────────────────────────
    // ── SEITENZAHLEN ────────────────────────────────
    // ────────────────────────────────────────────────
    const totalPages = doc.getPageCount();
    doc.getPages().forEach((pg, idx) => {
      const numText = `${idx + 1} / ${totalPages}`;
      const numW = fontReg.widthOfTextAtSize(numText, FS.small);
      pg.drawText(numText, {
        x: PW / 2 - numW / 2,
        y: MB / 2,
        font: fontReg,
        size: FS.small,
        color: C.light,
      });
    });

    // ── META-DATEN (ATS-relevant) ────────────────
    doc.setTitle(san(d.name || 'Lebenslauf') + ' – ' + san(d.role || 'CV'));
    doc.setAuthor(san(d.name || ''));
    doc.setSubject('ATS-optimierter Lebenslauf');
    doc.setKeywords(['Lebenslauf', 'CV', san(d.role || ''), san(d.name || '')]);
    doc.setCreator('CV Builder – ATS Mode');

    // ── DOWNLOAD ────────────────────────────────
    const pdfBytes = await doc.save();
    const blob     = new Blob([pdfBytes], { type: 'application/pdf' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = san(d.name || 'Lebenslauf').replace(/\s+/g, '_') + '_ATS.pdf';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ ATS-PDF erstellt — maschinenlesbar & ATS-kompatibel!');

  } catch (err) {
    console.error('[ATS-PDF] Fehler:', err);
    showToast('❌ Fehler: ' + (err.message || String(err)));
  }
}
