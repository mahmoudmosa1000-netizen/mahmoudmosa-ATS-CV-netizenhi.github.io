// ═══════════════════════════════════════════════════════════════
//  CV BUILDER — ats-score.js  (v2 — vollständig mehrsprachig)
//  Echtzeit ATS-Score (0–100) mit übersetzten Hinweisen
// ═══════════════════════════════════════════════════════════════

function updateATSScore() {
  const wrap = document.getElementById('ats-score-wrap');
  if (!wrap) return;

  const d    = collectData();
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'de';
  // Zugriff auf verschachtelte atsHints-Keys direkt über TRANSLATIONS-Objekt
  // Übersetzungen laden: zuerst aktuelle Sprache, dann DE als Fallback
  const hints =
    (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang] && TRANSLATIONS[lang].atsHints)
      ? TRANSLATIONS[lang].atsHints
      : (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS['de'] && TRANSLATIONS['de'].atsHints)
        ? TRANSLATIONS['de'].atsHints
        : {};

  // H(key): gibt Übersetzung zurück — kein hardcodierter Fallback mehr
  const H = (key, _unused) => hints[key] || key;

  // ── BEWERTUNGS-REGELN (100 Pkt gesamt) ────────────────────
  const rules = [
    // Kontakt & Identität (25 Pkt)
    { pts:6, earned: !!(d.name  && d.name.trim().length  >= 3),  tab:'personal',   hint: H('noName',         'Name fehlt') },
    { pts:6, earned: !!(d.email && d.email.includes('@')),        tab:'personal',   hint: H('noEmail',        'E-Mail fehlt') },
    { pts:5, earned: !!(d.phone && d.phone.trim().length >= 6),   tab:'personal',   hint: H('noPhone',        'Telefon fehlt') },
    { pts:4, earned: !!(d.role  && d.role.trim().length  >= 3),   tab:'personal',   hint: H('noRole',         'Berufsbezeichnung fehlt') },
    { pts:4, earned: !!(d.address && d.address.trim().length >= 3),tab:'personal',  hint: H('noAddress',      'Adresse/Ort fehlt') },
    // Kurzprofil (15 Pkt)
    { pts:5, earned: !!(d.summary && d.summary.trim().length >= 50),  tab:'personal', hint: H('summaryMissing','Kurzprofil fehlt (min. 50 Zeichen)') },
    { pts:5, earned: !!(d.summary && d.summary.trim().length >= 150), tab:'personal', hint: H('summaryShort',  'Kurzprofil zu knapp (150+ empfohlen)') },
    { pts:5, earned: !!(d.summary && d.summary.trim().length >= 50  && d.summary.trim().length <= 600), tab:'personal', hint: H('summaryLong','Kurzprofil über 600 Zeichen') },
    // Berufserfahrung (25 Pkt)
    { pts:8, earned: !!(d.exp  && d.exp.length  >= 1),            tab:'experience', hint: H('noExp',          'Keine Berufserfahrung') },
    { pts:7, earned: !!(d.exp  && d.exp.length  >= 1 && d.exp.every(e=>e.desc && e.desc.trim().length>=30)), tab:'experience', hint: H('expNoDesc','Beschreibungen fehlen oder zu kurz') },
    { pts:5, earned: !!(d.exp  && d.exp.length  >= 1 && d.exp.every(e=>e.from && e.to)),  tab:'experience', hint: H('expNoDates',   'Zeitraum fehlt in Erfahrungseinträgen') },
    { pts:3, earned: !!(d.exp  && d.exp.length  >= 1 && d.exp.some(e=>/[•\-\*]/.test(e.desc||''))), tab:'experience', hint: H('expNoBullets','Keine Bullet Points in Beschreibungen') },
    { pts:2, earned: !!(d.exp  && d.exp.length  >= 1 && d.exp.every(e=>e.title && e.company)), tab:'experience', hint: H('expNoTitle','Jobtitel oder Unternehmen fehlt') },
    // Ausbildung (10 Pkt)
    { pts:6, earned: !!(d.edu  && d.edu.length  >= 1),            tab:'education',  hint: H('noEdu',          'Kein Ausbildungseintrag') },
    { pts:4, earned: !!(d.edu  && d.edu.length  >= 1 && d.edu.every(e=>e.degree && e.school)), tab:'education', hint: H('eduIncomplete','Abschluss oder Schule fehlt') },
    // Skills & Sprachen (15 Pkt)
    { pts:5, earned: !!(d.skills && d.skills.length >= 3),         tab:'skills',     hint: H('fewSkills',      'Weniger als 3 Skills') },
    { pts:5, earned: !!(d.skills && d.skills.length >= 6),         tab:'skills',     hint: H('moreSkills',     'Unter 6 Skills') },
    { pts:5, earned: !!(d.langs  && d.langs.length  >= 1),         tab:'skills',     hint: H('noLangs',        'Keine Sprachen eingetragen') },
    // Extras (10 Pkt)
    { pts:4, earned: !!(d.linkedin && d.linkedin.trim().length > 5), tab:'personal', hint: H('noLinkedin',     'LinkedIn-Profil fehlt') },
    { pts:3, earned: !!(d.certs && d.certs.length>=1)||(d.projects && d.projects.length>=1), tab:'extras', hint: H('noCertsProj','Keine Zertifikate oder Projekte') },
    { pts:3, earned: !!(d.komps  && d.komps.trim().length >= 20),  tab:'skills',     hint: H('noKomps',        'Kompetenzen fehlen oder zu kurz') },
  ];

  // ── SCORE BERECHNEN ──────────────────────────────────────────
  const totalPts  = rules.reduce((s,r) => s + r.pts, 0);
  const earnedPts = rules.reduce((s,r) => s + (r.earned ? r.pts : 0), 0);
  const score     = Math.round((earnedPts / totalPts) * 100);

  const failed = rules.filter(r => !r.earned).sort((a,b) => b.pts - a.pts);

  // ── STATUS-TEXT ───────────────────────────────────────────────
  const color      = score >= 80 ? '#4a7c59' : score >= 60 ? '#e07b20' : score >= 35 ? '#d4941a' : '#c0392b';
  const statusText = score >= 80 ? H('statusGood','✓ Gut für ATS')
                   : score >= 60 ? H('statusOk',  'Verbesserbar')
                   : score >= 35 ? H('statusWeak', 'Schwach')
                   :               H('statusCrit', 'Kritisch');

  // ── DOM UPDATEN ───────────────────────────────────────────────
  const scoreValEl  = document.getElementById('ats-score-value');
  const scoreFillEl = document.getElementById('ats-score-fill');
  const scoreRingEl = document.getElementById('ats-ring-circle');
  const scoreRingTx = document.getElementById('ats-score-ring-text');
  const statusEl    = document.getElementById('ats-score-status');
  const hintsEl     = document.getElementById('ats-score-hints');

  if (!scoreValEl) return;

  if (scoreValEl)  { scoreValEl.textContent  = score + ' / 100'; scoreValEl.style.color = color; }
  if (statusEl)    { statusEl.textContent    = statusText; statusEl.style.color = color;
                     statusEl.style.background = color + '18'; statusEl.style.borderColor = color + '40'; }

  if (scoreFillEl) {
    scoreFillEl.style.width      = score + '%';
    scoreFillEl.style.background = `linear-gradient(90deg, ${color}aa, ${color})`;
    scoreFillEl.style.transition = 'width 0.6s ease, background 0.4s';
  }
  if (scoreRingEl) {
    const r    = 28;
    const circ = 2 * Math.PI * r;
    scoreRingEl.style.strokeDasharray = `${(score/100)*circ} ${circ}`;
    scoreRingEl.style.stroke = color;
  }
  if (scoreRingTx) { scoreRingTx.textContent = score; scoreRingTx.setAttribute('fill', color); }

  // ── HINWEISE ─────────────────────────────────────────────────
  if (!hintsEl) return;

  if (failed.length === 0) {
    hintsEl.innerHTML = `<div class="ats-hint ats-hint-ok">
      <span class="ats-hint-icon">🎉</span>
      <span class="ats-hint-text">${H('allOk','Ausgezeichnet! Dein Lebenslauf ist ATS-optimal.')}</span>
    </div>`;
    return;
  }

  const top3 = failed.slice(0, 3);
  const rest = failed.slice(3);

  hintsEl.innerHTML = top3.map(r => `
    <div class="ats-hint" onclick="switchToTab('${r.tab}')">
      <span class="ats-hint-icon">⚠</span>
      <span class="ats-hint-text">${r.hint}</span>
      <span class="ats-hint-pts">−${r.pts}</span>
    </div>`).join('');

  if (rest.length > 0) {
    const id = 'ats-extra-hints';
    hintsEl.innerHTML += `
      <button class="ats-hints-toggle" onclick="
        var el=document.getElementById('${id}');
        var btn=this;
        if(el.style.display==='none'){el.style.display='block';btn.textContent='▲';}
        else{el.style.display='none';btn.textContent='▼ +${rest.length}';}
      ">▼ +${rest.length}</button>
      <div id="${id}" style="display:none;margin-top:4px;">
        ${rest.map(r=>`<div class="ats-hint" onclick="switchToTab('${r.tab}')">
          <span class="ats-hint-icon">⚠</span>
          <span class="ats-hint-text">${r.hint}</span>
          <span class="ats-hint-pts">−${r.pts}</span>
        </div>`).join('')}
      </div>`;
  }
}

// ── PANEL TOGGLE ─────────────────────────────────────────────
function toggleATSPanel() {
  const body  = document.getElementById('ats-score-body');
  const arrow = document.getElementById('ats-arrow');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
  if (!isOpen) updateATSScore();
}

// ── TAB-NAVIGATION ───────────────────────────────────────────
function switchToTab(tabId) {
  const map = { personal:'personal', experience:'experience',
                education:'education', skills:'skills', extras:'extras' };
  const target = map[tabId];
  if (!target) return;
  const btn = document.querySelector(`.etab[onclick*="switchTab('${target}'"]`);
  if (btn) { btn.click(); btn.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
}
