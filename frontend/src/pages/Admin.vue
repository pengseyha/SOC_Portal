<script setup>
import { onMounted, ref } from 'vue';
import AdminActions from '../components/AdminActions.vue';
import DataTable from '../components/DataTable.vue';
import { api } from '../services/api.js';

const users = ref([]);
const form = ref({ role: 'analyst', password: 'TempPass123!' });
const message = ref('');

async function load() {
  const data = await api('/admin/users');
  users.value = data.users;
}

async function create(event) {
  event.preventDefault();
  await api('/admin/users', { method: 'POST', body: JSON.stringify(form.value) });
  form.value = { role: 'analyst', password: 'TempPass123!' };
  message.value = 'User created';
  await load();
}

async function disable(id) {
  await api(`/admin/users/${id}/disable`, { method: 'PATCH' });
  await load();
}

async function reset(id) {
  const data = await api(`/admin/users/${id}/reset-password`, { method: 'POST' });
  message.value = `Temporary password: ${data.password}`;
}

async function remove(id) {
  await api(`/admin/users/${id}`, { method: 'DELETE' });
  await load();
}

onMounted(load);
</script>

<template>
  <div class="page-grid">
    <section class="panel">
      <h2>Create User</h2>
      <form class="admin-form" @submit="create">
        <input v-for="field in ['name', 'username', 'email', 'title', 'department', 'password']" :key="field" v-model="form[field]" :placeholder="field" :required="['name', 'username', 'email', 'password'].includes(field)" />
        <select v-model="form.role">
          <option value="analyst">analyst</option>
          <option value="admin">admin</option>
        </select>
        <button class="primary">Create</button>
      </form>
      <p v-if="message" class="form-message">{{ message }}</p>
    </section>
    <section class="panel">
      <h2>Users</h2>
      <DataTable
        :rows="users"
        :columns="[
          { key: 'username', label: 'Username' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions', component: AdminActions, props: (user) => ({ user, onDisable: disable, onReset: reset, onRemove: remove }) }
        ]"
      >
      </DataTable>
    </section>
  </div>
</template>
