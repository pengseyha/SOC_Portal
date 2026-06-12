<script setup>
import { Download } from '@lucide/vue';
import { onMounted, ref, watch } from 'vue';
import DataTable from '../components/DataTable.vue';
import SeverityBadge from '../components/SeverityBadge.vue';
import { api } from '../services/api.js';

const props = defineProps({
  security: { type: Boolean, default: false }
});

const rows = ref([]);
const filters = ref({ search: '', severity: '' });

async function load() {
  const endpoint = props.security ? '/security-events' : '/audit-logs';
  const query = new URLSearchParams(Object.fromEntries(Object.entries(filters.value).filter(([, value]) => value))).toString();
  const data = await api(`${endpoint}?${query}`);
  rows.value = props.security ? data.events : data.logs;
}

async function exportCsv() {
  const response = await api('/audit-logs/export.csv');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audit-logs.csv';
  link.click();
  URL.revokeObjectURL(url);
}

watch(() => props.security, load);
onMounted(load);
</script>

<template>
  <section class="panel">
    <div class="panel-tools">
      <input v-model="filters.search" placeholder="Search logs" />
      <select v-model="filters.severity">
        <option value="">All severities</option>
        <option>info</option>
        <option>low</option>
        <option>medium</option>
        <option>high</option>
        <option>critical</option>
      </select>
      <button @click="load">Filter</button>
      <button v-if="!security" @click="exportCsv"><Download :size="16" /> CSV</button>
    </div>
    <DataTable
      :rows="rows"
      :columns="[
        { key: 'username', label: 'User' },
        { key: 'eventType', label: 'Action' },
        { key: 'timestamp', label: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
        { key: 'sourceIp', label: 'Source IP' },
        { key: 'severity', label: 'Severity', component: SeverityBadge, props: (row) => ({ value: row.severity }) },
        { key: 'status', label: 'Status' }
      ]"
    />
  </section>
</template>
