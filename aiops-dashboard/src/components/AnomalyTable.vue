<script setup lang="ts">
import { computed } from 'vue';
import type { Anomaly } from '../types';

interface Props {
  items: Anomaly[];
  pageSize?: number;
}

interface Emits {
  (e: 'status', id: string, status: Anomaly['status']): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const size = props.pageSize ?? 10;

const sorted = computed(() =>
  [...props.items].sort((a,b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
);

function formatDate(date: string | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleString('de-DE');
}

function getStatusColor(status: Anomaly['status']) {
  switch (status) {
    case 'unchecked': return '#ef4444';
    case 'acknowledged': return '#f59e0b';
    case 'resolved': return '#10b981';
    default: return '#6b7280';
  }
}

function onStatusChange(id: string, event: Event) {
  const status = (event.target as HTMLSelectElement).value as Anomaly['status'];
  emit('status', id, status);
}
</script>

<template>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Anomalie ID</th>
          <th>Quelle</th>
          <th>Service</th>
          <th>Region</th>
          <th>Error Code</th>
          <th>Threshold</th>
          <th>Erkannt</th>
          <th>Status</th>
          <th>Zusammenfassung</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.anomalyId">
          <td class="anomaly-id">{{ item.anomalyId }}</td>
          <td>{{ item.source }}</td>
          <td>{{ item.pivot?.service || '-' }}</td>
          <td>{{ item.pivot?.region || '-' }}</td>
          <td>{{ item.pivot?.errorCode || '-' }}</td>
          <td>{{ item.pivot?.threshold !== undefined ? item.pivot.threshold.toFixed(1) + '%' : '-' }}</td>
          <td>{{ formatDate(item.detectedTs) }}</td>
          <td>
            <select 
              :value="item.status" 
              @change="onStatusChange(item.anomalyId, $event)"
              :style="{ color: getStatusColor(item.status) }"
            >
              <option value="unchecked">Ungeprüft</option>
              <option value="acknowledged">Bestätigt</option>
              <option value="resolved">Gelöst</option>
            </select>
          </td>
          <td class="summary">{{ item.llmSummary || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-container {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background: #f9fafb;
  font-weight: 600;
  font-size: 14px;
}

.anomaly-id {
  font-family: monospace;
  font-size: 12px;
}

.summary {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-weight: 600;
}
</style>
