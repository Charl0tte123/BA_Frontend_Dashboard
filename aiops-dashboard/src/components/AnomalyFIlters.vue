<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: {
    status: 'all'|'unchecked'|'acknowledged'|'resolved';
    source: string|'all';
    service: string|'all';
    text: string;
  };
  sources: string[];
  services: string[];
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function updateFilter(key: keyof Props['modelValue'], value: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  });
}
</script>

<template>
  <div class="filters">
    <div class="filter-group">
      <label>Status:</label>
      <select :value="modelValue.status" @change="updateFilter('status', ($event.target as HTMLSelectElement).value)">
        <option value="all">Alle</option>
        <option value="unchecked">Ungeprüft</option>
        <option value="acknowledged">Bestätigt</option>
        <option value="resolved">Gelöst</option>
      </select>
    </div>

    <div class="filter-group">
      <label>Quelle:</label>
      <select :value="modelValue.source" @change="updateFilter('source', ($event.target as HTMLSelectElement).value)">
        <option value="all">Alle</option>
        <option v-for="source in sources" :key="source" :value="source">{{ source }}</option>
      </select>
    </div>

    <div class="filter-group">
      <label>Service:</label>
      <select :value="modelValue.service" @change="updateFilter('service', ($event.target as HTMLSelectElement).value)">
        <option value="all">Alle</option>
        <option v-for="service in services" :key="service" :value="service">{{ service }}</option>
      </select>
    </div>

    <div class="filter-group">
      <label>Suche:</label>
      <input 
        type="text" 
        :value="modelValue.text" 
        @input="updateFilter('text', ($event.target as HTMLInputElement).value)"
        placeholder="Anomalie ID, Error Code, Region..."
      />
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-weight: 600;
  font-size: 14px;
}

.filter-group select,
.filter-group input {
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  min-width: 150px;
}
</style>
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  min-width: 150px;
}
</style>
