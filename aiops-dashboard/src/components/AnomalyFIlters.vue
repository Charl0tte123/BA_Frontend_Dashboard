<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  sources: string[];
  services: string[];
  modelValue: {
    status: ('unchecked'|'acknowledged'|'resolved'|'all');
    source: string|'all';
    service: string|'all';
    text: string;
  }
}>();
const emit = defineEmits(['update:modelValue']);

const local = ref(structuredClone(props.modelValue));
watch(local, v => emit('update:modelValue', v), { deep: true });
watch(() => props.modelValue, v => local.value = structuredClone(v));
</script>

<template>
  <div class="filters">
    <select v-model="local.status" title="Status">
      <option value="all">Status: alle</option>
      <option value="unchecked">unchecked</option>
      <option value="acknowledged">acknowledged</option>
      <option value="resolved">resolved</option>
    </select>

    <select v-model="local.source" title="Quelle">
      <option value="all">Quelle: alle</option>
      <option v-for="s in sources" :key="s" :value="s">{{ s }}</option>
    </select>

    <select v-model="local.service" title="Service">
      <option value="all">Service: alle</option>
      <option v-for="s in services" :key="s" :value="s">{{ s }}</option>
    </select>

    <input v-model="local.text" placeholder="Suche (ID, Error, Region, Summary…)" />
  </div>
</template>

<style scoped>
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
select,input{border:1px solid #d0d7de;border-radius:10px;padding:10px 12px;background:#fff;min-width:180px}
input{flex:1}
</style>
