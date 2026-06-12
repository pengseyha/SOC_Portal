<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import DataTable from '../components/DataTable.vue';
import { useAuth } from '../composables/useAuth.js';
import { api } from '../services/api.js';

const { user, setUser } = useAuth();
const form = ref({});
const history = ref([]);
const message = ref('');

watchEffect(() => {
  form.value = { ...(user.value || {}) };
});

async function save(event) {
  event.preventDefault();
  const data = await api('/profile', { method: 'PUT', body: JSON.stringify(form.value) });
  setUser(data.user);
  message.value = 'Profile updated';
}

onMounted(async () => {
  const data = await api('/profile/login-history');
  history.value = data.logs;
});
</script>

<template>
  <div class="split">
    <section class="panel">
      <h2>Profile</h2>
      <form class="stack" @submit="save">
        <input v-for="field in ['name', 'email', 'title', 'department', 'phone']" :key="field" v-model="form[field]" :placeholder="field" />
        <button class="primary">Save Profile</button>
        <p v-if="message" class="form-message">{{ message }}</p>
      </form>
    </section>
    <section class="panel">
      <h2>Login History</h2>
      <DataTable
        :rows="history"
        :columns="[
          { key: 'timestamp', label: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
          { key: 'sourceIp', label: 'Source IP' },
          { key: 'userAgent', label: 'User Agent' }
        ]"
      />
    </section>
  </div>
</template>
