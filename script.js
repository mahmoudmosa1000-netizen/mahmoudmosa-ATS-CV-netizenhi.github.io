// ═══════════════════════════════════════════════
//  CV BUILDER — script.js  (v3 – alle Features)
// ═══════════════════════════════════════════════

let state = {
  color:'#3b4f3a', font:'Playfair Display', photoData:'',
  page2Entries:[],
  exp:[], edu:[], skills:[], langs:[], extraquals:[],
  refs:[], certs:[], projects:[],
  savedExp:[], savedEdu:[], savedSkills:[], savedLangs:[], savedExtraQuals:[],
  savedRefs:[], savedCerts:[], savedProjects:[],
};

let zoom=1;
let expCount=0, eduCount=0, p2Count=0, eqCount=0, refCount=0, certCount=0, projCount=0;
let undoStack=[];
let sectionOrder=['profile','experience','education','komps','hobbies','extraquals','referenzen','zertifikate','projekte','folio'];
let autoSaveTimer=null;
let dragSrcId=null, dragType=null;

// ─── DEBOUNCE ───────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
const renderDebounced = debounce(() => render(), 150);

const COLORS=[
  {val:'#2d3d2c'},{val:'#1a3a5c'},{val:'#5c2d2d'},
  {val:'#2d2d4a'},{val:'#3d3020'},{val:'#1a4040'},
  {val:'#4a3a1a'},{val:'#2a2a2a'},{val:'#8F9790'},
];
const FONTS=[
  {val:'Playfair Display',label:'Playfair',   subKey:'fontClassic'},
  {val:'Georgia',          label:'Georgia',    subKey:'fontTraditional'},
  {val:'"Source Sans 3"',  label:'Source Sans',subKey:'fontModern'},
  {val:'Verdana',          label:'Verdana',    subKey:'fontClear'},
];
function getSectionLabels(){return{
  profile:t('cvProfile'), experience:t('cvExperience'),
  education:t('cvEducation'), komps:t('cvKomps'),
  hobbies:t('cvInterests'), extraquals:t('cvExtraQual'),
  referenzen:t('cvReferenzen'), zertifikate:t('cvZertifikate'), projekte:t('cvProjekte'),
  folio:t('cvFolioSection')||'Portfolio & Links',
};}
// Keep for import/export key validation only (values not shown in UI)
const SECTION_LABELS={
  profile:'profile', experience:'experience', education:'education', komps:'komps',
  hobbies:'hobbies', extraquals:'extraquals', referenzen:'referenzen',
  zertifikate:'zertifikate', projekte:'projekte', folio:'folio',
};
function getRoleSuggestions(){ return t('roleSuggestions').split('|'); }

// ─── INIT ───────────────────────────────────────
function init() {
  const isAr=currentLang==='ar';
  document.documentElement.setAttribute('dir',isAr?'rtl':'ltr');
  document.documentElement.setAttribute('lang',currentLang);
  buildColorPicker(); buildFontPicker(); buildSectionOrderUI();
  buildRoleSuggestions();
  loadSaved(); buildDynamicLists();
  applyTranslations(); buildProfilesList();
  startAutoSave(); updateProgress(); render(); if(typeof updateATSScore==="function") updateATSScore();
  initKeyboardShortcuts();
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    // Don't hijack shortcuts when typing in inputs/textareas
    const inField = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveData();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !inField) {
      e.preventDefault();
      undoDelete();
    }
  });
}

function buildRoleSuggestions() {
  let dl=document.getElementById('role-suggestions');
  if(!dl){dl=document.createElement('datalist');dl.id='role-suggestions';document.body.appendChild(dl);}
  dl.innerHTML=getRoleSuggestions().map(r=>`<option value="${r}">`).join('');
}

function buildColorPicker() {
  const wrap=document.getElementById('color-picker'); if(!wrap) return;
  COLORS.forEach(c=>{
    const el=document.createElement('div');
    el.className='color-opt'+(state.color===c.val?' selected':'');
    el.style.backgroundColor=c.val;
    el.onclick=()=>{
      state.color=c.val;
      document.querySelectorAll('.color-opt').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      const cc=document.getElementById('f-custom-color');if(cc)cc.value=c.val;
      render();
    };
    wrap.appendChild(el);
  });
}

function setCustomColor(val) {
  state.color = val;
  document.querySelectorAll('.color-opt').forEach(x=>x.classList.remove('selected'));
  render();
}

