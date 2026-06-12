<script setup>
import { onMounted, ref } from 'vue';
import SeverityBadge from '../components/SeverityBadge.vue';
import { api } from '../services/api.js';

const items = ref([]);

onMounted(async () => {
  const data = await api('/activity/timeline');
  items.value = data.activities;
});
</script>

<template>
  <section class="panel">
    <div class="timeline">
      <article v-for="item in items" :key="item.id">
        <time>{{ new Date(item.timestamp).toLocaleString() }}</time>
        <strong>{{ item.eventType }}</strong>
        <p>{{ item.description }}</p>
        <SeverityBadge :value="item.severity" />
      </article>
    </div>
  </section>
</template>
