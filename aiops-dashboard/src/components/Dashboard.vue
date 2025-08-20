<script setup lang="ts">
import { ref, reactive, computed, onMounted, watchEffect, defineComponent, h, PropType } from 'vue'

type Incident = {
  id: string
  title: string
  category: string
  location: string
  area?: string
  description: string
  reportedAt: string
  processed: boolean
  assignedTo?: string
  processedAt?: string
}

const LS_KEY = 'incidentOverrides.v1'
const sortMode = ref<'urgency'|'newest'|'oldest'>('urgency')
const filterMode = ref<'all'|'open'|'done'>('all')

const baseIncidents = ref<Incident[]>([])
const overrides = ref<Record<string, Partial<Incident>>>({})
const drafts = reactive<Record<string, string>>({})

function loadOverrides(): Record<string, Partial<Incident>> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveOverrides() { localStorage.setItem(LS_KEY, JSON.stringify(overrides.value)) }
function updateOverride(id: string, patch: Partial<Incident>) {
  overrides.value = { ...overrides.value, [id]: { ...(overrides.value[id]||{}), ...patch } }
  saveOverrides()
}

const mergedIncidents = computed<Incident[]>(() =>
  baseIncidents.value.map(i => ({ ...i, ...(overrides.value[i.id] || {}) }))
)

const kpiTotal = computed(() => mergedIncidents.value.length)
const kpiDone = computed(() => mergedIncidents.value.filter(i => i.processed).length)
const kpiOpen = computed(() => kpiTotal.value - kpiDone.value)
const kpiOldestOpen = computed(() => {
  const open = mergedIncidents.value.filter(i => !i.processed)
  if (!open.length) return '–'
  const now = new Date()
  const oldestDays = Math.max(...open.map(i => daysBetween(now, new Date(i.reportedAt))))
  return `${oldestDays} Tage`
})

function priority(it: Incident) {
  if (it.processed) return { key: 3, label: 'erledigt', cls: 'dot-done' }
  const now = new Date()
  const d = daysBetween(now, new Date(it.reportedAt))
  if (d >= 7) return { key: 0, label: 'hoch', cls: 'dot-high' }
  if (d >= 3) return { key: 1, label: 'mittel', cls: 'dot-medium' }
  return { key: 2, label: 'niedrig', cls: 'dot-low' }
}
function cardTone(it: Incident) {
  const key = priority(it).key
  return key === 0 ? 'card-tone-dark' : key === 1 ? 'card-tone-mid' : 'card-tone-light'
}

const visibleIncidents = computed<Incident[]>(() => {
  let items = mergedIncidents.value
  if (filterMode.value === 'open') items = items.filter(i => !i.processed)
  if (filterMode.value === 'done') items = items.filter(i => i.processed)
  const score = (it: Incident) => {
    if (sortMode.value === 'newest') return -new Date(it.reportedAt).getTime()
    if (sortMode.value === 'oldest') return new Date(it.reportedAt).getTime()
    return (it.processed ? 1e15 : 0) + new Date(it.reportedAt).getTime()
  }
  return [...items].sort((a,b) => score(a) - score(b))
})

// Charts data
const statusCounts = computed(() => {
  const open = mergedIncidents.value.filter(i => !i.processed).length
  const done = mergedIncidents.value.length - open
  return { labels: ['Offen', 'Erledigt'], values: [open, done] }
})
const byCategory = computed(() => {
  const map: Record<string, number> = {}
  for (const i of mergedIncidents.value) map[i.category] = (map[i.category] || 0) + 1
  const entries = Object.entries(map).sort((a,b) => b[1]-a[1])
  return { labels: entries.map(e=>e[0]), values: entries.map(e=>e[1]) }
})
const ageBuckets = computed(() => {
  const now = new Date()
  const buckets = { '<24h':0, '1–3T':0, '3–7T':0, '>7T':0 }
  for (const i of mergedIncidents.value.filter(x => !x.processed)) {
    const d = daysBetween(now, new Date(i.reportedAt))
    if (d < 1) buckets['<24h']++
    else if (d < 3) buckets['1–3T']++
    else if (d < 7) buckets['3–7T']++
    else buckets['>7T']++
  }
  const labels = Object.keys(buckets)
  return { labels, values: labels.map(k => (buckets as any)[k]) }
})
const trend14 = computed(() => {
  const days:string[] = []
  const counts: Record<string, number> = {}
  const today = new Date()
  for (let i=13;i>=0;i--){
    const d = new Date(today); d.setDate(d.getDate()-i)
    const key = d.toISOString().slice(0,10)
    days.push(key); counts[key] = 0
  }
  for (const i of mergedIncidents.value) {
    const key = new Date(i.reportedAt).toISOString().slice(0,10)
    if (key in counts) counts[key]++
  }
  const labels = days.map(k => k.slice(5))
  const values = days.map(k => counts[k])
  return { labels, values }
})

