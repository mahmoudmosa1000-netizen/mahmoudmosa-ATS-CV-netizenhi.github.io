// ═══════════════════════════════════════════════════════════════
//  CV BUILDER — onboarding.js
//  Schritt 10: 3-Schritte-Onboarding-Flow für neue Nutzer
//
//  Schritt 1: Willkommen + Value Proposition
//  Schritt 2: Startpunkt wählen (Leer / Beispiel / Importieren)
//  Schritt 3: Schneller Tipp + Los geht's
//
//  Zeigt sich NUR bei echten Erstbesuchern:
//  kein localStorage-Flag UND keine gespeicherten CV-Daten
// ═══════════════════════════════════════════════════════════════

let _onboardingStep = 1;
const ONBOARDING_TOTAL_STEPS = 3;

// ── PRÜFEN OB ONBOARDING GEZEIGT WERDEN SOLL ──────────────────
function maybeShowOnboarding() {
  const alreadySeen = localStorage.getItem('cvbuilder_onboarded');
  const hasData      = localStorage.getItem('cvbuilder_data');
  if (alreadySeen || hasData) return;

  // Kurze Verzögerung, damit die UI erst vollständig gerendert ist
  setTimeout(() => {
    _onboardingStep = 1;
    renderOnboardingStep();
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.style.display = 'flex';
  }, 350);
}

// ── SCHRITT-INHALTE RENDERN ─────────────────────────────────────
function renderOnboardingStep() {
  const body = document.getElementById('onboarding-body');
  const dots = document.getElementById('onboarding-dots');
  const footer = document.getElementById('onboarding-footer');
  if (!body) return;

  // Fortschritts-Punkte
  if (dots) {
    dots.innerHTML = Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, i) => {
      const n = i + 1;
      return `<span class="ob-dot ${n === _onboardingStep ? 'active' : ''} ${n < _onboardingStep ? 'done' : ''}"></span>`;
    }).join('');
  }

  if (_onboardingStep === 1) {
    body.innerHTML = `
      <div class="ob-step ob-step-welcome">
        <div class="ob-icon">🎯</div>
        <h2 class="ob-title">Willkommen beim CV Builder</h2>
        <p class="ob-sub">Erstelle in wenigen Minuten einen professionellen, ATS-optimierten Lebenslauf — komplett kostenlos und ohne Registrierung.</p>
        <div class="ob-features">
          <div class="ob-feature">
            <span class="ob-feature-icon">🤖</span>
            <div>
              <div class="ob-feature-title">ATS-optimiert</div>
              <div class="ob-feature-text">Echtzeit-Score & maschinenlesbares Text-PDF</div>
            </div>
          </div>
          <div class="ob-feature">
            <span class="ob-feature-icon">✨</span>
            <div>
              <div class="ob-feature-title">KI-Unterstützung</div>
              <div class="ob-feature-text">Bessere Formulierungen mit einem Klick</div>
            </div>
          </div>
          <div class="ob-feature">
            <span class="ob-feature-icon">🌍</span>
            <div>
              <div class="ob-feature-title">Mehrsprachig</div>
              <div class="ob-feature-text">Deutsch, Englisch und Arabisch</div>
            </div>
          </div>
        </div>
      </div>`;
    if (footer) footer.innerHTML = `
      <button class="btn btn-ghost" onclick="skipOnboarding()">Überspringen</button>
      <button class="btn btn-primary" onclick="onboardingNext()">Los geht's →</button>`;
  }

  else if (_onboardingStep === 2) {
    body.innerHTML = `
      <div class="ob-step">
        <h2 class="ob-title ob-title-sm">Wie möchtest du starten?</h2>
        <p class="ob-sub">Wähle eine Option — du kannst später jederzeit alles anpassen.</p>
        <div class="ob-cards">
          <button type="button" class="ob-card" onclick="onboardingChooseStart('blank')">
            <span class="ob-card-icon">📋</span>
            <span class="ob-card-title">Von Null starten</span>
            <span class="ob-card-text">Leeres Profil, Schritt für Schritt ausfüllen</span>
          </button>
          <button type="button" class="ob-card" onclick="onboardingChooseStart('example')">
            <span class="ob-card-icon">✨</span>
            <span class="ob-card-title">Beispiel ansehen</span>
            <span class="ob-card-text">Mit Beispieldaten alle Funktionen erkunden</span>
          </button>
          <button type="button" class="ob-card" onclick="onboardingChooseStart('import')">
            <span class="ob-card-icon">📤</span>
            <span class="ob-card-title">Daten importieren</span>
            <span class="ob-card-text">JSON Resume oder vorheriger Export</span>
          </button>
        </div>
      </div>`;
    if (footer) footer.innerHTML = `
      <button class="btn btn-ghost" onclick="onboardingPrev()">← Zurück</button>
      <span class="ob-footer-spacer"></span>`;
  }

  else if (_onboardingStep === 3) {
    body.innerHTML = `
      <div class="ob-step ob-step-final">
        <div class="ob-icon">💡</div>
        <h2 class="ob-title ob-title-sm">Ein letzter Tipp</h2>
        <div class="ob-tip-box">
          <div class="ob-tip-row"><span>🎯</span> Behalte den <strong>ATS-Score</strong> oben links im Blick — er zeigt dir in Echtzeit, was noch fehlt.</div>
          <div class="ob-tip-row"><span>✨</span> Nutze die <strong>KI-Buttons</strong> direkt in den Textfeldern, um Beschreibungen zu verbessern.</div>
          <div class="ob-tip-row"><span>🔍</span> Füge im Tab <strong>"Job"</strong> eine Stellenanzeige ein, um passende Keywords zu finden.</div>
        </div>
      </div>`;
    if (footer) footer.innerHTML = `
      <button class="btn btn-ghost" onclick="onboardingPrev()">← Zurück</button>
      <button class="btn btn-primary" onclick="finishOnboarding()">Jetzt starten →</button>`;
  }
}

