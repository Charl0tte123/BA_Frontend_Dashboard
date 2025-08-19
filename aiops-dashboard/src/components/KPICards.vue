<script setup lang="ts">
import { computed } from 'vue';
import type { Anomaly } from '../types';

interface Props {
  items: Anomaly[];
}

const props = defineProps<Props>();

const stats = computed(() => {
  const total = props.items.length;
  const unchecked = props.items.filter(a => a.status === 'unchecked').length;
  const acknowledged = props.items.filter(a => a.status === 'acknowledged').length;
  const resolved = props.items.filter(a => a.status === 'resolved').length;
  
  return { total, unchecked, acknowledged, resolved };
});
</script>

<template>
  <div class="kpi-cards">
    <div class="kpi-card">
      <div class="kpi-value">{{ stats.total }}</div>
      <div class="kpi-label">Gesamt</div>
    </div>
    
    <div class="kpi-card unchecked">
      <div class="kpi-value">{{ stats.unchecked }}</div>
      <div class="kpi-label">Ungeprüft</div>
    </div>
    
    <div class="kpi-card acknowledged">
      <div class="kpi-value">{{ stats.acknowledged }}</div>
      <div class="kpi-label">Bestätigt</div>
    </div>
    
    <div class="kpi-card resolved">
      <div class="kpi-value">{{ stats.resolved }}</div>
      <div class="kpi-label">Gelöst</div>
    </div>
  </div>
</template>

<style scoped>
.kpi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  text-align: center;
}

.kpi-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.kpi-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.unchecked .kpi-value { color: #ef4444; }
.acknowledged .kpi-value { color: #f59e0b; }
.resolved .kpi-value { color: #10b981; }
</style>
