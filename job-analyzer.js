// ═══════════════════════════════════════════════════════════════
//  CV BUILDER — job-analyzer.js
//  Schritt 3: Job Description Analyzer
//
//  Features:
//  ✓ Stellenanzeige einfügen → Keywords extrahieren (KI + lokal)
//  ✓ Abgleich mit aktuellem CV-Inhalt
//  ✓ Fehlende Keywords anzeigen (mit 1-Klick-Hinzufügen)
//  ✓ Match-Score (0–100%) zwischen Job und CV
//  ✓ ATS-Score nach jeder Änderung neu berechnen
//  ✓ Ohne API-Key: lokale Keyword-Extraktion als Fallback
// ═══════════════════════════════════════════════════════════════

// ── ZUSTAND ──────────────────────────────────────────────────
const _jd = {
  rawText:      '',
  keywords:     [],  // { word, category, found }
  matchScore:   0,
  isAnalyzing:  false,
};

// ── STOPWÖRTER (DE + EN) ──────────────────────────────────────
const JD_STOPWORDS = new Set([
  'und','oder','die','der','das','ein','eine','einen','dem','den','des',
  'mit','für','in','an','auf','von','zu','bei','nach','aus','über',
  'sind','wird','werden','haben','hat','war','wir','sie','ihr','wer',
  'uns','wie','als','auch','aber','wenn','dass','nicht','noch','schon',
  'sehr','mehr','nur','alle','bis','im','am','zum','zur','vom','beim',
  // EN
  'and','or','the','a','an','to','of','in','for','with','on','at',
  'is','are','be','been','will','we','you','our','us','as','but','if',
  'that','this','not','have','has','by','from','it','its','your','their',
  'can','may','should','would','could','all','any','some','more','also',
  // Boilerplate
  'ihnen','sich','nach','über','unter','durch','zwischen','sowie','bzw',
  'bitte','gerne','freuen','suchen','bieten','wir','stellen','ihr',
  'please','join','team','company','role','position','candidate','apply',
  'opportunity','about','who','what','how','when','where','why','which',
]);

// ── KEYWORD-KATEGORIEN (lokale Extraktion) ────────────────────
const JD_PATTERNS = {
  tech: /\b(python|javascript|typescript|react|vue|angular|node|java|c\+\+|c#|\.net|php|ruby|go|rust|swift|kotlin|sql|nosql|mongodb|postgresql|mysql|redis|elasticsearch|docker|kubernetes|aws|azure|gcp|git|linux|html|css|sass|rest|api|graphql|microservices|devops|ci\/cd|jenkins|terraform|ansible|excel|sap|salesforce|powerbi|tableau|matlab|r\b|hadoop|spark)\b/gi,
  soft: /\b(teamwork|teamfähig|kommunikation|kommunikativ|eigeninitiative|selbstständig|analytisch|kreativ|flexibel|zuverlässig|belastbar|lösungsorientiert|leadership|führung|management|agil|scrum|kanban|projektmanagement|präsentation|verhandlung|koordination|organisation|motivation|empathie|teamleiter|verantwortung)\b/gi,
  lang: /\b(deutsch|englisch|französisch|spanisch|arabisch|chinesisch|japanisch|italian|russian|turkish|german|english|french|spanish|arabic|chinese)\b/gi,
  cert: /\b(zertifikat|zertifizierung|certified|certification|aws certified|pmp|prince2|itil|cissp|ceh|azure certified|google cloud|scrum master|product owner|six sigma)\b/gi,
  edu:  /\b(bachelor|master|diplom|promotion|phd|mba|ausbildung|studium|hochschule|universität|university|college|degree|bsc|msc|bachelor of|master of)\b/gi,
  exp:  /\b(\d+[\+\-]?\s*jahre?|years? experience|berufserfahrung|erfahrung|experience|senior|junior|lead|principal|architect|director|manager|specialist|expert|consultant|engineer|developer|analyst|designer|coordinator)\b/gi,
};

// ── LOKALE KEYWORD-EXTRAKTION (ohne API) ─────────────────────
function extractKeywordsLocally(text) {
  const found = new Map(); // word → category

  // Pattern-basiert
  Object.entries(JD_PATTERNS).forEach(([cat, pattern]) => {
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(text)) !== null) {
      const w = m[0].toLowerCase().trim();
      if (!found.has(w)) found.set(w, cat);
    }
  });

  // Nomen / Fachbegriffe extrahieren (Wörter > 4 Zeichen, nicht Stopwort)
  const words = text.match(/\b[A-Za-zÄÖÜäöüß]{4,}\b/g) || [];
  words.forEach(w => {
    const wl = w.toLowerCase();
    if (!JD_STOPWORDS.has(wl) && !found.has(wl) && w[0] === w[0].toUpperCase()) {
      found.set(wl, 'term');
    }
  });

  return Array.from(found.entries())
    .map(([word, category]) => ({ word, category }))
    .slice(0, 60); // max 60 Keywords
}