// ── NAVIGATION ───────────────────────────────────────────────
function onboardingNext() {
  if (_onboardingStep < ONBOARDING_TOTAL_STEPS) {
    _onboardingStep++;
    renderOnboardingStep();
  }
}
function onboardingPrev() {
  if (_onboardingStep > 1) {
    _onboardingStep--;
    renderOnboardingStep();
  }
}

// ── STARTPUNKT WÄHLEN (Schritt 2) ─────────────────────────────
function onboardingChooseStart(mode) {
  if (mode === 'blank') {
    // Nichts zu tun — leeres Profil ist bereits Standard
    onboardingNext();
  } else if (mode === 'example') {
    loadOnboardingExample();
    onboardingNext();
  } else if (mode === 'import') {
    // Onboarding schließen, dann den bestehenden Import-Dialog öffnen
    finishOnboarding(true);
    setTimeout(() => { if (typeof triggerImport === 'function') triggerImport(); }, 200);
  }
}

// ── BEISPIELDATEN LADEN ────────────────────────────────────────
function loadOnboardingExample() {
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'de';

  const examples = {
    de: {
      name: 'Anna Beispiel', role: 'Marketing Managerin',
      email: 'anna.beispiel@email.com', phone: '+49 151 23456789', address: 'Berlin, Deutschland',
      summary: 'Erfahrene Marketing-Managerin mit 6 Jahren Erfahrung im B2B-Bereich. Spezialisiert auf datengetriebene Kampagnen, Content-Strategie und Teamführung. Steigerte den Lead-Output in der aktuellen Position um 45%.',
      komps: 'Projektmanagement\nDatenanalyse\nTeamführung\nContent-Strategie',
      exp: [
        { title: 'Senior Marketing Managerin', company: 'TechVision GmbH', from: 'Jan. 2022', to: 'Heute',
          desc: '• Leitete ein 5-köpfiges Marketing-Team und steigerte den Lead-Output um 45%\n• Entwickelte eine datengetriebene Content-Strategie für 3 Produktlinien\n• Optimierte das Marketing-Budget und reduzierte die Kosten pro Lead um 22%' },
        { title: 'Marketing Specialist', company: 'Digital Solutions AG', from: 'Mär. 2019', to: 'Dez. 2021',
          desc: '• Koordinierte Social-Media-Kampagnen mit über 2 Mio. Reichweite monatlich\n• Analysierte Kampagnen-Performance und präsentierte Ergebnisse an die Geschäftsführung' },
      ],
      edu: [
        { degree: 'M.Sc. Marketing & Kommunikation', school: 'Universität Hamburg', from: '2017', to: '2019' },
      ],
      skills: [ { name: 'Google Analytics', pct: 90 }, { name: 'HubSpot', pct: 70 }, { name: 'SEO/SEM', pct: 70 } ],
      langs: [ { name: 'Deutsch', lvl: 'native' }, { name: 'Englisch', lvl: 'advanced' } ],
    },
    en: {
      name: 'Anna Example', role: 'Marketing Manager',
      email: 'anna.example@email.com', phone: '+1 555 123 4567', address: 'Berlin, Germany',
      summary: 'Experienced Marketing Manager with 6 years in B2B environments. Specialized in data-driven campaigns, content strategy and team leadership. Increased lead output by 45% in current role.',
      komps: 'Project Management\nData Analysis\nTeam Leadership\nContent Strategy',
      exp: [
        { title: 'Senior Marketing Manager', company: 'TechVision Inc.', from: 'Jan. 2022', to: 'Present',
          desc: '• Led a 5-person marketing team and increased lead output by 45%\n• Developed a data-driven content strategy across 3 product lines\n• Optimized marketing budget, reducing cost-per-lead by 22%' },
        { title: 'Marketing Specialist', company: 'Digital Solutions Co.', from: 'Mar. 2019', to: 'Dec. 2021',
          desc: '• Coordinated social media campaigns reaching 2M+ users monthly\n• Analyzed campaign performance and presented results to leadership' },
      ],
      edu: [
        { degree: 'M.Sc. Marketing & Communication', school: 'University of Hamburg', from: '2017', to: '2019' },
      ],
      skills: [ { name: 'Google Analytics', pct: 90 }, { name: 'HubSpot', pct: 70 }, { name: 'SEO/SEM', pct: 70 } ],
      langs: [ { name: 'English', lvl: 'native' }, { name: 'German', lvl: 'advanced' } ],
    },
  };

  const ex = examples[lang] || examples.de;

  // Bestehende Daten leeren und Beispiel anwenden (applyData übernimmt alles)
  if (typeof applyData === 'function') {
    applyData({
      name: ex.name, role: ex.role, email: ex.email, phone: ex.phone, address: ex.address,
      summary: ex.summary, komps: ex.komps,
      exp: ex.exp, edu: ex.edu, skills: ex.skills, langs: ex.langs,
    });
  }
  showToast('✓ Beispiel geladen — passe es jetzt an dich an!');
}

// ── ONBOARDING SCHLIESSEN ──────────────────────────────────────
function skipOnboarding() {
  finishOnboarding();
}

function finishOnboarding(silent) {
  const modal = document.getElementById('onboarding-modal');
  if (modal) modal.style.display = 'none';
  localStorage.setItem('cvbuilder_onboarded', '1');
  if (!silent) {
    // Fokus auf das Namensfeld legen, um direkt loslegen zu können
    setTimeout(() => {
      const nameField = document.getElementById('f-name');
      if (nameField) nameField.focus();
    }, 150);
  }
}

// ── Erneut anzeigen (z.B. über Hilfe-Link) ─────────────────────
function restartOnboarding() {
  localStorage.removeItem('cvbuilder_onboarded');
  _onboardingStep = 1;
  renderOnboardingStep();
  const modal = document.getElementById('onboarding-modal');
  if (modal) modal.style.display = 'flex';
}

// ── START: nach vollständigem Laden prüfen ──────────────────────
setTimeout(maybeShowOnboarding, 500);
