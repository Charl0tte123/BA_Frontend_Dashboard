<script setup lang="ts">
import { computed } from 'vue';
import type { Anomaly } from '../types';

const props = defineProps<{ items: Anomaly[] }>();

const total = computed(() => props.items.length);
const byStatus = computed(() => ({
  unchecked: props.items.filter(a => a.status === 'unchecked').length,
  acknowledged: props.items.filter(a => a.status === 'acknowledged').length,
  resolved: props.items.filter(a => a.status === 'resolved').length
}));
const timeRange = computed(() => {
  if (!props.items.length) return '—';
  const ts = props.items.map(a => new Date(a.ts).getTime());
  const min = new Date(Math.min(...ts));
  const max = new Date(Math.max(...ts));
  return `${min.toLocaleString()} – ${max.toLocaleString()}`;
});
const avgTimeToCheck = computed(() => {
  const diffs = props.items
    .filter(a => a.firstSeenTs && a.checkedTs)
    .map(a => (new Date(a.checkedTs!).getTime() - new Date(a.firstSeenTs!).getTime())/60000);
  if (!diffs.length) return '—';
  const avg = diffs.reduce((s,v)=>s+v,0)/diffs.length;
  return `${avg.toFixed(1)} min`;
});
</script>

<template>
  <div class="kpis">
    <div class="card"><div class="h">Anomalien (gesamt)</div><div class="v">{{ total }}</div></div>
    <div class="card"><div class="h">Unchecked</div><div class="v">{{ byStatus.unchecked }}</div></div>
    <div class="card"><div class="h">Acknowledged</div><div class="v">{{ byStatus.acknowledged }}</div></div>
    <div class="card"><div class="h">Resolved</div><div class="v">{{ byStatus.resolved }}</div></div>
    <div class="card wide"><div class="h">Zeitfenster</div><div class="v small">{{ timeRange }}</div></div>
    <div class="card"><div class="h">Ø Time‑to‑Check</div><div class="v">{{ avgTimeToCheck }}</div></div>
  </div>
</template>

<style scoped>
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.card{background:#0d1b2a;color:#fff;border-radius:16px;padding:14px;box-shadow:0 6px 18px rgba(0,0,0,.12)}
.card.wide{grid-column: span 2}
.h{font-size:12px;opacity:.85;margin-bottom:6px}
.v{font-size:22px;font-weight:700}
.v.small{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:1080px){.kpis{grid-template-columns:repeat(2,1fr)}.card.wide{grid-column: span 2}}
</style>