function buildFontPicker() {
  const wrap=document.getElementById('font-picker'); if(!wrap) return;
  wrap.innerHTML='';
  FONTS.forEach(f=>{
    const el=document.createElement('div');
    el.className='font-opt'+(state.font===f.val?' selected':'');
    el.innerHTML=`<div class="font-opt-name" style="font-family:${f.val}">${f.label}</div><div class="font-opt-label">${t(f.subKey)}</div>`;
    el.onclick=()=>{state.font=f.val;document.querySelectorAll('.font-opt').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');render();};
    wrap.appendChild(el);
  });
}

// ─── SECTION ORDER ──────────────────────────────
function buildSectionOrderUI() {
  const wrap=document.getElementById('section-order-list'); if(!wrap) return;
  wrap.innerHTML='';
  const labels=getSectionLabels();
  sectionOrder.forEach(key=>{
    const item=document.createElement('div');
    item.className='section-order-item'; item.draggable=true; item.dataset.key=key;
    item.innerHTML=`<span class="so-handle">⠿</span><span>${labels[key]||SECTION_LABELS[key]||key}</span>`;
    item.addEventListener('dragstart',e=>{dragSrcId=key;dragType='section';item.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
    item.addEventListener('dragend',()=>item.classList.remove('dragging'));
    item.addEventListener('dragover',e=>{e.preventDefault();item.classList.add('drag-over');});
    item.addEventListener('dragleave',()=>item.classList.remove('drag-over'));
    item.addEventListener('drop',e=>{
      e.preventDefault();item.classList.remove('drag-over');
      if(dragType!=='section'||dragSrcId===key) return;
      const from=sectionOrder.indexOf(dragSrcId), to=sectionOrder.indexOf(key);
      sectionOrder.splice(to,0,sectionOrder.splice(from,1)[0]);
      buildSectionOrderUI(); render();
    });
    wrap.appendChild(item);
  });
}

// ─── TABS ───────────────────────────────────────
function switchTab(id,btn) {
  document.querySelectorAll('.etab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.epanel').forEach(p=>{p.classList.remove('active');p.style.display='none';});
  btn.classList.add('active');
  const panel = document.getElementById('panel-'+id);
  if(panel){ panel.style.display='block'; panel.classList.add('active'); }
  if(id==='design') setTimeout(updatePhotoDesignPreview, 50);
}

// ─── PROFILES ───────────────────────────────────
function getProfiles(){try{return JSON.parse(localStorage.getItem('cvbuilder_profiles')||'[]');}catch{return[];}}
function saveProfiles(arr){localStorage.setItem('cvbuilder_profiles',JSON.stringify(arr));}
function getCurrentProfileId(){return localStorage.getItem('cvbuilder_current_profile')||'';}
function setCurrentProfileId(id){localStorage.setItem('cvbuilder_current_profile',id);}

function buildProfilesList(){
  const wrap=document.getElementById('profiles-list'); if(!wrap) return;
  const profiles=getProfiles(), curId=getCurrentProfileId();
  wrap.innerHTML=profiles.length===0?`<div style="font-size:12px;color:#888;padding:8px 0;">${t('noProfiles')}</div>`:'';
  profiles.forEach(p=>{
    const row=document.createElement('div'); row.className='profile-row'+(p.id===curId?' active':'');
    row.innerHTML=`<span class="profile-name">${h(p.name)}</span><div class="profile-btns"><button class="pbtn" onclick="loadProfile('${p.id}')">Laden</button><button class="pbtn danger" onclick="deleteProfile('${p.id}')">×</button></div>`;
    wrap.appendChild(row);
  });
  const cnt=document.getElementById('profile-count'); if(cnt) cnt.textContent=profiles.length+'/5';
}

function saveAsProfile(){
  const profiles=getProfiles();
  if(profiles.length>=5){showToast('❌ '+t('toastMaxProfiles'));return;}
  const name=prompt('Profilname:','Profil '+(profiles.length+1)); if(!name) return;
  const id='p_'+Date.now(), data=collectData();
  profiles.push({id,name:name.trim(),data}); saveProfiles(profiles);
  setCurrentProfileId(id); buildProfilesList(); showToast('✓ '+t('toastProfileSaved')+': '+name);
}
function loadProfile(id){
  const p=getProfiles().find(x=>x.id===id); if(!p) return;
  if(!confirm('Aktuellen Stand mit "'+p.name+'" überschreiben?')) return;
  setCurrentProfileId(id); applyData(p.data); buildProfilesList(); showToast('✓ '+t('toastProfileLoaded')+': '+p.name);
  document.getElementById('profile-modal').style.display='none';
}
function deleteProfile(id){
  let profiles=getProfiles(); const p=profiles.find(x=>x.id===id);
  if(!p||!confirm('Profil "'+p.name+'" löschen?')) return;
  profiles=profiles.filter(x=>x.id!==id); saveProfiles(profiles);
  if(getCurrentProfileId()===id) setCurrentProfileId('');
  buildProfilesList(); showToast(t('toastProfileDeleted'));
}
function openProfileModal(){buildProfilesList();document.getElementById('profile-modal').style.display='flex';}
function closeProfileModal(){document.getElementById('profile-modal').style.display='none';}

// ─── CHAR COUNTER ───────────────────────────────
function updateCharCount(){
  const el=document.getElementById('f-summary'), counter=document.getElementById('summary-char-count');
  if(!el||!counter) return;
  const len=el.value.length;
  counter.textContent=len+' / 600';
  counter.style.color=len>600?'#c0392b':len>480?'#e67e22':'#8a9e89';
}

// ─── PROGRESS ───────────────────────────────────
function updateProgress(){
  const fields=['f-name','f-role','f-email','f-phone','f-address','f-summary'];
  const filled=fields.filter(id=>val(id).trim().length>0).length;
  const bonus=(state.exp.length>0?1:0)+(state.edu.length>0?1:0)+(state.skills.length>0?1:0)+(state.photoData?1:0);
  const pct=Math.round(((filled+bonus)/(fields.length+4))*100);
  const bar=document.getElementById('progress-fill'), label=document.getElementById('progress-label');
  if(bar){bar.style.width=pct+'%'; bar.style.background=pct>=80?'#5a7358':pct>=50?'#e67e22':'#c0392b';}
  if(label) label.textContent=pct+'%';
}

// ─── AUTO-SAVE ──────────────────────────────────
function startAutoSave(){
  if(autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer=setInterval(()=>saveData(true),30000);
}

// ─── QR CODE ────────────────────────────────────
let _qrDataUrl = '';
let _qrFrame   = 'none';

// ─── FOLIO LINKS (multi-entry) ───────────────────
let _folioLinks = []; // [{id, url, label, showLink, showQR, qrDataUrl}]
let _folioCount = 0;

function addFolioLink(data = {}) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  _folioCount++;
  const num = _folioCount;
  const pos = data.pos || 'left'; // 'left' = sidebar, 'overlay' = free floating on CV
  _folioLinks.push({ id, url: data.url||'', label: data.label||'', showLink: data.showLink!==false, showQR: !!data.showQR, qrDataUrl: data.qrDataUrl||'', pos });

  const list = document.getElementById('folio-links-list');
  const card = document.createElement('div');
  card.className = 'folio-link-card';
  card.id = 'folio-card-' + id;

  card.innerHTML = `
    <div class="folio-card-header">
      <span class="folio-card-icon">🔗</span>
      <span class="folio-card-num">Link #${num}</span>
      <button class="folio-card-del" onclick="removeFolioLink('${id}')" title="Entfernen">×</button>
    </div>
    <div class="form-group" style="margin-bottom:8px;">
      <label style="font-size:11px;" data-i18n="labelFolioURL">URL</label>
      <input type="text" id="fl-url-${id}" value="${esc(data.url||'')}"
        placeholder="https://behance.net/..." data-i18n="placeholderFolioURL" data-i18n-attr="placeholder"
        oninput="onFolioLinkInput('${id}')">
    </div>
    <div class="form-group" style="margin-bottom:8px;">
      <label style="font-size:11px;" data-i18n="labelFolioLinkText">Linktext im Lebenslauf</label>
      <input type="text" id="fl-label-${id}" value="${esc(data.label||'')}"
        placeholder="z.B. Mein Portfolio" data-i18n="placeholderFolioLinkText" data-i18n-attr="placeholder"
        oninput="onFolioLinkInput('${id}')">
    </div>

    <!-- ── ANZEIGEN ALS + POSITION (immer sichtbar) ── -->
    <div class="folio-display-grid">
      <!-- Links: Anzeigen-Optionen -->
      <div class="folio-display-col">
        <div class="folio-col-head">Anzeigen als</div>
        <label class="folio-toggle-label" style="margin-bottom:6px;">
          <input type="checkbox" id="fl-showlink-${id}" ${data.showLink!==false?'checked':''} onchange="onFolioVisibilityChange('${id}')">
          <span>🔗 Klickbarer Link</span>
        </label>
        <label class="folio-toggle-label">
          <input type="checkbox" id="fl-showqr-${id}" ${data.showQR?'checked':''} onchange="onFolioVisibilityChange('${id}')">
          <span>🔲 QR-Code</span>
        </label>
      </div>
      <!-- Rechts: Position -->
      <div class="folio-display-col">
        <div class="folio-col-head">Position im CV</div>
        <button class="folio-pos-pill ${pos==='left'?'active':''}" onclick="setFolioLinkPos('${id}','left')" id="fl-pill-left-${id}">
          ⬅ Links
          <span class="folio-pos-desc">Seitenleiste</span>
        </button>
        <button class="folio-pos-pill ${pos==='right'?'active':''}" onclick="setFolioLinkPos('${id}','right')" id="fl-pill-right-${id}">
          ➡ Rechts
          <span class="folio-pos-desc">Hauptbereich</span>
        </button>
        <button class="folio-pos-pill ${pos==='overlay'?'active':''}" onclick="setFolioLinkPos('${id}','overlay')" id="fl-pill-overlay-${id}" style="margin-top:4px;">
          📌 Frei
          <span class="folio-pos-desc">Overlay auf CV</span>
        </button>
      </div>
    </div>

    <!-- Overlay controls (nur bei pos=overlay) -->
    <div id="fl-overlay-controls-${id}" style="${pos==='overlay'?'':'display:none;'}margin-top:8px;padding:10px;background:#f5f5f5;border-radius:7px;">
      <div style="font-size:10px;color:var(--ink-faint);margin-bottom:8px;font-weight:600;">📍 Frei-Position auf dem CV (in %)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <div>
          <label style="font-size:10px;">Horizontal: <span id="fl-ox-label-${id}">${data.overlayX||'75'}%</span></label>
          <input type="range" id="fl-ox-${id}" min="0" max="92" value="${data.overlayX||75}" step="1"
            oninput="document.getElementById('fl-ox-label-${id}').textContent=this.value+'%';onFolioLinkInput('${id}')"
            style="width:100%;accent-color:var(--g-muted);">
        </div>
        <div>
          <label style="font-size:10px;">Vertikal: <span id="fl-oy-label-${id}">${data.overlayY||'4'}%</span></label>
          <input type="range" id="fl-oy-${id}" min="0" max="92" value="${data.overlayY||4}" step="1"
            oninput="document.getElementById('fl-oy-label-${id}').textContent=this.value+'%';onFolioLinkInput('${id}')"
            style="width:100%;accent-color:var(--g-muted);">
        </div>
      </div>
      <div style="margin-bottom:6px;">
        <label style="font-size:10px;">Größe: <span id="fl-os-label-${id}">${data.overlaySize||64}px</span></label>
        <input type="range" id="fl-os-${id}" min="40" max="130" value="${data.overlaySize||64}" step="4"
          oninput="document.getElementById('fl-os-label-${id}').textContent=this.value+'px';onFolioLinkInput('${id}')"
          style="width:100%;accent-color:var(--g-muted);">
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',4,4)" style="font-size:9px;">↖ Lo</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',38,4)" style="font-size:9px;">↑ Mo</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',88,4)" style="font-size:9px;">↗ Ro</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',4,44)" style="font-size:9px;">← Lm</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',38,44)" style="font-size:9px;">⊙</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',88,44)" style="font-size:9px;">→ Rm</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',4,86)" style="font-size:9px;">↙ Lu</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',38,86)" style="font-size:9px;">↓ Mu</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',88,86)" style="font-size:9px;">↘ Ru</button>
      </div>
      <div style="font-size:9px;color:var(--ink-faint);margin-top:5px;" data-i18n="folioOverlayDragHint">💡 QR-Code im Vorschau-Bereich direkt verschieben.</div>
    </div>

    <!-- QR Vorschau (bei showQR) -->
    <div class="folio-qr-mini-preview" id="fl-qrpreview-${id}" ${data.showQR&&data.qrDataUrl?'style="display:block;"':''}>
      <div class="qr-mini-label" data-i18n="folioQRPreviewLabel">QR-Code Vorschau</div>
      <div id="fl-qrout-${id}" style="display:inline-block;">${data.qrDataUrl?`<img src="${data.qrDataUrl}" style="width:100px;height:100px;image-rendering:crisp-edges;">`:''}</div>
      <div style="margin-top:6px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
        <button class="btn-add" style="margin:0;font-size:10px;padding:3px 10px;" onclick="regenerateFolioQR('${id}')" data-i18n="btnRegenQR">🔄 Neu generieren</button>
        <button class="btn-add" style="margin:0;font-size:10px;padding:3px 10px;" onclick="downloadSingleFolioQR('${id}')" data-i18n="btnDownloadFolioQR">⬇ PNG</button>
      </div>
    </div>`;

  list.appendChild(card);
  if (data.showQR && data.url) setTimeout(() => generateSingleFolioQR(id), 150);
  render();
}

function setFolioLinkPos(id, pos) {
  const obj = getFolioLinkObj(id);
  if (obj) obj.pos = pos;
  // Update pill active states
  ['left','right','overlay'].forEach(p => {
    const btn = document.getElementById('fl-pill-' + p + '-' + id);
    if (btn) btn.classList.toggle('active', p === pos);
  });
  // Show/hide overlay controls (only for overlay position)
  const oc = document.getElementById('fl-overlay-controls-' + id);
  if (oc) oc.style.display = pos === 'overlay' ? 'block' : 'none';
  renderDebounced();
}

function snapFolioOverlay(id, x, y) {
  const ox = document.getElementById('fl-ox-' + id);
  const oy = document.getElementById('fl-oy-' + id);
  const lx = document.getElementById('fl-ox-label-' + id);
  const ly = document.getElementById('fl-oy-label-' + id);
  if (ox) { ox.value = x; if (lx) lx.textContent = x + '%'; }
  if (oy) { oy.value = y; if (ly) ly.textContent = y + '%'; }
  onFolioLinkInput(id);
}

function removeFolioLink(id) {
  const card = document.getElementById('folio-card-' + id);
  if (card) card.remove();
  _folioLinks = _folioLinks.filter(l => l.id !== id);
  render();
}

function getFolioLinkObj(id) {
  return _folioLinks.find(l => l.id === id);
}

function onFolioLinkInput(id) {
  const obj = getFolioLinkObj(id);
  if (!obj) return;
  obj.url       = val('fl-url-' + id);
  obj.label     = val('fl-label-' + id);
  obj.showLink  = (document.getElementById('fl-showlink-' + id)||{}).checked !== false;
  obj.overlayX  = parseFloat((document.getElementById('fl-ox-' + id)||{}).value ?? obj.overlayX ?? 75);
  obj.overlayY  = parseFloat((document.getElementById('fl-oy-' + id)||{}).value ?? obj.overlayY ?? 4);
  obj.overlaySize = parseInt((document.getElementById('fl-os-' + id)||{}).value || obj.overlaySize || 64);
  renderDebounced();
}

function onFolioVisibilityChange(id) {
  const obj = getFolioLinkObj(id);
  if (!obj) return;
  obj.url      = val('fl-url-' + id);
  obj.label    = val('fl-label-' + id);
  obj.showLink = (document.getElementById('fl-showlink-' + id)||{}).checked !== false;
  obj.showQR   = !!((document.getElementById('fl-showqr-' + id)||{}).checked);

  const preview = document.getElementById('fl-qrpreview-' + id);
  if (!obj.showQR) {
    if (preview) preview.style.display = 'none';
    obj.qrDataUrl = '';
    renderDebounced();
    return;
  }
  if (preview) preview.style.display = 'block';
  generateSingleFolioQR(id);
}

function onFolioToggleQR(id) { onFolioVisibilityChange(id); }

function generateSingleFolioQR(id) {
  const obj = getFolioLinkObj(id);
  if (!obj || !obj.url) return;
  const outEl = document.getElementById('fl-qrout-' + id);
  if (!outEl) return;
  outEl.innerHTML = '';
  const url = obj.url.startsWith('http') ? obj.url : 'https://' + obj.url;
  const tmp = document.createElement('div');
  outEl.appendChild(tmp);
  try {
    new QRCode(tmp, { text: url, width: 120, height: 120, colorDark: '#1a2419', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    setTimeout(() => {
      const img = tmp.querySelector('img') || tmp.querySelector('canvas');
      if (img) {
        obj.qrDataUrl = img.tagName === 'CANVAS' ? img.toDataURL('image/png') : img.src;
      }
      render();
    }, 220);
  } catch(e) { console.warn('Folio QR error', e); }
}

function regenerateFolioQR(id) {
  generateSingleFolioQR(id);
  showToast('🔲 QR-Code wird generiert…');
}

function downloadSingleFolioQR(id) {
  const obj = getFolioLinkObj(id);
  if (!obj || !obj.qrDataUrl) { showToast('⚠ Bitte zuerst eine URL eingeben und QR generieren'); return; }
  const a = document.createElement('a');
  a.href = obj.qrDataUrl;
  const safeName = (obj.label || val('f-name') || 'QR').replace(/\s+/g, '_');
  a.download = safeName + '_QR.png';
  a.click();
}

// Legacy stubs (keep for old saved data compat)
let _folioQRDataUrl = '';
function updateFolioQR() {}
function downloadFolioQR() {}

function selectQRFrame(el, frame) {
  document.querySelectorAll('.qr-frame-opt').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
  _qrFrame = frame;
  const bw = document.getElementById('qr-border-wrap');
  if (bw) bw.style.display = (frame === 'none') ? 'none' : 'block';
  if (_qrDataUrl) buildQRCanvas(getQRUrl());
}

function getQRUrl() {
  const mode = (document.getElementById('qr-content')||{}).value || 'web';
  if (mode === 'custom')   return val('qr-custom-text') || '';
  if (mode === 'email')    { const e = val('f-email'); return e ? 'mailto:'+e : ''; }
  if (mode === 'linkedin') { const li = val('f-linkedin'); return li ? (li.startsWith('http') ? li : 'https://'+li) : ''; }
  const w = val('f-web'); return w ? (w.startsWith('http') ? w : 'https://'+w) : '';
}

function generateQR() {
  // Toggle sub-panel visibility
  const chk  = document.getElementById('qr-in-cv');
  const opts  = document.getElementById('qr-cv-options');
  if (chk && opts) opts.style.display = chk.checked ? 'block' : 'none';

  const mode = (document.getElementById('qr-content')||{}).value || 'web';
  const cw   = document.getElementById('qr-custom-wrap');
  if (cw) cw.style.display = mode === 'custom' ? 'block' : 'none';

  const lpos = (document.getElementById('qr-label-pos')||{}).value || 'none';
  const capW = document.getElementById('qr-caption-wrap');
  if (capW) capW.style.display = lpos === 'none' ? 'none' : 'block';

  const url = getQRUrl();
  if (!url) {
    if (chk && chk.checked) showToast('⚠ '+t('toastQRNoURL'));
    return;
  }
  buildQRCanvas(url);
}

function buildQRCanvas(url) {
  const target = document.getElementById('qr-output');
  const label  = document.getElementById('qr-url-label');
  if (!target) return;
  target.innerHTML = ''; _qrDataUrl = '';

  if (typeof QRCode === 'undefined') {
    target.innerHTML = '<div style="padding:16px;color:#c0392b;font-size:12px;text-align:center;">QR-Bibliothek nicht geladen.</div>';
    return;
  }

  const eclMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };
  const ecl    = eclMap[(document.getElementById('qr-ecl')||{}).value || 'M'] || QRCode.CorrectLevel.M;
  const darkC  = (document.getElementById('qr-dark-color') ||{}).value || state.color || '#2d3d2c';
  const lightC = (document.getElementById('qr-light-color')||{}).value || '#ffffff';
  const isTransparent = lightC === 'transparent';

  const RENDER = 480; // high-res base
  const tmp = document.createElement('div'); tmp.style.display = 'none'; document.body.appendChild(tmp);

  new QRCode(tmp, {
    text: url, width: RENDER, height: RENDER,
    colorDark:  darkC,
    colorLight: isTransparent ? '#ffffff' : lightC,
    correctLevel: ecl,
  });

  setTimeout(() => {
    const srcCanvas = tmp.querySelector('canvas');
    if (!srcCanvas) { tmp.remove(); return; }

    const border  = parseInt((document.getElementById('qr-border-size')||{}).value || '2');
    const pad     = _qrFrame === 'none' ? 0 : border * 6 + 12;
    const total   = RENDER + pad * 2;
    const fc      = document.createElement('canvas');
    fc.width = fc.height = total;
    const ctx = fc.getContext('2d');

    // ── Background ──
    ctx.clearRect(0, 0, total, total);
    if (!isTransparent) {
      if (_qrFrame === 'badge') {
        ctx.fillStyle = '#f5f5f5';
        drawRR(ctx, 0, 0, total, total, 22); ctx.fill();
      } else if (_qrFrame === 'colored') {
        ctx.fillStyle = darkC;
        drawRR(ctx, 0, 0, total, total, 22); ctx.fill();
      } else {
        ctx.fillStyle = lightC;
        ctx.fillRect(0, 0, total, total);
      }
    }

    // ── QR image ──
    ctx.drawImage(srcCanvas, pad, pad, RENDER, RENDER);

    // ── Transparent: erase light pixels ──
    if (isTransparent) {
      const imgData = ctx.getImageData(0, 0, total, total);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 200 && d[i+1] > 200 && d[i+2] > 200) d[i+3] = 0;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // ── Frame border ──
    if (_qrFrame !== 'none') {
      const bw = border * 2.5;
      const br = { simple: 0, rounded: 16, shadow: 6, badge: 22, colored: 22 }[_qrFrame] || 8;
      ctx.strokeStyle = _qrFrame === 'colored' ? 'rgba(255,255,255,0.35)' : darkC;
      ctx.lineWidth = bw;
      drawRR(ctx, bw/2, bw/2, total-bw, total-bw, br); ctx.stroke();

      if (_qrFrame === 'shadow') {
        const sc = document.createElement('canvas');
        sc.width = total + 16; sc.height = total + 16;
        const sc2 = sc.getContext('2d');
        sc2.shadowColor = 'rgba(0,0,0,0.22)'; sc2.shadowBlur = 14;
        sc2.shadowOffsetX = 5; sc2.shadowOffsetY = 5;
        sc2.drawImage(fc, 0, 0);
        const fc3 = document.createElement('canvas');
        fc3.width = sc.width; fc3.height = sc.height;
        fc3.getContext('2d').drawImage(sc, 0, 0);
        _qrDataUrl = fc3.toDataURL('image/png');
        target.innerHTML = `<img src="${_qrDataUrl}" style="max-width:160px;display:block;margin:0 auto;image-rendering:crisp-edges;">`;
        if (label) label.textContent = url;
        tmp.remove(); render(); return;
      }
    }

    _qrDataUrl = fc.toDataURL('image/png');
    target.innerHTML = `<img src="${_qrDataUrl}" style="max-width:160px;display:block;margin:0 auto;image-rendering:crisp-edges;">`;
    if (label) label.textContent = url;
    tmp.remove();
    render();
  }, 150);
}

function drawRR(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

function downloadQR() {
  if (!_qrDataUrl) {
    generateQR();
    setTimeout(() => {
      if (_qrDataUrl) downloadQR();
      else showToast('⚠ '+t('toastQRFailed'));
    }, 500);
    return;
  }
  const a = document.createElement('a');
  a.href     = _qrDataUrl;
  a.download = (val('f-name')||'CV').replace(/\s+/g,'_') + '_QRCode.png';
  a.click();
  showToast('✓ '+t('toastQRDownloaded'));
}

// ─── QR SNAP ─────────────────────────────────────
function snapQR(x, y) {
  const ex = document.getElementById('qr-x'), ey = document.getElementById('qr-y');
  if (ex) { ex.value = x; document.getElementById('qr-x-label').textContent = x + '%'; }
  if (ey) { ey.value = y; document.getElementById('qr-y-label').textContent = y + '%'; }
  render();
}

// ─── QR DRAG & DROP ON CV PAPER ──────────────────
function initQRDrag(el) {
  const paper = document.getElementById('cv-paper');
  let startX, startY, startL, startT;

  el.addEventListener('mousedown', e => {
    e.preventDefault();
    const rect = paper.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startL = (parseFloat(el.style.left) / 100) * paper.offsetWidth;
    startT = (parseFloat(el.style.top)  / 100) * paper.offsetHeight;
    el.style.transition = 'none';

    const onMove = e => {
      const dx = e.clientX - startX, dy = e.clientY - startY;
      const newL = startL + dx, newT = startT + dy;
      const pctX = (newL / paper.offsetWidth)  * 100;
      const pctY = (newT / paper.offsetHeight) * 100;
      el.style.left = pctX + '%';
      el.style.top  = pctY + '%';

      // Sync sliders
      const ex = document.getElementById('qr-x'), ey = document.getElementById('qr-y');
      if (ex) { ex.value = Math.round(pctX); document.getElementById('qr-x-label').textContent = Math.round(pctX) + '%'; }
      if (ey) { ey.value = Math.round(pctY); document.getElementById('qr-y-label').textContent = Math.round(pctY) + '%'; }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      el.style.transition = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Touch support
  el.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    startL = (parseFloat(el.style.left) / 100) * paper.offsetWidth;
    startT = (parseFloat(el.style.top)  / 100) * paper.offsetHeight;

    const onMove = e => {
      const t = e.touches[0];
      const newL = startL + (t.clientX - startX);
      const newT = startT + (t.clientY - startY);
      const pctX = (newL / paper.offsetWidth)  * 100;
      const pctY = (newT / paper.offsetHeight) * 100;
      el.style.left = pctX + '%';
      el.style.top  = pctY + '%';
      const ex = document.getElementById('qr-x'), ey = document.getElementById('qr-y');
      if (ex) { ex.value = Math.round(pctX); document.getElementById('qr-x-label').textContent = Math.round(pctX) + '%'; }
      if (ey) { ey.value = Math.round(pctY); document.getElementById('qr-y-label').textContent = Math.round(pctY) + '%'; }
    };
    const onEnd = () => { el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd); };
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
  }, { passive: false });
}

// ─── FOLIO OVERLAY DRAG ──────────────────────────
function initFolioOverlayDrag(el, linkId) {
  const paper = document.getElementById('cv-paper');
  let startX, startY, startL, startT;
  const syncSliders = (pctX, pctY) => {
    const ox = document.getElementById('fl-ox-' + linkId);
    const oy = document.getElementById('fl-oy-' + linkId);
    const lx = document.getElementById('fl-ox-label-' + linkId);
    const ly = document.getElementById('fl-oy-label-' + linkId);
    if (ox) { ox.value = Math.round(pctX); if (lx) lx.textContent = Math.round(pctX) + '%'; }
    if (oy) { oy.value = Math.round(pctY); if (ly) ly.textContent = Math.round(pctY) + '%'; }
    const obj = getFolioLinkObj(linkId);
    if (obj) { obj.overlayX = Math.round(pctX); obj.overlayY = Math.round(pctY); }
  };
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    const rect = paper.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startL = (parseFloat(el.style.left) / 100) * paper.offsetWidth;
    startT = (parseFloat(el.style.top)  / 100) * paper.offsetHeight;
    const onMove = e => {
      const newL = startL + (e.clientX - startX);
      const newT = startT + (e.clientY - startY);
      const pctX = Math.max(0, Math.min(92, (newL / paper.offsetWidth)  * 100));
      const pctY = Math.max(0, Math.min(92, (newT / paper.offsetHeight) * 100));
      el.style.left = pctX + '%'; el.style.top = pctY + '%';
      syncSliders(pctX, pctY);
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ─── JSON EXPORT ─────────────────────────────────
function exportJSON() {
  const d = collectData();
  // Build JSON Resume standard format
  const jsonResume = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name:    d.name,
      label:   d.role,
      email:   d.email,
      phone:   d.phone,
      url:     d.web,
      summary: d.summary,
      location: { address: d.address },
      profiles: d.web ? [{ network:'Website', url: d.web, username: d.webLabel }] : [],
    },
    work: (d.exp||[]).map(e => ({
      name:      e.company,
      position:  e.title,
      startDate: e.from,
      endDate:   e.to,
      summary:   e.desc,
    })),
    education: (d.edu||[]).map(e => ({
      institution: e.school,
      area:        e.degree,
      startDate:   e.from,
      endDate:     e.to,
    })),
    skills: (d.skills||[]).map(s => ({
      name:  s.name,
      level: s.pct + '%',
    })),
    languages: (d.langs||[]).map(l => ({
      language: l.name,
      fluency:  l.lvl,
    })),
    interests: (d.hobbies||'').split(',').filter(Boolean).map(h => ({ name: h.trim() })),
    references: (d.refs||[]).map(r => ({
      name:      r.name,
      reference: r.note,
      position:  r.pos,
      company:   r.company,
      email:     r.email,
      phone:     r.phone,
    })),
    projects: (d.projects||[]).map(p => ({
      name:        p.title,
      url:         p.url,
      description: p.desc,
      startDate:   p.from,
      endDate:     p.to,
    })),
    certificates: (d.certs||[]).map(c => ({
      name:   c.title,
      issuer: c.issuer,
      date:   c.date,
      url:    c.url,
    })),
    // Extra fields (non-standard but useful)
    _cvbuilder: {
      goal:       d.goal,
      komps:      d.komps,
      kompsPos:   d.kompsPos,
      hobbiesPos: d.hobbiesPos,
      licensePos: d.licensePos,
      license:    d.license,
      licenseNote:d.licenseNote,
      extraquals: d.extraquals,
      color:      d.color,
      font:       d.font,
      sectionOrder: d.sectionOrder,
      fontScale:  d.fontScale,
      lineHeight: d.lineHeight,
      rightBg:    d.rightBg,
      birth:      d.birth,
    },
  };

  const blob = new Blob([JSON.stringify(jsonResume, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (d.name||'CV').replace(/\s+/g,'_') + '_Resume.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('✓ '+t('toastJSONExported'));
}

// ─── SECTION ORDER RESET ─────────────────────────
function resetSectionOrder() {
  sectionOrder = ['profile','experience','education','komps','hobbies','extraquals','referenzen','zertifikate','projekte','folio'];
  buildSectionOrderUI();
  render();
  showToast('✓ '+t('toastOrderReset'));
}

// ─── JSON RESUME IMPORT ──────────────────────────
function triggerImport(){document.getElementById('import-file-input').click();}
function handleImport(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{importJsonResume(JSON.parse(ev.target.result));}
    catch{showToast('❌ '+t('toastInvalidJSON'));}
  };
  reader.readAsText(file); e.target.value='';
}
function importJsonResume(d){
  if(d.basics){
    if(d.basics.name)    setVal('f-name',d.basics.name);
    if(d.basics.label)   setVal('f-role',d.basics.label);
    if(d.basics.email)   setVal('f-email',d.basics.email);
    if(d.basics.phone)   setVal('f-phone',d.basics.phone);
    if(d.basics.url)     setVal('f-web',d.basics.url);
    if(d.basics.summary) setVal('f-summary',d.basics.summary);
    if(d.basics.location){
      const loc=d.basics.location;
      setVal('f-address',[loc.city,loc.country].filter(Boolean).join(', '));
    }
  }
  if(Array.isArray(d.work)) d.work.forEach(w=>addEntry('exp',{title:w.position||'',company:w.name||w.company||'',from:w.startDate||'',to:w.endDate||'heute',desc:w.summary||(Array.isArray(w.highlights)?w.highlights.join('\n'):'')}));
  if(Array.isArray(d.education)) d.education.forEach(e=>addEntry('edu',{degree:[e.studyType,e.area].filter(Boolean).join(' – ')||e.institution||'',school:e.institution||'',from:e.startDate||'',to:e.endDate||''}));
  if(Array.isArray(d.skills)) setVal('f-komps',d.skills.map(s=>s.name).filter(Boolean).join('\n'));
  if(Array.isArray(d.languages)){
    const m={native:'native',fluent:'advanced',advanced:'advanced',intermediate:'intermediate',beginner:'basic'};
    d.languages.forEach(l=>addLang({name:l.language||'',lvl:m[(l.fluency||'').toLowerCase()]||'intermediate'}));
  }
  if(Array.isArray(d.interests)) setVal('f-hobbies',d.interests.map(i=>i.name).filter(Boolean).join(', '));
  if(Array.isArray(d.references)) d.references.forEach(r=>addRef({name:r.name||'',note:r.reference||''}));
  if(Array.isArray(d.projects)) d.projects.forEach(p=>addProject({title:p.name||'',url:p.url||'',desc:p.description||(Array.isArray(p.highlights)?p.highlights.join('\n'):''),from:p.startDate||'',to:p.endDate||''}));
  if(Array.isArray(d.certificates)||Array.isArray(d.awards)){
    (d.certificates||d.awards||[]).forEach(c=>addCert({title:c.name||c.title||'',issuer:c.awarder||c.issuer||'',date:c.date||'',url:c.url||''}));
  }
  // Restore app-specific settings from our own exports
  if(d._cvbuilder){
    const cb=d._cvbuilder;
    if(cb.color){state.color=cb.color;}
    if(cb.font){state.font=cb.font;}
    if(cb.sectionOrder&&Array.isArray(cb.sectionOrder)){sectionOrder=cb.sectionOrder.filter(k=>SECTION_LABELS[k]);Object.keys(SECTION_LABELS).forEach(k=>{if(!sectionOrder.includes(k))sectionOrder.push(k);});buildSectionOrderUI();}
    if(cb.fontScale){setVal('f-font-scale',cb.fontScale);const lb=document.getElementById('font-scale-label');if(lb)lb.textContent=cb.fontScale+'%';}
    if(cb.lineHeight){setVal('f-line-height',cb.lineHeight);const lb=document.getElementById('line-height-label');if(lb)lb.textContent=cb.lineHeight;}
    if(cb.rightBg)setVal('f-right-bg',cb.rightBg);
    if(cb.kompsPos)setVal('f-komps-pos',cb.kompsPos);
    if(cb.hobbiesPos)setVal('f-hobbies-pos',cb.hobbiesPos);
    if(cb.licensePos)setVal('f-license-pos',cb.licensePos);
    if(cb.licenseNote)setVal('f-license-note',cb.licenseNote);
    if(cb.birth)setVal('f-birth',cb.birth);
    if(cb.goal)setVal('f-goal',cb.goal);
    if(cb.komps)setVal('f-komps',cb.komps);
    if(cb.license&&Array.isArray(cb.license)){['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D','T','L'].forEach(c=>{const el=document.getElementById('lic-'+c);if(el)el.checked=false;});cb.license.forEach(c=>{const el=document.getElementById('lic-'+c);if(el)el.checked=true;});}
    buildColorPicker();buildFontPicker();
  }
  render(); updateProgress(); showToast('✓ '+t('toastImported'));
}

// ─── DRAG & DROP FOR CARDS ──────────────────────
function makeDraggable(card, listId, stateArr){
  card.draggable=true;
  card.addEventListener('dragstart',e=>{dragSrcId=card.id;dragType='card';card.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
  card.addEventListener('dragend',()=>card.classList.remove('dragging'));
  card.addEventListener('dragover',e=>{e.preventDefault();if(dragType==='card') card.classList.add('drag-over');});
  card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
  card.addEventListener('drop',e=>{
    e.preventDefault();card.classList.remove('drag-over');
    if(dragType!=='card'||!dragSrcId||dragSrcId===card.id) return;
    const list=document.getElementById(listId), srcEl=document.getElementById(dragSrcId);
    if(!srcEl||!list) return;
    const cards=[...list.children];
    const srcIdx=cards.indexOf(srcEl), dstIdx=cards.indexOf(card);
    if(srcIdx<dstIdx) list.insertBefore(srcEl,card.nextSibling); else list.insertBefore(srcEl,card);
    // sync state array by card id suffix
    const getSuffix=id=>id.split('-').slice(1).join('-');
    const srcId=getSuffix(dragSrcId), dstId=getSuffix(card.id);
    const si=stateArr.indexOf(srcId), di=stateArr.indexOf(dstId);
    if(si>-1&&di>-1) stateArr.splice(di,0,stateArr.splice(si,1)[0]);
    render();
  });
}

// ─── UNDO ───────────────────────────────────────
function pushUndo(type,data){
  undoStack.push({type,data});
  if(undoStack.length>10) undoStack.shift();
  const btn=document.getElementById('undo-btn');
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';}
  showUndoToast();
}
function showUndoToast(){
  let el=document.getElementById('undo-toast');
  if(!el){
    el=document.createElement('div');el.id='undo-toast';
    Object.assign(el.style,{position:'fixed',bottom:'4rem',right:'1.5rem',background:'#1a2419',color:'#fff',padding:'10px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',zIndex:'9998',display:'flex',gap:'12px',alignItems:'center',transition:'opacity 0.3s',boxShadow:'0 4px 16px rgba(0,0,0,0.3)',opacity:'0'});
    document.body.appendChild(el);
  }
  el.innerHTML=`<span>${t('toastDeleted')}</span><button onclick="undoDelete()" style="background:var(--g-light);color:var(--g-dark);border:none;border-radius:4px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer;">↩ Rückgängig</button>`;
  el.style.opacity='1';clearTimeout(el._to);el._to=setTimeout(()=>{el.style.opacity='0';},4500);
}
function undoDelete(){
  const item=undoStack.pop(); if(!item) return;
  const el=document.getElementById('undo-toast'); if(el) el.style.opacity='0';
  const{type,data}=item;
  if(type==='exp') addEntry('exp',data);
  else if(type==='edu') addEntry('edu',data);
  else if(type==='skill') addSkill(data);
  else if(type==='lang') addLang(data);
  else if(type==='extraqual') addExtraQual(data);
  else if(type==='ref') addRef(data);
  else if(type==='cert') addCert(data);
  else if(type==='project') addProject(data);
  else if(type==='p2entry') addPage2Entry(data);
  if(undoStack.length===0){
    const btn=document.getElementById('undo-btn');
    if(btn){btn.disabled=true;btn.style.opacity='0.4';btn.style.cursor='not-allowed';}
  }
}

// ── DATUMSPICKER HELPER ──────────────────────────────────────
function makeDatePicker(prefix, existingVal, opts) {
  opts = opts || {};
  var isTo = opts.isTo || false;
  var lang = (typeof currentLang !== 'undefined') ? currentLang : 'de';
  var MONTHS_MAP = {
    de: ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    ar: ['\u064a\u0646\u0627\u064a\u0631','\u0641\u0628\u0631\u0627\u064a\u0631','\u0645\u0627\u0631\u0633','\u0623\u0628\u0631\u064a\u0644','\u0645\u0627\u064a\u0648','\u064a\u0648\u0646\u064a\u0648','\u064a\u0648\u0644\u064a\u0648','\u0623\u063a\u0633\u0637\u0633','\u0633\u0628\u062a\u0645\u0628\u0631','\u0623\u0643\u062a\u0648\u0628\u0631','\u0646\u0648\u0641\u0645\u0628\u0631','\u062f\u064a\u0633\u0645\u0628\u0631'],
  };
  var HEUTE_MAP = { de: 'Heute', en: 'Present', ar: '\u0627\u0644\u0622\u0646' };
  var months = MONTHS_MAP[lang] || MONTHS_MAP.de;
  var heute  = HEUTE_MAP[lang]  || 'Heute';
  var initMonth = '', initYear = '', initToday = false;
  if (existingVal) {
    if (/heute|present|\u0627\u0644\u0622\u0646|current/i.test(existingVal)) {
      initToday = true;
    } else {
      var mMatch = existingVal.match(/([A-Za-z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\u00e9\u00e0]+)/);
      var yMatch = existingVal.match(/(\d{4})/);
      if (mMatch) {
        var mStr = mMatch[1].toLowerCase().slice(0,3);
        var idx  = months.findIndex(function(m){ return m.toLowerCase().slice(0,3) === mStr; });
        if (idx >= 0) initMonth = String(idx+1).padStart(2,'0');
      }
      if (!initMonth) {
        var mNum = existingVal.match(/^(\d{1,2})[\/.\-]/);
        if (mNum) initMonth = mNum[1].padStart(2,'0');
      }
      if (yMatch) initYear = yMatch[1];
    }
  }
  var monthOpts = ['<option value="">--</option>'];
  months.forEach(function(m, i){
    var v = String(i+1).padStart(2,'0');
    monthOpts.push('<option value="'+v+'"'+(initMonth===v?' selected':'')+'>'+m+'</option>');
  });
  var todayAttr = initToday ? ' checked' : '';
  var disAttr   = initToday ? ' disabled' : '';
  var todayHtml = isTo
    ? '<label class="dp-today-label"><input type="checkbox" class="dp-today-cb" id="'+prefix+'-today"'+todayAttr+' onchange="dpToggleToday(\''+prefix+'\')">'
      + '<span class="dp-today-text">'+heute+'</span></label>'
    : '';
  return '<div class="dp-wrap" data-prefix="'+prefix+'">'
    + '<select class="dp-month" id="'+prefix+'-month" onchange="dpUpdate(\''+prefix+'\')"'+disAttr+'>'
    + monthOpts.join('')+'</select>'
    + '<input class="dp-year" id="'+prefix+'-year" type="number" min="1950" max="2040"'
    + ' value="'+initYear+'" placeholder="2024" oninput="dpUpdate(\''+prefix+'\')"'+disAttr+'>'
    + todayHtml
    + '<input type="hidden" id="'+prefix+'" value="'+(existingVal||'')+'"></div>';
}

function dpUpdate(prefix) {
  var monthEl = document.getElementById(prefix+'-month');
  var yearEl  = document.getElementById(prefix+'-year');
  var hidden  = document.getElementById(prefix);
  if (!monthEl || !yearEl || !hidden) return;
  var lang   = (typeof currentLang !== 'undefined') ? currentLang : 'de';
  var MONTHS_MAP = {
    de: ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    ar: ['\u064a\u0646\u0627\u064a\u0631','\u0641\u0628\u0631\u0627\u064a\u0631','\u0645\u0627\u0631\u0633','\u0623\u0628\u0631\u064a\u0644','\u0645\u0627\u064a\u0648','\u064a\u0648\u0646\u064a\u0648','\u064a\u0648\u0644\u064a\u0648','\u0623\u063a\u0633\u0637\u0633','\u0633\u0628\u062a\u0645\u0628\u0631','\u0623\u0643\u062a\u0648\u0628\u0631','\u0646\u0648\u0641\u0645\u0628\u0631','\u062f\u064a\u0633\u0645\u0628\u0631'],
  };
  var months = MONTHS_MAP[lang] || MONTHS_MAP.de;
  var m  = monthEl.value;
  var y  = (yearEl.value || '').trim();
  if (m && y)  hidden.value = months[parseInt(m)-1] + '. ' + y;
  else if (y)  hidden.value = y;
  else if (m)  hidden.value = months[parseInt(m)-1];
  else         hidden.value = '';
  render();
}

function dpToggleToday(prefix) {
  var cb      = document.getElementById(prefix+'-today');
  var monthEl = document.getElementById(prefix+'-month');
  var yearEl  = document.getElementById(prefix+'-year');
  var hidden  = document.getElementById(prefix);
  if (!cb || !hidden) return;
  var lang  = (typeof currentLang !== 'undefined') ? currentLang : 'de';
  var heute = {de:'Heute',en:'Present',ar:'\u0627\u0644\u0622\u0646'}[lang] || 'Heute';
  if (cb.checked) {
    hidden.value = heute;
    if (monthEl) { monthEl.value=''; monthEl.disabled=true; }
    if (yearEl)  { yearEl.value='';  yearEl.disabled=true;  }
  } else {
    hidden.value = '';
    if (monthEl) monthEl.disabled = false;
    if (yearEl)  yearEl.disabled  = false;
  }
  render();
}

// ─── ENTRY BUILDERS ─────────────────────────────
function addEntry(type,data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2);
  const list=document.getElementById(type+'-list');
  const num=type==='exp'?++expCount:++eduCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id=type+'-'+id;
  if(type==='exp'){
    card.innerHTML=`
      <div class="entry-card-header"><span class="drag-handle" title="Ziehen">⠿</span><span class="entry-card-label">${t('entryExperience')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeEntry('exp','${id}')">×</button></div>
      <div class="form-group"><label>${t('labelJobTitle')}</label><input type="text" id="exp-title-${id}" value="${esc(data.title||'')}" list="role-suggestions" placeholder="${t('placeholderJobTitle')}" oninput="render()"></div>
      <div class="form-group"><label>${t('labelCompany')}</label><input type="text" id="exp-company-${id}" value="${esc(data.company||'')}" placeholder="${t('placeholderCompany')}" oninput="render()"></div>
      <div class="form-row">
        <div class="form-group dp-group"><label>${t('labelFrom')}</label>${makeDatePicker('exp-from-'+id, data.from||''  , {isTo:false})}</div>
        <div class="form-group dp-group"><label>${t('labelTo')}</label>${makeDatePicker('exp-to-'+id,   data.to||''    , {isTo:true})}</div>
      </div>
      <div class="form-group"><label>${t('labelDesc')}</label><textarea id="exp-desc-${id}" placeholder="${t('placeholderDesc')}" oninput="render()">${esc(data.desc||'')}</textarea></div>`;
    state.exp.push(id);
  } else {
    card.innerHTML=`
      <div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('entryEducation')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeEntry('edu','${id}')">×</button></div>
      <div class="form-group"><label>${t('labelDegree')}</label><input type="text" id="edu-degree-${id}" value="${esc(data.degree||'')}" placeholder="${t('placeholderDegree')}" oninput="render()"></div>
      <div class="form-group"><label>${t('labelSchool')}</label><input type="text" id="edu-school-${id}" value="${esc(data.school||'')}" placeholder="${t('placeholderSchool')}" oninput="render()"></div>
      <div class="form-row">
        <div class="form-group dp-group"><label>${t('labelFrom')}</label>${makeDatePicker('edu-from-'+id, data.from||''  , {isTo:false})}</div>
        <div class="form-group dp-group"><label>${t('labelTo')}</label>${makeDatePicker('edu-to-'+id,   data.to||''    , {isTo:true})}</div>
      </div>`;
    state.edu.push(id);
  }
  list.appendChild(card); makeDraggable(card,type+'-list',state[type]); render();
}

function removeEntry(type,id){
  const data=type==='exp'?{title:val('exp-title-'+id),company:val('exp-company-'+id),from:val('exp-from-'+id),to:val('exp-to-'+id),desc:val('exp-desc-'+id)}:{degree:val('edu-degree-'+id),school:val('edu-school-'+id),from:val('edu-from-'+id),to:val('edu-to-'+id)};
  pushUndo(type,data);
  const el=document.getElementById(type+'-'+id); if(el) el.remove();
  state[type]=state[type].filter(x=>x!==id); render(); updateProgress(); if(typeof updateATSScore==="function") updateATSScore();
}

function addSkill(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2);
  const card=document.createElement('div'); card.className='entry-card'; card.id='skill-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('labelSkill')}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeSkill('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelSkillName')}</label><input type="text" id="sk-name-${id}" value="${esc(data.name||'')}" placeholder="${t('placeholderSkill')}" oninput="render()"></div>
    <div class="form-group sk-level-group"><label>${t('labelSkillLevel')||'Level'}</label><select id="sk-pct-${id}" onchange="render()" class="sk-level-select"><option value="90" ${parseInt(data.pct||70)>=85?'selected':''}>⭐⭐⭐⭐ Experte</option><option value="70" ${parseInt(data.pct||70)>=60&&parseInt(data.pct||70)<85?'selected':''}>⭐⭐⭐ Fortgeschritten</option><option value="50" ${parseInt(data.pct||70)>=35&&parseInt(data.pct||70)<60?'selected':''}>⭐⭐ Mittelstufe</option><option value="25" ${parseInt(data.pct||70)<35?'selected':''}>⭐ Einsteiger</option></select><span class="sk-ats-badge" title="ATS-freundliches Text-Level">✓ ATS</span></div></div>`;
  document.getElementById('skill-list').appendChild(card); state.skills.push(id); makeDraggable(card,'skill-list',state.skills); render();
}
function removeSkill(id){pushUndo('skill',{name:val('sk-name-'+id),pct:val('sk-pct-'+id)});const el=document.getElementById('skill-'+id);if(el)el.remove();state.skills=state.skills.filter(x=>x!==id);render();updateProgress();if(typeof updateATSScore==="function")updateATSScore();}

function addLang(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2);
  const card=document.createElement('div'); card.className='entry-card'; card.id='lang-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('labelLangName')}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeLang('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelLangName')}</label><input type="text" id="ln-name-${id}" value="${esc(data.name||'')}" placeholder="${t('placeholderLang')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelLangLevel')}</label><select id="ln-lvl-${id}" onchange="render()">
      <option value="native"       ${(data.lvl==='native'||data.lvl==='Muttersprache')?'selected':''}>${t('optNative')}</option>
      <option value="advanced"     ${(data.lvl==='advanced'||data.lvl==='Fortgeschritten')?'selected':''}>${t('optAdvanced')}</option>
      <option value="intermediate" ${(data.lvl==='intermediate'||data.lvl==='Mittelstufe')?'selected':''}>${t('optIntermediate')}</option>
      <option value="basic"        ${(data.lvl==='basic'||data.lvl==='Grundkenntnisse')?'selected':''}>${t('optBasic')}</option>
    </select></div></div>`;
  document.getElementById('lang-list').appendChild(card); state.langs.push(id); makeDraggable(card,'lang-list',state.langs); render();
}
function removeLang(id){pushUndo('lang',{name:val('ln-name-'+id),lvl:val('ln-lvl-'+id)});const el=document.getElementById('lang-'+id);if(el)el.remove();state.langs=state.langs.filter(x=>x!==id);render();}

function addExtraQual(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++eqCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id='eq-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('labelExtraQual')||'Qualifikation'} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeExtraQual('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelExtraQualTitle')||'Bezeichnung'}</label><input type="text" id="eq-title-${id}" value="${esc(data.title||'')}" placeholder="${t('placeholderExtraQualTitle')||'z.B. Erste-Hilfe-Kurs'}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelExtraQualDetail')||'Details'}</label><input type="text" id="eq-detail-${id}" value="${esc(data.detail||'')}" placeholder="${t('placeholderExtraQualDetail')||'z.B. 2023'}" oninput="render()"></div></div>`;
  document.getElementById('extraqual-list').appendChild(card); state.extraquals.push(id); makeDraggable(card,'extraqual-list',state.extraquals); render();
}
function removeExtraQual(id){pushUndo('extraqual',{title:val('eq-title-'+id),detail:val('eq-detail-'+id)});const el=document.getElementById('eq-'+id);if(el)el.remove();state.extraquals=state.extraquals.filter(x=>x!==id);render();}

function addRef(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++refCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id='ref-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('cardRef')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeRef('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelName')}</label><input type="text" id="ref-name-${id}" value="${esc(data.name||'')}" placeholder="${t('placeholderRefName')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelPosition')}</label><input type="text" id="ref-pos-${id}" value="${esc(data.pos||'')}" placeholder="${t('placeholderRefPos')}" oninput="render()"></div></div>
    <div class="form-row"><div class="form-group"><label>${t('labelCompanyName')}</label><input type="text" id="ref-company-${id}" value="${esc(data.company||'')}" placeholder="${t('placeholderRefCompany')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelEmail')}</label><input type="email" id="ref-email-${id}" value="${esc(data.email||'')}" placeholder="${t('placeholderRefEmail')}" oninput="render()"></div></div>
    <div class="form-row"><div class="form-group"><label>${t('labelPhone')}</label><input type="text" id="ref-phone-${id}" value="${esc(data.phone||'')}" placeholder="+49 ..." oninput="render()"></div>
    <div class="form-group"><label>${t('labelNote')}</label><input type="text" id="ref-note-${id}" value="${esc(data.note||'')}" placeholder="${t('placeholderRefNote')}" oninput="render()"></div></div>`;
  document.getElementById('ref-list').appendChild(card); state.refs.push(id); makeDraggable(card,'ref-list',state.refs); render();
}
function removeRef(id){pushUndo('ref',{name:val('ref-name-'+id),pos:val('ref-pos-'+id),company:val('ref-company-'+id),email:val('ref-email-'+id),phone:val('ref-phone-'+id),note:val('ref-note-'+id)});const el=document.getElementById('ref-'+id);if(el)el.remove();state.refs=state.refs.filter(x=>x!==id);render();}

function addCert(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++certCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id='cert-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('cardCert')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeCert('${id}')">×</button></div>
    <div class="form-group"><label>${t('labelCertTitle')}</label><input type="text" id="cert-title-${id}" value="${esc(data.title||'')}" placeholder="${t('placeholderCertTitle')}" oninput="render()"></div>
    <div class="form-row"><div class="form-group"><label>${t('labelIssuer')}</label><input type="text" id="cert-issuer-${id}" value="${esc(data.issuer||'')}" placeholder="${t('placeholderIssuer')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelDate')}</label><input type="text" id="cert-date-${id}" value="${esc(data.date||'')}" placeholder="${t('placeholderDate')}" oninput="render()"></div></div>
    <div class="form-group"><label>${t('labelURL')}</label><input type="text" id="cert-url-${id}" value="${esc(data.url||'')}" placeholder="https://..." oninput="render()"></div>`;
  document.getElementById('cert-list').appendChild(card); state.certs.push(id); makeDraggable(card,'cert-list',state.certs); render();
}
function removeCert(id){pushUndo('cert',{title:val('cert-title-'+id),issuer:val('cert-issuer-'+id),date:val('cert-date-'+id),url:val('cert-url-'+id)});const el=document.getElementById('cert-'+id);if(el)el.remove();state.certs=state.certs.filter(x=>x!==id);render();}

function addProject(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++projCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id='proj-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('cardProject')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeProject('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelProjectName')}</label><input type="text" id="proj-title-${id}" value="${esc(data.title||'')}" placeholder="${t('placeholderProjectName')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelURLLink')}</label><input type="text" id="proj-url-${id}" value="${esc(data.url||'')}" placeholder="https://github.com/..." oninput="render()"></div></div>
    <div class="form-row"><div class="form-group dp-group"><label>${t('labelFrom')}</label>${makeDatePicker('proj-from-'+id, data.from||''  , {isTo:false})}</div>
    <div class="form-group dp-group"><label>${t('labelTo')}</label>${makeDatePicker('proj-to-'+id,   data.to||''    , {isTo:true})}</div></div>
    <div class="form-group"><label>${t('labelDesc')}</label><textarea id="proj-desc-${id}" placeholder="${t('placeholderP2Desc')}" oninput="render()">${esc(data.desc||'')}</textarea></div>`;
  document.getElementById('proj-list').appendChild(card); state.projects.push(id); makeDraggable(card,'proj-list',state.projects); render();
}
function removeProject(id){pushUndo('project',{title:val('proj-title-'+id),url:val('proj-url-'+id),from:val('proj-from-'+id),to:val('proj-to-'+id),desc:val('proj-desc-'+id)});const el=document.getElementById('proj-'+id);if(el)el.remove();state.projects=state.projects.filter(x=>x!==id);render();}

function addPage2Entry(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++p2Count;
  const card=document.createElement('div'); card.className='entry-card'; card.id='p2e-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('entryP2')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removePage2Entry('${id}')">×</button></div>
    <div class="form-group"><label>${t('labelP2EntryTitle')}</label><input type="text" id="p2e-title-${id}" value="${esc(data.title||'')}" placeholder="${t('placeholderP2Title2')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelP2Sub')}</label><input type="text" id="p2e-sub-${id}" value="${esc(data.sub||'')}" placeholder="${t('placeholderP2Sub')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelP2Desc')}</label><textarea id="p2e-desc-${id}" placeholder="${t('placeholderP2Desc')}" oninput="render()">${esc(data.desc||'')}</textarea></div>`;
  document.getElementById('p2-entries-list').appendChild(card); state.page2Entries.push(id); makeDraggable(card,'p2-entries-list',state.page2Entries); render();
}
function removePage2Entry(id){pushUndo('p2entry',{title:val('p2e-title-'+id),sub:val('p2e-sub-'+id),desc:val('p2e-desc-'+id)});const el=document.getElementById('p2e-'+id);if(el)el.remove();state.page2Entries=state.page2Entries.filter(x=>x!==id);render();}

// ─── RENDER ─────────────────────────────────────
function render(){
  const col=state.color, font=state.font;
  const colLight=lighten(col,0.55), colDark2=colLight2(col);
  const fScale=parseInt((document.getElementById('f-font-scale')||{}).value||'100')/100;
  const lineH=(document.getElementById('f-line-height')||{}).value||'1.75';
  const rightBg=(document.getElementById('f-right-bg')||{}).value||'#ffffff';

  const name=val('f-name')||t('cvFallbackName');
  const role=val('f-role')||(currentLang==='ar'?'المسمى الوظيفي':currentLang==='en'?'Job Title':'Berufsbezeichnung');
  const email=val('f-email'),phone=val('f-phone'),address=val('f-address'),birth=val('f-birth'),web=val('f-web'),linkedin=val('f-linkedin');
  const webLabel=val('f-web-label')||t('placeholderWebLabel'), summary=val('f-summary'), goal=val('f-goal'), komps=val('f-komps');
  const folio=val('f-folio'), folioLabel=val('f-folio-label')||t('cvFolio')||'Portfolio';
  const folioShowLink=(document.getElementById('folio-show-link')||{}).checked!==false;
  const folioShowQR=(document.getElementById('folio-show-qr')||{}).checked||false;
  // Collect active multi folio links
  const activeFolioLinks=_folioLinks.map(l=>({
    url:l.url||val('fl-url-'+l.id)||'',
    label:l.label||val('fl-label-'+l.id)||'Portfolio',
    showLink:(document.getElementById('fl-showlink-'+l.id)||{}).checked!==false,
    showQR:!!((document.getElementById('fl-showqr-'+l.id)||{}).checked),
    qrDataUrl:l.qrDataUrl||'',
    pos:l.pos||'left',
    id:l.id,
    overlayX:parseFloat((document.getElementById('fl-ox-'+l.id)||{}).value??l.overlayX??75),
    overlayY:parseFloat((document.getElementById('fl-oy-'+l.id)||{}).value??l.overlayY??4),
    overlaySize:parseInt((document.getElementById('fl-os-'+l.id)||{}).value||l.overlaySize||64),
  })).filter(l=>l.url);

  const photoSrc=state.photoData||'';
  const photoShape=(document.getElementById('f-photo-shape')||{}).value||'circle';
  const borderRadius=photoShape==='square'?'10px':'50%';
  const photoSize=(document.getElementById('f-photo-size')||{}).value||'120';
  const borderSize=(document.getElementById('f-border-size')||{}).value||'4';
  const borderColor=(document.getElementById('f-border-color')||{}).value||'rgba(255,255,255,0.9)';
  const px=photoSize+'px';
  const initials=name.split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase();

  const avatarHTML=photoSrc
    ?`<img src="${photoSrc}" style="width:${px};height:${px};border-radius:${borderRadius};object-fit:cover;object-position:center top;border:${borderSize}px solid ${borderColor};display:block;box-shadow:0 4px 18px rgba(0,0,0,0.30);">`
    :`<div class="cv-avatar" style="width:${px};height:${px};background:linear-gradient(145deg,${colLight} 0%,${col} 100%);font-family:${font};border-radius:${borderRadius};border:${borderSize}px solid ${borderColor};font-size:${Math.round(parseInt(photoSize)*0.28)}px;box-shadow:0 4px 18px rgba(0,0,0,0.20);">${initials||'CV'}</div>`;

  const hobbies=val('f-hobbies');
  const hobbiesSize=(document.getElementById('f-hobbies-size')||{}).value||'10';
  const LIC=['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D','T','L'];
  const activeLic=LIC.filter(c=>{const el=document.getElementById('lic-'+c);return el&&el.checked;});
  const licNote=val('f-license-note');
  const kompsPos=(document.getElementById('f-komps-pos')||{}).value||'right';
  const hobbiesPos=(document.getElementById('f-hobbies-pos')||{}).value||'right';
  const licensePos=(document.getElementById('f-license-pos')||{}).value||'right';

  // LEFT
  let leftHTML=`
    <div class="cv-avatar-wrap">${avatarHTML}</div>
    <div class="cv-l-name" style="font-family:${font};font-size:${Math.round(16*fScale)}px;">${h(name)}</div>
    <div class="cv-l-role" style="font-size:${Math.round(9*fScale)}px;">${h(role)}</div>
    <div class="cv-l-section"><div class="cv-l-section-title">${t('cvContact')}</div>
      ${email?`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvEmail')}</span><span class="cv-contact-val" style="font-size:${Math.round(11*fScale)}px;">${h(email)}</span></div>`:''}
      ${phone?`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvPhone')}</span><span class="cv-contact-val" style="font-size:${Math.round(11*fScale)}px;">${h(phone)}</span></div>`:''}
      ${address?`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvAddress')}</span><span class="cv-contact-val" style="font-size:${Math.round(11*fScale)}px;">${h(address)}</span></div>`:''}
      ${birth?`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvBirth')}</span><span class="cv-contact-val" style="font-size:${Math.round(11*fScale)}px;">${h(birth)}</span></div>`:''}
      ${web?(()=>{const href=web.startsWith('http')?web:'https://'+web;return`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvWeb')}</span><span class="cv-contact-val"><a href="${href}" target="_blank" style="color:inherit;text-decoration:underline;font-weight:700;font-size:${Math.round(11*fScale)}px;">${h(webLabel)}</a></span></div>`;})():''}
      ${linkedin?(()=>{const href=linkedin.startsWith('http')?linkedin:'https://'+linkedin;return`<div class="cv-contact-item"><span class="cv-contact-label">LinkedIn</span><span class="cv-contact-val"><a href="${href}" target="_blank" style="color:inherit;text-decoration:underline;font-weight:700;font-size:${Math.round(11*fScale)}px;">LinkedIn</a></span></div>`;})():''}
      ${folio&&folioShowLink?(()=>{const href=folio.startsWith('http')?folio:'https://'+folio;return`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvFolioSection')||'Portfolio'}</span><span class="cv-contact-val"><a href="${href}" target="_blank" style="color:inherit;text-decoration:underline;font-weight:700;font-size:${Math.round(11*fScale)}px;">${h(folioLabel)}</a></span></div>`;})():''}
    </div>`;

  const activeSkills=state.skills.filter(id=>val('sk-name-'+id));
  if(activeSkills.length){
    leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvSkills')}</div>`;
    activeSkills.forEach(id=>{const n=val('sk-name-'+id),p=Math.min(100,Math.max(0,parseInt(val('sk-pct-'+id))||70));const skillMode=document.getElementById('skill-display-mode')?.value||'bar';const lvlMap={90:'Experte',70:'Fortgeschritten',50:'Mittelstufe',25:'Einsteiger'};const lvlText=lvlMap[p]||(p>=85?'Experte':p>=60?'Fortgeschritten':p>=35?'Mittelstufe':'Einsteiger');if(skillMode==='text'){leftHTML+=`<div class="cv-skill-bar cv-skill-text-mode"><div class="cv-skill-name" style="font-size:${Math.round(11*fScale)}px;">${h(n)}</div><div class="cv-skill-level-text" style="font-size:${Math.round(9*fScale)}px;">${lvlText}</div></div>`;}else{leftHTML+=`<div class="cv-skill-bar"><div class="cv-skill-name" style="font-size:${Math.round(11*fScale)}px;">${h(n)}</div><div class="cv-skill-track"><div class="cv-skill-fill" style="width:${p}%"></div></div></div>`;}});
    leftHTML+=`</div>`;
  }
  const activeLangs=state.langs.filter(id=>val('ln-name-'+id));
  if(activeLangs.length){
    leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvLanguages')}</div>`;
    activeLangs.forEach(id=>{const n=val('ln-name-'+id),lv=val('ln-lvl-'+id);
      const dotsMap={native:5,advanced:4,intermediate:3,basic:2,Muttersprache:5,Fortgeschritten:4,Mittelstufe:3,Grundkenntnisse:2};
      const dots=dotsMap[lv]||3;
      const lvLabel={native:t('optNative'),advanced:t('optAdvanced'),intermediate:t('optIntermediate'),basic:t('optBasic'),Muttersprache:t('optNative'),Fortgeschritten:t('optAdvanced'),Mittelstufe:t('optIntermediate'),Grundkenntnisse:t('optBasic')}[lv]||lv;let dotHtml='';for(let i=0;i<5;i++)dotHtml+=`<div class="cv-lang-dot${i<dots?' on':''}"></div>`;leftHTML+=`<div class="cv-lang-item"><div class="cv-lang-name" style="font-size:${Math.round(11*fScale)}px;">${h(n)}</div><div class="cv-lang-sub">${lvLabel}</div><div class="cv-lang-dots">${dotHtml}</div></div>`;});
    leftHTML+=`</div>`;
  }

  const webHref=web?(web.startsWith('http')?web:'https://'+web):'#';
  const webLink=web?`<a href="${webHref}" target="_blank" style="color:${col};text-decoration:underline;font-weight:700;">${h(webLabel)}</a>`:h(webLabel);
  const renderTxt=txt=>h(txt).replace(/%%WEBSITE%%/g,webLink);

  // RIGHT header
  let rightHTML=`
    <div class="cv-r-name" style="font-family:${font};font-size:${Math.round(28*fScale)}px;">${h(name)}</div>
    <div class="cv-r-role" style="color:${colDark2};font-size:${Math.round(12*fScale)}px;">${h(role)}</div>
    <div class="cv-divider" style="background:linear-gradient(90deg,${col} 0%,${colLight} 60%,transparent 100%);"></div>`;

  // Section renderers
  const renderers={
    profile:()=>{
      let s='';
      if(summary||goal){
        s+=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvProfile')}</div>`;
        if(summary) s+=`<div class="cv-summary" style="font-size:${Math.round(11.5*fScale)}px;line-height:${lineH};">${renderTxt(summary)}</div>`;
        if(goal) s+=`<div class="cv-summary" style="font-size:${Math.round(11.5*fScale)}px;line-height:${lineH};margin-top:6px;font-style:italic;color:#666;">${renderTxt(goal)}</div>`;
      }
      return s;
    },
    experience:()=>{
      const entries=state.exp.map(id=>({title:val('exp-title-'+id),company:val('exp-company-'+id),from:val('exp-from-'+id),to:val('exp-to-'+id),desc:val('exp-desc-'+id)})).filter(e=>e.title||e.company);
      if(!entries.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvExperience')}</div>`;
      entries.forEach(e=>{s+=`<div class="cv-entry" style="border-left-color:${colLight};"><div class="cv-entry-head"><span class="cv-entry-title" style="font-size:${Math.round(12.5*fScale)}px;">${h(e.title)}</span><span class="cv-entry-date" style="color:${colDark2};font-size:${Math.round(10*fScale)}px;">${h(e.from)}${e.to?' – '+h(e.to):''}</span></div>${e.company?`<div class="cv-entry-sub" style="color:${colDark2};font-size:${Math.round(11*fScale)}px;">${h(e.company)}</div>`:''} ${e.desc?`<div class="cv-entry-desc" style="font-size:${Math.round(11*fScale)}px;line-height:${lineH};">${h(e.desc).replace(/\n/g,'<br>')}</div>`:''}</div>`;});
      return s;
    },
    education:()=>{
      const entries=state.edu.map(id=>({degree:val('edu-degree-'+id),school:val('edu-school-'+id),from:val('edu-from-'+id),to:val('edu-to-'+id)})).filter(e=>e.degree||e.school);
      if(!entries.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvEducation')}</div>`;
      entries.forEach(e=>{s+=`<div class="cv-entry" style="border-left-color:${colLight};"><div class="cv-entry-head"><span class="cv-entry-title" style="font-size:${Math.round(12.5*fScale)}px;">${h(e.degree)}</span><span class="cv-entry-date" style="color:${colDark2};font-size:${Math.round(10*fScale)}px;">${h(e.from)}${e.to?' – '+h(e.to):''}</span></div>${e.school?`<div class="cv-entry-sub" style="color:${colDark2};font-size:${Math.round(11*fScale)}px;">${h(e.school)}</div>`:''}</div>`;});
      return s;
    },
    komps:()=>{
      if(!komps.trim()) return '';
      if(kompsPos==='left'){leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvKomps')}</div>`;komps.split('\n').forEach(k=>{if(k.trim())leftHTML+=`<span class="cv-tag">${h(k.trim())}</span>`;});leftHTML+=`</div>`;return '';}
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvKomps')}</div><div class="cv-komps">`;
      komps.split('\n').forEach(k=>{if(k.trim())s+=`<div class="cv-komp" style="border-left-color:${colLight};font-size:${Math.round(10.5*fScale)}px;">${h(k.trim())}</div>`;});
      return s+`</div>`;
    },
    hobbies:()=>{
      if(!hobbies) return '';
      if(hobbiesPos==='left'){leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvInterests')}</div>`;hobbies.split(',').forEach(tag=>{if(tag.trim())leftHTML+=`<span class="cv-tag" style="font-size:${hobbiesSize}px;">${h(tag.trim())}</span>`;});leftHTML+=`</div>`;return '';}
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvInterests')}</div><div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;">`;
      hobbies.split(',').forEach(tag=>{if(tag.trim())s+=`<span style="background:${colLight}22;border:1px solid ${colLight};border-radius:5px;padding:3px 10px;font-size:${hobbiesSize}px;color:#444;font-weight:500;">${h(tag.trim())}</span>`;});
      return s+`</div>`;
    },
    extraquals:()=>{
      const eqEntries=state.extraquals.map(id=>({title:val('eq-title-'+id),detail:val('eq-detail-'+id)})).filter(e=>e.title);
      if(!activeLic.length&&!eqEntries.length) return '';
      if(licensePos==='left'){
        leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvExtraQual')}</div>`;
        if(activeLic.length){leftHTML+=`<div style="margin-bottom:7px;"><div style="font-size:9px;font-weight:700;opacity:0.55;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">${t('cvLicense')||'Führerschein'}</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${activeLic.map(c=>`<span style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;color:#fff;">${c}</span>`).join('')}</div>${licNote?`<div style="font-size:10px;opacity:0.6;margin-top:4px;font-style:italic;">${h(licNote)}</div>`:''}</div>`;}
        eqEntries.forEach(e=>{leftHTML+=`<div style="margin-bottom:6px;"><div style="font-size:11px;font-weight:600;opacity:0.9;">${h(e.title)}</div>${e.detail?`<div style="font-size:10px;opacity:0.55;margin-top:1px;">${h(e.detail)}</div>`:''}</div>`;});
        leftHTML+=`</div>`; return '';
      }
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvExtraQual')}</div>`;
      if(activeLic.length){s+=`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;"><span style="font-size:${Math.round(11*fScale)}px;font-weight:600;color:#444;">${t('cvLicense')||'Führerschein'}:</span><div style="display:flex;flex-wrap:wrap;gap:5px;">${activeLic.map(c=>`<span style="background:${col};color:#fff;border-radius:5px;padding:2px 9px;font-size:${Math.round(10.5*fScale)}px;font-weight:700;">${c}</span>`).join('')}</div></div>`;if(licNote)s+=`<div style="font-size:${Math.round(11*fScale)}px;color:#666;margin-bottom:6px;font-style:italic;">${h(licNote)}</div>`;}
      if(eqEntries.length){s+=`<div class="cv-komps" style="margin-top:4px;">`;eqEntries.forEach(e=>{s+=`<div class="cv-komp" style="border-left-color:${colLight};font-size:${Math.round(10.5*fScale)}px;"><span style="font-weight:700;">${h(e.title)}</span>${e.detail?`<span style="font-size:${Math.round(10*fScale)}px;color:#888;display:block;margin-top:2px;">${h(e.detail)}</span>`:''}</div>`;});s+=`</div>`;}
      return s;
    },
    referenzen:()=>{
      const refs=state.refs.map(id=>({name:val('ref-name-'+id),pos:val('ref-pos-'+id),company:val('ref-company-'+id),email:val('ref-email-'+id),phone:val('ref-phone-'+id),note:val('ref-note-'+id)})).filter(r=>r.name);
      if(!refs.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvReferenzen')}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;
      refs.forEach(r=>{s+=`<div style="background:#f8faf8;border-radius:6px;padding:10px 12px;border-left:2.5px solid ${colLight};"><div style="font-weight:700;font-size:${Math.round(12*fScale)}px;color:#1a2818;">${h(r.name)}</div>${r.pos?`<div style="font-size:${Math.round(10.5*fScale)}px;font-style:italic;color:${colDark2};">${h(r.pos)}</div>`:''} ${r.company?`<div style="font-size:${Math.round(10.5*fScale)}px;color:#555;">${h(r.company)}</div>`:''} ${r.email?`<div style="font-size:${Math.round(10*fScale)}px;color:#666;margin-top:4px;">${h(r.email)}</div>`:''} ${r.phone?`<div style="font-size:${Math.round(10*fScale)}px;color:#666;">${h(r.phone)}</div>`:''} ${r.note?`<div style="font-size:${Math.round(10*fScale)}px;color:#999;font-style:italic;">${h(r.note)}</div>`:''}</div>`;});
      return s+`</div>`;
    },
    zertifikate:()=>{
      const certs=state.certs.map(id=>({title:val('cert-title-'+id),issuer:val('cert-issuer-'+id),date:val('cert-date-'+id),url:val('cert-url-'+id)})).filter(c=>c.title);
      if(!certs.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvZertifikate')}</div>`;
      certs.forEach(c=>{const link=c.url?(c.url.startsWith('http')?c.url:'https://'+c.url):'';s+=`<div class="cv-entry" style="border-left-color:${colLight};"><div class="cv-entry-head"><span class="cv-entry-title" style="font-size:${Math.round(12.5*fScale)}px;">${link?`<a href="${link}" target="_blank" style="color:inherit;text-decoration:none;">`:''}${h(c.title)}${link?`</a>`:''}</span><span class="cv-entry-date" style="color:${colDark2};font-size:${Math.round(10*fScale)}px;">${h(c.date)}</span></div>${c.issuer?`<div class="cv-entry-sub" style="color:${colDark2};font-size:${Math.round(11*fScale)}px;">${h(c.issuer)}</div>`:''}</div>`;});
      return s;
    },
    projekte:()=>{
      const projs=state.projects.map(id=>({title:val('proj-title-'+id),url:val('proj-url-'+id),from:val('proj-from-'+id),to:val('proj-to-'+id),desc:val('proj-desc-'+id)})).filter(p=>p.title);
      if(!projs.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvProjekte')}</div>`;
      projs.forEach(p=>{const link=p.url?(p.url.startsWith('http')?p.url:'https://'+p.url):'';s+=`<div class="cv-entry" style="border-left-color:${colLight};"><div class="cv-entry-head"><span class="cv-entry-title" style="font-size:${Math.round(12.5*fScale)}px;">${link?`<a href="${link}" target="_blank" style="color:${col};text-decoration:none;">`:''}${h(p.title)}${link?`</a>`:''}</span><span class="cv-entry-date" style="color:${colDark2};font-size:${Math.round(10*fScale)}px;">${h(p.from)}${p.to?' – '+h(p.to):''}</span></div>${p.url?`<div style="font-size:${Math.round(10*fScale)}px;color:${col};margin-top:2px;"><a href="${link}" target="_blank" style="color:${col};">${h(p.url)}</a></div>`:''} ${p.desc?`<div class="cv-entry-desc" style="font-size:${Math.round(11*fScale)}px;line-height:${lineH};">${h(p.desc).replace(/\n/g,'<br>')}</div>`:''}</div>`;});
      return s;
    },
    // ── FOLIO als sortierbare Sektion (rechte Spalte, pos='right') ──
    folio:()=>{
      // Right column: links with pos='right', QRs with pos='right'
      const rightLinks = activeFolioLinks.filter(l => l.showLink && l.pos === 'right');
      const rightQRs   = activeFolioLinks.filter(l => l.showQR && l.qrDataUrl && l.pos === 'right');
      if(!rightLinks.length && !rightQRs.length) return '';
      const sectionTitle = t('cvFolioSection')||'Portfolio & Links';
      let s = `<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${sectionTitle}</div>`;
      if(rightLinks.length){
        s += `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:${rightQRs.length?'10px':'0'};">`;
        rightLinks.forEach(l=>{
          const href = l.url.startsWith('http')?l.url:'https://'+l.url;
          s += `<div style="display:flex;align-items:center;gap:8px;font-size:${Math.round(11*fScale)}px;">
            <span style="font-size:${Math.round(9*fScale)}px;opacity:0.5;">▸</span>
            <a href="${href}" target="_blank" style="color:${col};text-decoration:underline;font-weight:600;">${h(l.label||l.url)}</a>
          </div>`;
        });
        s += `</div>`;
      }
      if(rightQRs.length){
        const qrSz = Math.round(62*fScale);
        s += `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;margin-top:4px;">`;
        rightQRs.forEach(l=>{
          s += `<div style="text-align:center;">
            <img src="${l.qrDataUrl}" style="width:${qrSz}px;height:${qrSz}px;image-rendering:crisp-edges;background:#fff;padding:3px;border-radius:4px;display:block;">
            <div style="font-size:${Math.round(8*fScale)}px;margin-top:3px;opacity:0.6;font-weight:600;max-width:${qrSz+6}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h(l.label)}</div>
          </div>`;
        });
        s += `</div>`;
      }
      return s;
    },
  };

  sectionOrder.forEach(key=>{const r=renderers[key];if(r) rightHTML+=r();});

  // ── FOLIO LINKS: Seitenleiste links (pos='left') ──
  const sidebarFolioLinks = activeFolioLinks.filter(l => l.showLink && l.pos === 'left');
  const sidebarFolioQRs   = activeFolioLinks.filter(l => l.showQR && l.qrDataUrl && l.pos === 'left');
  if(sidebarFolioLinks.length || sidebarFolioQRs.length){
    const sectionTitle = t('cvFolioSection')||'Portfolio & Links';
    leftHTML += `<div class="cv-l-section"><div class="cv-l-section-title">${sectionTitle}</div>`;
    sidebarFolioLinks.forEach(l=>{
      const href = l.url.startsWith('http')?l.url:'https://'+l.url;
      leftHTML += `<div class="cv-contact-item"><span class="cv-contact-label" style="font-size:${Math.round(9*fScale)}px;">▸</span><span class="cv-contact-val"><a href="${href}" target="_blank" style="color:inherit;text-decoration:underline;font-weight:700;font-size:${Math.round(11*fScale)}px;">${h(l.label||l.url)}</a></span></div>`;
    });
    if(sidebarFolioQRs.length){
      leftHTML += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;justify-content:center;">`;
      sidebarFolioQRs.forEach(l=>{
        leftHTML += `<div style="text-align:center;"><img src="${l.qrDataUrl}" style="width:66px;height:66px;image-rendering:crisp-edges;background:#fff;padding:3px;border-radius:4px;display:block;"><div style="font-size:8px;margin-top:3px;opacity:0.65;font-weight:600;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h(l.label)}</div></div>`;
      });
      leftHTML += `</div>`;
    }
    leftHTML += `</div>`;
  }

  // ── QR CODE OVERLAY — Hauptwebsite-QR (frei positionierbar) ──
  const qrInCV    = (document.getElementById('qr-in-cv')||{}).checked;
  const qrSizePx  = parseInt((document.getElementById('qr-size')||{}).value || '64');
  const qrX       = parseFloat((document.getElementById('qr-x')||{}).value ?? '4');
  const qrY       = parseFloat((document.getElementById('qr-y')||{}).value ?? '4');
  const qrCaption = val('qr-caption');
  const qrLabelPos= (document.getElementById('qr-label-pos')||{}).value || 'none';

  // Remove old overlay
  const oldOverlay = document.getElementById('cv-qr-overlay');
  if (oldOverlay) oldOverlay.remove();

  if (qrInCV && _qrDataUrl) {
    const capEl = qrCaption && qrLabelPos !== 'none'
      ? `<div style="font-size:8px;color:rgba(0,0,0,0.5);text-align:center;margin-${qrLabelPos==='above'?'bottom':'top'}:3px;letter-spacing:0.05em;white-space:nowrap;">${h(qrCaption)}</div>` : '';
    const imgEl = `<img src="${_qrDataUrl}" style="width:${qrSizePx}px;height:${qrSizePx}px;display:block;image-rendering:crisp-edges;pointer-events:none;">`;

    const overlay = document.createElement('div');
    overlay.id = 'cv-qr-overlay';
    overlay.style.left = qrX + '%';
    overlay.style.top  = qrY + '%';
    overlay.innerHTML  = qrLabelPos === 'above' ? capEl + imgEl : imgEl + capEl;
    overlay.title = 'Ziehen zum Verschieben';

    document.getElementById('cv-paper').appendChild(overlay);
    initQRDrag(overlay);
  }

  // ── FOLIO OVERLAY QRs (pos='overlay', frei auf CV) ──
  document.querySelectorAll('[id^="cv-folio-qr-overlay-"]').forEach(el => el.remove());
  const paper = document.getElementById('cv-paper');
  activeFolioLinks.filter(l => l.pos === 'overlay' && l.showQR && l.qrDataUrl).forEach(l => {
    const ox   = parseFloat((document.getElementById('fl-ox-' + l.id)||{}).value ?? '75');
    const oy   = parseFloat((document.getElementById('fl-oy-' + l.id)||{}).value ?? '4');
    const os   = parseInt((document.getElementById('fl-os-' + l.id)||{}).value || '64');
    const ov   = document.createElement('div');
    ov.id      = 'cv-folio-qr-overlay-' + l.id;
    ov.style.position = 'absolute';
    ov.style.left     = ox + '%';
    ov.style.top      = oy + '%';
    ov.style.zIndex   = '20';
    ov.style.cursor   = 'move';
    ov.style.userSelect = 'none';
    ov.title = 'Ziehen zum Verschieben — ' + (l.label||l.url);
    ov.innerHTML = `<div style="text-align:center;background:rgba(255,255,255,0.92);padding:4px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
      <img src="${l.qrDataUrl}" style="width:${os}px;height:${os}px;display:block;image-rendering:crisp-edges;">
      ${l.label?`<div style="font-size:7px;margin-top:2px;opacity:0.6;font-weight:600;max-width:${os+8}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h(l.label)}</div>`:''}
    </div>`;
    paper.appendChild(ov);
    // Drag support — sync back to sliders
    initFolioOverlayDrag(ov, l.id);
  });

  const cvLeft=document.getElementById('cv-left');
  cvLeft.style.backgroundColor=col; cvLeft.style.color='#fff'; cvLeft.innerHTML=leftHTML;
  const cvRight=document.getElementById('cv-right');

  cvRight.innerHTML=rightHTML; cvRight.style.backgroundColor=rightBg;
  document.getElementById('cv-paper').style.fontFamily='"Source Sans 3",sans-serif';

  // PAGE 2
  const p2Title=val('p2-title'),p2Free=val('p2-freetext');
  const p2Entries=state.page2Entries.map(id=>({title:val('p2e-title-'+id),sub:val('p2e-sub-'+id),desc:val('p2e-desc-'+id)})).filter(e=>e.title||e.desc);
  const hasPage2=p2Title||p2Free||p2Entries.length>0;
  const paper2=document.getElementById('cv-paper-2'); paper2.style.display=hasPage2?'table':'none';
  if(hasPage2){
    let left2=`<div style="display:flex;justify-content:center;margin-bottom:1.5rem;"><div style="width:48px;height:48px;border-radius:50%;background:${colLight};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;border:3px solid rgba(255,255,255,0.3);">${t('page2Circle')}</div></div><div style="text-align:center;font-weight:700;font-size:14px;margin-bottom:4px;">${h(name)}</div><div style="text-align:center;font-size:9px;opacity:0.6;margin-bottom:2rem;">${h(role)}</div><div style="font-size:8.5px;font-weight:700;opacity:0.55;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:5px;margin-bottom:12px;">${t('cvContact')}</div>${email?`<div style="margin-bottom:8px;"><span style="font-size:8.5px;font-weight:700;opacity:0.5;display:block;">${t('cvEmail')}</span><span style="font-size:11px;opacity:.85;">${h(email)}</span></div>`:''}${phone?`<div style="margin-bottom:8px;"><span style="font-size:8.5px;font-weight:700;opacity:0.5;display:block;">${t('cvPhone')}</span><span style="font-size:11px;opacity:.85;">${h(phone)}</span></div>`:''}${web?(()=>{const wh=web.startsWith('http')?web:'https://'+web;return`<div style="margin-bottom:8px;"><span style="font-size:8.5px;font-weight:700;opacity:0.5;display:block;">${t('cvWeb')}</span><a href="${wh}" target="_blank" style="font-size:11px;color:inherit;text-decoration:underline;font-weight:700;">${h(webLabel)}</a></div>`;})():''}`;
    let right2=`<div style="font-size:${Math.round(22*fScale)}px;font-weight:700;color:#1e2e1d;margin-bottom:4px;font-family:${font};">${h(name)}</div><div style="font-size:${Math.round(11*fScale)}px;color:${colDark2};margin-bottom:12px;font-weight:500;">${h(role)}</div><div style="height:2px;margin-bottom:1.25rem;border-radius:1px;background:linear-gradient(90deg,${col} 0%,${colLight} 60%,transparent 100%);"></div>`;
    if(p2Title) right2+=`<div class="cv-section-head" style="color:${col};">${h(p2Title)}</div>`;
    p2Entries.forEach(e=>{right2+=`<div class="cv-entry" style="border-left-color:${colLight};margin-bottom:12px;"><div class="cv-entry-head"><span class="cv-entry-title">${h(e.title)}</span></div>${e.sub?`<div class="cv-entry-sub" style="color:${colDark2};">${h(e.sub)}</div>`:''} ${e.desc?`<div class="cv-entry-desc">${h(e.desc).replace(/\n/g,'<br>')}</div>`:''}</div>`;});
    if(p2Free) right2+=`<div style="font-size:${Math.round(11*fScale)}px;color:#555;line-height:${lineH};margin-top:1rem;">${h(p2Free).replace(/\n/g,'<br>')}</div>`;
    const l2=document.getElementById('cv-left-2'); l2.style.backgroundColor=col;l2.style.color='#fff';l2.innerHTML=left2;
    document.getElementById('cv-right-2').innerHTML=right2; paper2.style.fontFamily='"Source Sans 3",sans-serif';
  }
  updateProgress(); if(typeof updateATSScore==="function") updateATSScore();
}

// ─── HELPERS ─────────────────────────────────────
function val(id){const el=document.getElementById(id);return el?el.value:'';}
function h(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function esc(s){return String(s||'').replace(/"/g,'&quot;');}
function setVal(id,v){const el=document.getElementById(id);if(el)el.value=v||'';}
function lighten(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgb(${Math.round(r+(255-r)*a)},${Math.round(g+(255-g)*a)},${Math.round(b+(255-b)*a)})`;}
function colLight2(col){const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);return`rgb(${Math.min(255,Math.round(r*1.8))},${Math.min(255,Math.round(g*1.8))},${Math.min(255,Math.round(b*1.8))})`;}

// ─── ZOOM ────────────────────────────────────────
function changeZoom(delta){
  zoom=Math.min(1.4,Math.max(0.5,zoom+delta));
  document.getElementById('cv-paper').style.transform=`scale(${zoom})`;
  const p2=document.getElementById('cv-paper-2');if(p2)p2.style.transform=`scale(${zoom})`;
  document.getElementById('zoom-label').textContent=Math.round(zoom*100)+'%';
  document.getElementById('preview-area').style.paddingBottom=zoom>1?`${(zoom-1)*1000+80}px`:'2rem';
}

// ─── COLLECT / APPLY ─────────────────────────────
function collectData(){
  return{
    name:val('f-name'),role:val('f-role'),email:val('f-email'),phone:val('f-phone'),
    address:val('f-address'),birth:val('f-birth'),web:val('f-web'),webLabel:val('f-web-label'),linkedin:val('f-linkedin'),
    folio:val('f-folio'),folioLabel:val('f-folio-label'),
    folioShowLink:(document.getElementById('folio-show-link')||{}).checked!==false,
    folioShowQR:(document.getElementById('folio-show-qr')||{}).checked||false,
    folioLinks:_folioLinks.map(l=>({
      id:l.id,
      url:l.url||val('fl-url-'+l.id),
      label:l.label||val('fl-label-'+l.id),
      showLink:(document.getElementById('fl-showlink-'+l.id)||{}).checked!==false,
      showQR:!!((document.getElementById('fl-showqr-'+l.id)||{}).checked),
      qrDataUrl:l.qrDataUrl||'',
      pos:l.pos||'left',
      overlayX:parseFloat((document.getElementById('fl-ox-'+l.id)||{}).value??l.overlayX??75),
      overlayY:parseFloat((document.getElementById('fl-oy-'+l.id)||{}).value??l.overlayY??4),
      overlaySize:parseInt((document.getElementById('fl-os-'+l.id)||{}).value||l.overlaySize||64),
    })),
    summary:val('f-summary'),goal:val('f-goal'),komps:val('f-komps'),hobbies:val('f-hobbies'),
    kompsPos:val('f-komps-pos')||'right',hobbiesPos:val('f-hobbies-pos')||'right',licensePos:val('f-license-pos')||'right',
    color:state.color,font:state.font,photoData:state.photoData,
    fontScale:val('f-font-scale')||'100',lineHeight:val('f-line-height')||'1.75',rightBg:val('f-right-bg')||'#ffffff',
    qrInCV: (document.getElementById('qr-in-cv')||{}).checked||false,
    qrX: val('qr-x')||'4', qrY: val('qr-y')||'4', qrSize: val('qr-size')||'64',
    qrContent: val('qr-content')||'web', qrCaption: val('qr-caption'),
    qrCustom: val('qr-custom-text'), qrDataUrl: _qrDataUrl,
    qrFrame: _qrFrame||'none', qrEcl: val('qr-ecl')||'M',
    qrDarkColor: (document.getElementById('qr-dark-color')||{}).value||'',
    qrLightColor: (document.getElementById('qr-light-color')||{}).value||'',
    qrBorderSize: val('qr-border-size')||'2', qrLabelPos: val('qr-label-pos')||'none',
    sectionOrder:[...sectionOrder],
    license:['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D','T','L'].filter(c=>{const el=document.getElementById('lic-'+c);return el&&el.checked;}),
    licenseNote:val('f-license-note'),
    exp:state.exp.map(id=>({id,title:val('exp-title-'+id),company:val('exp-company-'+id),from:val('exp-from-'+id),to:val('exp-to-'+id),desc:val('exp-desc-'+id)})),
    edu:state.edu.map(id=>({id,degree:val('edu-degree-'+id),school:val('edu-school-'+id),from:val('edu-from-'+id),to:val('edu-to-'+id)})),
    skills:state.skills.map(id=>({id,name:val('sk-name-'+id),pct:val('sk-pct-'+id)})),
    langs:state.langs.map(id=>({id,name:val('ln-name-'+id),lvl:val('ln-lvl-'+id)})),
    extraquals:state.extraquals.map(id=>({id,title:val('eq-title-'+id),detail:val('eq-detail-'+id)})),
    refs:state.refs.map(id=>({id,name:val('ref-name-'+id),pos:val('ref-pos-'+id),company:val('ref-company-'+id),email:val('ref-email-'+id),phone:val('ref-phone-'+id),note:val('ref-note-'+id)})),
    certs:state.certs.map(id=>({id,title:val('cert-title-'+id),issuer:val('cert-issuer-'+id),date:val('cert-date-'+id),url:val('cert-url-'+id)})),
    projects:state.projects.map(id=>({id,title:val('proj-title-'+id),url:val('proj-url-'+id),from:val('proj-from-'+id),to:val('proj-to-'+id),desc:val('proj-desc-'+id)})),
    p2title:val('p2-title'),p2free:val('p2-freetext'),
    p2entries:state.page2Entries.map(id=>({id,title:val('p2e-title-'+id),sub:val('p2e-sub-'+id),desc:val('p2e-desc-'+id)})),
    photoShape:val('f-photo-shape'),photoSize:val('f-photo-size')||'120',borderSize:val('f-border-size')||'4',borderColor:val('f-border-color'),photoPos:val('f-photo-pos')||'25',
  };
}

function applyData(d){
  ['exp-list','edu-list','skill-list','lang-list','extraqual-list','ref-list','cert-list','proj-list','p2-entries-list'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='';});
  state.exp=[];state.edu=[];state.skills=[];state.langs=[];state.extraquals=[];state.refs=[];state.certs=[];state.projects=[];state.page2Entries=[];
  setVal('f-name',d.name);setVal('f-role',d.role);setVal('f-email',d.email);setVal('f-phone',d.phone);
  setVal('f-address',d.address);setVal('f-birth',d.birth);setVal('f-web',d.web);setVal('f-web-label',d.webLabel||t('placeholderWebLabel'));setVal('f-linkedin',d.linkedin||'');
  if(d.folio!=null){setVal('f-folio',d.folio);setVal('f-folio-label',d.folioLabel||'');
    const sl=document.getElementById('folio-show-link');if(sl)sl.checked=d.folioShowLink!==false;
    const sq=document.getElementById('folio-show-qr');if(sq)sq.checked=!!d.folioShowQR;
    if(d.folioShowQR)updateFolioQR();}
  // Restore multi folio links
  const folioListEl=document.getElementById('folio-links-list');
  if(folioListEl){folioListEl.innerHTML='';}_folioLinks=[];_folioCount=0;
  if(Array.isArray(d.folioLinks))d.folioLinks.forEach(l=>addFolioLink(l));
  setVal('f-summary',d.summary);setVal('f-goal',d.goal);setVal('f-komps',d.komps);setVal('f-hobbies',d.hobbies);
  setVal('f-komps-pos',d.kompsPos||'right');setVal('f-hobbies-pos',d.hobbiesPos||'right');setVal('f-license-pos',d.licensePos||'right');
  setVal('f-license-note',d.licenseNote);setVal('f-right-bg',d.rightBg||'#ffffff');
  setVal('p2-title',d.p2title);setVal('p2-freetext',d.p2free);
  if(d.fontScale){setVal('f-font-scale',d.fontScale);const lb=document.getElementById('font-scale-label');if(lb)lb.textContent=d.fontScale+'%';}
  if(d.lineHeight){setVal('f-line-height',d.lineHeight);const lb=document.getElementById('line-height-label');if(lb)lb.textContent=d.lineHeight;}
  if(d.rightBg) setVal('f-right-bg',d.rightBg);
  if(d.qrInCV){const el=document.getElementById('qr-in-cv');if(el){el.checked=true;const opts=document.getElementById('qr-cv-options');if(opts)opts.style.display='block';}}
  if(d.qrX!=null){setVal('qr-x',d.qrX);const lb=document.getElementById('qr-x-label');if(lb)lb.textContent=d.qrX+'%';}
  if(d.qrY!=null){setVal('qr-y',d.qrY);const lb=document.getElementById('qr-y-label');if(lb)lb.textContent=d.qrY+'%';}
  if(d.qrSize){setVal('qr-size',d.qrSize);const lb=document.getElementById('qr-size-label');if(lb)lb.textContent=d.qrSize+'px';}
  if(d.qrContent){setVal('qr-content',d.qrContent);const cw=document.getElementById('qr-custom-wrap');if(cw)cw.style.display=d.qrContent==='custom'?'block':'none';}
  if(d.qrCaption) setVal('qr-caption',d.qrCaption);
  if(d.qrCustom)  setVal('qr-custom-text',d.qrCustom);
  if(d.qrEcl)    setVal('qr-ecl',d.qrEcl);
  if(d.qrDarkColor) {const el=document.getElementById('qr-dark-color');if(el)el.value=d.qrDarkColor;}
  if(d.qrLightColor){const el=document.getElementById('qr-light-color');if(el)el.value=d.qrLightColor;}
  if(d.qrBorderSize){setVal('qr-border-size',d.qrBorderSize);const lb=document.getElementById('qr-border-label');if(lb)lb.textContent=d.qrBorderSize+'px';}
  if(d.qrLabelPos){ setVal('qr-label-pos',d.qrLabelPos);const cw=document.getElementById('qr-caption-wrap');if(cw)cw.style.display=d.qrLabelPos==='none'?'none':'block';}
  if(d.qrFrame){
    _qrFrame=d.qrFrame;
    const picked=document.querySelector(`.qr-frame-opt[data-frame="${d.qrFrame}"]`);
    if(picked){document.querySelectorAll('.qr-frame-opt').forEach(x=>x.classList.remove('selected'));picked.classList.add('selected');}
    const bw=document.getElementById('qr-border-wrap');if(bw)bw.style.display=d.qrFrame==='none'?'none':'block';
  }
  if(d.qrDataUrl){_qrDataUrl=d.qrDataUrl;const out=document.getElementById('qr-output');if(out){out.innerHTML=`<img src="${d.qrDataUrl}" style="max-width:160px;display:block;margin:0 auto;image-rendering:crisp-edges;">`;const lbl=document.getElementById('qr-url-label');if(lbl)lbl.textContent=t('toastQRSaved');}}

  if(d.photoShape)setVal('f-photo-shape',d.photoShape);
  if(d.photoPos){const el=document.getElementById('f-photo-pos');if(el){el.value=d.photoPos;const lb=document.getElementById('photo-pos-label');if(lb)lb.textContent=d.photoPos+'%';}}
  if(d.photoSize){const el=document.getElementById('f-photo-size');if(el){el.value=d.photoSize;const lb=document.getElementById('photo-size-label');if(lb)lb.textContent=d.photoSize+'px';}}
  if(d.borderSize){const el=document.getElementById('f-border-size');if(el){el.value=d.borderSize;const lb=document.getElementById('border-size-label');if(lb)lb.textContent=d.borderSize+'px';}}
  if(d.borderColor)setVal('f-border-color',d.borderColor);
  if(d.color){state.color=d.color;}if(d.font){state.font=d.font;}
  if(d.sectionOrder&&Array.isArray(d.sectionOrder)){sectionOrder=d.sectionOrder.filter(k=>SECTION_LABELS[k]);Object.keys(SECTION_LABELS).forEach(k=>{if(!sectionOrder.includes(k))sectionOrder.push(k);});buildSectionOrderUI();}
  if(d.license&&Array.isArray(d.license)){['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D','T','L'].forEach(c=>{const el=document.getElementById('lic-'+c);if(el)el.checked=false;});d.license.forEach(c=>{const el=document.getElementById('lic-'+c);if(el)el.checked=true;});}
  if(d.photoData){state.photoData=d.photoData;document.getElementById('photo-preview-img').src=d.photoData;document.getElementById('photo-preview-name').textContent=t('photoShown');document.getElementById('photo-drop-zone').style.display='none';document.getElementById('photo-preview-section').style.display='block';}
  (d.exp||[]).forEach(e=>addEntry('exp',e));(d.edu||[]).forEach(e=>addEntry('edu',e));
  (d.skills||[]).forEach(s=>addSkill(s));(d.langs||[]).forEach(l=>addLang(l));
  (d.extraquals||[]).forEach(e=>addExtraQual(e));(d.refs||[]).forEach(r=>addRef(r));
  (d.certs||[]).forEach(c=>addCert(c));(d.projects||[]).forEach(p=>addProject(p));
  (d.p2entries||[]).forEach(e=>addPage2Entry(e));
  buildColorPicker();buildFontPicker();updateCharCount();render();
}

// ─── SAVE / LOAD ─────────────────────────────────
function saveData(silent=false){
  const ind=document.getElementById('autosave-indicator');
  if(ind){ind.className='saving';ind.style.color='rgba(255,255,255,0.4)';}
  localStorage.setItem('cvbuilder_data',JSON.stringify(collectData()));
  if(ind){setTimeout(()=>{ind.className='saved';ind.style.color='rgba(255,255,255,0.5)';setTimeout(()=>{ind.className='';ind.style.color='rgba(255,255,255,0.3)';},3000);},200);}
  if(!silent)showToast(t('toastSaved'));
}
function loadSaved(){
  const raw=localStorage.getItem('cvbuilder_data'); if(!raw) return;
  try{state._pendingLoad=JSON.parse(raw);}catch{}
}
function buildDynamicLists(){
  const d=state._pendingLoad;
  if(!d){
    [{name:'HTML & CSS',pct:40},{name:'Python',pct:30},{name:t('defaultSkillSoft'),pct:80}].forEach(s=>addSkill(s));
    [{name:'العربية / Arabisch / Arabic',lvl:'native'},{name:'Deutsch / German',lvl:'advanced'},{name:'Englisch / English',lvl:'advanced'}].forEach(l=>addLang(l));
    return;
  }
  applyData(d);
}
function resetAll(){
  if(!confirm(t('toastResetConfirm'))) return;
  localStorage.removeItem('cvbuilder_data');
  localStorage.removeItem('cvbuilder_lang');
  // Set translated default for web-label if empty
  const wlEl = document.getElementById('f-web-label');
  if (wlEl && !wlEl.value) wlEl.value = t('placeholderWebLabel');
  location.reload();
}

// ─── PDF EXPORT ──────────────────────────────────
function exportPDF(){window.print();}
function downloadPDF(){
  const name=val('f-name')||'CV';
  const filename=name.replace(/\s+/g,'_')+'_Lebenslauf.pdf';
  showToast(t('toastPDFBuilding'));
  const pages=[{paperId:'cv-paper',leftId:'cv-left',paper:document.getElementById('cv-paper'),left:document.getElementById('cv-left'),right:document.getElementById('cv-right')}];
  const p2el=document.getElementById('cv-paper-2');
  if(p2el&&p2el.style.display!=='none')pages.push({paperId:'cv-paper-2',leftId:'cv-left-2',paper:p2el,left:document.getElementById('cv-left-2'),right:document.getElementById('cv-right-2')});
  const savedT=pages.map(p=>{const s=p.paper.style.transform;p.paper.style.transform='scale(1)';return s;});
  function offRel(el,anc){let x=0,y=0,cur=el;while(cur&&cur!==anc){x+=cur.offsetLeft;y+=cur.offsetTop;cur=cur.offsetParent;}return{x,y,w:el.offsetWidth,h:el.offsetHeight};}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const heights=pages.map(p=>Math.max(p.paper.offsetHeight,p.left.scrollHeight,p.right.scrollHeight,1050));
    const{jsPDF}=window.jspdf; const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const pW=210,pH=297;
    const next=i=>{
      if(i>=pages.length){pages.forEach((p,idx)=>{p.paper.style.transform=savedT[idx];});pdf.save(filename);showToast(t('toastPDFDone'));return;}
      const pg=pages[i],fullH=heights[i],col=state.color,paperPxW=pg.paper.offsetWidth||720;
      const rawLinks=[];
      pg.paper.querySelectorAll('a[href]').forEach(link=>{const href=link.getAttribute('href');if(!href||href==='#')return;const pos=offRel(link,pg.paper);rawLinks.push({url:href,xPx:pos.x,yPx:pos.y,wPx:Math.max(pos.w,60),hPx:Math.max(pos.h,14)});});
      html2canvas(pg.paper,{scale:4,useCORS:true,allowTaint:true,backgroundColor:'#ffffff',logging:false,
        onclone:doc=>{const cP=doc.getElementById(pg.paperId);const cL=doc.getElementById(pg.leftId);if(cP){cP.style.display='table';cP.style.minHeight=fullH+'px';cP.style.height=fullH+'px';}if(cL){cL.style.display='table-cell';cL.style.height=fullH+'px';cL.style.minHeight=fullH+'px';cL.style.backgroundColor=col;cL.style.background=col;}}
      }).then(canvas=>{
        if(i>0)pdf.addPage();
        const firstPage=pdf.getNumberOfPages(),imgH=(canvas.height*pW)/canvas.width;
        let posY=0,rem=imgH,isFirst=true;
        while(rem>0){if(!isFirst)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',0.98),'JPEG',0,-posY,pW,imgH);posY+=pH;rem-=pH;isFirst=false;}
        const mmX=pW/paperPxW,mmY=imgH/fullH;
        rawLinks.forEach(({url,xPx,yPx,wPx,hPx})=>{const xM=xPx*mmX,yM=yPx*mmY,wM=wPx*mmX,hM=hPx*mmY,pgIdx=Math.floor(yM/pH),yOp=yM-pgIdx*pH,tPg=firstPage+pgIdx;if(tPg<=pdf.getNumberOfPages()){pdf.setPage(tPg);pdf.link(xM,yOp,wM,hM,{url});}});
        pdf.setPage(pdf.getNumberOfPages());next(i+1);
      }).catch(err=>{console.error(err);showToast(t('toastPDFError'));pages.forEach((p,idx)=>{p.paper.style.transform=savedT[idx];});});
    };
    next(0);
  }));
}

// ─── TOAST ───────────────────────────────────────
function showToast(msg){
  let el=document.getElementById('toast');
  if(!el){el=document.createElement('div');el.id='toast';Object.assign(el.style,{position:'fixed',bottom:'1.5rem',right:'1.5rem',background:'#2d3d2c',color:'#fff',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',zIndex:'9999',transition:'opacity 0.3s'});document.body.appendChild(el);}
  el.textContent=msg;el.style.opacity='1';clearTimeout(el._to);el._to=setTimeout(()=>el.style.opacity='0',2400);
}

// ─── PHOTO ───────────────────────────────────────
function handlePhotoUpload(e){const f=e.target.files[0];if(f)readPhoto(f);}
function handleDrop(e){e.preventDefault();document.getElementById('photo-drop-zone').style.borderColor='';const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/'))readPhoto(f);}
function readPhoto(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const SIZE=600,canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      const scale=Math.max(SIZE/img.width,SIZE/img.height),cropW=SIZE/scale,cropH=SIZE/scale;
      const posVal=parseFloat((document.getElementById('f-photo-pos')||{}).value||'25')/100;
      const cropX=(img.width-cropW)/2,cropY=Math.max(0,(img.height-cropH)*posVal);
      ctx.drawImage(img,cropX,cropY,cropW,cropH,0,0,SIZE,SIZE);
      state.photoData=canvas.toDataURL('image/jpeg',0.95);
      document.getElementById('photo-preview-img').src=state.photoData;
      document.getElementById('photo-preview-name').textContent=file.name;
      document.getElementById('photo-drop-zone').style.display='none';
      document.getElementById('photo-preview-section').style.display='block';
      render();updateProgress();if(typeof updateATSScore==="function")updateATSScore();updatePhotoDesignPreview();showToast(t('toastPhotoUploaded'));
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function removePhoto(){state.photoData='';document.getElementById('photo-input').value='';document.getElementById('photo-preview-img').src='';document.getElementById('photo-drop-zone').style.display='block';document.getElementById('photo-preview-section').style.display='none';render();updateProgress();if(typeof updateATSScore==="function")updateATSScore();updatePhotoDesignPreview();}

// ─── START ───────────────────────────────────────
init();
setTimeout(initWheelZoom, 600);

// ─── MAUSRAD-ZOOM ────────────────────────────────
function initWheelZoom() {
  const preview = document.getElementById('preview-area');
  if (!preview) return;
  preview.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    changeZoom(e.deltaY < 0 ? 0.1 : -0.1);
  }, { passive: false });
}

// ─── KI-ASSISTENT ────────────────────────────────
let _aiTone = 'professionell';
let _aiLastResult = '';

function selectTone(btn, tone) {
  _aiTone = tone;
  document.querySelectorAll('.ai-tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function runAI() {
  const aiType = document.getElementById('ai-type')?.value || 'summary';
  const aiInput = document.getElementById('ai-input')?.value?.trim();
  const aiLang = document.getElementById('ai-lang-out')?.value || 'Deutsch';

  if (!aiInput) {
    document.getElementById('ai-error').style.display = 'block';
    document.getElementById('ai-error').textContent = '⚠ Bitte geben Sie zuerst Ihre Stichpunkte ein.';
    return;
  }

  document.getElementById('ai-error').style.display = 'none';
  document.getElementById('ai-result-wrap').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-run-btn').disabled = true;

  const prompts = {
    summary: `Schreibe ein professionelles Kurzprofil für einen Lebenslauf auf ${aiLang}. Ton: ${_aiTone}. Länge: 3-4 Sätze. Nutze diese Infos: ${aiInput}. Antworte NUR mit dem Text, keine Überschriften oder Erklärungen.`,
    experience: `Schreibe eine professionelle Berufserfahrungs-Beschreibung für einen Lebenslauf auf ${aiLang}. Ton: ${_aiTone}. Nutze Aufzählungspunkte (•). Basiere dich auf: ${aiInput}. Antworte NUR mit dem Text.`,
    skills: `Liste professionelle Skills und Stärken für einen Lebenslauf auf ${aiLang} auf. Ton: ${_aiTone}. Je Zeile ein Skill, kurz und präzise. Basiere dich auf: ${aiInput}. Antworte NUR mit der Liste.`,
    cover: `Schreibe eine professionelle Anschreiben-Einleitung (2-3 Sätze) auf ${aiLang}. Ton: ${_aiTone}. Nutze diese Infos: ${aiInput}. Antworte NUR mit dem Text.`,
    improve: `Verbessere folgenden Text stilistisch für einen Lebenslauf auf ${aiLang}. Mache ihn ${_aiTone}er, prägnanter und professioneller. Behalte den Inhalt bei. Text: ${aiInput}. Antworte NUR mit dem verbesserten Text.`,
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompts[aiType] || prompts.summary }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API-Fehler');
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    _aiLastResult = text.trim();

    document.getElementById('ai-result-text').textContent = _aiLastResult;
    document.getElementById('ai-result-wrap').style.display = 'block';
  } catch (err) {
    document.getElementById('ai-error').style.display = 'block';
    document.getElementById('ai-error').textContent = '❌ Fehler: ' + (err.message || 'Unbekannter Fehler. Bitte versuchen Sie es erneut.');
  } finally {
    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-run-btn').disabled = false;
  }
}

function aiCopyToClipboard() {
  if (!_aiLastResult) return;
  navigator.clipboard.writeText(_aiLastResult).then(() => showToast('✓ Text kopiert!')).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = _aiLastResult; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('✓ Text kopiert!');
  });
}

function aiApplyToField() {
  if (!_aiLastResult) return;
  const el = document.getElementById('f-summary');
  if (el) { el.value = _aiLastResult; renderDebounced(); updateProgress(); if(typeof updateATSScore==="function")updateATSScore(); updateCharCount(); showToast('✓ In Kurzprofil übernommen!'); }
}

// ─── FOTO DESIGN LIVE-VORSCHAU ────────────────────
function updatePhotoDesignPreview() {
  const wrap = document.getElementById('photo-design-avatar');
  if (!wrap) return;
  const size    = parseInt((document.getElementById('f-photo-size')||{}).value || '120');
  const border  = parseInt((document.getElementById('f-border-size')||{}).value || '4');
  const bColor  = (document.getElementById('f-border-color')||{}).value || 'rgba(255,255,255,0.9)';
  const shape   = (document.getElementById('f-photo-shape')||{}).value || 'circle';
  const radius  = shape === 'square' ? '10px' : '50%';
  // Scale down to max 100px for the mini preview
  const scale   = Math.min(1, 100 / size);
  const dispSz  = Math.round(size * scale) + 'px';
  const col     = state.color || '#3b4f3a';
  const colL    = lighten(col, 0.55);
  const name    = val('f-name') || '';
  const initials = name.split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase() || 'CV';

  if (state.photoData) {
    wrap.innerHTML = `<img src="${state.photoData}"
      style="width:${dispSz};height:${dispSz};border-radius:${radius};
             object-fit:cover;object-position:center top;
             border:${border}px solid ${bColor};
             box-shadow:0 4px 18px rgba(0,0,0,0.30);display:block;
             transition:all 0.2s;">`;
  } else {
    wrap.innerHTML = `<div style="width:${dispSz};height:${dispSz};border-radius:${radius};
      background:linear-gradient(145deg,${colL} 0%,${col} 100%);
      border:${border}px solid ${bColor};
      font-size:${Math.round(size*scale*0.28)}px;font-weight:700;color:#fff;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 18px rgba(0,0,0,0.20);
      transition:all 0.2s;">${initials}</div>`;
  }
}// ═══════════════════════════════════════════════
//  CV BUILDER — script.js  (v3 – alle Features)
// ═══════════════════════════════════════════════

let state = {
  color:'#3b4f3a', font:'Playfair Display', photoData:'',
  page2Entries:[],
  exp:[], edu:[], skills:[], langs:[], extraquals:[],
  refs:[], certs:[], projects:[],
  savedExp:[], savedEdu:[], savedSkills:[], savedLangs:[], savedExtraQuals:[],
  savedRefs:[], savedCerts:[], savedProjects:[],
};

let zoom=1;
let expCount=0, eduCount=0, p2Count=0, eqCount=0, refCount=0, certCount=0, projCount=0;
let undoStack=[];
let sectionOrder=['profile','experience','education','komps','hobbies','extraquals','referenzen','zertifikate','projekte','folio'];
let autoSaveTimer=null;
let dragSrcId=null, dragType=null;

// ─── DEBOUNCE ───────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
const renderDebounced = debounce(() => render(), 150);

const COLORS=[
  {val:'#2d3d2c'},{val:'#1a3a5c'},{val:'#5c2d2d'},
  {val:'#2d2d4a'},{val:'#3d3020'},{val:'#1a4040'},
  {val:'#4a3a1a'},{val:'#2a2a2a'},{val:'#8F9790'},
];
const FONTS=[
  {val:'Playfair Display',label:'Playfair',   subKey:'fontClassic'},
  {val:'Georgia',          label:'Georgia',    subKey:'fontTraditional'},
  {val:'"Source Sans 3"',  label:'Source Sans',subKey:'fontModern'},
  {val:'Verdana',          label:'Verdana',    subKey:'fontClear'},
];
function getSectionLabels(){return{
  profile:t('cvProfile'), experience:t('cvExperience'),
  education:t('cvEducation'), komps:t('cvKomps'),
  hobbies:t('cvInterests'), extraquals:t('cvExtraQual'),
  referenzen:t('cvReferenzen'), zertifikate:t('cvZertifikate'), projekte:t('cvProjekte'),
  folio:t('cvFolioSection')||'Portfolio & Links',
};}
// Keep for import/export key validation only (values not shown in UI)
const SECTION_LABELS={
  profile:'profile', experience:'experience', education:'education', komps:'komps',
  hobbies:'hobbies', extraquals:'extraquals', referenzen:'referenzen',
  zertifikate:'zertifikate', projekte:'projekte', folio:'folio',
};
function getRoleSuggestions(){ return t('roleSuggestions').split('|'); }

// ─── INIT ───────────────────────────────────────
function init() {
  const isAr=currentLang==='ar';
  document.documentElement.setAttribute('dir',isAr?'rtl':'ltr');
  document.documentElement.setAttribute('lang',currentLang);
  buildColorPicker(); buildFontPicker(); buildSectionOrderUI();
  buildRoleSuggestions();
  loadSaved(); buildDynamicLists();
  applyTranslations(); buildProfilesList();
  startAutoSave(); updateProgress(); render();
  initKeyboardShortcuts();
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    // Don't hijack shortcuts when typing in inputs/textareas
    const inField = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveData();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !inField) {
      e.preventDefault();
      undoDelete();
    }
  });
}

function buildRoleSuggestions() {
  let dl=document.getElementById('role-suggestions');
  if(!dl){dl=document.createElement('datalist');dl.id='role-suggestions';document.body.appendChild(dl);}
  dl.innerHTML=getRoleSuggestions().map(r=>`<option value="${r}">`).join('');
}

function buildColorPicker() {
  const wrap=document.getElementById('color-picker'); if(!wrap) return;
  COLORS.forEach(c=>{
    const el=document.createElement('div');
    el.className='color-opt'+(state.color===c.val?' selected':'');
    el.style.backgroundColor=c.val;
    el.onclick=()=>{
      state.color=c.val;
      document.querySelectorAll('.color-opt').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      const cc=document.getElementById('f-custom-color');if(cc)cc.value=c.val;
      render();
    };
    wrap.appendChild(el);
  });
}

function setCustomColor(val) {
  state.color = val;
  document.querySelectorAll('.color-opt').forEach(x=>x.classList.remove('selected'));
  render();
}

function buildFontPicker() {
  const wrap=document.getElementById('font-picker'); if(!wrap) return;
  wrap.innerHTML='';
  FONTS.forEach(f=>{
    const el=document.createElement('div');
    el.className='font-opt'+(state.font===f.val?' selected':'');
    el.innerHTML=`<div class="font-opt-name" style="font-family:${f.val}">${f.label}</div><div class="font-opt-label">${t(f.subKey)}</div>`;
    el.onclick=()=>{state.font=f.val;document.querySelectorAll('.font-opt').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');render();};
    wrap.appendChild(el);
  });
}

// ─── SECTION ORDER ──────────────────────────────
function buildSectionOrderUI() {
  const wrap=document.getElementById('section-order-list'); if(!wrap) return;
  wrap.innerHTML='';
  const labels=getSectionLabels();
  sectionOrder.forEach(key=>{
    const item=document.createElement('div');
    item.className='section-order-item'; item.draggable=true; item.dataset.key=key;
    item.innerHTML=`<span class="so-handle">⠿</span><span>${labels[key]||SECTION_LABELS[key]||key}</span>`;
    item.addEventListener('dragstart',e=>{dragSrcId=key;dragType='section';item.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
    item.addEventListener('dragend',()=>item.classList.remove('dragging'));
    item.addEventListener('dragover',e=>{e.preventDefault();item.classList.add('drag-over');});
    item.addEventListener('dragleave',()=>item.classList.remove('drag-over'));
    item.addEventListener('drop',e=>{
      e.preventDefault();item.classList.remove('drag-over');
      if(dragType!=='section'||dragSrcId===key) return;
      const from=sectionOrder.indexOf(dragSrcId), to=sectionOrder.indexOf(key);
      sectionOrder.splice(to,0,sectionOrder.splice(from,1)[0]);
      buildSectionOrderUI(); render();
    });
    wrap.appendChild(item);
  });
}

// ─── TABS ───────────────────────────────────────
function switchTab(id,btn) {
  document.querySelectorAll('.etab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.epanel').forEach(p=>{p.classList.remove('active');p.style.display='none';});
  btn.classList.add('active');
  const panel = document.getElementById('panel-'+id);
  if(panel){ panel.style.display='block'; panel.classList.add('active'); }
  if(id==='design') setTimeout(updatePhotoDesignPreview, 50);
}

// ─── PROFILES ───────────────────────────────────
function getProfiles(){try{return JSON.parse(localStorage.getItem('cvbuilder_profiles')||'[]');}catch{return[];}}
function saveProfiles(arr){localStorage.setItem('cvbuilder_profiles',JSON.stringify(arr));}
function getCurrentProfileId(){return localStorage.getItem('cvbuilder_current_profile')||'';}
function setCurrentProfileId(id){localStorage.setItem('cvbuilder_current_profile',id);}

function buildProfilesList(){
  const wrap=document.getElementById('profiles-list'); if(!wrap) return;
  const profiles=getProfiles(), curId=getCurrentProfileId();
  wrap.innerHTML=profiles.length===0?`<div style="font-size:12px;color:#888;padding:8px 0;">${t('noProfiles')}</div>`:'';
  profiles.forEach(p=>{
    const row=document.createElement('div'); row.className='profile-row'+(p.id===curId?' active':'');
    row.innerHTML=`<span class="profile-name">${h(p.name)}</span><div class="profile-btns"><button class="pbtn" onclick="loadProfile('${p.id}')">Laden</button><button class="pbtn danger" onclick="deleteProfile('${p.id}')">×</button></div>`;
    wrap.appendChild(row);
  });
  const cnt=document.getElementById('profile-count'); if(cnt) cnt.textContent=profiles.length+'/5';
}

function saveAsProfile(){
  const profiles=getProfiles();
  if(profiles.length>=5){showToast('❌ '+t('toastMaxProfiles'));return;}
  const name=prompt('Profilname:','Profil '+(profiles.length+1)); if(!name) return;
  const id='p_'+Date.now(), data=collectData();
  profiles.push({id,name:name.trim(),data}); saveProfiles(profiles);
  setCurrentProfileId(id); buildProfilesList(); showToast('✓ '+t('toastProfileSaved')+': '+name);
}
function loadProfile(id){
  const p=getProfiles().find(x=>x.id===id); if(!p) return;
  if(!confirm('Aktuellen Stand mit "'+p.name+'" überschreiben?')) return;
  setCurrentProfileId(id); applyData(p.data); buildProfilesList(); showToast('✓ '+t('toastProfileLoaded')+': '+p.name);
  document.getElementById('profile-modal').style.display='none';
}
function deleteProfile(id){
  let profiles=getProfiles(); const p=profiles.find(x=>x.id===id);
  if(!p||!confirm('Profil "'+p.name+'" löschen?')) return;
  profiles=profiles.filter(x=>x.id!==id); saveProfiles(profiles);
  if(getCurrentProfileId()===id) setCurrentProfileId('');
  buildProfilesList(); showToast(t('toastProfileDeleted'));
}
function openProfileModal(){buildProfilesList();document.getElementById('profile-modal').style.display='flex';}
function closeProfileModal(){document.getElementById('profile-modal').style.display='none';}

// ─── CHAR COUNTER ───────────────────────────────
function updateCharCount(){
  const el=document.getElementById('f-summary'), counter=document.getElementById('summary-char-count');
  if(!el||!counter) return;
  const len=el.value.length;
  counter.textContent=len+' / 600';
  counter.style.color=len>600?'#c0392b':len>480?'#e67e22':'#8a9e89';
}

// ─── PROGRESS ───────────────────────────────────
function updateProgress(){
  const fields=['f-name','f-role','f-email','f-phone','f-address','f-summary'];
  const filled=fields.filter(id=>val(id).trim().length>0).length;
  const bonus=(state.exp.length>0?1:0)+(state.edu.length>0?1:0)+(state.skills.length>0?1:0)+(state.photoData?1:0);
  const pct=Math.round(((filled+bonus)/(fields.length+4))*100);
  const bar=document.getElementById('progress-fill'), label=document.getElementById('progress-label');
  if(bar){bar.style.width=pct+'%'; bar.style.background=pct>=80?'#5a7358':pct>=50?'#e67e22':'#c0392b';}
  if(label) label.textContent=pct+'%';
}

// ─── AUTO-SAVE ──────────────────────────────────
function startAutoSave(){
  if(autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer=setInterval(()=>saveData(true),30000);
}

// ─── QR CODE ────────────────────────────────────
let _qrDataUrl = '';
let _qrFrame   = 'none';

// ─── FOLIO LINKS (multi-entry) ───────────────────
let _folioLinks = []; // [{id, url, label, showLink, showQR, qrDataUrl}]
let _folioCount = 0;

function addFolioLink(data = {}) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  _folioCount++;
  const num = _folioCount;
  const pos = data.pos || 'left'; // 'left' = sidebar, 'overlay' = free floating on CV
  _folioLinks.push({ id, url: data.url||'', label: data.label||'', showLink: data.showLink!==false, showQR: !!data.showQR, qrDataUrl: data.qrDataUrl||'', pos });

  const list = document.getElementById('folio-links-list');
  const card = document.createElement('div');
  card.className = 'folio-link-card';
  card.id = 'folio-card-' + id;

  card.innerHTML = `
    <div class="folio-card-header">
      <span class="folio-card-icon">🔗</span>
      <span class="folio-card-num">Link #${num}</span>
      <button class="folio-card-del" onclick="removeFolioLink('${id}')" title="Entfernen">×</button>
    </div>
    <div class="form-group" style="margin-bottom:8px;">
      <label style="font-size:11px;" data-i18n="labelFolioURL">URL</label>
      <input type="text" id="fl-url-${id}" value="${esc(data.url||'')}"
        placeholder="https://behance.net/..." data-i18n="placeholderFolioURL" data-i18n-attr="placeholder"
        oninput="onFolioLinkInput('${id}')">
    </div>
    <div class="form-group" style="margin-bottom:8px;">
      <label style="font-size:11px;" data-i18n="labelFolioLinkText">Linktext im Lebenslauf</label>
      <input type="text" id="fl-label-${id}" value="${esc(data.label||'')}"
        placeholder="z.B. Mein Portfolio" data-i18n="placeholderFolioLinkText" data-i18n-attr="placeholder"
        oninput="onFolioLinkInput('${id}')">
    </div>

    <!-- ── ANZEIGEN ALS + POSITION (immer sichtbar) ── -->
    <div class="folio-display-grid">
      <!-- Links: Anzeigen-Optionen -->
      <div class="folio-display-col">
        <div class="folio-col-head">Anzeigen als</div>
        <label class="folio-toggle-label" style="margin-bottom:6px;">
          <input type="checkbox" id="fl-showlink-${id}" ${data.showLink!==false?'checked':''} onchange="onFolioVisibilityChange('${id}')">
          <span>🔗 Klickbarer Link</span>
        </label>
        <label class="folio-toggle-label">
          <input type="checkbox" id="fl-showqr-${id}" ${data.showQR?'checked':''} onchange="onFolioVisibilityChange('${id}')">
          <span>🔲 QR-Code</span>
        </label>
      </div>
      <!-- Rechts: Position -->
      <div class="folio-display-col">
        <div class="folio-col-head">Position im CV</div>
        <button class="folio-pos-pill ${pos==='left'?'active':''}" onclick="setFolioLinkPos('${id}','left')" id="fl-pill-left-${id}">
          ⬅ Links
          <span class="folio-pos-desc">Seitenleiste</span>
        </button>
        <button class="folio-pos-pill ${pos==='right'?'active':''}" onclick="setFolioLinkPos('${id}','right')" id="fl-pill-right-${id}">
          ➡ Rechts
          <span class="folio-pos-desc">Hauptbereich</span>
        </button>
        <button class="folio-pos-pill ${pos==='overlay'?'active':''}" onclick="setFolioLinkPos('${id}','overlay')" id="fl-pill-overlay-${id}" style="margin-top:4px;">
          📌 Frei
          <span class="folio-pos-desc">Overlay auf CV</span>
        </button>
      </div>
    </div>

    <!-- Overlay controls (nur bei pos=overlay) -->
    <div id="fl-overlay-controls-${id}" style="${pos==='overlay'?'':'display:none;'}margin-top:8px;padding:10px;background:#f5f5f5;border-radius:7px;">
      <div style="font-size:10px;color:var(--ink-faint);margin-bottom:8px;font-weight:600;">📍 Frei-Position auf dem CV (in %)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <div>
          <label style="font-size:10px;">Horizontal: <span id="fl-ox-label-${id}">${data.overlayX||'75'}%</span></label>
          <input type="range" id="fl-ox-${id}" min="0" max="92" value="${data.overlayX||75}" step="1"
            oninput="document.getElementById('fl-ox-label-${id}').textContent=this.value+'%';onFolioLinkInput('${id}')"
            style="width:100%;accent-color:var(--g-muted);">
        </div>
        <div>
          <label style="font-size:10px;">Vertikal: <span id="fl-oy-label-${id}">${data.overlayY||'4'}%</span></label>
          <input type="range" id="fl-oy-${id}" min="0" max="92" value="${data.overlayY||4}" step="1"
            oninput="document.getElementById('fl-oy-label-${id}').textContent=this.value+'%';onFolioLinkInput('${id}')"
            style="width:100%;accent-color:var(--g-muted);">
        </div>
      </div>
      <div style="margin-bottom:6px;">
        <label style="font-size:10px;">Größe: <span id="fl-os-label-${id}">${data.overlaySize||64}px</span></label>
        <input type="range" id="fl-os-${id}" min="40" max="130" value="${data.overlaySize||64}" step="4"
          oninput="document.getElementById('fl-os-label-${id}').textContent=this.value+'px';onFolioLinkInput('${id}')"
          style="width:100%;accent-color:var(--g-muted);">
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',4,4)" style="font-size:9px;">↖ Lo</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',38,4)" style="font-size:9px;">↑ Mo</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',88,4)" style="font-size:9px;">↗ Ro</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',4,44)" style="font-size:9px;">← Lm</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',38,44)" style="font-size:9px;">⊙</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',88,44)" style="font-size:9px;">→ Rm</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',4,86)" style="font-size:9px;">↙ Lu</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',38,86)" style="font-size:9px;">↓ Mu</button>
        <button class="qr-snap-btn" onclick="snapFolioOverlay('${id}',88,86)" style="font-size:9px;">↘ Ru</button>
      </div>
      <div style="font-size:9px;color:var(--ink-faint);margin-top:5px;" data-i18n="folioOverlayDragHint">💡 QR-Code im Vorschau-Bereich direkt verschieben.</div>
    </div>

    <!-- QR Vorschau (bei showQR) -->
    <div class="folio-qr-mini-preview" id="fl-qrpreview-${id}" ${data.showQR&&data.qrDataUrl?'style="display:block;"':''}>
      <div class="qr-mini-label" data-i18n="folioQRPreviewLabel">QR-Code Vorschau</div>
      <div id="fl-qrout-${id}" style="display:inline-block;">${data.qrDataUrl?`<img src="${data.qrDataUrl}" style="width:100px;height:100px;image-rendering:crisp-edges;">`:''}</div>
      <div style="margin-top:6px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
        <button class="btn-add" style="margin:0;font-size:10px;padding:3px 10px;" onclick="regenerateFolioQR('${id}')" data-i18n="btnRegenQR">🔄 Neu generieren</button>
        <button class="btn-add" style="margin:0;font-size:10px;padding:3px 10px;" onclick="downloadSingleFolioQR('${id}')" data-i18n="btnDownloadFolioQR">⬇ PNG</button>
      </div>
    </div>`;

  list.appendChild(card);
  if (data.showQR && data.url) setTimeout(() => generateSingleFolioQR(id), 150);
  render();
}

function setFolioLinkPos(id, pos) {
  const obj = getFolioLinkObj(id);
  if (obj) obj.pos = pos;
  // Update pill active states
  ['left','right','overlay'].forEach(p => {
    const btn = document.getElementById('fl-pill-' + p + '-' + id);
    if (btn) btn.classList.toggle('active', p === pos);
  });
  // Show/hide overlay controls (only for overlay position)
  const oc = document.getElementById('fl-overlay-controls-' + id);
  if (oc) oc.style.display = pos === 'overlay' ? 'block' : 'none';
  renderDebounced();
}

function snapFolioOverlay(id, x, y) {
  const ox = document.getElementById('fl-ox-' + id);
  const oy = document.getElementById('fl-oy-' + id);
  const lx = document.getElementById('fl-ox-label-' + id);
  const ly = document.getElementById('fl-oy-label-' + id);
  if (ox) { ox.value = x; if (lx) lx.textContent = x + '%'; }
  if (oy) { oy.value = y; if (ly) ly.textContent = y + '%'; }
  onFolioLinkInput(id);
}

function removeFolioLink(id) {
  const card = document.getElementById('folio-card-' + id);
  if (card) card.remove();
  _folioLinks = _folioLinks.filter(l => l.id !== id);
  render();
}

function getFolioLinkObj(id) {
  return _folioLinks.find(l => l.id === id);
}

function onFolioLinkInput(id) {
  const obj = getFolioLinkObj(id);
  if (!obj) return;
  obj.url       = val('fl-url-' + id);
  obj.label     = val('fl-label-' + id);
  obj.showLink  = (document.getElementById('fl-showlink-' + id)||{}).checked !== false;
  obj.overlayX  = parseFloat((document.getElementById('fl-ox-' + id)||{}).value ?? obj.overlayX ?? 75);
  obj.overlayY  = parseFloat((document.getElementById('fl-oy-' + id)||{}).value ?? obj.overlayY ?? 4);
  obj.overlaySize = parseInt((document.getElementById('fl-os-' + id)||{}).value || obj.overlaySize || 64);
  renderDebounced();
}

function onFolioVisibilityChange(id) {
  const obj = getFolioLinkObj(id);
  if (!obj) return;
  obj.url      = val('fl-url-' + id);
  obj.label    = val('fl-label-' + id);
  obj.showLink = (document.getElementById('fl-showlink-' + id)||{}).checked !== false;
  obj.showQR   = !!((document.getElementById('fl-showqr-' + id)||{}).checked);

  const preview = document.getElementById('fl-qrpreview-' + id);
  if (!obj.showQR) {
    if (preview) preview.style.display = 'none';
    obj.qrDataUrl = '';
    renderDebounced();
    return;
  }
  if (preview) preview.style.display = 'block';
  generateSingleFolioQR(id);
}

function onFolioToggleQR(id) { onFolioVisibilityChange(id); }

function generateSingleFolioQR(id) {
  const obj = getFolioLinkObj(id);
  if (!obj || !obj.url) return;
  const outEl = document.getElementById('fl-qrout-' + id);
  if (!outEl) return;
  outEl.innerHTML = '';
  const url = obj.url.startsWith('http') ? obj.url : 'https://' + obj.url;
  const tmp = document.createElement('div');
  outEl.appendChild(tmp);
  try {
    new QRCode(tmp, { text: url, width: 120, height: 120, colorDark: '#1a2419', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    setTimeout(() => {
      const img = tmp.querySelector('img') || tmp.querySelector('canvas');
      if (img) {
        obj.qrDataUrl = img.tagName === 'CANVAS' ? img.toDataURL('image/png') : img.src;
      }
      render();
    }, 220);
  } catch(e) { console.warn('Folio QR error', e); }
}

function regenerateFolioQR(id) {
  generateSingleFolioQR(id);
  showToast('🔲 QR-Code wird generiert…');
}

function downloadSingleFolioQR(id) {
  const obj = getFolioLinkObj(id);
  if (!obj || !obj.qrDataUrl) { showToast('⚠ Bitte zuerst eine URL eingeben und QR generieren'); return; }
  const a = document.createElement('a');
  a.href = obj.qrDataUrl;
  const safeName = (obj.label || val('f-name') || 'QR').replace(/\s+/g, '_');
  a.download = safeName + '_QR.png';
  a.click();
}

// Legacy stubs (keep for old saved data compat)
let _folioQRDataUrl = '';
function updateFolioQR() {}
function downloadFolioQR() {}

function selectQRFrame(el, frame) {
  document.querySelectorAll('.qr-frame-opt').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
  _qrFrame = frame;
  const bw = document.getElementById('qr-border-wrap');
  if (bw) bw.style.display = (frame === 'none') ? 'none' : 'block';
  if (_qrDataUrl) buildQRCanvas(getQRUrl());
}

function getQRUrl() {
  const mode = (document.getElementById('qr-content')||{}).value || 'web';
  if (mode === 'custom')   return val('qr-custom-text') || '';
  if (mode === 'email')    { const e = val('f-email'); return e ? 'mailto:'+e : ''; }
  if (mode === 'linkedin') { const li = val('f-linkedin'); return li ? (li.startsWith('http') ? li : 'https://'+li) : ''; }
  const w = val('f-web'); return w ? (w.startsWith('http') ? w : 'https://'+w) : '';
}

function generateQR() {
  // Toggle sub-panel visibility
  const chk  = document.getElementById('qr-in-cv');
  const opts  = document.getElementById('qr-cv-options');
  if (chk && opts) opts.style.display = chk.checked ? 'block' : 'none';

  const mode = (document.getElementById('qr-content')||{}).value || 'web';
  const cw   = document.getElementById('qr-custom-wrap');
  if (cw) cw.style.display = mode === 'custom' ? 'block' : 'none';

  const lpos = (document.getElementById('qr-label-pos')||{}).value || 'none';
  const capW = document.getElementById('qr-caption-wrap');
  if (capW) capW.style.display = lpos === 'none' ? 'none' : 'block';

  const url = getQRUrl();
  if (!url) {
    if (chk && chk.checked) showToast('⚠ '+t('toastQRNoURL'));
    return;
  }
  buildQRCanvas(url);
}

function buildQRCanvas(url) {
  const target = document.getElementById('qr-output');
  const label  = document.getElementById('qr-url-label');
  if (!target) return;
  target.innerHTML = ''; _qrDataUrl = '';

  if (typeof QRCode === 'undefined') {
    target.innerHTML = '<div style="padding:16px;color:#c0392b;font-size:12px;text-align:center;">QR-Bibliothek nicht geladen.</div>';
    return;
  }

  const eclMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };
  const ecl    = eclMap[(document.getElementById('qr-ecl')||{}).value || 'M'] || QRCode.CorrectLevel.M;
  const darkC  = (document.getElementById('qr-dark-color') ||{}).value || state.color || '#2d3d2c';
  const lightC = (document.getElementById('qr-light-color')||{}).value || '#ffffff';
  const isTransparent = lightC === 'transparent';

  const RENDER = 480; // high-res base
  const tmp = document.createElement('div'); tmp.style.display = 'none'; document.body.appendChild(tmp);

  new QRCode(tmp, {
    text: url, width: RENDER, height: RENDER,
    colorDark:  darkC,
    colorLight: isTransparent ? '#ffffff' : lightC,
    correctLevel: ecl,
  });

  setTimeout(() => {
    const srcCanvas = tmp.querySelector('canvas');
    if (!srcCanvas) { tmp.remove(); return; }

    const border  = parseInt((document.getElementById('qr-border-size')||{}).value || '2');
    const pad     = _qrFrame === 'none' ? 0 : border * 6 + 12;
    const total   = RENDER + pad * 2;
    const fc      = document.createElement('canvas');
    fc.width = fc.height = total;
    const ctx = fc.getContext('2d');

    // ── Background ──
    ctx.clearRect(0, 0, total, total);
    if (!isTransparent) {
      if (_qrFrame === 'badge') {
        ctx.fillStyle = '#f5f5f5';
        drawRR(ctx, 0, 0, total, total, 22); ctx.fill();
      } else if (_qrFrame === 'colored') {
        ctx.fillStyle = darkC;
        drawRR(ctx, 0, 0, total, total, 22); ctx.fill();
      } else {
        ctx.fillStyle = lightC;
        ctx.fillRect(0, 0, total, total);
      }
    }

    // ── QR image ──
    ctx.drawImage(srcCanvas, pad, pad, RENDER, RENDER);

    // ── Transparent: erase light pixels ──
    if (isTransparent) {
      const imgData = ctx.getImageData(0, 0, total, total);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 200 && d[i+1] > 200 && d[i+2] > 200) d[i+3] = 0;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // ── Frame border ──
    if (_qrFrame !== 'none') {
      const bw = border * 2.5;
      const br = { simple: 0, rounded: 16, shadow: 6, badge: 22, colored: 22 }[_qrFrame] || 8;
      ctx.strokeStyle = _qrFrame === 'colored' ? 'rgba(255,255,255,0.35)' : darkC;
      ctx.lineWidth = bw;
      drawRR(ctx, bw/2, bw/2, total-bw, total-bw, br); ctx.stroke();

      if (_qrFrame === 'shadow') {
        const sc = document.createElement('canvas');
        sc.width = total + 16; sc.height = total + 16;
        const sc2 = sc.getContext('2d');
        sc2.shadowColor = 'rgba(0,0,0,0.22)'; sc2.shadowBlur = 14;
        sc2.shadowOffsetX = 5; sc2.shadowOffsetY = 5;
        sc2.drawImage(fc, 0, 0);
        const fc3 = document.createElement('canvas');
        fc3.width = sc.width; fc3.height = sc.height;
        fc3.getContext('2d').drawImage(sc, 0, 0);
        _qrDataUrl = fc3.toDataURL('image/png');
        target.innerHTML = `<img src="${_qrDataUrl}" style="max-width:160px;display:block;margin:0 auto;image-rendering:crisp-edges;">`;
        if (label) label.textContent = url;
        tmp.remove(); render(); return;
      }
    }

    _qrDataUrl = fc.toDataURL('image/png');
    target.innerHTML = `<img src="${_qrDataUrl}" style="max-width:160px;display:block;margin:0 auto;image-rendering:crisp-edges;">`;
    if (label) label.textContent = url;
    tmp.remove();
    render();
  }, 150);
}

function drawRR(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

function downloadQR() {
  if (!_qrDataUrl) {
    generateQR();
    setTimeout(() => {
      if (_qrDataUrl) downloadQR();
      else showToast('⚠ '+t('toastQRFailed'));
    }, 500);
    return;
  }
  const a = document.createElement('a');
  a.href     = _qrDataUrl;
  a.download = (val('f-name')||'CV').replace(/\s+/g,'_') + '_QRCode.png';
  a.click();
  showToast('✓ '+t('toastQRDownloaded'));
}

// ─── QR SNAP ─────────────────────────────────────
function snapQR(x, y) {
  const ex = document.getElementById('qr-x'), ey = document.getElementById('qr-y');
  if (ex) { ex.value = x; document.getElementById('qr-x-label').textContent = x + '%'; }
  if (ey) { ey.value = y; document.getElementById('qr-y-label').textContent = y + '%'; }
  render();
}

// ─── QR DRAG & DROP ON CV PAPER ──────────────────
function initQRDrag(el) {
  const paper = document.getElementById('cv-paper');
  let startX, startY, startL, startT;

  el.addEventListener('mousedown', e => {
    e.preventDefault();
    const rect = paper.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startL = (parseFloat(el.style.left) / 100) * paper.offsetWidth;
    startT = (parseFloat(el.style.top)  / 100) * paper.offsetHeight;
    el.style.transition = 'none';

    const onMove = e => {
      const dx = e.clientX - startX, dy = e.clientY - startY;
      const newL = startL + dx, newT = startT + dy;
      const pctX = (newL / paper.offsetWidth)  * 100;
      const pctY = (newT / paper.offsetHeight) * 100;
      el.style.left = pctX + '%';
      el.style.top  = pctY + '%';

      // Sync sliders
      const ex = document.getElementById('qr-x'), ey = document.getElementById('qr-y');
      if (ex) { ex.value = Math.round(pctX); document.getElementById('qr-x-label').textContent = Math.round(pctX) + '%'; }
      if (ey) { ey.value = Math.round(pctY); document.getElementById('qr-y-label').textContent = Math.round(pctY) + '%'; }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      el.style.transition = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Touch support
  el.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    startL = (parseFloat(el.style.left) / 100) * paper.offsetWidth;
    startT = (parseFloat(el.style.top)  / 100) * paper.offsetHeight;

    const onMove = e => {
      const t = e.touches[0];
      const newL = startL + (t.clientX - startX);
      const newT = startT + (t.clientY - startY);
      const pctX = (newL / paper.offsetWidth)  * 100;
      const pctY = (newT / paper.offsetHeight) * 100;
      el.style.left = pctX + '%';
      el.style.top  = pctY + '%';
      const ex = document.getElementById('qr-x'), ey = document.getElementById('qr-y');
      if (ex) { ex.value = Math.round(pctX); document.getElementById('qr-x-label').textContent = Math.round(pctX) + '%'; }
      if (ey) { ey.value = Math.round(pctY); document.getElementById('qr-y-label').textContent = Math.round(pctY) + '%'; }
    };
    const onEnd = () => { el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd); };
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
  }, { passive: false });
}

// ─── FOLIO OVERLAY DRAG ──────────────────────────
function initFolioOverlayDrag(el, linkId) {
  const paper = document.getElementById('cv-paper');
  let startX, startY, startL, startT;
  const syncSliders = (pctX, pctY) => {
    const ox = document.getElementById('fl-ox-' + linkId);
    const oy = document.getElementById('fl-oy-' + linkId);
    const lx = document.getElementById('fl-ox-label-' + linkId);
    const ly = document.getElementById('fl-oy-label-' + linkId);
    if (ox) { ox.value = Math.round(pctX); if (lx) lx.textContent = Math.round(pctX) + '%'; }
    if (oy) { oy.value = Math.round(pctY); if (ly) ly.textContent = Math.round(pctY) + '%'; }
    const obj = getFolioLinkObj(linkId);
    if (obj) { obj.overlayX = Math.round(pctX); obj.overlayY = Math.round(pctY); }
  };
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    const rect = paper.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startL = (parseFloat(el.style.left) / 100) * paper.offsetWidth;
    startT = (parseFloat(el.style.top)  / 100) * paper.offsetHeight;
    const onMove = e => {
      const newL = startL + (e.clientX - startX);
      const newT = startT + (e.clientY - startY);
      const pctX = Math.max(0, Math.min(92, (newL / paper.offsetWidth)  * 100));
      const pctY = Math.max(0, Math.min(92, (newT / paper.offsetHeight) * 100));
      el.style.left = pctX + '%'; el.style.top = pctY + '%';
      syncSliders(pctX, pctY);
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ─── JSON EXPORT ─────────────────────────────────
function exportJSON() {
  const d = collectData();
  // Build JSON Resume standard format
  const jsonResume = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name:    d.name,
      label:   d.role,
      email:   d.email,
      phone:   d.phone,
      url:     d.web,
      summary: d.summary,
      location: { address: d.address },
      profiles: d.web ? [{ network:'Website', url: d.web, username: d.webLabel }] : [],
    },
    work: (d.exp||[]).map(e => ({
      name:      e.company,
      position:  e.title,
      startDate: e.from,
      endDate:   e.to,
      summary:   e.desc,
    })),
    education: (d.edu||[]).map(e => ({
      institution: e.school,
      area:        e.degree,
      startDate:   e.from,
      endDate:     e.to,
    })),
    skills: (d.skills||[]).map(s => ({
      name:  s.name,
      level: s.pct + '%',
    })),
    languages: (d.langs||[]).map(l => ({
      language: l.name,
      fluency:  l.lvl,
    })),
    interests: (d.hobbies||'').split(',').filter(Boolean).map(h => ({ name: h.trim() })),
    references: (d.refs||[]).map(r => ({
      name:      r.name,
      reference: r.note,
      position:  r.pos,
      company:   r.company,
      email:     r.email,
      phone:     r.phone,
    })),
    projects: (d.projects||[]).map(p => ({
      name:        p.title,
      url:         p.url,
      description: p.desc,
      startDate:   p.from,
      endDate:     p.to,
    })),
    certificates: (d.certs||[]).map(c => ({
      name:   c.title,
      issuer: c.issuer,
      date:   c.date,
      url:    c.url,
    })),
    // Extra fields (non-standard but useful)
    _cvbuilder: {
      goal:       d.goal,
      komps:      d.komps,
      kompsPos:   d.kompsPos,
      hobbiesPos: d.hobbiesPos,
      licensePos: d.licensePos,
      license:    d.license,
      licenseNote:d.licenseNote,
      extraquals: d.extraquals,
      color:      d.color,
      font:       d.font,
      sectionOrder: d.sectionOrder,
      fontScale:  d.fontScale,
      lineHeight: d.lineHeight,
      rightBg:    d.rightBg,
      birth:      d.birth,
    },
  };

  const blob = new Blob([JSON.stringify(jsonResume, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (d.name||'CV').replace(/\s+/g,'_') + '_Resume.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('✓ '+t('toastJSONExported'));
}

// ─── SECTION ORDER RESET ─────────────────────────
function resetSectionOrder() {
  sectionOrder = ['profile','experience','education','komps','hobbies','extraquals','referenzen','zertifikate','projekte','folio'];
  buildSectionOrderUI();
  render();
  showToast('✓ '+t('toastOrderReset'));
}

// ─── JSON RESUME IMPORT ──────────────────────────
function triggerImport(){document.getElementById('import-file-input').click();}
function handleImport(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{importJsonResume(JSON.parse(ev.target.result));}
    catch{showToast('❌ '+t('toastInvalidJSON'));}
  };
  reader.readAsText(file); e.target.value='';
}
function importJsonResume(d){
  if(d.basics){
    if(d.basics.name)    setVal('f-name',d.basics.name);
    if(d.basics.label)   setVal('f-role',d.basics.label);
    if(d.basics.email)   setVal('f-email',d.basics.email);
    if(d.basics.phone)   setVal('f-phone',d.basics.phone);
    if(d.basics.url)     setVal('f-web',d.basics.url);
    if(d.basics.summary) setVal('f-summary',d.basics.summary);
    if(d.basics.location){
      const loc=d.basics.location;
      setVal('f-address',[loc.city,loc.country].filter(Boolean).join(', '));
    }
  }
  if(Array.isArray(d.work)) d.work.forEach(w=>addEntry('exp',{title:w.position||'',company:w.name||w.company||'',from:w.startDate||'',to:w.endDate||'heute',desc:w.summary||(Array.isArray(w.highlights)?w.highlights.join('\n'):'')}));
  if(Array.isArray(d.education)) d.education.forEach(e=>addEntry('edu',{degree:[e.studyType,e.area].filter(Boolean).join(' – ')||e.institution||'',school:e.institution||'',from:e.startDate||'',to:e.endDate||''}));
  if(Array.isArray(d.skills)) setVal('f-komps',d.skills.map(s=>s.name).filter(Boolean).join('\n'));
  if(Array.isArray(d.languages)){
    const m={native:'native',fluent:'advanced',advanced:'advanced',intermediate:'intermediate',beginner:'basic'};
    d.languages.forEach(l=>addLang({name:l.language||'',lvl:m[(l.fluency||'').toLowerCase()]||'intermediate'}));
  }
  if(Array.isArray(d.interests)) setVal('f-hobbies',d.interests.map(i=>i.name).filter(Boolean).join(', '));
  if(Array.isArray(d.references)) d.references.forEach(r=>addRef({name:r.name||'',note:r.reference||''}));
  if(Array.isArray(d.projects)) d.projects.forEach(p=>addProject({title:p.name||'',url:p.url||'',desc:p.description||(Array.isArray(p.highlights)?p.highlights.join('\n'):''),from:p.startDate||'',to:p.endDate||''}));
  if(Array.isArray(d.certificates)||Array.isArray(d.awards)){
    (d.certificates||d.awards||[]).forEach(c=>addCert({title:c.name||c.title||'',issuer:c.awarder||c.issuer||'',date:c.date||'',url:c.url||''}));
  }
  // Restore app-specific settings from our own exports
  if(d._cvbuilder){
    const cb=d._cvbuilder;
    if(cb.color){state.color=cb.color;}
    if(cb.font){state.font=cb.font;}
    if(cb.sectionOrder&&Array.isArray(cb.sectionOrder)){sectionOrder=cb.sectionOrder.filter(k=>SECTION_LABELS[k]);Object.keys(SECTION_LABELS).forEach(k=>{if(!sectionOrder.includes(k))sectionOrder.push(k);});buildSectionOrderUI();}
    if(cb.fontScale){setVal('f-font-scale',cb.fontScale);const lb=document.getElementById('font-scale-label');if(lb)lb.textContent=cb.fontScale+'%';}
    if(cb.lineHeight){setVal('f-line-height',cb.lineHeight);const lb=document.getElementById('line-height-label');if(lb)lb.textContent=cb.lineHeight;}
    if(cb.rightBg)setVal('f-right-bg',cb.rightBg);
    if(cb.kompsPos)setVal('f-komps-pos',cb.kompsPos);
    if(cb.hobbiesPos)setVal('f-hobbies-pos',cb.hobbiesPos);
    if(cb.licensePos)setVal('f-license-pos',cb.licensePos);
    if(cb.licenseNote)setVal('f-license-note',cb.licenseNote);
    if(cb.birth)setVal('f-birth',cb.birth);
    if(cb.goal)setVal('f-goal',cb.goal);
    if(cb.komps)setVal('f-komps',cb.komps);
    if(cb.license&&Array.isArray(cb.license)){['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D','T','L'].forEach(c=>{const el=document.getElementById('lic-'+c);if(el)el.checked=false;});cb.license.forEach(c=>{const el=document.getElementById('lic-'+c);if(el)el.checked=true;});}
    buildColorPicker();buildFontPicker();
  }
  render(); updateProgress(); showToast('✓ '+t('toastImported'));
}

// ─── DRAG & DROP FOR CARDS ──────────────────────
function makeDraggable(card, listId, stateArr){
  card.draggable=true;
  card.addEventListener('dragstart',e=>{dragSrcId=card.id;dragType='card';card.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
  card.addEventListener('dragend',()=>card.classList.remove('dragging'));
  card.addEventListener('dragover',e=>{e.preventDefault();if(dragType==='card') card.classList.add('drag-over');});
  card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
  card.addEventListener('drop',e=>{
    e.preventDefault();card.classList.remove('drag-over');
    if(dragType!=='card'||!dragSrcId||dragSrcId===card.id) return;
    const list=document.getElementById(listId), srcEl=document.getElementById(dragSrcId);
    if(!srcEl||!list) return;
    const cards=[...list.children];
    const srcIdx=cards.indexOf(srcEl), dstIdx=cards.indexOf(card);
    if(srcIdx<dstIdx) list.insertBefore(srcEl,card.nextSibling); else list.insertBefore(srcEl,card);
    // sync state array by card id suffix
    const getSuffix=id=>id.split('-').slice(1).join('-');
    const srcId=getSuffix(dragSrcId), dstId=getSuffix(card.id);
    const si=stateArr.indexOf(srcId), di=stateArr.indexOf(dstId);
    if(si>-1&&di>-1) stateArr.splice(di,0,stateArr.splice(si,1)[0]);
    render();
  });
}

// ─── UNDO ───────────────────────────────────────
function pushUndo(type,data){
  undoStack.push({type,data});
  if(undoStack.length>10) undoStack.shift();
  const btn=document.getElementById('undo-btn');
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';}
  showUndoToast();
}
function showUndoToast(){
  let el=document.getElementById('undo-toast');
  if(!el){
    el=document.createElement('div');el.id='undo-toast';
    Object.assign(el.style,{position:'fixed',bottom:'4rem',right:'1.5rem',background:'#1a2419',color:'#fff',padding:'10px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',zIndex:'9998',display:'flex',gap:'12px',alignItems:'center',transition:'opacity 0.3s',boxShadow:'0 4px 16px rgba(0,0,0,0.3)',opacity:'0'});
    document.body.appendChild(el);
  }
  el.innerHTML=`<span>${t('toastDeleted')}</span><button onclick="undoDelete()" style="background:var(--g-light);color:var(--g-dark);border:none;border-radius:4px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer;">↩ Rückgängig</button>`;
  el.style.opacity='1';clearTimeout(el._to);el._to=setTimeout(()=>{el.style.opacity='0';},4500);
}
function undoDelete(){
  const item=undoStack.pop(); if(!item) return;
  const el=document.getElementById('undo-toast'); if(el) el.style.opacity='0';
  const{type,data}=item;
  if(type==='exp') addEntry('exp',data);
  else if(type==='edu') addEntry('edu',data);
  else if(type==='skill') addSkill(data);
  else if(type==='lang') addLang(data);
  else if(type==='extraqual') addExtraQual(data);
  else if(type==='ref') addRef(data);
  else if(type==='cert') addCert(data);
  else if(type==='project') addProject(data);
  else if(type==='p2entry') addPage2Entry(data);
  if(undoStack.length===0){
    const btn=document.getElementById('undo-btn');
    if(btn){btn.disabled=true;btn.style.opacity='0.4';btn.style.cursor='not-allowed';}
  }
}

// ─── ENTRY BUILDERS ─────────────────────────────
function addEntry(type,data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2);
  const list=document.getElementById(type+'-list');
  const num=type==='exp'?++expCount:++eduCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id=type+'-'+id;
  if(type==='exp'){
    card.innerHTML=`
      <div class="entry-card-header"><span class="drag-handle" title="Ziehen">⠿</span><span class="entry-card-label">${t('entryExperience')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeEntry('exp','${id}')">×</button></div>
      <div class="form-group"><label>${t('labelJobTitle')}</label><input type="text" id="exp-title-${id}" value="${esc(data.title||'')}" list="role-suggestions" placeholder="${t('placeholderJobTitle')}" oninput="render()"></div>
      <div class="form-group"><label>${t('labelCompany')}</label><input type="text" id="exp-company-${id}" value="${esc(data.company||'')}" placeholder="${t('placeholderCompany')}" oninput="render()"></div>
      <div class="form-row">
        <div class="form-group"><label>${t('labelFrom')}</label><input type="text" id="exp-from-${id}" value="${esc(data.from||'')}" placeholder="${t('placeholderFrom')}" oninput="render()"></div>
        <div class="form-group"><label>${t('labelTo')}</label><input type="text" id="exp-to-${id}" value="${esc(data.to||'')}" placeholder="${t('placeholderTo')}" oninput="render()"></div>
      </div>
      <div class="form-group"><label>${t('labelDesc')}</label><textarea id="exp-desc-${id}" placeholder="${t('placeholderDesc')}" oninput="render()">${esc(data.desc||'')}</textarea></div>`;
    state.exp.push(id);
  } else {
    card.innerHTML=`
      <div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('entryEducation')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeEntry('edu','${id}')">×</button></div>
      <div class="form-group"><label>${t('labelDegree')}</label><input type="text" id="edu-degree-${id}" value="${esc(data.degree||'')}" placeholder="${t('placeholderDegree')}" oninput="render()"></div>
      <div class="form-group"><label>${t('labelSchool')}</label><input type="text" id="edu-school-${id}" value="${esc(data.school||'')}" placeholder="${t('placeholderSchool')}" oninput="render()"></div>
      <div class="form-row">
        <div class="form-group"><label>${t('labelFrom')}</label><input type="text" id="edu-from-${id}" value="${esc(data.from||'')}" placeholder="${t('placeholderFrom')}" oninput="render()"></div>
        <div class="form-group"><label>${t('labelTo')}</label><input type="text" id="edu-to-${id}" value="${esc(data.to||'')}" placeholder="${t('placeholderTo')}" oninput="render()"></div>
      </div>`;
    state.edu.push(id);
  }
  list.appendChild(card); makeDraggable(card,type+'-list',state[type]); render();
}

function removeEntry(type,id){
  const data=type==='exp'?{title:val('exp-title-'+id),company:val('exp-company-'+id),from:val('exp-from-'+id),to:val('exp-to-'+id),desc:val('exp-desc-'+id)}:{degree:val('edu-degree-'+id),school:val('edu-school-'+id),from:val('edu-from-'+id),to:val('edu-to-'+id)};
  pushUndo(type,data);
  const el=document.getElementById(type+'-'+id); if(el) el.remove();
  state[type]=state[type].filter(x=>x!==id); render(); updateProgress();
}

function addSkill(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2);
  const card=document.createElement('div'); card.className='entry-card'; card.id='skill-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('labelSkill')}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeSkill('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelSkillName')}</label><input type="text" id="sk-name-${id}" value="${esc(data.name||'')}" placeholder="${t('placeholderSkill')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelSkillLevel')}: <span id="sk-pct-label-${id}">${data.pct||50}%</span></label><input type="range" id="sk-pct-${id}" min="0" max="100" value="${data.pct||50}" step="5" oninput="document.getElementById('sk-pct-label-${id}').textContent=this.value+'%';render()" style="width:100%;accent-color:var(--g-muted);margin-top:6px;"></div></div>`;
  document.getElementById('skill-list').appendChild(card); state.skills.push(id); makeDraggable(card,'skill-list',state.skills); render();
}
function removeSkill(id){pushUndo('skill',{name:val('sk-name-'+id),pct:val('sk-pct-'+id)});const el=document.getElementById('skill-'+id);if(el)el.remove();state.skills=state.skills.filter(x=>x!==id);render();updateProgress();}

function addLang(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2);
  const card=document.createElement('div'); card.className='entry-card'; card.id='lang-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('labelLangName')}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeLang('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelLangName')}</label><input type="text" id="ln-name-${id}" value="${esc(data.name||'')}" placeholder="${t('placeholderLang')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelLangLevel')}</label><select id="ln-lvl-${id}" onchange="render()">
      <option value="native"       ${(data.lvl==='native'||data.lvl==='Muttersprache')?'selected':''}>${t('optNative')}</option>
      <option value="advanced"     ${(data.lvl==='advanced'||data.lvl==='Fortgeschritten')?'selected':''}>${t('optAdvanced')}</option>
      <option value="intermediate" ${(data.lvl==='intermediate'||data.lvl==='Mittelstufe')?'selected':''}>${t('optIntermediate')}</option>
      <option value="basic"        ${(data.lvl==='basic'||data.lvl==='Grundkenntnisse')?'selected':''}>${t('optBasic')}</option>
    </select></div></div>`;
  document.getElementById('lang-list').appendChild(card); state.langs.push(id); makeDraggable(card,'lang-list',state.langs); render();
}
function removeLang(id){pushUndo('lang',{name:val('ln-name-'+id),lvl:val('ln-lvl-'+id)});const el=document.getElementById('lang-'+id);if(el)el.remove();state.langs=state.langs.filter(x=>x!==id);render();}

function addExtraQual(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++eqCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id='eq-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('labelExtraQual')||'Qualifikation'} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeExtraQual('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelExtraQualTitle')||'Bezeichnung'}</label><input type="text" id="eq-title-${id}" value="${esc(data.title||'')}" placeholder="${t('placeholderExtraQualTitle')||'z.B. Erste-Hilfe-Kurs'}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelExtraQualDetail')||'Details'}</label><input type="text" id="eq-detail-${id}" value="${esc(data.detail||'')}" placeholder="${t('placeholderExtraQualDetail')||'z.B. 2023'}" oninput="render()"></div></div>`;
  document.getElementById('extraqual-list').appendChild(card); state.extraquals.push(id); makeDraggable(card,'extraqual-list',state.extraquals); render();
}
function removeExtraQual(id){pushUndo('extraqual',{title:val('eq-title-'+id),detail:val('eq-detail-'+id)});const el=document.getElementById('eq-'+id);if(el)el.remove();state.extraquals=state.extraquals.filter(x=>x!==id);render();}

function addRef(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++refCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id='ref-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('cardRef')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeRef('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelName')}</label><input type="text" id="ref-name-${id}" value="${esc(data.name||'')}" placeholder="${t('placeholderRefName')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelPosition')}</label><input type="text" id="ref-pos-${id}" value="${esc(data.pos||'')}" placeholder="${t('placeholderRefPos')}" oninput="render()"></div></div>
    <div class="form-row"><div class="form-group"><label>${t('labelCompanyName')}</label><input type="text" id="ref-company-${id}" value="${esc(data.company||'')}" placeholder="${t('placeholderRefCompany')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelEmail')}</label><input type="email" id="ref-email-${id}" value="${esc(data.email||'')}" placeholder="${t('placeholderRefEmail')}" oninput="render()"></div></div>
    <div class="form-row"><div class="form-group"><label>${t('labelPhone')}</label><input type="text" id="ref-phone-${id}" value="${esc(data.phone||'')}" placeholder="+49 ..." oninput="render()"></div>
    <div class="form-group"><label>${t('labelNote')}</label><input type="text" id="ref-note-${id}" value="${esc(data.note||'')}" placeholder="${t('placeholderRefNote')}" oninput="render()"></div></div>`;
  document.getElementById('ref-list').appendChild(card); state.refs.push(id); makeDraggable(card,'ref-list',state.refs); render();
}
function removeRef(id){pushUndo('ref',{name:val('ref-name-'+id),pos:val('ref-pos-'+id),company:val('ref-company-'+id),email:val('ref-email-'+id),phone:val('ref-phone-'+id),note:val('ref-note-'+id)});const el=document.getElementById('ref-'+id);if(el)el.remove();state.refs=state.refs.filter(x=>x!==id);render();}

function addCert(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++certCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id='cert-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('cardCert')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeCert('${id}')">×</button></div>
    <div class="form-group"><label>${t('labelCertTitle')}</label><input type="text" id="cert-title-${id}" value="${esc(data.title||'')}" placeholder="${t('placeholderCertTitle')}" oninput="render()"></div>
    <div class="form-row"><div class="form-group"><label>${t('labelIssuer')}</label><input type="text" id="cert-issuer-${id}" value="${esc(data.issuer||'')}" placeholder="${t('placeholderIssuer')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelDate')}</label><input type="text" id="cert-date-${id}" value="${esc(data.date||'')}" placeholder="${t('placeholderDate')}" oninput="render()"></div></div>
    <div class="form-group"><label>${t('labelURL')}</label><input type="text" id="cert-url-${id}" value="${esc(data.url||'')}" placeholder="https://..." oninput="render()"></div>`;
  document.getElementById('cert-list').appendChild(card); state.certs.push(id); makeDraggable(card,'cert-list',state.certs); render();
}
function removeCert(id){pushUndo('cert',{title:val('cert-title-'+id),issuer:val('cert-issuer-'+id),date:val('cert-date-'+id),url:val('cert-url-'+id)});const el=document.getElementById('cert-'+id);if(el)el.remove();state.certs=state.certs.filter(x=>x!==id);render();}

function addProject(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++projCount;
  const card=document.createElement('div'); card.className='entry-card'; card.id='proj-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('cardProject')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removeProject('${id}')">×</button></div>
    <div class="form-row"><div class="form-group"><label>${t('labelProjectName')}</label><input type="text" id="proj-title-${id}" value="${esc(data.title||'')}" placeholder="${t('placeholderProjectName')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelURLLink')}</label><input type="text" id="proj-url-${id}" value="${esc(data.url||'')}" placeholder="https://github.com/..." oninput="render()"></div></div>
    <div class="form-row"><div class="form-group"><label>${t('labelFrom')}</label><input type="text" id="proj-from-${id}" value="${esc(data.from||'')}" placeholder="${t('placeholderFrom')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelTo')}</label><input type="text" id="proj-to-${id}" value="${esc(data.to||'')}" placeholder="${t('placeholderTo')}" oninput="render()"></div></div>
    <div class="form-group"><label>${t('labelDesc')}</label><textarea id="proj-desc-${id}" placeholder="${t('placeholderP2Desc')}" oninput="render()">${esc(data.desc||'')}</textarea></div>`;
  document.getElementById('proj-list').appendChild(card); state.projects.push(id); makeDraggable(card,'proj-list',state.projects); render();
}
function removeProject(id){pushUndo('project',{title:val('proj-title-'+id),url:val('proj-url-'+id),from:val('proj-from-'+id),to:val('proj-to-'+id),desc:val('proj-desc-'+id)});const el=document.getElementById('proj-'+id);if(el)el.remove();state.projects=state.projects.filter(x=>x!==id);render();}

function addPage2Entry(data={}){
  const id=Date.now()+'_'+Math.random().toString(36).slice(2); const num=++p2Count;
  const card=document.createElement('div'); card.className='entry-card'; card.id='p2e-'+id;
  card.innerHTML=`<div class="entry-card-header"><span class="drag-handle">⠿</span><span class="entry-card-label">${t('entryP2')} #${num}</span><button class="btn-del" aria-label="Eintrag löschen" onclick="removePage2Entry('${id}')">×</button></div>
    <div class="form-group"><label>${t('labelP2EntryTitle')}</label><input type="text" id="p2e-title-${id}" value="${esc(data.title||'')}" placeholder="${t('placeholderP2Title2')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelP2Sub')}</label><input type="text" id="p2e-sub-${id}" value="${esc(data.sub||'')}" placeholder="${t('placeholderP2Sub')}" oninput="render()"></div>
    <div class="form-group"><label>${t('labelP2Desc')}</label><textarea id="p2e-desc-${id}" placeholder="${t('placeholderP2Desc')}" oninput="render()">${esc(data.desc||'')}</textarea></div>`;
  document.getElementById('p2-entries-list').appendChild(card); state.page2Entries.push(id); makeDraggable(card,'p2-entries-list',state.page2Entries); render();
}
function removePage2Entry(id){pushUndo('p2entry',{title:val('p2e-title-'+id),sub:val('p2e-sub-'+id),desc:val('p2e-desc-'+id)});const el=document.getElementById('p2e-'+id);if(el)el.remove();state.page2Entries=state.page2Entries.filter(x=>x!==id);render();}

// ─── RENDER ─────────────────────────────────────
function render(){
  const col=state.color, font=state.font;
  const colLight=lighten(col,0.55), colDark2=colLight2(col);
  const fScale=parseInt((document.getElementById('f-font-scale')||{}).value||'100')/100;
  const lineH=(document.getElementById('f-line-height')||{}).value||'1.75';
  const rightBg=(document.getElementById('f-right-bg')||{}).value||'#ffffff';

  const name=val('f-name')||t('cvFallbackName');
  const role=val('f-role')||(currentLang==='ar'?'المسمى الوظيفي':currentLang==='en'?'Job Title':'Berufsbezeichnung');
  const email=val('f-email'),phone=val('f-phone'),address=val('f-address'),birth=val('f-birth'),web=val('f-web'),linkedin=val('f-linkedin');
  const webLabel=val('f-web-label')||t('placeholderWebLabel'), summary=val('f-summary'), goal=val('f-goal'), komps=val('f-komps');
  const folio=val('f-folio'), folioLabel=val('f-folio-label')||t('cvFolio')||'Portfolio';
  const folioShowLink=(document.getElementById('folio-show-link')||{}).checked!==false;
  const folioShowQR=(document.getElementById('folio-show-qr')||{}).checked||false;
  // Collect active multi folio links
  const activeFolioLinks=_folioLinks.map(l=>({
    url:l.url||val('fl-url-'+l.id)||'',
    label:l.label||val('fl-label-'+l.id)||'Portfolio',
    showLink:(document.getElementById('fl-showlink-'+l.id)||{}).checked!==false,
    showQR:!!((document.getElementById('fl-showqr-'+l.id)||{}).checked),
    qrDataUrl:l.qrDataUrl||'',
    pos:l.pos||'left',
    id:l.id,
    overlayX:parseFloat((document.getElementById('fl-ox-'+l.id)||{}).value??l.overlayX??75),
    overlayY:parseFloat((document.getElementById('fl-oy-'+l.id)||{}).value??l.overlayY??4),
    overlaySize:parseInt((document.getElementById('fl-os-'+l.id)||{}).value||l.overlaySize||64),
  })).filter(l=>l.url);

  const photoSrc=state.photoData||'';
  const photoShape=(document.getElementById('f-photo-shape')||{}).value||'circle';
  const borderRadius=photoShape==='square'?'10px':'50%';
  const photoSize=(document.getElementById('f-photo-size')||{}).value||'120';
  const borderSize=(document.getElementById('f-border-size')||{}).value||'4';
  const borderColor=(document.getElementById('f-border-color')||{}).value||'rgba(255,255,255,0.9)';
  const px=photoSize+'px';
  const initials=name.split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase();

  const avatarHTML=photoSrc
    ?`<img src="${photoSrc}" style="width:${px};height:${px};border-radius:${borderRadius};object-fit:cover;object-position:center top;border:${borderSize}px solid ${borderColor};display:block;box-shadow:0 4px 18px rgba(0,0,0,0.30);">`
    :`<div class="cv-avatar" style="width:${px};height:${px};background:linear-gradient(145deg,${colLight} 0%,${col} 100%);font-family:${font};border-radius:${borderRadius};border:${borderSize}px solid ${borderColor};font-size:${Math.round(parseInt(photoSize)*0.28)}px;box-shadow:0 4px 18px rgba(0,0,0,0.20);">${initials||'CV'}</div>`;

  const hobbies=val('f-hobbies');
  const hobbiesSize=(document.getElementById('f-hobbies-size')||{}).value||'10';
  const LIC=['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D','T','L'];
  const activeLic=LIC.filter(c=>{const el=document.getElementById('lic-'+c);return el&&el.checked;});
  const licNote=val('f-license-note');
  const kompsPos=(document.getElementById('f-komps-pos')||{}).value||'right';
  const hobbiesPos=(document.getElementById('f-hobbies-pos')||{}).value||'right';
  const licensePos=(document.getElementById('f-license-pos')||{}).value||'right';

  // LEFT
  let leftHTML=`
    <div class="cv-avatar-wrap">${avatarHTML}</div>
    <div class="cv-l-name" style="font-family:${font};font-size:${Math.round(16*fScale)}px;">${h(name)}</div>
    <div class="cv-l-role" style="font-size:${Math.round(9*fScale)}px;">${h(role)}</div>
    <div class="cv-l-section"><div class="cv-l-section-title">${t('cvContact')}</div>
      ${email?`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvEmail')}</span><span class="cv-contact-val" style="font-size:${Math.round(11*fScale)}px;">${h(email)}</span></div>`:''}
      ${phone?`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvPhone')}</span><span class="cv-contact-val" style="font-size:${Math.round(11*fScale)}px;">${h(phone)}</span></div>`:''}
      ${address?`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvAddress')}</span><span class="cv-contact-val" style="font-size:${Math.round(11*fScale)}px;">${h(address)}</span></div>`:''}
      ${birth?`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvBirth')}</span><span class="cv-contact-val" style="font-size:${Math.round(11*fScale)}px;">${h(birth)}</span></div>`:''}
      ${web?(()=>{const href=web.startsWith('http')?web:'https://'+web;return`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvWeb')}</span><span class="cv-contact-val"><a href="${href}" target="_blank" style="color:inherit;text-decoration:underline;font-weight:700;font-size:${Math.round(11*fScale)}px;">${h(webLabel)}</a></span></div>`;})():''}
      ${linkedin?(()=>{const href=linkedin.startsWith('http')?linkedin:'https://'+linkedin;return`<div class="cv-contact-item"><span class="cv-contact-label">LinkedIn</span><span class="cv-contact-val"><a href="${href}" target="_blank" style="color:inherit;text-decoration:underline;font-weight:700;font-size:${Math.round(11*fScale)}px;">LinkedIn</a></span></div>`;})():''}
      ${folio&&folioShowLink?(()=>{const href=folio.startsWith('http')?folio:'https://'+folio;return`<div class="cv-contact-item"><span class="cv-contact-label">${t('cvFolioSection')||'Portfolio'}</span><span class="cv-contact-val"><a href="${href}" target="_blank" style="color:inherit;text-decoration:underline;font-weight:700;font-size:${Math.round(11*fScale)}px;">${h(folioLabel)}</a></span></div>`;})():''}
    </div>`;

  const activeSkills=state.skills.filter(id=>val('sk-name-'+id));
  if(activeSkills.length){
    leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvSkills')}</div>`;
    activeSkills.forEach(id=>{const n=val('sk-name-'+id),p=Math.min(100,Math.max(0,parseInt(val('sk-pct-'+id))||50));leftHTML+=`<div class="cv-skill-bar"><div class="cv-skill-name" style="font-size:${Math.round(11*fScale)}px;">${h(n)}</div><div class="cv-skill-track"><div class="cv-skill-fill" style="width:${p}%"></div></div></div>`;});
    leftHTML+=`</div>`;
  }
  const activeLangs=state.langs.filter(id=>val('ln-name-'+id));
  if(activeLangs.length){
    leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvLanguages')}</div>`;
    activeLangs.forEach(id=>{const n=val('ln-name-'+id),lv=val('ln-lvl-'+id);
      const dotsMap={native:5,advanced:4,intermediate:3,basic:2,Muttersprache:5,Fortgeschritten:4,Mittelstufe:3,Grundkenntnisse:2};
      const dots=dotsMap[lv]||3;
      const lvLabel={native:t('optNative'),advanced:t('optAdvanced'),intermediate:t('optIntermediate'),basic:t('optBasic'),Muttersprache:t('optNative'),Fortgeschritten:t('optAdvanced'),Mittelstufe:t('optIntermediate'),Grundkenntnisse:t('optBasic')}[lv]||lv;let dotHtml='';for(let i=0;i<5;i++)dotHtml+=`<div class="cv-lang-dot${i<dots?' on':''}"></div>`;leftHTML+=`<div class="cv-lang-item"><div class="cv-lang-name" style="font-size:${Math.round(11*fScale)}px;">${h(n)}</div><div class="cv-lang-sub">${lvLabel}</div><div class="cv-lang-dots">${dotHtml}</div></div>`;});
    leftHTML+=`</div>`;
  }

  const webHref=web?(web.startsWith('http')?web:'https://'+web):'#';
  const webLink=web?`<a href="${webHref}" target="_blank" style="color:${col};text-decoration:underline;font-weight:700;">${h(webLabel)}</a>`:h(webLabel);
  const renderTxt=txt=>h(txt).replace(/%%WEBSITE%%/g,webLink);

  // RIGHT header
  let rightHTML=`
    <div class="cv-r-name" style="font-family:${font};font-size:${Math.round(28*fScale)}px;">${h(name)}</div>
    <div class="cv-r-role" style="color:${colDark2};font-size:${Math.round(12*fScale)}px;">${h(role)}</div>
    <div class="cv-divider" style="background:linear-gradient(90deg,${col} 0%,${colLight} 60%,transparent 100%);"></div>`;

  // Section renderers
  const renderers={
    profile:()=>{
      let s='';
      if(summary||goal){
        s+=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvProfile')}</div>`;
        if(summary) s+=`<div class="cv-summary" style="font-size:${Math.round(11.5*fScale)}px;line-height:${lineH};">${renderTxt(summary)}</div>`;
        if(goal) s+=`<div class="cv-summary" style="font-size:${Math.round(11.5*fScale)}px;line-height:${lineH};margin-top:6px;font-style:italic;color:#666;">${renderTxt(goal)}</div>`;
      }
      return s;
    },
    experience:()=>{
      const entries=state.exp.map(id=>({title:val('exp-title-'+id),company:val('exp-company-'+id),from:val('exp-from-'+id),to:val('exp-to-'+id),desc:val('exp-desc-'+id)})).filter(e=>e.title||e.company);
      if(!entries.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvExperience')}</div>`;
      entries.forEach(e=>{s+=`<div class="cv-entry" style="border-left-color:${colLight};"><div class="cv-entry-head"><span class="cv-entry-title" style="font-size:${Math.round(12.5*fScale)}px;">${h(e.title)}</span><span class="cv-entry-date" style="color:${colDark2};font-size:${Math.round(10*fScale)}px;">${h(e.from)}${e.to?' – '+h(e.to):''}</span></div>${e.company?`<div class="cv-entry-sub" style="color:${colDark2};font-size:${Math.round(11*fScale)}px;">${h(e.company)}</div>`:''} ${e.desc?`<div class="cv-entry-desc" style="font-size:${Math.round(11*fScale)}px;line-height:${lineH};">${h(e.desc).replace(/\n/g,'<br>')}</div>`:''}</div>`;});
      return s;
    },
    education:()=>{
      const entries=state.edu.map(id=>({degree:val('edu-degree-'+id),school:val('edu-school-'+id),from:val('edu-from-'+id),to:val('edu-to-'+id)})).filter(e=>e.degree||e.school);
      if(!entries.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvEducation')}</div>`;
      entries.forEach(e=>{s+=`<div class="cv-entry" style="border-left-color:${colLight};"><div class="cv-entry-head"><span class="cv-entry-title" style="font-size:${Math.round(12.5*fScale)}px;">${h(e.degree)}</span><span class="cv-entry-date" style="color:${colDark2};font-size:${Math.round(10*fScale)}px;">${h(e.from)}${e.to?' – '+h(e.to):''}</span></div>${e.school?`<div class="cv-entry-sub" style="color:${colDark2};font-size:${Math.round(11*fScale)}px;">${h(e.school)}</div>`:''}</div>`;});
      return s;
    },
    komps:()=>{
      if(!komps.trim()) return '';
      if(kompsPos==='left'){leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvKomps')}</div>`;komps.split('\n').forEach(k=>{if(k.trim())leftHTML+=`<span class="cv-tag">${h(k.trim())}</span>`;});leftHTML+=`</div>`;return '';}
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvKomps')}</div><div class="cv-komps">`;
      komps.split('\n').forEach(k=>{if(k.trim())s+=`<div class="cv-komp" style="border-left-color:${colLight};font-size:${Math.round(10.5*fScale)}px;">${h(k.trim())}</div>`;});
      return s+`</div>`;
    },
    hobbies:()=>{
      if(!hobbies) return '';
      if(hobbiesPos==='left'){leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvInterests')}</div>`;hobbies.split(',').forEach(tag=>{if(tag.trim())leftHTML+=`<span class="cv-tag" style="font-size:${hobbiesSize}px;">${h(tag.trim())}</span>`;});leftHTML+=`</div>`;return '';}
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvInterests')}</div><div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;">`;
      hobbies.split(',').forEach(tag=>{if(tag.trim())s+=`<span style="background:${colLight}22;border:1px solid ${colLight};border-radius:5px;padding:3px 10px;font-size:${hobbiesSize}px;color:#444;font-weight:500;">${h(tag.trim())}</span>`;});
      return s+`</div>`;
    },
    extraquals:()=>{
      const eqEntries=state.extraquals.map(id=>({title:val('eq-title-'+id),detail:val('eq-detail-'+id)})).filter(e=>e.title);
      if(!activeLic.length&&!eqEntries.length) return '';
      if(licensePos==='left'){
        leftHTML+=`<div class="cv-l-section"><div class="cv-l-section-title">${t('cvExtraQual')}</div>`;
        if(activeLic.length){leftHTML+=`<div style="margin-bottom:7px;"><div style="font-size:9px;font-weight:700;opacity:0.55;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">${t('cvLicense')||'Führerschein'}</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${activeLic.map(c=>`<span style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;color:#fff;">${c}</span>`).join('')}</div>${licNote?`<div style="font-size:10px;opacity:0.6;margin-top:4px;font-style:italic;">${h(licNote)}</div>`:''}</div>`;}
        eqEntries.forEach(e=>{leftHTML+=`<div style="margin-bottom:6px;"><div style="font-size:11px;font-weight:600;opacity:0.9;">${h(e.title)}</div>${e.detail?`<div style="font-size:10px;opacity:0.55;margin-top:1px;">${h(e.detail)}</div>`:''}</div>`;});
        leftHTML+=`</div>`; return '';
      }
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvExtraQual')}</div>`;
      if(activeLic.length){s+=`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;"><span style="font-size:${Math.round(11*fScale)}px;font-weight:600;color:#444;">${t('cvLicense')||'Führerschein'}:</span><div style="display:flex;flex-wrap:wrap;gap:5px;">${activeLic.map(c=>`<span style="background:${col};color:#fff;border-radius:5px;padding:2px 9px;font-size:${Math.round(10.5*fScale)}px;font-weight:700;">${c}</span>`).join('')}</div></div>`;if(licNote)s+=`<div style="font-size:${Math.round(11*fScale)}px;color:#666;margin-bottom:6px;font-style:italic;">${h(licNote)}</div>`;}
      if(eqEntries.length){s+=`<div class="cv-komps" style="margin-top:4px;">`;eqEntries.forEach(e=>{s+=`<div class="cv-komp" style="border-left-color:${colLight};font-size:${Math.round(10.5*fScale)}px;"><span style="font-weight:700;">${h(e.title)}</span>${e.detail?`<span style="font-size:${Math.round(10*fScale)}px;color:#888;display:block;margin-top:2px;">${h(e.detail)}</span>`:''}</div>`;});s+=`</div>`;}
      return s;
    },
    referenzen:()=>{
      const refs=state.refs.map(id=>({name:val('ref-name-'+id),pos:val('ref-pos-'+id),company:val('ref-company-'+id),email:val('ref-email-'+id),phone:val('ref-phone-'+id),note:val('ref-note-'+id)})).filter(r=>r.name);
      if(!refs.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvReferenzen')}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;
      refs.forEach(r=>{s+=`<div style="background:#f8faf8;border-radius:6px;padding:10px 12px;border-left:2.5px solid ${colLight};"><div style="font-weight:700;font-size:${Math.round(12*fScale)}px;color:#1a2818;">${h(r.name)}</div>${r.pos?`<div style="font-size:${Math.round(10.5*fScale)}px;font-style:italic;color:${colDark2};">${h(r.pos)}</div>`:''} ${r.company?`<div style="font-size:${Math.round(10.5*fScale)}px;color:#555;">${h(r.company)}</div>`:''} ${r.email?`<div style="font-size:${Math.round(10*fScale)}px;color:#666;margin-top:4px;">${h(r.email)}</div>`:''} ${r.phone?`<div style="font-size:${Math.round(10*fScale)}px;color:#666;">${h(r.phone)}</div>`:''} ${r.note?`<div style="font-size:${Math.round(10*fScale)}px;color:#999;font-style:italic;">${h(r.note)}</div>`:''}</div>`;});
      return s+`</div>`;
    },
    zertifikate:()=>{
      const certs=state.certs.map(id=>({title:val('cert-title-'+id),issuer:val('cert-issuer-'+id),date:val('cert-date-'+id),url:val('cert-url-'+id)})).filter(c=>c.title);
      if(!certs.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvZertifikate')}</div>`;
      certs.forEach(c=>{const link=c.url?(c.url.startsWith('http')?c.url:'https://'+c.url):'';s+=`<div class="cv-entry" style="border-left-color:${colLight};"><div class="cv-entry-head"><span class="cv-entry-title" style="font-size:${Math.round(12.5*fScale)}px;">${link?`<a href="${link}" target="_blank" style="color:inherit;text-decoration:none;">`:''}${h(c.title)}${link?`</a>`:''}</span><span class="cv-entry-date" style="color:${colDark2};font-size:${Math.round(10*fScale)}px;">${h(c.date)}</span></div>${c.issuer?`<div class="cv-entry-sub" style="color:${colDark2};font-size:${Math.round(11*fScale)}px;">${h(c.issuer)}</div>`:''}</div>`;});
      return s;
    },
    projekte:()=>{
      const projs=state.projects.map(id=>({title:val('proj-title-'+id),url:val('proj-url-'+id),from:val('proj-from-'+id),to:val('proj-to-'+id),desc:val('proj-desc-'+id)})).filter(p=>p.title);
      if(!projs.length) return '';
      let s=`<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${t('cvProjekte')}</div>`;
      projs.forEach(p=>{const link=p.url?(p.url.startsWith('http')?p.url:'https://'+p.url):'';s+=`<div class="cv-entry" style="border-left-color:${colLight};"><div class="cv-entry-head"><span class="cv-entry-title" style="font-size:${Math.round(12.5*fScale)}px;">${link?`<a href="${link}" target="_blank" style="color:${col};text-decoration:none;">`:''}${h(p.title)}${link?`</a>`:''}</span><span class="cv-entry-date" style="color:${colDark2};font-size:${Math.round(10*fScale)}px;">${h(p.from)}${p.to?' – '+h(p.to):''}</span></div>${p.url?`<div style="font-size:${Math.round(10*fScale)}px;color:${col};margin-top:2px;"><a href="${link}" target="_blank" style="color:${col};">${h(p.url)}</a></div>`:''} ${p.desc?`<div class="cv-entry-desc" style="font-size:${Math.round(11*fScale)}px;line-height:${lineH};">${h(p.desc).replace(/\n/g,'<br>')}</div>`:''}</div>`;});
      return s;
    },
    // ── FOLIO als sortierbare Sektion (rechte Spalte, pos='right') ──
    folio:()=>{
      // Right column: links with pos='right', QRs with pos='right'
      const rightLinks = activeFolioLinks.filter(l => l.showLink && l.pos === 'right');
      const rightQRs   = activeFolioLinks.filter(l => l.showQR && l.qrDataUrl && l.pos === 'right');
      if(!rightLinks.length && !rightQRs.length) return '';
      const sectionTitle = t('cvFolioSection')||'Portfolio & Links';
      let s = `<div class="cv-section-head" style="color:${col};font-size:${Math.round(8.5*fScale)}px;">${sectionTitle}</div>`;
      if(rightLinks.length){
        s += `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:${rightQRs.length?'10px':'0'};">`;
        rightLinks.forEach(l=>{
          const href = l.url.startsWith('http')?l.url:'https://'+l.url;
          s += `<div style="display:flex;align-items:center;gap:8px;font-size:${Math.round(11*fScale)}px;">
            <span style="font-size:${Math.round(9*fScale)}px;opacity:0.5;">▸</span>
            <a href="${href}" target="_blank" style="color:${col};text-decoration:underline;font-weight:600;">${h(l.label||l.url)}</a>
          </div>`;
        });
        s += `</div>`;
      }
      if(rightQRs.length){
        const qrSz = Math.round(62*fScale);
        s += `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;margin-top:4px;">`;
        rightQRs.forEach(l=>{
          s += `<div style="text-align:center;">
            <img src="${l.qrDataUrl}" style="width:${qrSz}px;height:${qrSz}px;image-rendering:crisp-edges;background:#fff;padding:3px;border-radius:4px;display:block;">
            <div style="font-size:${Math.round(8*fScale)}px;margin-top:3px;opacity:0.6;font-weight:600;max-width:${qrSz+6}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h(l.label)}</div>
          </div>`;
        });
        s += `</div>`;
      }
      return s;
    },
  };

  sectionOrder.forEach(key=>{const r=renderers[key];if(r) rightHTML+=r();});

  // ── FOLIO LINKS: Seitenleiste links (pos='left') ──
  const sidebarFolioLinks = activeFolioLinks.filter(l => l.showLink && l.pos === 'left');
  const sidebarFolioQRs   = activeFolioLinks.filter(l => l.showQR && l.qrDataUrl && l.pos === 'left');
  if(sidebarFolioLinks.length || sidebarFolioQRs.length){
    const sectionTitle = t('cvFolioSection')||'Portfolio & Links';
    leftHTML += `<div class="cv-l-section"><div class="cv-l-section-title">${sectionTitle}</div>`;
    sidebarFolioLinks.forEach(l=>{
      const href = l.url.startsWith('http')?l.url:'https://'+l.url;
      leftHTML += `<div class="cv-contact-item"><span class="cv-contact-label" style="font-size:${Math.round(9*fScale)}px;">▸</span><span class="cv-contact-val"><a href="${href}" target="_blank" style="color:inherit;text-decoration:underline;font-weight:700;font-size:${Math.round(11*fScale)}px;">${h(l.label||l.url)}</a></span></div>`;
    });
    if(sidebarFolioQRs.length){
      leftHTML += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;justify-content:center;">`;
      sidebarFolioQRs.forEach(l=>{
        leftHTML += `<div style="text-align:center;"><img src="${l.qrDataUrl}" style="width:66px;height:66px;image-rendering:crisp-edges;background:#fff;padding:3px;border-radius:4px;display:block;"><div style="font-size:8px;margin-top:3px;opacity:0.65;font-weight:600;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h(l.label)}</div></div>`;
      });
      leftHTML += `</div>`;
    }
    leftHTML += `</div>`;
  }

  // ── QR CODE OVERLAY — Hauptwebsite-QR (frei positionierbar) ──
  const qrInCV    = (document.getElementById('qr-in-cv')||{}).checked;
  const qrSizePx  = parseInt((document.getElementById('qr-size')||{}).value || '64');
  const qrX       = parseFloat((document.getElementById('qr-x')||{}).value ?? '4');
  const qrY       = parseFloat((document.getElementById('qr-y')||{}).value ?? '4');
  const qrCaption = val('qr-caption');
  const qrLabelPos= (document.getElementById('qr-label-pos')||{}).value || 'none';

  // Remove old overlay
  const oldOverlay = document.getElementById('cv-qr-overlay');
  if (oldOverlay) oldOverlay.remove();

  if (qrInCV && _qrDataUrl) {
    const capEl = qrCaption && qrLabelPos !== 'none'
      ? `<div style="font-size:8px;color:rgba(0,0,0,0.5);text-align:center;margin-${qrLabelPos==='above'?'bottom':'top'}:3px;letter-spacing:0.05em;white-space:nowrap;">${h(qrCaption)}</div>` : '';
    const imgEl = `<img src="${_qrDataUrl}" style="width:${qrSizePx}px;height:${qrSizePx}px;display:block;image-rendering:crisp-edges;pointer-events:none;">`;

    const overlay = document.createElement('div');
    overlay.id = 'cv-qr-overlay';
    overlay.style.left = qrX + '%';
    overlay.style.top  = qrY + '%';
    overlay.innerHTML  = qrLabelPos === 'above' ? capEl + imgEl : imgEl + capEl;
    overlay.title = 'Ziehen zum Verschieben';

    document.getElementById('cv-paper').appendChild(overlay);
    initQRDrag(overlay);
  }

  // ── FOLIO OVERLAY QRs (pos='overlay', frei auf CV) ──
  document.querySelectorAll('[id^="cv-folio-qr-overlay-"]').forEach(el => el.remove());
  const paper = document.getElementById('cv-paper');
  activeFolioLinks.filter(l => l.pos === 'overlay' && l.showQR && l.qrDataUrl).forEach(l => {
    const ox   = parseFloat((document.getElementById('fl-ox-' + l.id)||{}).value ?? '75');
    const oy   = parseFloat((document.getElementById('fl-oy-' + l.id)||{}).value ?? '4');
    const os   = parseInt((document.getElementById('fl-os-' + l.id)||{}).value || '64');
    const ov   = document.createElement('div');
    ov.id      = 'cv-folio-qr-overlay-' + l.id;
    ov.style.position = 'absolute';
    ov.style.left     = ox + '%';
    ov.style.top      = oy + '%';
    ov.style.zIndex   = '20';
    ov.style.cursor   = 'move';
    ov.style.userSelect = 'none';
    ov.title = 'Ziehen zum Verschieben — ' + (l.label||l.url);
    ov.innerHTML = `<div style="text-align:center;background:rgba(255,255,255,0.92);padding:4px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
      <img src="${l.qrDataUrl}" style="width:${os}px;height:${os}px;display:block;image-rendering:crisp-edges;">
      ${l.label?`<div style="font-size:7px;margin-top:2px;opacity:0.6;font-weight:600;max-width:${os+8}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h(l.label)}</div>`:''}
    </div>`;
    paper.appendChild(ov);
    // Drag support — sync back to sliders
    initFolioOverlayDrag(ov, l.id);
  });

  const cvLeft=document.getElementById('cv-left');
  cvLeft.style.backgroundColor=col; cvLeft.style.color='#fff'; cvLeft.innerHTML=leftHTML;
  const cvRight=document.getElementById('cv-right');

  cvRight.innerHTML=rightHTML; cvRight.style.backgroundColor=rightBg;
  document.getElementById('cv-paper').style.fontFamily='"Source Sans 3",sans-serif';

  // PAGE 2
  const p2Title=val('p2-title'),p2Free=val('p2-freetext');
  const p2Entries=state.page2Entries.map(id=>({title:val('p2e-title-'+id),sub:val('p2e-sub-'+id),desc:val('p2e-desc-'+id)})).filter(e=>e.title||e.desc);
  const hasPage2=p2Title||p2Free||p2Entries.length>0;
  const paper2=document.getElementById('cv-paper-2'); paper2.style.display=hasPage2?'table':'none';
  if(hasPage2){
    let left2=`<div style="display:flex;justify-content:center;margin-bottom:1.5rem;"><div style="width:48px;height:48px;border-radius:50%;background:${colLight};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;border:3px solid rgba(255,255,255,0.3);">${t('page2Circle')}</div></div><div style="text-align:center;font-weight:700;font-size:14px;margin-bottom:4px;">${h(name)}</div><div style="text-align:center;font-size:9px;opacity:0.6;margin-bottom:2rem;">${h(role)}</div><div style="font-size:8.5px;font-weight:700;opacity:0.55;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:5px;margin-bottom:12px;">${t('cvContact')}</div>${email?`<div style="margin-bottom:8px;"><span style="font-size:8.5px;font-weight:700;opacity:0.5;display:block;">${t('cvEmail')}</span><span style="font-size:11px;opacity:.85;">${h(email)}</span></div>`:''}${phone?`<div style="margin-bottom:8px;"><span style="font-size:8.5px;font-weight:700;opacity:0.5;display:block;">${t('cvPhone')}</span><span style="font-size:11px;opacity:.85;">${h(phone)}</span></div>`:''}${web?(()=>{const wh=web.startsWith('http')?web:'https://'+web;return`<div style="margin-bottom:8px;"><span style="font-size:8.5px;font-weight:700;opacity:0.5;display:block;">${t('cvWeb')}</span><a href="${wh}" target="_blank" style="font-size:11px;color:inherit;text-decoration:underline;font-weight:700;">${h(webLabel)}</a></div>`;})():''}`;
    let right2=`<div style="font-size:${Math.round(22*fScale)}px;font-weight:700;color:#1e2e1d;margin-bottom:4px;font-family:${font};">${h(name)}</div><div style="font-size:${Math.round(11*fScale)}px;color:${colDark2};margin-bottom:12px;font-weight:500;">${h(role)}</div><div style="height:2px;margin-bottom:1.25rem;border-radius:1px;background:linear-gradient(90deg,${col} 0%,${colLight} 60%,transparent 100%);"></div>`;
    if(p2Title) right2+=`<div class="cv-section-head" style="color:${col};">${h(p2Title)}</div>`;
    p2Entries.forEach(e=>{right2+=`<div class="cv-entry" style="border-left-color:${colLight};margin-bottom:12px;"><div class="cv-entry-head"><span class="cv-entry-title">${h(e.title)}</span></div>${e.sub?`<div class="cv-entry-sub" style="color:${colDark2};">${h(e.sub)}</div>`:''} ${e.desc?`<div class="cv-entry-desc">${h(e.desc).replace(/\n/g,'<br>')}</div>`:''}</div>`;});
    if(p2Free) right2+=`<div style="font-size:${Math.round(11*fScale)}px;color:#555;line-height:${lineH};margin-top:1rem;">${h(p2Free).replace(/\n/g,'<br>')}</div>`;
    const l2=document.getElementById('cv-left-2'); l2.style.backgroundColor=col;l2.style.color='#fff';l2.innerHTML=left2;
    document.getElementById('cv-right-2').innerHTML=right2; paper2.style.fontFamily='"Source Sans 3",sans-serif';
  }
  updateProgress();
}

// ─── HELPERS ─────────────────────────────────────
function val(id){const el=document.getElementById(id);return el?el.value:'';}
function h(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function esc(s){return String(s||'').replace(/"/g,'&quot;');}
function setVal(id,v){const el=document.getElementById(id);if(el)el.value=v||'';}
function lighten(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgb(${Math.round(r+(255-r)*a)},${Math.round(g+(255-g)*a)},${Math.round(b+(255-b)*a)})`;}
function colLight2(col){const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);return`rgb(${Math.min(255,Math.round(r*1.8))},${Math.min(255,Math.round(g*1.8))},${Math.min(255,Math.round(b*1.8))})`;}

// ─── ZOOM ────────────────────────────────────────
function changeZoom(delta){
  zoom=Math.min(1.4,Math.max(0.5,zoom+delta));
  document.getElementById('cv-paper').style.transform=`scale(${zoom})`;
  const p2=document.getElementById('cv-paper-2');if(p2)p2.style.transform=`scale(${zoom})`;
  document.getElementById('zoom-label').textContent=Math.round(zoom*100)+'%';
  document.getElementById('preview-area').style.paddingBottom=zoom>1?`${(zoom-1)*1000+80}px`:'2rem';
}

// ─── COLLECT / APPLY ─────────────────────────────
function collectData(){
  return{
    name:val('f-name'),role:val('f-role'),email:val('f-email'),phone:val('f-phone'),
    address:val('f-address'),birth:val('f-birth'),web:val('f-web'),webLabel:val('f-web-label'),linkedin:val('f-linkedin'),
    folio:val('f-folio'),folioLabel:val('f-folio-label'),
    folioShowLink:(document.getElementById('folio-show-link')||{}).checked!==false,
    folioShowQR:(document.getElementById('folio-show-qr')||{}).checked||false,
    folioLinks:_folioLinks.map(l=>({
      id:l.id,
      url:l.url||val('fl-url-'+l.id),
      label:l.label||val('fl-label-'+l.id),
      showLink:(document.getElementById('fl-showlink-'+l.id)||{}).checked!==false,
      showQR:!!((document.getElementById('fl-showqr-'+l.id)||{}).checked),
      qrDataUrl:l.qrDataUrl||'',
      pos:l.pos||'left',
      overlayX:parseFloat((document.getElementById('fl-ox-'+l.id)||{}).value??l.overlayX??75),
      overlayY:parseFloat((document.getElementById('fl-oy-'+l.id)||{}).value??l.overlayY??4),
      overlaySize:parseInt((document.getElementById('fl-os-'+l.id)||{}).value||l.overlaySize||64),
    })),
    summary:val('f-summary'),goal:val('f-goal'),komps:val('f-komps'),hobbies:val('f-hobbies'),
    kompsPos:val('f-komps-pos')||'right',hobbiesPos:val('f-hobbies-pos')||'right',licensePos:val('f-license-pos')||'right',
    color:state.color,font:state.font,photoData:state.photoData,
    fontScale:val('f-font-scale')||'100',lineHeight:val('f-line-height')||'1.75',rightBg:val('f-right-bg')||'#ffffff',
    qrInCV: (document.getElementById('qr-in-cv')||{}).checked||false,
    qrX: val('qr-x')||'4', qrY: val('qr-y')||'4', qrSize: val('qr-size')||'64',
    qrContent: val('qr-content')||'web', qrCaption: val('qr-caption'),
    qrCustom: val('qr-custom-text'), qrDataUrl: _qrDataUrl,
    qrFrame: _qrFrame||'none', qrEcl: val('qr-ecl')||'M',
    qrDarkColor: (document.getElementById('qr-dark-color')||{}).value||'',
    qrLightColor: (document.getElementById('qr-light-color')||{}).value||'',
    qrBorderSize: val('qr-border-size')||'2', qrLabelPos: val('qr-label-pos')||'none',
    sectionOrder:[...sectionOrder],
    license:['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D','T','L'].filter(c=>{const el=document.getElementById('lic-'+c);return el&&el.checked;}),
    licenseNote:val('f-license-note'),
    exp:state.exp.map(id=>({id,title:val('exp-title-'+id),company:val('exp-company-'+id),from:val('exp-from-'+id),to:val('exp-to-'+id),desc:val('exp-desc-'+id)})),
    edu:state.edu.map(id=>({id,degree:val('edu-degree-'+id),school:val('edu-school-'+id),from:val('edu-from-'+id),to:val('edu-to-'+id)})),
    skills:state.skills.map(id=>({id,name:val('sk-name-'+id),pct:val('sk-pct-'+id)})),
    langs:state.langs.map(id=>({id,name:val('ln-name-'+id),lvl:val('ln-lvl-'+id)})),
    extraquals:state.extraquals.map(id=>({id,title:val('eq-title-'+id),detail:val('eq-detail-'+id)})),
    refs:state.refs.map(id=>({id,name:val('ref-name-'+id),pos:val('ref-pos-'+id),company:val('ref-company-'+id),email:val('ref-email-'+id),phone:val('ref-phone-'+id),note:val('ref-note-'+id)})),
    certs:state.certs.map(id=>({id,title:val('cert-title-'+id),issuer:val('cert-issuer-'+id),date:val('cert-date-'+id),url:val('cert-url-'+id)})),
    projects:state.projects.map(id=>({id,title:val('proj-title-'+id),url:val('proj-url-'+id),from:val('proj-from-'+id),to:val('proj-to-'+id),desc:val('proj-desc-'+id)})),
    p2title:val('p2-title'),p2free:val('p2-freetext'),
    p2entries:state.page2Entries.map(id=>({id,title:val('p2e-title-'+id),sub:val('p2e-sub-'+id),desc:val('p2e-desc-'+id)})),
    photoShape:val('f-photo-shape'),photoSize:val('f-photo-size')||'120',borderSize:val('f-border-size')||'4',borderColor:val('f-border-color'),photoPos:val('f-photo-pos')||'25',
  };
}

function applyData(d){
  ['exp-list','edu-list','skill-list','lang-list','extraqual-list','ref-list','cert-list','proj-list','p2-entries-list'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='';});
  state.exp=[];state.edu=[];state.skills=[];state.langs=[];state.extraquals=[];state.refs=[];state.certs=[];state.projects=[];state.page2Entries=[];
  setVal('f-name',d.name);setVal('f-role',d.role);setVal('f-email',d.email);setVal('f-phone',d.phone);
  setVal('f-address',d.address);setVal('f-birth',d.birth);setVal('f-web',d.web);setVal('f-web-label',d.webLabel||t('placeholderWebLabel'));setVal('f-linkedin',d.linkedin||'');
  if(d.folio!=null){setVal('f-folio',d.folio);setVal('f-folio-label',d.folioLabel||'');
    const sl=document.getElementById('folio-show-link');if(sl)sl.checked=d.folioShowLink!==false;
    const sq=document.getElementById('folio-show-qr');if(sq)sq.checked=!!d.folioShowQR;
    if(d.folioShowQR)updateFolioQR();}
  // Restore multi folio links
  const folioListEl=document.getElementById('folio-links-list');
  if(folioListEl){folioListEl.innerHTML='';}_folioLinks=[];_folioCount=0;
  if(Array.isArray(d.folioLinks))d.folioLinks.forEach(l=>addFolioLink(l));
  setVal('f-summary',d.summary);setVal('f-goal',d.goal);setVal('f-komps',d.komps);setVal('f-hobbies',d.hobbies);
  setVal('f-komps-pos',d.kompsPos||'right');setVal('f-hobbies-pos',d.hobbiesPos||'right');setVal('f-license-pos',d.licensePos||'right');
  setVal('f-license-note',d.licenseNote);setVal('f-right-bg',d.rightBg||'#ffffff');
  setVal('p2-title',d.p2title);setVal('p2-freetext',d.p2free);
  if(d.fontScale){setVal('f-font-scale',d.fontScale);const lb=document.getElementById('font-scale-label');if(lb)lb.textContent=d.fontScale+'%';}
  if(d.lineHeight){setVal('f-line-height',d.lineHeight);const lb=document.getElementById('line-height-label');if(lb)lb.textContent=d.lineHeight;}
  if(d.rightBg) setVal('f-right-bg',d.rightBg);
  if(d.qrInCV){const el=document.getElementById('qr-in-cv');if(el){el.checked=true;const opts=document.getElementById('qr-cv-options');if(opts)opts.style.display='block';}}
  if(d.qrX!=null){setVal('qr-x',d.qrX);const lb=document.getElementById('qr-x-label');if(lb)lb.textContent=d.qrX+'%';}
  if(d.qrY!=null){setVal('qr-y',d.qrY);const lb=document.getElementById('qr-y-label');if(lb)lb.textContent=d.qrY+'%';}
  if(d.qrSize){setVal('qr-size',d.qrSize);const lb=document.getElementById('qr-size-label');if(lb)lb.textContent=d.qrSize+'px';}
  if(d.qrContent){setVal('qr-content',d.qrContent);const cw=document.getElementById('qr-custom-wrap');if(cw)cw.style.display=d.qrContent==='custom'?'block':'none';}
  if(d.qrCaption) setVal('qr-caption',d.qrCaption);
  if(d.qrCustom)  setVal('qr-custom-text',d.qrCustom);
  if(d.qrEcl)    setVal('qr-ecl',d.qrEcl);
  if(d.qrDarkColor) {const el=document.getElementById('qr-dark-color');if(el)el.value=d.qrDarkColor;}
  if(d.qrLightColor){const el=document.getElementById('qr-light-color');if(el)el.value=d.qrLightColor;}
  if(d.qrBorderSize){setVal('qr-border-size',d.qrBorderSize);const lb=document.getElementById('qr-border-label');if(lb)lb.textContent=d.qrBorderSize+'px';}
  if(d.qrLabelPos){ setVal('qr-label-pos',d.qrLabelPos);const cw=document.getElementById('qr-caption-wrap');if(cw)cw.style.display=d.qrLabelPos==='none'?'none':'block';}
  if(d.qrFrame){
    _qrFrame=d.qrFrame;
    const picked=document.querySelector(`.qr-frame-opt[data-frame="${d.qrFrame}"]`);
    if(picked){document.querySelectorAll('.qr-frame-opt').forEach(x=>x.classList.remove('selected'));picked.classList.add('selected');}
    const bw=document.getElementById('qr-border-wrap');if(bw)bw.style.display=d.qrFrame==='none'?'none':'block';
  }
  if(d.qrDataUrl){_qrDataUrl=d.qrDataUrl;const out=document.getElementById('qr-output');if(out){out.innerHTML=`<img src="${d.qrDataUrl}" style="max-width:160px;display:block;margin:0 auto;image-rendering:crisp-edges;">`;const lbl=document.getElementById('qr-url-label');if(lbl)lbl.textContent=t('toastQRSaved');}}

  if(d.photoShape)setVal('f-photo-shape',d.photoShape);
  if(d.photoPos){const el=document.getElementById('f-photo-pos');if(el){el.value=d.photoPos;const lb=document.getElementById('photo-pos-label');if(lb)lb.textContent=d.photoPos+'%';}}
  if(d.photoSize){const el=document.getElementById('f-photo-size');if(el){el.value=d.photoSize;const lb=document.getElementById('photo-size-label');if(lb)lb.textContent=d.photoSize+'px';}}
  if(d.borderSize){const el=document.getElementById('f-border-size');if(el){el.value=d.borderSize;const lb=document.getElementById('border-size-label');if(lb)lb.textContent=d.borderSize+'px';}}
  if(d.borderColor)setVal('f-border-color',d.borderColor);
  if(d.color){state.color=d.color;}if(d.font){state.font=d.font;}
  if(d.sectionOrder&&Array.isArray(d.sectionOrder)){sectionOrder=d.sectionOrder.filter(k=>SECTION_LABELS[k]);Object.keys(SECTION_LABELS).forEach(k=>{if(!sectionOrder.includes(k))sectionOrder.push(k);});buildSectionOrderUI();}
  if(d.license&&Array.isArray(d.license)){['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D1','D','T','L'].forEach(c=>{const el=document.getElementById('lic-'+c);if(el)el.checked=false;});d.license.forEach(c=>{const el=document.getElementById('lic-'+c);if(el)el.checked=true;});}
  if(d.photoData){state.photoData=d.photoData;document.getElementById('photo-preview-img').src=d.photoData;document.getElementById('photo-preview-name').textContent=t('photoShown');document.getElementById('photo-drop-zone').style.display='none';document.getElementById('photo-preview-section').style.display='block';}
  (d.exp||[]).forEach(e=>addEntry('exp',e));(d.edu||[]).forEach(e=>addEntry('edu',e));
  (d.skills||[]).forEach(s=>addSkill(s));(d.langs||[]).forEach(l=>addLang(l));
  (d.extraquals||[]).forEach(e=>addExtraQual(e));(d.refs||[]).forEach(r=>addRef(r));
  (d.certs||[]).forEach(c=>addCert(c));(d.projects||[]).forEach(p=>addProject(p));
  (d.p2entries||[]).forEach(e=>addPage2Entry(e));
  buildColorPicker();buildFontPicker();updateCharCount();render();
}

// ─── SAVE / LOAD ─────────────────────────────────
function saveData(silent=false){
  const ind=document.getElementById('autosave-indicator');
  if(ind){ind.className='saving';ind.style.color='rgba(255,255,255,0.4)';}
  localStorage.setItem('cvbuilder_data',JSON.stringify(collectData()));
  if(ind){setTimeout(()=>{ind.className='saved';ind.style.color='rgba(255,255,255,0.5)';setTimeout(()=>{ind.className='';ind.style.color='rgba(255,255,255,0.3)';},3000);},200);}
  if(!silent)showToast(t('toastSaved'));
}
function loadSaved(){
  const raw=localStorage.getItem('cvbuilder_data'); if(!raw) return;
  try{state._pendingLoad=JSON.parse(raw);}catch{}
}
function buildDynamicLists(){
  const d=state._pendingLoad;
  if(!d){
    [{name:'HTML & CSS',pct:40},{name:'Python',pct:30},{name:t('defaultSkillSoft'),pct:80}].forEach(s=>addSkill(s));
    [{name:'العربية / Arabisch / Arabic',lvl:'native'},{name:'Deutsch / German',lvl:'advanced'},{name:'Englisch / English',lvl:'advanced'}].forEach(l=>addLang(l));
    return;
  }
  applyData(d);
}
function resetAll(){
  if(!confirm(t('toastResetConfirm'))) return;
  localStorage.removeItem('cvbuilder_data');
  localStorage.removeItem('cvbuilder_lang');
  // Set translated default for web-label if empty
  const wlEl = document.getElementById('f-web-label');
  if (wlEl && !wlEl.value) wlEl.value = t('placeholderWebLabel');
  location.reload();
}

// ─── PDF EXPORT ──────────────────────────────────
function exportPDF(){window.print();}
function downloadPDF(){
  const name=val('f-name')||'CV';
  const filename=name.replace(/\s+/g,'_')+'_Lebenslauf.pdf';
  showToast(t('toastPDFBuilding'));
  const pages=[{paperId:'cv-paper',leftId:'cv-left',paper:document.getElementById('cv-paper'),left:document.getElementById('cv-left'),right:document.getElementById('cv-right')}];
  const p2el=document.getElementById('cv-paper-2');
  if(p2el&&p2el.style.display!=='none')pages.push({paperId:'cv-paper-2',leftId:'cv-left-2',paper:p2el,left:document.getElementById('cv-left-2'),right:document.getElementById('cv-right-2')});
  const savedT=pages.map(p=>{const s=p.paper.style.transform;p.paper.style.transform='scale(1)';return s;});
  function offRel(el,anc){let x=0,y=0,cur=el;while(cur&&cur!==anc){x+=cur.offsetLeft;y+=cur.offsetTop;cur=cur.offsetParent;}return{x,y,w:el.offsetWidth,h:el.offsetHeight};}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const heights=pages.map(p=>Math.max(p.paper.offsetHeight,p.left.scrollHeight,p.right.scrollHeight,1050));
    const{jsPDF}=window.jspdf; const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const pW=210,pH=297;
    const next=i=>{
      if(i>=pages.length){pages.forEach((p,idx)=>{p.paper.style.transform=savedT[idx];});pdf.save(filename);showToast(t('toastPDFDone'));return;}
      const pg=pages[i],fullH=heights[i],col=state.color,paperPxW=pg.paper.offsetWidth||720;
      const rawLinks=[];
      pg.paper.querySelectorAll('a[href]').forEach(link=>{const href=link.getAttribute('href');if(!href||href==='#')return;const pos=offRel(link,pg.paper);rawLinks.push({url:href,xPx:pos.x,yPx:pos.y,wPx:Math.max(pos.w,60),hPx:Math.max(pos.h,14)});});
      html2canvas(pg.paper,{scale:4,useCORS:true,allowTaint:true,backgroundColor:'#ffffff',logging:false,
        onclone:doc=>{const cP=doc.getElementById(pg.paperId);const cL=doc.getElementById(pg.leftId);if(cP){cP.style.display='table';cP.style.minHeight=fullH+'px';cP.style.height=fullH+'px';}if(cL){cL.style.display='table-cell';cL.style.height=fullH+'px';cL.style.minHeight=fullH+'px';cL.style.backgroundColor=col;cL.style.background=col;}}
      }).then(canvas=>{
        if(i>0)pdf.addPage();
        const firstPage=pdf.getNumberOfPages(),imgH=(canvas.height*pW)/canvas.width;
        let posY=0,rem=imgH,isFirst=true;
        while(rem>0){if(!isFirst)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',0.98),'JPEG',0,-posY,pW,imgH);posY+=pH;rem-=pH;isFirst=false;}
        const mmX=pW/paperPxW,mmY=imgH/fullH;
        rawLinks.forEach(({url,xPx,yPx,wPx,hPx})=>{const xM=xPx*mmX,yM=yPx*mmY,wM=wPx*mmX,hM=hPx*mmY,pgIdx=Math.floor(yM/pH),yOp=yM-pgIdx*pH,tPg=firstPage+pgIdx;if(tPg<=pdf.getNumberOfPages()){pdf.setPage(tPg);pdf.link(xM,yOp,wM,hM,{url});}});
        pdf.setPage(pdf.getNumberOfPages());next(i+1);
      }).catch(err=>{console.error(err);showToast(t('toastPDFError'));pages.forEach((p,idx)=>{p.paper.style.transform=savedT[idx];});});
    };
    next(0);
  }));
}

// ─── TOAST ───────────────────────────────────────
function showToast(msg){
  let el=document.getElementById('toast');
  if(!el){el=document.createElement('div');el.id='toast';Object.assign(el.style,{position:'fixed',bottom:'1.5rem',right:'1.5rem',background:'#2d3d2c',color:'#fff',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',zIndex:'9999',transition:'opacity 0.3s'});document.body.appendChild(el);}
  el.textContent=msg;el.style.opacity='1';clearTimeout(el._to);el._to=setTimeout(()=>el.style.opacity='0',2400);
}

// ─── PHOTO ───────────────────────────────────────
function handlePhotoUpload(e){const f=e.target.files[0];if(f)readPhoto(f);}
function handleDrop(e){e.preventDefault();document.getElementById('photo-drop-zone').style.borderColor='';const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/'))readPhoto(f);}
function readPhoto(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const SIZE=600,canvas=document.createElement('canvas');canvas.width=SIZE;canvas.height=SIZE;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      const scale=Math.max(SIZE/img.width,SIZE/img.height),cropW=SIZE/scale,cropH=SIZE/scale;
      const posVal=parseFloat((document.getElementById('f-photo-pos')||{}).value||'25')/100;
      const cropX=(img.width-cropW)/2,cropY=Math.max(0,(img.height-cropH)*posVal);
      ctx.drawImage(img,cropX,cropY,cropW,cropH,0,0,SIZE,SIZE);
      state.photoData=canvas.toDataURL('image/jpeg',0.95);
      document.getElementById('photo-preview-img').src=state.photoData;
      document.getElementById('photo-preview-name').textContent=file.name;
      document.getElementById('photo-drop-zone').style.display='none';
      document.getElementById('photo-preview-section').style.display='block';
      render();updateProgress();updatePhotoDesignPreview();showToast(t('toastPhotoUploaded'));
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function removePhoto(){state.photoData='';document.getElementById('photo-input').value='';document.getElementById('photo-preview-img').src='';document.getElementById('photo-drop-zone').style.display='block';document.getElementById('photo-preview-section').style.display='none';render();updateProgress();updatePhotoDesignPreview();}

// ─── START ───────────────────────────────────────
init();
setTimeout(initWheelZoom, 600);

// ─── MAUSRAD-ZOOM ────────────────────────────────
function initWheelZoom() {
  const preview = document.getElementById('preview-area');
  if (!preview) return;
  preview.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    changeZoom(e.deltaY < 0 ? 0.1 : -0.1);
  }, { passive: false });
}

// ─── KI-ASSISTENT ────────────────────────────────
let _aiTone = 'professionell';
let _aiLastResult = '';

function selectTone(btn, tone) {
  _aiTone = tone;
  document.querySelectorAll('.ai-tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function runAI() {
  const aiType = document.getElementById('ai-type')?.value || 'summary';
  const aiInput = document.getElementById('ai-input')?.value?.trim();
  const aiLang = document.getElementById('ai-lang-out')?.value || 'Deutsch';

  if (!aiInput) {
    document.getElementById('ai-error').style.display = 'block';
    document.getElementById('ai-error').textContent = '⚠ Bitte geben Sie zuerst Ihre Stichpunkte ein.';
    return;
  }

  document.getElementById('ai-error').style.display = 'none';
  document.getElementById('ai-result-wrap').style.display = 'none';
  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-run-btn').disabled = true;

  const prompts = {
    summary: `Schreibe ein professionelles Kurzprofil für einen Lebenslauf auf ${aiLang}. Ton: ${_aiTone}. Länge: 3-4 Sätze. Nutze diese Infos: ${aiInput}. Antworte NUR mit dem Text, keine Überschriften oder Erklärungen.`,
    experience: `Schreibe eine professionelle Berufserfahrungs-Beschreibung für einen Lebenslauf auf ${aiLang}. Ton: ${_aiTone}. Nutze Aufzählungspunkte (•). Basiere dich auf: ${aiInput}. Antworte NUR mit dem Text.`,
    skills: `Liste professionelle Skills und Stärken für einen Lebenslauf auf ${aiLang} auf. Ton: ${_aiTone}. Je Zeile ein Skill, kurz und präzise. Basiere dich auf: ${aiInput}. Antworte NUR mit der Liste.`,
    cover: `Schreibe eine professionelle Anschreiben-Einleitung (2-3 Sätze) auf ${aiLang}. Ton: ${_aiTone}. Nutze diese Infos: ${aiInput}. Antworte NUR mit dem Text.`,
    improve: `Verbessere folgenden Text stilistisch für einen Lebenslauf auf ${aiLang}. Mache ihn ${_aiTone}er, prägnanter und professioneller. Behalte den Inhalt bei. Text: ${aiInput}. Antworte NUR mit dem verbesserten Text.`,
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompts[aiType] || prompts.summary }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API-Fehler');
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    _aiLastResult = text.trim();

    document.getElementById('ai-result-text').textContent = _aiLastResult;
    document.getElementById('ai-result-wrap').style.display = 'block';
  } catch (err) {
    document.getElementById('ai-error').style.display = 'block';
    document.getElementById('ai-error').textContent = '❌ Fehler: ' + (err.message || 'Unbekannter Fehler. Bitte versuchen Sie es erneut.');
  } finally {
    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-run-btn').disabled = false;
  }
}

function aiCopyToClipboard() {
  if (!_aiLastResult) return;
  navigator.clipboard.writeText(_aiLastResult).then(() => showToast('✓ Text kopiert!')).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = _aiLastResult; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('✓ Text kopiert!');
  });
}

function aiApplyToField() {
  if (!_aiLastResult) return;
  const el = document.getElementById('f-summary');
  if (el) { el.value = _aiLastResult; renderDebounced(); updateProgress(); updateCharCount(); showToast('✓ In Kurzprofil übernommen!'); }
}

// ─── FOTO DESIGN LIVE-VORSCHAU ────────────────────
function updatePhotoDesignPreview() {
  const wrap = document.getElementById('photo-design-avatar');
  if (!wrap) return;
  const size    = parseInt((document.getElementById('f-photo-size')||{}).value || '120');
  const border  = parseInt((document.getElementById('f-border-size')||{}).value || '4');
  const bColor  = (document.getElementById('f-border-color')||{}).value || 'rgba(255,255,255,0.9)';
  const shape   = (document.getElementById('f-photo-shape')||{}).value || 'circle';
  const radius  = shape === 'square' ? '10px' : '50%';
  // Scale down to max 100px for the mini preview
  const scale   = Math.min(1, 100 / size);
  const dispSz  = Math.round(size * scale) + 'px';
  const col     = state.color || '#3b4f3a';
  const colL    = lighten(col, 0.55);
  const name    = val('f-name') || '';
  const initials = name.split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase() || 'CV';

  if (state.photoData) {
    wrap.innerHTML = `<img src="${state.photoData}"
      style="width:${dispSz};height:${dispSz};border-radius:${radius};
             object-fit:cover;object-position:center top;
             border:${border}px solid ${bColor};
             box-shadow:0 4px 18px rgba(0,0,0,0.30);display:block;
             transition:all 0.2s;">`;
  } else {
    wrap.innerHTML = `<div style="width:${dispSz};height:${dispSz};border-radius:${radius};
      background:linear-gradient(145deg,${colL} 0%,${col} 100%);
      border:${border}px solid ${bColor};
      font-size:${Math.round(size*scale*0.28)}px;font-weight:700;color:#fff;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 18px rgba(0,0,0,0.20);
      transition:all 0.2s;">${initials}</div>`;
  }
}
