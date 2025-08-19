<script setup lang="ts">
import { computed } from 'vue';
import type { Anomaly } from '../types';

const props = defineProps<{
  items: Anomaly[];
  pageSize?: number;
}>();
const emit = defineEmits<{
  (e: 'status', id: string, status: Anomaly['status']): void
}>();

const size = props.pageSize ?? 10;

const sorted = computed(() =>
  [...props.items].sort((a,b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
);

</script>

<template>
  <table class="tbl">
    <thead>
      <tr>
        <th>Time</th>
        <th>ID</th>
        <th>Pivot</th>
        <th>Lift</th>
        <th>Impact</th>
        <th>Risk</th>
        <th>Status</th>
        <th>Aktion</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="a in sorted.slice(0, size)" :key="a.anomalyId">
        <td><span class="mono">{{ new Date(a.ts).toLocaleString() }}</span></td>
        <td class="mono small">{{ a.anomalyId }}</td>
        <td>
          <div class="pv">
            <div><b>{{ a.pivot.service ?? '—' }}</b> ({{ a.pivot.region ?? '—' }})</div>
            <div class="muted">v{{ a.pivot.version ?? '—' }} • {{ a.pivot.errorCode ?? '—' }} • {{ a.source }}</div>
            <div v-if="a.llmSummary" class="llm">{{ a.llmSummary }}</div>
          </div>
        </td>
        <td><b>{{ a.lift.toFixed(2) }}</b></td>
        <td>{{ (a.impactShare*100).toFixed(0) }}%</td>
        <td><span :class="['pill', a.riskLevel?.toLowerCase()]">{{ a.riskLevel ?? '—' }}</span></td>
        <td><span class="pill status" :data-s="a.status">{{ a.status }}</span></td>
        <td class="actions">
          <button class="ack" @click="emit('status', a.anomalyId, 'acknowledged')">ack</button>
          <button class="res" @click="emit('status', a.anomalyId, 'resolved')">resolve</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.tbl{width:100%;border-collapse:separate;border-spacing:0 10px}
thead th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;text-align:left;padding:0 8px}
tbody tr{background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.06)}
td{padding:12px 8px;vertical-align:top}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
.small{font-size:12px}
.pv .muted{color:#6b7280;font-size:12px;margin-top:2px}
.pv .llm{margin-top:6px;background:#f1f5f9;border-radius:8px;padding:8px;font-size:12px}
.pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#e5e7eb;font-size:12px}
.pill.s1{background:#fee2e2;color:#991b1b}
.pill.s2{background:#ffedd5;color:#9a3412}
.pill.s3{background:#fef9c3;color:#854d0e}
.pill.s4{background:#dcfce7;color:#14532d}
.pill.status[data-s="unchecked"]{background:#e0e7ff;color:#3730a3}
.pill.status[data-s="acknowledged"]{background:#fde68a;color:#92400e}
.pill.status[data-s="resolved"]{background:#bbf7d0;color:#065f46}
.actions button{border:0;border-radius:10px;padding:8px 10px;cursor:pointer}
.actions .ack{background:#ffedd5}
.actions .res{background:#dcfce7;margin-left:8px}
</style>
