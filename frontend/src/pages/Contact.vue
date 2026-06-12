<script setup>
import { ref } from 'vue';
import { api } from '../services/api.js';

const form = ref({});
const message = ref('');

async function submit(event) {
  event.preventDefault();
  await api('/contact', { method: 'POST', body: JSON.stringify(form.value) });
  message.value = 'Message submitted and logged.';
  form.value = {};
}
</script>

<template>
  <section class="panel narrow">
    <form class="stack" @submit="submit">
      <input v-for="field in ['name', 'email', 'subject']" :key="field" v-model="form[field]" :placeholder="field" required />
      <textarea v-model="form.message" placeholder="message" required />
      <button class="primary">Submit</button>
    </form>
    <p v-if="message" class="form-message">{{ message }}</p>
  </section>
</template>
