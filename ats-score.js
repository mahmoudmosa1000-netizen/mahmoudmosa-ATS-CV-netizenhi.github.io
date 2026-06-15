// ═══════════════════════════════════════════════════════════════
//  CV BUILDER — ats-score.js
//  Echtzeit ATS-Score (0–100) mit konkreten Verbesserungshinweisen
//
//  Kriterien (gesamt 100 Punkte):
//    Kontakt & Identität  : 25 Pkt
//    Kurzprofil           : 15 Pkt
//    Berufserfahrung      : 25 Pkt
//    Ausbildung           : 10 Pkt
//    Skills & Sprachen    : 15 Pkt
//    Extras               : 10 Pkt
// ═══════════════════════════════════════════════════════════════

function updateATSScore() {
  const wrap = document.getElementById('ats-score-wrap');
  if (!wrap) return;

  const d = collectData();

  // ── BEWERTUNGS-REGELN ──────────────────────────────────────
  // Jede Regel: { pts, earned, hint, tab }
  const rules = [

    // ── KONTAKT & IDENTITÄT (25 Pkt) ──────────────────────
    {
      pts: 6,
      earned: !!(d.name && d.name.trim().length >= 3),
      hint: 'Vollständiger Name fehlt oder zu kurz',
      tab: 'personal',
    },
    {
      pts: 6,
      earned: !!(d.email && d.email.includes('@')),
      hint: 'E-Mail-Adresse fehlt',
      tab: 'personal',
    },
    {
      pts: 5,
      earned: !!(d.phone && d.phone.trim().length >= 6),
      hint: 'Telefonnummer fehlt',
      tab: 'personal',
    },
    {
      pts: 4,
      earned: !!(d.role && d.role.trim().length >= 3),
      hint: 'Berufsbezeichnung fehlt — ATS nutzt dieses Feld für Matching',
      tab: 'personal',
    },
    {
      pts: 4,
      earned: !!(d.address && d.address.trim().length >= 3),
      hint: 'Adresse/Ort fehlt — Recruiter filtern oft nach Region',
      tab: 'personal',
    },

    // ── KURZPROFIL (15 Pkt) ───────────────────────────────
    {
      pts: 5,
      earned: !!(d.summary && d.summary.trim().length >= 50),
      hint: 'Kurzprofil fehlt oder zu kurz (min. 50 Zeichen)',
      tab: 'personal',
    },
    {
      pts: 5,
      earned: !!(d.summary && d.summary.trim().length >= 150),
      hint: 'Kurzprofil zu knapp — ATS bevorzugt 150+ Zeichen',
      tab: 'personal',
    },
    {
      pts: 5,
      earned: !!(d.summary && d.summary.trim().length >= 50 && d.summary.trim().length <= 600),
      hint: 'Kurzprofil über 600 Zeichen — zu lang für ATS',
      tab: 'personal',
    },

    // ── BERUFSERFAHRUNG (25 Pkt) ──────────────────────────
    {
      pts: 8,
      earned: d.exp && d.exp.length >= 1,
      hint: 'Keine Berufserfahrung eingetragen',
      tab: 'experience',
    },
    {
      pts: 7,
      earned: d.exp && d.exp.length >= 1 &&
              d.exp.every(e => e.desc && e.desc.trim().length >= 30),
      hint: 'Erfahrungs-Beschreibungen fehlen oder zu kurz (min. 30 Zeichen)',
      tab: 'experience',
    },
    {
      pts: 5,
      earned: d.exp && d.exp.length >= 1 &&
              d.exp.every(e => e.from && e.to),
      hint: 'Zeitraum (Von/Bis) bei Erfahrungseinträgen fehlt',
      tab: 'experience',
    },
    {
      pts: 3,
      earned: d.exp && d.exp.length >= 1 &&
              d.exp.some(e => /[•\-\*]/.test(e.desc || '')),
      hint: 'Keine Bullet Points in Beschreibungen — nutze • für ATS-Klarheit',
      tab: 'experience',
    },
    {
      pts: 2,
      earned: d.exp && d.exp.length >= 1 &&
              d.exp.every(e => e.title && e.company),
      hint: 'Jobtitel oder Unternehmen fehlt bei einem Erfahrungs-Eintrag',
      tab: 'experience',
    },

    // ── AUSBILDUNG (10 Pkt) ───────────────────────────────
    {
      pts: 6,
      earned: d.edu && d.edu.length >= 1,
      hint: 'Kein Ausbildungseintrag — ATS-Systeme prüfen immer Bildung',
      tab: 'education',
    },
    {
      pts: 4,
      earned: d.edu && d.edu.length >= 1 &&
              d.edu.every(e => e.degree && e.school),
      hint: 'Abschluss oder Schule/Hochschule fehlt bei Bildungseinträgen',
      tab: 'education',
    },

    // ── SKILLS & SPRACHEN (15 Pkt) ────────────────────────
    {
      pts: 5,
      earned: d.skills && d.skills.length >= 3,
      hint: 'Weniger als 3 Skills — ATS-Matching benötigt Keywords',
      tab: 'skills',
    },
    {
      pts: 5,
      earned: d.skills && d.skills.length >= 6,
      hint: 'Unter 6 Skills — ergänze relevante Fachbegriffe für deine Branche',
      tab: 'skills',
    },
    {
      pts: 5,
      earned: d.langs && d.langs.length >= 1,
      hint: 'Keine Sprachkenntnisse eingetragen',
      tab: 'skills',
    },

    // ── EXTRAS (10 Pkt) ───────────────────────────────────
    {
      pts: 4,
      earned: !!(d.linkedin && d.linkedin.trim().length > 5),
      hint: 'LinkedIn-Profil fehlt — Recruiter prüfen es bei 87% der Bewerbungen',
      tab: 'personal',
    },
    {
      pts: 3,
      earned: (d.certs && d.certs.length >= 1) ||
              (d.projects && d.projects.length >= 1),
      hint: 'Keine Zertifikate oder Projekte — stärken dein Keyword-Profil',
      tab: 'extras',
    },
    {
      pts: 3,
      earned: !!(d.komps && d.komps.trim().length >= 20),
      hint: 'Kompetenzen fehlen oder zu kurz — wichtig für ATS-Keyword-Matching',
      tab: 'skills',
    },
  ];

  // ── SCORE BERECHNEN ───────────────────────────────────────
  const totalPts  = rules.reduce((sum, r) => sum + r.pts, 0);
  const earnedPts = rules.reduce((sum, r) => sum + (r.earned ? r.pts : 0), 0);
  const score     = Math.round((earnedPts / totalPts) * 100);

  // ── FEHLENDE HINWEISE SAMMELN (max. 3 anzeigen) ──────────
  const failedRules = rules
    .filter(r => !r.earned)
    .sort((a, b) => b.pts - a.pts); // wichtigste zuerst

  // ── UI AKTUALISIEREN ─────────────────────────────────────
  const scoreVal  = document.getElementById('ats-score-value');
  const scoreFill = document.getElementById('ats-score-fill');
  const scoreRing = document.getElementById('ats-score-ring-text');
  const hintsEl   = document.getElementById('ats-score-hints');
  const labelEl   = document.getElementById('ats-score-status');

  if (!scoreVal || !scoreFill || !hintsEl) return;

  // Farbe je nach Score
  const color = score >= 80 ? '#4a7c59'
              : score >= 60 ? '#e07b20'
              : score >= 35 ? '#d4941a'
              :               '#c0392b';

  const statusText = score >= 80 ? '✓ Gut für ATS'
                   : score >= 60 ? 'Verbesserbar'
                   : score >= 35 ? 'Schwach'
                   :               'Kritisch';

  // Wert & Farbe setzen
  scoreVal.textContent = score + ' / 100';
  scoreVal.style.color = color;
  if (labelEl) { labelEl.textContent = statusText; labelEl.style.color = color; }

  // Progress-Bar animieren
  scoreFill.style.width      = score + '%';
  scoreFill.style.background = `linear-gradient(90deg, ${color}cc, ${color})`;

  // SVG-Ring aktualisieren
  const ringEl = document.getElementById('ats-ring-circle');
  if (ringEl) {
    const radius = 28;
    const circ   = 2 * Math.PI * radius;
    const dash   = (score / 100) * circ;
    ringEl.style.strokeDasharray  = `${dash} ${circ}`;
    ringEl.style.stroke            = color;
  }
  if (scoreRing) { scoreRing.textContent = score; scoreRing.style.fill = color; }

  // Hinweise rendern (max. 3)
  const topHints = failedRules.slice(0, 3);
  hintsEl.innerHTML = topHints.map(r => `
    <div class="ats-hint" onclick="switchToTab('${r.tab}')">
      <span class="ats-hint-icon">⚠</span>
      <span class="ats-hint-text">${r.hint}</span>
      <span class="ats-hint-pts">−${r.pts} Pkt</span>
    </div>
  `).join('');

  // Kein Hinweis = Erfolgsmeldung
  if (topHints.length === 0) {
    hintsEl.innerHTML = `<div class="ats-hint ats-hint-ok">
      <span class="ats-hint-icon">🎉</span>
      <span class="ats-hint-text">Ausgezeichnet! Dein Lebenslauf ist ATS-optimal.</span>
    </div>`;
  }

  // Restliche Hinweise als Toggle
  if (failedRules.length > 3) {
    const remaining = failedRules.slice(3);
    const toggleId  = 'ats-hints-extra';
    hintsEl.innerHTML += `
      <button class="ats-hints-toggle" onclick="
        var el=document.getElementById('${toggleId}');
        var btn=this;
        if(el.style.display==='none'){el.style.display='block';btn.textContent='▲ Weniger anzeigen';}
        else{el.style.display='none';btn.textContent='▼ ${remaining.length} weitere Hinweise';}
      ">▼ ${remaining.length} weitere Hinweise</button>
      <div id="${toggleId}" style="display:none;">
        ${remaining.map(r => `
          <div class="ats-hint" onclick="switchToTab('${r.tab}')">
            <span class="ats-hint-icon">⚠</span>
            <span class="ats-hint-text">${r.hint}</span>
            <span class="ats-hint-pts">−${r.pts} Pkt</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// ── TAB-NAVIGATION HELPER ────────────────────────────────────
function switchToTab(tabId) {
  const tabMap = {
    personal:   'personal',
    experience: 'experience',
    education:  'education',
    skills:     'skills',
    extras:     'extras',
  };
  const target = tabMap[tabId];
  if (!target) return;
  const btn = document.querySelector(`.etab[onclick*="switchTab('${target}'"]`);
  if (btn) { btn.click(); btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

// ── PANEL TOGGLE ─────────────────────────────────────────────
function toggleATSPanel() {
  const body  = document.getElementById('ats-score-body');
  const arrow = document.getElementById('ats-arrow');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
  // Score beim ersten Öffnen berechnen
  if (!isOpen) updateATSScore();
}
