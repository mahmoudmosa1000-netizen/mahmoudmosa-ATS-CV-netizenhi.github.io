// ═══════════════════════════════════════════════════════════════
//  CV BUILDER — action-verbs.js
//  Schritt 9: Action Verb Bibliothek
//
//  Funktionen:
//  ✓ ~160 kategorisierte, starke Aktionsverben (DE/EN/AR)
//  ✓ Durchsuchbares Popover direkt am Beschreibungsfeld
//  ✓ 1-Klick-Einfügen am Cursor (intelligente Bullet-Erkennung)
//  ✓ Kategorie-Filter (Führung, Erfolge, Technik, Kommunikation…)
// ═══════════════════════════════════════════════════════════════

const ACTION_VERBS = {
  de: {
    'Führung & Leitung': [
      'Leitete','Führte','Koordinierte','Steuerte','Verantwortete','Beaufsichtigte',
      'Delegierte','Mentor­te','Motivierte','Schulte','Trainierte','Förderte',
      'Repräsentierte','Vertrat','Initiierte','Etablierte',
    ],
    'Erfolge & Ergebnisse': [
      'Steigerte','Reduzierte','Erzielte','Übertraf','Erreichte','Optimierte',
      'Verbesserte','Maximierte','Generierte','Lieferte','Sicherte','Gewann',
      'Realisierte','Verdoppelte','Beschleunigte','Senkte',
    ],
    'Analyse & Planung': [
      'Analysierte','Bewertete','Evaluierte','Identifizierte','Plante','Konzipierte',
      'Entwickelte','Strukturierte','Prognostizierte','Untersuchte','Diagnostizierte',
      'Modellierte','Kalkulierte','Recherchierte',
    ],
    'Kommunikation': [
      'Präsentierte','Verhandelte','Beriet','Kommunizierte','Moderierte','Vermittelte',
      'Überzeugte','Dokumentierte','Berichtete','Pflegte Beziehungen zu','Korrespondierte mit',
    ],
    'Technik & Entwicklung': [
      'Entwickelte','Programmierte','Implementierte','Automatisierte','Integrierte',
      'Konfigurierte','Testete','Debuggte','Wartete','Migrierte','Deployte','Skalierte',
      'Architektierte','Refaktorierte',
    ],
    'Organisation & Verwaltung': [
      'Organisierte','Verwaltete','Koordinierte','Plante','Terminierte','Dokumentierte',
      'Archivierte','Bearbeitete','Prüfte','Kontrollierte','Administrierte','Pflegte',
    ],
    'Kreativität & Innovation': [
      'Entwarf','Gestaltete','Konzipierte','Innovierte','Kreierte','Erfand',
      'Visualisierte','Konzeptionierte','Pionierte',
    ],
    'Verkauf & Kundenbetreuung': [
      'Akquirierte','Betreute','Beriet','Verkaufte','Gewann Kunden','Baute Beziehungen auf',
      'Verhandelte Verträge','Steigerte Umsatz','Bediente','Unterstützte',
    ],
  },
  en: {
    'Leadership': [
      'Led','Directed','Coordinated','Managed','Oversaw','Supervised','Delegated',
      'Mentored','Motivated','Trained','Coached','Fostered','Represented','Spearheaded',
      'Established','Championed',
    ],
    'Achievement & Results': [
      'Increased','Reduced','Achieved','Exceeded','Delivered','Optimized','Improved',
      'Maximized','Generated','Secured','Won','Realized','Doubled','Accelerated',
      'Decreased','Drove',
    ],
    'Analysis & Planning': [
      'Analyzed','Assessed','Evaluated','Identified','Planned','Designed','Developed',
      'Structured','Forecasted','Investigated','Diagnosed','Modeled','Calculated','Researched',
    ],
    'Communication': [
      'Presented','Negotiated','Advised','Communicated','Facilitated','Mediated',
      'Persuaded','Documented','Reported','Built relationships with','Liaised with',
    ],
    'Technical & Development': [
      'Developed','Programmed','Implemented','Automated','Integrated','Configured',
      'Tested','Debugged','Maintained','Migrated','Deployed','Scaled','Architected',
      'Refactored',
    ],
    'Organization & Administration': [
      'Organized','Administered','Coordinated','Scheduled','Documented','Archived',
      'Processed','Reviewed','Monitored','Maintained',
    ],
    'Creativity & Innovation': [
      'Designed','Crafted','Conceived','Innovated','Created','Invented','Visualized',
      'Conceptualized','Pioneered',
    ],
    'Sales & Customer Care': [
      'Acquired','Supported','Advised','Sold','Won clients','Built relationships',
      'Negotiated contracts','Grew revenue','Served','Assisted',
    ],
  },
  ar: {
    'القيادة والإدارة': [
      'قاد','أدار','نسّق','وجّه','أشرف على','فوّض','درّب','حفّز','مثّل','أسّس',
    ],
    'الإنجازات والنتائج': [
      'زاد','خفّض','حقّق','تجاوز','حسّن','عزّز','ولّد','أمّن','حقّق نتائج',
    ],
    'التحليل والتخطيط': [
      'حلّل','قيّم','حدّد','خطّط','طوّر','صمّم','بحث','شخّص',
    ],
    'التواصل': [
      'قدّم عرضًا','تفاوض','استشار','تواصل مع','وثّق','قرّر','أقنع',
    ],
    'التقنية والتطوير': [
      'طوّر','برمج','نفّذ','أتمتة','دمج','اختبر','نشر','صان',
    ],
    'التنظيم والإدارة': [
      'نظّم','أدار','جدول','وثّق','راجع','تابع',
    ],
  },
};

