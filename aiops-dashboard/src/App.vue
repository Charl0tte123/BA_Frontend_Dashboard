<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import type { Anomaly } from './types';
import KpiCards from './components/KpiCards.vue';
import AnomalyFilters from './components/AnomalyFilters.vue';
import AnomalyTable from './components/AnomalyTable.vue';

// Removed local example data

const all = ref<Anomaly[]>([]);
const loading = ref(false);

const filters = reactive({
  status: 'all' as 'all'|'unchecked'|'acknowledged'|'resolved',
  source: 'all' as string|'all',
  service: 'all' as string|'all',
  text: ''
});

const sources = computed(() => [...new Set(all.value.map(a => a.source))].sort());
const services = computed(() => [...new Set(all.value.map(a => a.pivot.service).filter(Boolean) as string[])].sort());

const filtered = computed(() => {
  let items = all.value;
  if (filters.status !== 'all') items = items.filter(a => a.status === filters.status);
  if (filters.source !== 'all') items = items.filter(a => a.source === filters.source);
  if (filters.service !== 'all') items = items.filter(a => a.pivot.service === filters.service);
  if (filters.text.trim()) {
    const t = filters.text.toLowerCase();
    items = items.filter(a =>
      a.anomalyId.toLowerCase().includes(t) ||
      (a.pivot.errorCode ?? '').toLowerCase().includes(t) ||
      (a.pivot.region ?? '').toLowerCase().includes(t) ||
      (a.llmSummary ?? '').toLowerCase().includes(t)
    );
  }
  return items;
});

async function load() {
  loading.value = true;
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    // JSON aus lokaler Datei laden (kein fetch, kein API Call)
    const data = (await import('./data/anomalies.json')).default as Anomaly[];
    all.value = [...data];
  } finally {
    loading.value = false;
  }
}

async function onStatus(id: string, status: Anomaly['status']) {
  const idx = all.value.findIndex(a => a.anomalyId === id);
  if (idx >= 0) {
    // Optimistic UI
    const now = new Date().toISOString();
    all.value[idx] = { ...all.value[idx], status, checkedTs: (status !== 'unchecked' ? now : undefined) };
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log(`Status updated for ${id}: ${status}`);
    } catch {
      /* in echt: rollback + toast */
    }
  }
}

onMounted(load);
</script>

<template>
  <div class="wrap">
    <header>
      <h1>AiOps Anomalies</h1>
      <button @click="load" :disabled="loading">{{ loading ? 'Lade…' : 'Refresh' }}</button>
    </header>

    <KpiCards :items="filtered" />

    <AnomalyFilters
      v-model="filters"
      :sources="sources"
      :services="services"
    />

    <AnomalyTable :items="filtered" @status="onStatus" />

    <footer>
      <small>Demo‑Dashboard • Vue 3 + TS • Beispiel‑Daten via Mock‑API</small>
    </footer>
  </div>
</template>

<style scoped>
.wrap{max-width:1200px;margin:0 auto;padding:20px}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
h1{font-size:22px;margin:0}
header button{border:0;background:#0ea5e9;color:#fff;border-radius:10px;padding:10px 14px;cursor:pointer}
footer{margin:24px 0;color:#6b7280}
body{background:#f6f8fa}
</style>
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log(`Status updated for ${id}: ${status}`);
    } catch {
      /* in echt: rollback + toast */
    }
  }
}

onMounted(load);
</script>

<template>
  <div class="wrap">
    <header>
      <h1>AiOps Anomalies</h1>
      <button @click="load" :disabled="loading">{{ loading ? 'Lade…' : 'Refresh' }}</button>
    </header>

    <KpiCards :items="filtered" />

    <AnomalyFilters
      v-model="filters"
      :sources="sources"
      :services="services"
    />

    <AnomalyTable :items="filtered" @status="onStatus" />

    <footer>
      <small>Demo‑Dashboard • Vue 3 + TS • Beispiel‑Daten via Mock‑API</small>
    </footer>
  </div>
</template>

<style scoped>
.wrap{max-width:1200px;margin:0 auto;padding:20px}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
h1{font-size:22px;margin:0}
header button{border:0;background:#0ea5e9;color:#fff;border-radius:10px;padding:10px 14px;cursor:pointer}
footer{margin:24px 0;color:#6b7280}
body{background:#f6f8fa}
</style>