// ── KI-KEYWORD-EXTRAKTION (mit API) ──────────────────────────
async function extractKeywordsWithAI(text) {
  const prompt = `Analysiere diese Stellenanzeige und extrahiere die wichtigsten Keywords für einen ATS-optimierten Lebenslauf.

Stellenanzeige:
${text.substring(0, 3000)}

Antworte NUR mit einem JSON-Array ohne Erklärungen:
[{"word":"Python","category":"tech"},{"word":"Teamführung","category":"soft"},...]

Kategorien: "tech" (Technologien), "soft" (Soft Skills), "lang" (Sprachen), "cert" (Zertifikate), "exp" (Erfahrung/Titel), "term" (Fachbegriffe).
Maximal 40 Keywords, nur die wichtigsten. Keine Stoppwörter. Kurze, präzise Begriffe.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Kein JSON im Response');
  return JSON.parse(match[0]);
}

// ── CV-TEXT ZUSAMMENSTELLEN FÜR MATCHING ─────────────────────
function getCVText() {
  const d = collectData();
  const parts = [
    d.name, d.role, d.summary, d.goal, d.komps,
    ...(d.exp   || []).map(e => [e.title, e.company, e.desc].join(' ')),
    ...(d.edu   || []).map(e => [e.degree, e.school].join(' ')),
    ...(d.skills|| []).map(s => s.name),
    ...(d.langs || []).map(l => l.name),
    ...(d.certs || []).map(c => [c.title, c.issuer].join(' ')),
    ...(d.projects||[]).map(p => [p.title, p.desc].join(' ')),
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

// ── MATCHING BERECHNEN ───────────────────────────────────────
function computeMatches(keywords) {
  const cvText = getCVText();
  return keywords.map(kw => ({
    ...kw,
    found: cvText.includes(kw.word.toLowerCase()),
  }));
}

// ── ANALYSE STARTEN ──────────────────────────────────────────
async function analyzeJobDescription() {
  const textarea = document.getElementById('jd-input');
  const text = textarea ? textarea.value.trim() : '';

  if (!text || text.length < 50) {
    showToast('⚠ Bitte Stellenanzeige einfügen (min. 50 Zeichen)');
    return;
  }

  if (_jd.isAnalyzing) return;
  _jd.isAnalyzing = true;
  _jd.rawText = text;

  setJDState('loading');

  try {
    let keywords;
    try {
      // Versuche KI-Extraktion
      keywords = await extractKeywordsWithAI(text);
    } catch (e) {
      // Fallback: lokale Extraktion
      console.warn('[JD] API-Fehler, nutze lokale Extraktion:', e.message);
      keywords = extractKeywordsLocally(text);
      showToast('💡 Lokale Keyword-Extraktion (kein API-Key)');
    }

    _jd.keywords = computeMatches(keywords);
    const found  = _jd.keywords.filter(k => k.found).length;
    _jd.matchScore = _jd.keywords.length > 0
      ? Math.round((found / _jd.keywords.length) * 100) : 0;

    renderJDResults();
    setJDState('results');

  } catch (err) {
    showToast('❌ Fehler: ' + err.message);
    setJDState('idle');
  } finally {
    _jd.isAnalyzing = false;
  }
}

// ── ERGEBNISSE RENDERN ───────────────────────────────────────
function renderJDResults() {
  const wrap     = document.getElementById('jd-results');
  const scoreEl  = document.getElementById('jd-match-score');
  const scoreBar = document.getElementById('jd-match-bar');
  const scoreLbl = document.getElementById('jd-match-label');
  if (!wrap) return;

  // Score
  const s = _jd.matchScore;
  const color = s >= 75 ? '#4a7c59' : s >= 50 ? '#e07b20' : s >= 25 ? '#d4941a' : '#c0392b';
  const label = s >= 75 ? 'Sehr gut' : s >= 50 ? 'Gut' : s >= 25 ? 'Ausbaufähig' : 'Niedrig';

  if (scoreEl)  { scoreEl.textContent = s + '%'; scoreEl.style.color = color; }
  if (scoreBar) { scoreBar.style.width = s + '%'; scoreBar.style.background = color; }
  if (scoreLbl) { scoreLbl.textContent = label; scoreLbl.style.color = color; }

  // Keywords gruppieren
  const cats = {
    tech: { label: '💻 Technologien', items: [] },
    soft: { label: '🤝 Soft Skills',  items: [] },
    exp:  { label: '🏆 Erfahrung',    items: [] },
    lang: { label: '🌍 Sprachen',     items: [] },
    cert: { label: '📜 Zertifikate',  items: [] },
    term: { label: '📌 Fachbegriffe', items: [] },
  };
  _jd.keywords.forEach(kw => {
    const cat = cats[kw.category] || cats.term;
    cat.items.push(kw);
  });

  const missing = _jd.keywords.filter(k => !k.found);
  const matched = _jd.keywords.filter(k =>  k.found);

  wrap.innerHTML = `
    <!-- Fehlende Keywords -->
    <div class="jd-section-title">
      ⚠ Fehlende Keywords
      <span class="jd-count jd-count-miss">${missing.length}</span>
    </div>
    <div class="jd-hint-tip">Klicke ein Keyword an, um es direkt zu deinem CV hinzuzufügen</div>
    <div class="jd-tags" id="jd-missing-tags">
      ${missing.map(kw => `
        <button class="jd-tag jd-tag-miss" onclick="addKeywordToCV('${esc2(kw.word)}','${kw.category}')" title="Zum CV hinzufügen">
          ${esc2(kw.word)} <span class="jd-tag-add">+</span>
        </button>
      `).join('') || '<span class="jd-no-miss">🎉 Alle Keywords abgedeckt!</span>'}
    </div>

    <!-- Gefundene Keywords -->
    <div class="jd-section-title" style="margin-top:14px;">
      ✓ Im CV gefunden
      <span class="jd-count jd-count-ok">${matched.length}</span>
    </div>
    <div class="jd-tags">
      ${matched.map(kw => `
        <span class="jd-tag jd-tag-ok">${esc2(kw.word)}</span>
      `).join('') || '<span style="font-size:11px;color:var(--ink-faint);">Noch keine Übereinstimmungen</span>'}
    </div>

    <!-- Nach Kategorie aufschlüsseln -->
    <details class="jd-details" style="margin-top:14px;">
      <summary class="jd-details-summary">Nach Kategorie anzeigen</summary>
      <div style="margin-top:8px;">
        ${Object.values(cats).filter(c => c.items.length > 0).map(c => `
          <div class="jd-cat-block">
            <div class="jd-cat-label">${c.label}</div>
            <div class="jd-tags">
              ${c.items.map(kw => `
                <span class="jd-tag ${kw.found ? 'jd-tag-ok' : 'jd-tag-miss'}"
                      ${!kw.found ? `onclick="addKeywordToCV('${esc2(kw.word)}','${kw.category}')" style="cursor:pointer;"` : ''}>
                  ${esc2(kw.word)}${!kw.found ? ' <span class="jd-tag-add">+</span>' : ''}
                </span>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}

// ── KEYWORD ZUM CV HINZUFÜGEN ─────────────────────────────────
function addKeywordToCV(word, category) {
  const d = collectData();

  if (category === 'tech' || category === 'term' || category === 'cert') {
    // Als Skill hinzufügen
    const exists = (d.skills || []).some(s =>
      s.name.toLowerCase() === word.toLowerCase()
    );
    if (!exists) {
      addSkill({ name: word, pct: 60 });
      showToast(`✓ "${word}" zu Skills hinzugefügt`);
    } else {
      showToast(`ℹ "${word}" bereits in Skills`);
    }

  } else if (category === 'lang') {
    // Als Sprache hinzufügen
    const exists = (d.langs || []).some(l =>
      l.name.toLowerCase().includes(word.toLowerCase())
    );
    if (!exists) {
      addLang({ name: word, lvl: 'intermediate' });
      showToast(`✓ "${word}" zu Sprachen hinzugefügt`);
    } else {
      showToast(`ℹ "${word}" bereits in Sprachen`);
    }

  } else {
    // Zu Kompetenzen hinzufügen
    const kompEl = document.getElementById('f-komps');
    if (kompEl) {
      const current = kompEl.value.trim();
      if (!current.toLowerCase().includes(word.toLowerCase())) {
        kompEl.value = current ? current + ', ' + word : word;
        renderDebounced();
        showToast(`✓ "${word}" zu Kompetenzen hinzugefügt`);
      } else {
        showToast(`ℹ "${word}" bereits in Kompetenzen`);
      }
    }
  }

  // Keyword als gefunden markieren und neu rendern
  _jd.keywords = _jd.keywords.map(k =>
    k.word.toLowerCase() === word.toLowerCase() ? { ...k, found: true } : k
  );
  const found = _jd.keywords.filter(k => k.found).length;
  _jd.matchScore = Math.round((found / _jd.keywords.length) * 100);

  renderJDResults();
  if (typeof updateATSScore === 'function') updateATSScore();
}

// ── PANEL STATE ───────────────────────────────────────────────
function setJDState(state) {
  const loading  = document.getElementById('jd-loading');
  const results  = document.getElementById('jd-results-wrap');
  const inputWrap = document.getElementById('jd-input-wrap');
  const analyzeBtn = document.getElementById('jd-analyze-btn');

  if (loading)    loading.style.display     = state === 'loading'  ? 'block' : 'none';
  if (results)    results.style.display     = state === 'results'  ? 'block' : 'none';
  if (analyzeBtn) analyzeBtn.disabled       = state === 'loading';
}

// ── RESET ─────────────────────────────────────────────────────
function resetJobAnalyzer() {
  _jd.rawText    = '';
  _jd.keywords   = [];
  _jd.matchScore = 0;
  const ta = document.getElementById('jd-input');
  if (ta) ta.value = '';
  setJDState('idle');
  const wrap = document.getElementById('jd-results');
  if (wrap) wrap.innerHTML = '';
}

// ── HELPER: Escape für HTML-Attribute ────────────────────────
function esc2(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}