let _verbPopoverTarget = null; // Aktuell offenes Feld
let _verbPopoverFilter = '';

// ── POPOVER ÖFFNEN/SCHLIESSEN ─────────────────────────────────
function toggleVerbPicker(fieldId, btnEl) {
  const existing = document.getElementById('verb-popover');
  if (existing) {
    const wasOpenForSameField = _verbPopoverTarget === fieldId;
    existing.remove();
    document.removeEventListener('click', closeVerbPickerOnOutsideClick, true);
    if (wasOpenForSameField) { _verbPopoverTarget = null; return; }
  }
  _verbPopoverTarget = fieldId;
  _verbPopoverFilter = '';
  buildVerbPopover(btnEl);
}

function buildVerbPopover(anchorEl) {
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'de';
  const dataset = ACTION_VERBS[lang] || ACTION_VERBS.de;
  const categories = Object.keys(dataset);

  const pop = document.createElement('div');
  pop.id = 'verb-popover';
  pop.className = 'verb-popover';

  pop.innerHTML = `
    <div class="verb-pop-header">
      <input type="text" id="verb-search" class="verb-search"
             placeholder="🔍 Verb suchen…" oninput="filterVerbPopover(this.value)" autocomplete="off">
      <button type="button" class="verb-pop-close" onclick="closeVerbPicker()">×</button>
    </div>
    <div class="verb-pop-cats" id="verb-cats">
      ${categories.map((cat, i) => `
        <button type="button" class="verb-cat-btn ${i===0?'active':''}" data-cat="${escAttr(cat)}"
                onclick="selectVerbCategory('${escAttr(cat)}', this)">${cat}</button>
      `).join('')}
    </div>
    <div class="verb-pop-list" id="verb-list"></div>
    <div class="verb-pop-hint">💡 Klicke auf ein Verb, um es einzufügen</div>
  `;

  document.body.appendChild(pop);
  positionVerbPopover(pop, anchorEl);
  renderVerbList(categories[0], dataset);

  setTimeout(() => {
    document.addEventListener('click', closeVerbPickerOnOutsideClick, true);
    const search = document.getElementById('verb-search');
    if (search) search.focus();
  }, 10);
}

// ── POSITIONIERUNG (am Button, mit Viewport-Begrenzung) ───────
function positionVerbPopover(pop, anchorEl) {
  if (!anchorEl) { pop.style.top = '100px'; pop.style.left = '50%'; return; }
  const rect = anchorEl.getBoundingClientRect();
  const popWidth = 320;
  let left = rect.left;
  let top  = rect.bottom + 6;

  if (left + popWidth > window.innerWidth - 12) {
    left = window.innerWidth - popWidth - 12;
  }
  if (top + 360 > window.innerHeight) {
    top = Math.max(12, rect.top - 366);
  }
  pop.style.position = 'fixed';
  pop.style.left = left + 'px';
  pop.style.top  = top + 'px';
}