// Utils
function daysBetween(a: Date, b: Date) { return Math.floor((a.getTime() - b.getTime()) / 86400000) }
function hoursBetween(a: Date, b: Date) { return Math.floor((a.getTime() - b.getTime()) / 3600000) }
function fmtDate(d: Date) { return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) }
function timeSince(d: Date) {
  const h = hoursBetween(new Date(), d)
  if (h < 1) return 'vor wenigen Minuten'
  if (h < 24) return `vor ${h} Std`
  const days = Math.floor(h/24)
  return `vor ${days} Tg`
}

function draftFor(it: Incident) { return drafts[it.id] ?? (it.assignedTo ?? '') }
function saveEmail(it: Incident) { updateOverride(it.id, { assignedTo: (draftFor(it) || '').trim() }) }
function setProcessed(it: Incident, processed: boolean) {
  const patch: Partial<Incident> = { processed }
  if (processed) patch.processedAt = new Date().toISOString()
  updateOverride(it.id, patch)
}

// Tiny canvas chart
const ChartCanvas = defineComponent({
  name: 'ChartCanvas',
  props: {
    kind: { type: String as PropType<'bar'|'doughnut'|'line'>, required: true },
    labels: { type: Array as PropType<string[]>, default: () => [] },
    values: { type: Array as PropType<number[]>, default: () => [] },
    colors: { type: Array as PropType<string[]>, default: () => [] },
  },
  setup(props) {
    const el = ref<HTMLCanvasElement|null>(null)
    const draw = () => {
      const c = el.value; if (!c) return
      const ctx = c.getContext('2d')!
      const w = c.width = c.clientWidth
      const h = c.height = 200
      ctx.clearRect(0,0,w,h)
      const palette = props.colors.length ? props.colors : ['#1e88e5','#64b5f6','#90caf9','#1565c0','#42a5f5','#0d47a1','#2e7d32','#ef6c00','#f9a825','#d32f2f']
      if (props.kind === 'doughnut') {
        const sum = props.values.reduce((a,b)=>a+b,0) || 1
        let start = -Math.PI/2
        const r = Math.min(w,h)/2 - 8
        const cx = w/2, cy = h/2
        props.values.forEach((v,idx)=>{
          const ang = (v/sum) * Math.PI*2
          ctx.beginPath(); ctx.moveTo(cx,cy)
          ctx.fillStyle = palette[idx % palette.length]
          ctx.arc(cx,cy,r,start,start+ang)
          ctx.closePath(); ctx.fill()
          start += ang
        })
        ctx.beginPath(); ctx.fillStyle = '#ffffff'
        ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.fill()
      } else if (props.kind === 'bar') {
        const max = Math.max(1, ...props.values)
        const pad = 24, base = h - 24
        const bw = Math.max(10, (w - pad*2) / Math.max(1, props.values.length) - 8)
        ctx.strokeStyle = '#e0e7ff'; ctx.lineWidth = 1
        for (let y=0;y<=4;y++){ const yy = base - (base-16)*(y/4); ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(w-pad, yy); ctx.stroke() }
        props.values.forEach((v,idx)=>{
          const x = pad + idx*((w - pad*2)/Math.max(1, props.values.length)) + 4
          const bh = (v/max) * (base-16)
          ctx.fillStyle = palette[idx % palette.length]
          ctx.fillRect(x, base-bh, bw, bh)
        })
      } else {
        const max = Math.max(1, ...props.values)
        const pad = 24, base = h - 24
        const step = (w - pad*2) / Math.max(1, props.values.length-1)
        ctx.strokeStyle = '#e0e7ff'; ctx.lineWidth = 1
        for (let y=0;y<=4;y++){ const yy = base - (base-16)*(y/4); ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(w-pad, yy); ctx.stroke() }
        ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 2
        ctx.beginPath()
        props.values.forEach((v,idx)=>{
          const x = pad + idx*step
          const y = base - (v/max)*(base-16)
          if (idx===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
        })
        ctx.stroke()
      }
    }
    onMounted(draw); watchEffect(draw)
    return () => h('canvas', { ref: el, class: 'chart-canvas' })
  }
})

// Data loading
async function loadData() {
  try {
    const res = await fetch('/incidents.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error(String(res.status))
    baseIncidents.value = await res.json()
  } catch {
    const now = Date.now()
    baseIncidents.value = [
      { id:'INC-1001', title:'Temperaturspitze im Kühlraum', category:'Sensorik', location:'Werk A', area:'Kühlkette', description:'Anstieg auf 9°C für 12 Minuten.', reportedAt:new Date(now-3*3600e3).toISOString(), processed:false },
      { id:'INC-1002', title:'Anomalie Stromverbrauch', category:'Energie', location:'Werk B', area:'Produktion 2', description:'Lastspitze +35% ggü. Schnitt.', reportedAt:new Date(now-26*3600e3).toISOString(), processed:false },
      { id:'INC-1003', title:'Ausfall Kamera 3', category:'Sicherheit', location:'Zentrale', area:'Eingang Ost', description:'Keine Daten seit 2h.', reportedAt:new Date(now-6*24*3600e3).toISOString(), processed:true, assignedTo:'technik@firma.de' },
      { id:'INC-1004', title:'Fehlmengen Lagerbestand', category:'Logistik', location:'Lager Nord', area:'Gang 7', description:'Differenz 18 Einheiten SKU 4711.', reportedAt:new Date(now-4*24*3600e3).toISOString(), processed:false },
      { id:'INC-1005', title:'Feuchte-Sensor Dauerwert', category:'Sensorik', location:'Werk A', area:'Linie 4', description:'Konstant 82% rF.', reportedAt:new Date(now-9*24*3600e3).toISOString(), processed:true, assignedTo:'wartung@firma.de' },
      { id:'INC-1006', title:'Login-Versuche ungewöhnlich', category:'IT', location:'Cloud', area:'IAM', description:'Mehrere fehlgeschlagene Logins.', reportedAt:new Date(now-2*24*3600e3).toISOString(), processed:false },
      { id:'INC-1007', title:'Druckabfall Leitung', category:'Instandhaltung', location:'Werk C', area:'Hydraulik', description:'-15% unter Mindestwert.', reportedAt:new Date(now-13*24*3600e3).toISOString(), processed:true, assignedTo:'maintenance@firma.de' },
      { id:'INC-1008', title:'Abweichung Ausschuss', category:'Qualität', location:'Werk B', area:'Linie 1', description:'+12% zum Wochenschnitt.', reportedAt:new Date(now-11*24*3600e3).toISOString(), processed:false },
      { id:'INC-1009', title:'Vibration erhöht', category:'Sensorik', location:'Werk C', area:'Motor M2', description:'Vibration +25% Peak.', reportedAt:new Date(now-7*24*3600e3).toISOString(), processed:false },
      { id:'INC-1010', title:'Netzwerk Latenz', category:'IT', location:'Werk A', area:'LAN', description:'Latenzen > 250ms.', reportedAt:new Date(now-18*3600e3).toISOString(), processed:false },
      { id:'INC-1011', title:'Füllstand kritisch', category:'Instandhaltung', location:'Werk B', area:'Tank 5', description:'< 10% für 30 Min.', reportedAt:new Date(now-5*24*3600e3).toISOString(), processed:true, assignedTo:'leitwarte@firma.de' },
      { id:'INC-1012', title:'Temperaturschwankung', category:'Qualität', location:'Werk A', area:'Reiferaum', description:'±3°C in 1h.', reportedAt:new Date(now-6*3600e3).toISOString(), processed:false },
    ]
  }
}

onMounted(async () => {
  overrides.value = loadOverrides()
  await loadData()
})
</script>

<template>
  <div class="dashboard">
    <header class="app-header">
      <h1>Incident Dashboard</h1>
    </header>

    <main class="two-col">
      <aside class="left-pane">
        <div class="toolbar sticky">
          <div class="filters">
            <label>
              Sortierung:
              <select v-model="sortMode">
                <option value="urgency">Dringlichkeit</option>
                <option value="newest">Neueste zuerst</option>
                <option value="oldest">Älteste zuerst</option>
              </select>
            </label>
            <label>
              Filter:
              <select v-model="filterMode">
                <option value="all">Alle</option>
                <option value="open">Nur offen</option>
                <option value="done">Nur bearbeitet</option>
              </select>
            </label>
          </div>
          <div class="kpi-row">
            <div class="kpi small"><div class="kpi-title">Gesamt</div><div class="kpi-value">{{ kpiTotal }}</div></div>
            <div class="kpi small"><div class="kpi-title">Offen</div><div class="kpi-value">{{ kpiOpen }}</div></div>
            <div class="kpi small"><div class="kpi-title">Erledigt</div><div class="kpi-value">{{ kpiDone }}</div></div>
            <div class="kpi small"><div class="kpi-title">Ältester Offen</div><div class="kpi-value">{{ kpiOldestOpen }}</div></div>
          </div>
        </div>

        <div class="list">
          <article
            v-for="it in visibleIncidents"
            :key="it.id"
            :class="['card list-item', { processed: it.processed }, cardTone(it)]"
          >
            <div class="card-header">
              <div class="prio-chip">
                <span class="dot" :class="priority(it).cls"></span>
                {{ it.processed ? 'erledigt' : priority(it).label }}
              </div>
              <div class="card-title">{{ it.title }}</div>
            </div>

            <div class="meta">
              <span class="badge">{{ it.category }}</span>
              <span class="badge">Ort: {{ it.location }}</span>
              <span v-if="it.area" class="badge">Bereich: {{ it.area }}</span>
            </div>

            <div class="desc">{{ it.description }}</div>

            <div class="meta">
              <span>Gemeldet: {{ fmtDate(new Date(it.reportedAt)) }} ({{ timeSince(new Date(it.reportedAt)) }})</span>
              <span v-if="it.assignedTo">• Bearbeiter: {{ it.assignedTo }}</span>
            </div>

            <div class="card-actions row">
              <label class="switch">
                <input type="checkbox" class="switch-input" :checked="it.processed" @change="(e:any)=>setProcessed(it, !!e.target.checked)" />
                <span class="switch-slider"></span>
                <span class="switch-label">Bearbeitet</span>
              </label>
              <input type="email" :value="draftFor(it)" placeholder="zuständig@example.com" @input="(e:any)=>{ drafts[it.id] = e.target.value }" @keydown.enter.prevent="saveEmail(it)" />
              <button class="primary" type="button" @click="saveEmail(it)">Speichern</button>
            </div>
          </article>
        </div>
      </aside>

      <section class="right-pane">
        <div class="cards">
          <div class="panel">
            <div class="panel-header">
              <div class="panel-title">Status</div>
              <div class="legend">
                <span class="dot dot-low"></span> Offen
                <span class="dot dot-done" style="margin-left:8px;"></span> Erledigt
              </div>
            </div>
            <ChartCanvas kind="doughnut" :labels="statusCounts.labels" :values="statusCounts.values" :colors="['#1e88e5','#2e7d32']" />
          </div>

          <div class="panel">
            <div class="panel-header"><div class="panel-title">Kategorien</div></div>
            <ChartCanvas kind="bar" :labels="byCategory.labels" :values="byCategory.values" />
          </div>

          <div class="panel">
            <div class="panel-header"><div class="panel-title">Alter offene Incidents</div></div>
            <ChartCanvas kind="bar" :labels="ageBuckets.labels" :values="ageBuckets.values" :colors="['#f9a825','#ef6c00','#d32f2f','#1565c0']" />
          </div>

          <div class="panel">
            <div class="panel-header"><div class="panel-title">Trend (14 Tage)</div></div>
            <ChartCanvas kind="line" :labels="trend14.labels" :values="trend14.values" />
          </div>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <small>Hinweis: Änderungen werden lokal im Browser gespeichert.</small>
    </footer>
  </div>
</template>

<style scoped>
:root{
  --blue-800:#0d47a1;
  --blue-700:#1565c0;
  --blue-600:#1976d2;
  --blue-500:#1e88e5;
  --blue-100:#e3f2fd;
  --text:#0d1b2a;
  --muted:#6b7a90;
  --surface:#ffffff;
  --bg:#fbfdff;
  --border:#e0e7ff;
  --green:#2e7d32;
  --yellow:#f9a825;
  --orange:#ef6c00;
  --red:#d32f2f;
  --card-blue-50:#f3f8ff;
  --card-blue-100:#e7f0ff;
  --card-blue-200:#d8e7ff;
}
.dashboard{color:var(--text);background:var(--bg);min-height:100vh}
.app-header{
  background:linear-gradient(90deg,var(--blue-800),var(--blue-600));
  color:#fff;padding:16px 20px;box-shadow:0 2px 8px rgba(0,0,0,.12);
}
.app-header h1{margin:0;font-size:20px;font-weight:700;letter-spacing:.2px}
.two-col{display:grid;grid-template-columns:420px 1fr;gap:16px;max-width:1300px;margin:16px auto;padding:0 16px}
.left-pane{display:flex;flex-direction:column;min-height:70vh;background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.right-pane{display:block}
.toolbar.sticky{position:sticky;top:0;background:var(--surface);z-index:2;border-bottom:1px solid var(--border);padding:12px}
.filters{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.filters select{padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:#fff}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.kpi{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:8px 10px}
.kpi.small .kpi-title{color:var(--muted);font-size:11px}
.kpi.small .kpi-value{font-size:20px;font-weight:700;color:var(--blue-700)}
.list{overflow:auto;padding:12px;display:flex;flex-direction:column;gap:12px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;box-shadow:0 2px 10px rgba(21,101,192,.06);display:flex;flex-direction:column;gap:8px}
.card.processed{filter:grayscale(1);opacity:.7}
.card-title{font-weight:700;color:var(--blue-700);flex:1}
.prio-chip{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.meta{display:flex;flex-wrap:wrap;gap:8px;color:var(--muted);font-size:12px}
.meta .badge{background:var(--blue-100);color:var(--blue-700);padding:2px 6px;border-radius:999px;border:1px solid var(--border)}
.desc{font-size:14px;line-height:1.35}
.card-actions{display:flex;gap:8px;align-items:center}
.row{display:flex;gap:8px;align-items:center}
input[type="email"]{padding:8px 10px;border:1px solid var(--border);border-radius:8px;flex:1;min-width:0}
button.primary{background:var(--blue-600);color:#fff;border:1px solid var(--blue-600);padding:8px 12px;border-radius:8px;cursor:pointer}
button.primary:disabled{opacity:.6;cursor:not-allowed}
.switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.switch-input{position:absolute;opacity:0;width:0;height:0}
.switch-slider{position:relative;display:inline-block;width:44px;height:24px;border-radius:999px;background:#dce6ff;border:1px solid var(--border);transition:.2s}
.switch-slider::after{content:'';position:absolute;width:20px;height:20px;top:1px;left:1px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:.2s}
.switch-input:checked + .switch-slider{background:rgba(46,125,50,.2);border-color:#a5d6a7}
.switch-input:checked + .switch-slider::after{left:21px;background:#2e7d32}
.switch-label{font-size:12px;color:var(--muted)}
.right-pane .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;box-shadow:0 2px 10px rgba(21,101,192,.06);display:flex;flex-direction:column;gap:8px}
.panel-header{display:flex;align-items:center;justify-content:space-between}
.panel-title{font-weight:700;color:var(--blue-700)}
.legend{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px}
.dot{width:10px;height:10px;border-radius:50%}
.dot-high{background:var(--red)}.dot-medium{background:var(--orange)}.dot-low{background:var(--yellow)}.dot-done{background:var(--green)}
.chart-canvas{width:100%;height:200px;display:block}
.app-footer{max-width:1300px;margin:24px auto;padding:0 16px;color:var(--muted)}
.card-tone-light{background:var(--card-blue-50);border-color:#e1ecff}
.card-tone-mid{background:var(--card-blue-100);border-color:#d3e3ff}
.card-tone-dark{background:var(--card-blue-200);border-color:#c6dbff}
@media (max-width:1024px){.two-col{grid-template-columns:1fr}.left-pane{order:2}.right-pane{order:1}}
</style>
