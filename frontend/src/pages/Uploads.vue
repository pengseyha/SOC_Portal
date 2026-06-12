<script setup>
import { onMounted, ref } from 'vue';
import DataTable from '../components/DataTable.vue';
import { api } from '../services/api.js';

const uploads = ref([]);
const file = ref(null);

async function load() {
  const data = await api('/uploads');
  uploads.value = data.uploads;
}

async function submit(event) {
  event.preventDefault();
  const body = new FormData();
  body.append('file', file.value);
  await api('/uploads', { method: 'POST', body });
  file.value = null;
  await load();
}

function pickFile(event) {
  file.value = event.target.files[0];
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <form class="panel-tools" @submit="submit">
      <input type="file" @change="pickFile" />
      <button class="primary" :disabled="!file">Upload</button>
    </form>
    <DataTable
      :rows="uploads"
      :columns="[
        { key: 'originalName', label: 'Filename' },
        { key: 'username', label: 'User' },
        { key: 'sourceIp', label: 'IP Address' },
        { key: 'size', label: 'Size', render: (row) => `${Math.round(row.size / 1024)} KB` },
        { key: 'createdAt', label: 'Upload Time', render: (row) => new Date(row.createdAt).toLocaleString() }
      ]"
    />
  </section>
</template>
