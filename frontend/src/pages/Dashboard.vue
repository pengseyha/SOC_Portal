<script setup>
import { AlertTriangle, Lock, Radar, Users, Wifi } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import DataTable from '../components/DataTable.vue';
import SeverityBadge from '../components/SeverityBadge.vue';
import { api } from '../services/api.js';

const data = ref(null);

onMounted(async () => {
  data.value = await api('/dashboard/overview');
});
</script>

<template>
  <div v-if="!data" class="loading">Loading SOC telemetry...</div>
  <div v-else class="page-grid">
    <section class="kpis">
      <article
        v-for="card in [
          ['Total Users', data.widgets.totalUsers, Users],
          ['Total Events', data.widgets.totalEvents, Radar],
          ['Failed Logins Today', data.widgets.failedLoginsToday, AlertTriangle],
          ['Locked Accounts', data.widgets.lockedAccounts, Lock],
          ['Active Sessions', data.widgets.activeSessions, Wifi]
        ]"
        :key="card[0]"
        class="kpi"
      >
        <component :is="card[2]" :size="22" />
        <span>{{ card[0] }}</span>
        <strong>{{ card[1] }}</strong>
      </article>
    </section>
    <section class="panel">
      <h2>Recent High Severity Events</h2>
      <DataTable
        :rows="data.recentAlerts"
        :columns="[
          { key: 'timestamp', label: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
          { key: 'username', label: 'User' },
          { key: 'eventType', label: 'Event' },
          { key: 'sourceIp', label: 'Source IP' },
          { key: 'severity', label: 'Severity', component: SeverityBadge, props: (row) => ({ value: row.severity }) }
        ]"
      />
    </section>
    <section class="split">
      <div class="panel">
        <h2>Top Attacker IPs</h2>
        <div v-for="ip in data.topAttackerIps" :key="ip.ip" class="metric-row">
          <span>{{ ip.ip }}</span>
          <strong>{{ ip.count }}</strong>
        </div>
      </div>
      <div class="panel">
        <h2>Recent User Activity</h2>
        <div v-for="item in data.recentActions.slice(0, 6)" :key="item.id" class="event-row">
          <SeverityBadge :value="item.severity" />
          <span>{{ item.description }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
