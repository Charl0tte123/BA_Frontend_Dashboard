const DATA_URL = './data/incidents.json';
const LS_KEY = 'incidentOverrides.v1';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const parseISO = (s) => new Date(s);
const fmtDate = (d) => d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const daysBetween = (a, b) => Math.floor((a - b) / 86400000);
const hoursBetween = (a, b) => Math.floor((a - b) / 3600000);

function loadOverrides(){
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}
function saveOverrides(map){
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}
function updateOverride(id, patch){
  const map = loadOverrides();
  map[id] = { ...(map[id] || {}), ...patch };
  saveOverrides(map);
}

function mergeIncidents(incidents, overrides){
  return incidents.map(x => {
    const o = overrides[x.id] || {};
    const merged = { ...x };
    if (typeof o.processed === 'boolean') merged.processed = o.processed;
    if (o.assignedTo !== undefined) merged.assignedTo = o.assignedTo;
    if (o.processedAt) merged.processedAt = o.processedAt;
    return merged;
  });
}

function priority(incident){
  if (incident.processed) return { key: 3, label: 'erledigt', cls: 'dot-done' };
  const now = new Date();
  const d = daysBetween(now, parseISO(incident.reportedAt));
  if (d >= 7) return { key: 0, label: 'hoch', cls: 'dot-high' };
  if (d >= 3) return { key: 1, label: 'mittel', cls: 'dot-medium' };
  return { key: 2, label: 'niedrig', cls: 'dot-low' };
}

function sortIncidents(incidents, mode){
  const now = new Date();
  const score = (it) => {
    if (mode === 'newest') return -parseISO(it.reportedAt).getTime();
    if (mode === 'oldest') return parseISO(it.reportedAt).getTime();
    // urgency: unprocessed first, oldest first
    const pr = priority(it);
    return (it.processed ? 1e15 : 0) + parseISO(it.reportedAt).getTime();
  };
  return [...incidents].sort((a,b) => score(a) - score(b));
}

function renderOverview(incidents){
  const total = incidents.length;
  const done = incidents.filter(i => i.processed).length;
  const open = total - done;
  const now = new Date();
  const oldestOpenDays = incidents
    .filter(i => !i.processed)
    .map(i => daysBetween(now, parseISO(i.reportedAt)))
    .sort((a,b) => b - a)[0];

  $('#kpi-total').textContent = total;
  $('#kpi-open').textContent = open;
  $('#kpi-done').textContent = done;
  $('#kpi-oldest').textContent = open ? `${oldestOpenDays} Tage` : '–';
}

function cardTemplate(it){
  const pr = priority(it);
  const since = timeSince(parseISO(it.reportedAt));
  const processedClass = it.processed ? 'processed' : '';
  const who = it.assignedTo ? `Bearbeiter: ${it.assignedTo}` : 'Noch keiner zugewiesen';
  return `
    <article class="card ${processedClass}" data-id="${it.id}">
      <div class="card-header">
        <div class="prio-chip"><span class="dot ${pr.cls}"></span> ${it.processed ? 'erledigt' : pr.label}</div>
        <div class="card-title">${escapeHtml(it.title)}</div>
      </div>
      <div class="meta">
        <span class="badge">${escapeHtml(it.category)}</span>
        <span class="badge">Ort: ${escapeHtml(it.location)}</span>
        ${it.area ? `<span class="badge">Bereich: ${escapeHtml(it.area)}</span>` : ''}
        <span>Gemeldet: ${fmtDate(parseISO(it.reportedAt))} (${since})</span>
      </div>
      <div class="desc">${escapeHtml(it.description)}</div>
      <div class="card-actions">
        <div class="row">
          <label>
            <input type="checkbox" class="chk-processed" ${it.processed ? 'checked' : ''}/>
            Bearbeitet
          </label>
          <input type="email" class="inp-email" placeholder="zuständig@example.com" value="${it.assignedTo ?? ''}" />
          <button class="primary btn-save">Speichern</button>
        </div>
        <small class="muted">${escapeHtml(who)}</small>
      </div>
    </article>
  `;
}

function renderIncidents(incidents){
  const container = $('#incident-list');
  container.innerHTML = incidents.map(cardTemplate).join('');
  // Wire events
  container.querySelectorAll('.card').forEach(card => {
    const id = card.getAttribute('data-id');
    const chk = card.querySelector('.chk-processed');
    const inp = card.querySelector('.inp-email');
    const btn = card.querySelector('.btn-save');

    const doSave = () => {
      const processed = !!chk.checked;
      const assignedTo = inp.value.trim();
      const patch = { processed, assignedTo };
      if (processed) patch.processedAt = new Date().toISOString();
      updateOverride(id, patch);
      // Re-render after save
      hydrate();
    };

    chk.addEventListener('change', doSave);
    btn.addEventListener('click', doSave);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSave(); }
    });
  });
}

function timeSince(d){
  const now = new Date();
  const h = hoursBetween(now, d);
  if (h < 1) return 'vor wenigen Minuten';
  if (h < 24) return `vor ${h} Std`;
  const days = Math.floor(h/24);
  return `vor ${days} Tg`;
}

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

async function loadData(){
  const res = await fetch(DATA_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Load failed: ${res.status}`);
  return await res.json();
}

function wireTabs(){
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetSel = btn.getAttribute('data-target');
      $$('#overview, #incidents').forEach(sec => sec.hidden = true);
      document.querySelector(targetSel).hidden = false;
    });
  });
}

function wireControls(state){
  $('#sort-select').addEventListener('change', () => hydrate());
  $('#filter-select').addEventListener('change', () => hydrate());
}

let baseIncidents = [];

function applyFilterSort(list){
  const filter = $('#filter-select').value;
  const sort = $('#sort-select').value;
  let items = list;
  if (filter === 'open') items = items.filter(i => !i.processed);
  if (filter === 'done') items = items.filter(i => i.processed);
  items = sortIncidents(items, sort);
  return items;
}

async function hydrate(){
  const overrides = loadOverrides();
  const merged = mergeIncidents(baseIncidents, overrides);
  renderOverview(merged);
  renderIncidents(applyFilterSort(merged));
}

(async function init(){
  wireTabs();
  wireControls();
  try {
    baseIncidents = await loadData();
    hydrate();
  } catch (e){
    console.error(e);
    alert('Konnte Daten nicht laden. Bitte über einen lokalen Server öffnen.');
  }
})();