// ── KATEGORIE WÄHLEN ───────────────────────────────────────────
function selectVerbCategory(cat, btnEl) {
  document.querySelectorAll('.verb-cat-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'de';
  const dataset = ACTION_VERBS[lang] || ACTION_VERBS.de;
  renderVerbList(cat, dataset);
}

// ── LISTE RENDERN (mit optionalem Suchfilter über alle Kategorien) ──
function renderVerbList(activeCat, dataset) {
  const listEl = document.getElementById('verb-list');
  if (!listEl) return;

  let verbs = [];
  if (_verbPopoverFilter.trim().length > 0) {
    // Suche über ALLE Kategorien
    const q = _verbPopoverFilter.toLowerCase();
    Object.values(dataset).forEach(arr => {
      arr.forEach(v => { if (v.toLowerCase().includes(q)) verbs.push(v); });
    });
    verbs = [...new Set(verbs)];
    // Kategorie-Tabs während Suche ausgrauen
    document.getElementById('verb-cats')?.classList.add('verb-cats-disabled');
  } else {
    verbs = dataset[activeCat] || [];
    document.getElementById('verb-cats')?.classList.remove('verb-cats-disabled');
  }

  if (verbs.length === 0) {
    listEl.innerHTML = `<div class="verb-empty">Keine Verben gefunden.</div>`;
    return;
  }

  listEl.innerHTML = verbs.map(v => `
    <button type="button" class="verb-chip" onclick="insertVerb('${escAttr(v)}')">${v}</button>
  `).join('');
}

// ── SUCHE FILTERN ──────────────────────────────────────────────
function filterVerbPopover(query) {
  _verbPopoverFilter = query;
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'de';
  const dataset = ACTION_VERBS[lang] || ACTION_VERBS.de;
  const activeCatBtn = document.querySelector('.verb-cat-btn.active');
  const activeCat = activeCatBtn ? activeCatBtn.dataset.cat : Object.keys(dataset)[0];
  renderVerbList(activeCat, dataset);
}

// ── VERB EINFÜGEN (intelligente Cursor- & Bullet-Logik) ───────
function insertVerb(verb) {
  const fieldId = _verbPopoverTarget;
  if (!fieldId) return;
  const field = document.getElementById(fieldId);
  if (!field) { closeVerbPicker(); return; }

  field.focus();
  const start = field.selectionStart ?? field.value.length;
  const end   = field.selectionEnd   ?? field.value.length;
  const before = field.value.slice(0, start);
  const after  = field.value.slice(end);

  // Prüfen: stehen wir am Zeilenanfang (oder ist die Zeile leer)?
  const lineStart = before.lastIndexOf('\n') + 1;
  const currentLinePrefix = before.slice(lineStart);
  const atLineStart = currentLinePrefix.trim() === '';

  let insertText = verb + ' ';
  // Wenn am Zeilenanfang und das Feld bereits Bullet-Punkte nutzt → Bullet voranstellen
  const usesBullets = /^[•\-\*]/m.test(field.value);
  if (atLineStart && usesBullets && !currentLinePrefix.includes('•')) {
    insertText = '• ' + insertText;
  }

  field.value = before + insertText + after;
  const newPos = before.length + insertText.length;
  field.setSelectionRange(newPos, newPos);

  field.dispatchEvent(new Event('input'));
  render();
  if (typeof updateATSScore === 'function') updateATSScore();

  showToast(`✓ "${verb}" eingefügt`);
  closeVerbPicker();
  field.focus();
}

// ── SCHLIESSEN ──────────────────────────────────────────────────
function closeVerbPicker() {
  const pop = document.getElementById('verb-popover');
  if (pop) pop.remove();
  document.removeEventListener('click', closeVerbPickerOnOutsideClick, true);
  _verbPopoverTarget = null;
}

function closeVerbPickerOnOutsideClick(e) {
  const pop = document.getElementById('verb-popover');
  if (!pop) return;
  if (pop.contains(e.target)) return;
  // Klick auf den öffnenden Button selbst nicht als "außerhalb" werten
  if (e.target.closest && e.target.closest('.verb-trigger-btn')) return;
  closeVerbPicker();
}

// ── HILFSFUNKTION: HTML-Attribut escapen ────────────────────────
function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
