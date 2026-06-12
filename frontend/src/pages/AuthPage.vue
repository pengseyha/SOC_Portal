<script setup>
import { ShieldCheck } from '@lucide/vue';
import { ref } from 'vue';
import { useAuth } from '../composables/useAuth.js';
import { api } from '../services/api.js';

const { login, register } = useAuth();
const mode = ref('login');
const form = ref({ identifier: 'admin@soc.local', password: 'Admin123!', rememberMe: true });
const message = ref('');
const messageType = ref('info');
const submitting = ref(false);

function setMode(nextMode) {
  mode.value = nextMode;
  message.value = '';
  messageType.value = 'info';
  form.value = {
    identifier: nextMode === 'login' ? 'admin@soc.local' : '',
    password: nextMode === 'login' ? 'Admin123!' : '',
    rememberMe: nextMode === 'login'
  };
}

function showMessage(text, type = 'info') {
  message.value = text;
  messageType.value = type;
}

async function submit(event) {
  event.preventDefault();
  if (submitting.value) return;
  showMessage('');
  submitting.value = true;
  try {
    if (mode.value === 'login') {
      await login(form.value.identifier, form.value.password, form.value.rememberMe);
      showMessage('Login successful. Opening dashboard...', 'success');
      return;
    }
    if (mode.value === 'register') {
      await register(form.value);
      return;
    }
    if (mode.value === 'forgot') {
      const data = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: form.value.email }) });
      showMessage(`Demo reset token: ${data.resetToken}`, 'success');
    }
    if (mode.value === 'reset') {
      await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: form.value.token, password: form.value.password }) });
      showMessage('Password reset logged.', 'success');
    }
  } catch (error) {
    showMessage(error.message || 'Request failed. Make sure the backend is running on port 4000.', 'error');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-screen">
    <section class="auth-panel">
      <div class="auth-brand">
        <ShieldCheck :size="42" />
        <div>
          <h1>SOC Monitoring Portal</h1>
          <p>Security event generation for Splunk and ELK demonstrations</p>
        </div>
      </div>
      <form @submit="submit">
        <template v-if="mode === 'register'">
          <input v-model="form.name" placeholder="Full name" required />
          <input v-model="form.username" placeholder="Username" required />
        </template>
        <input v-if="mode === 'register' || mode === 'forgot'" v-model="form.email" type="email" placeholder="Email" required />
        <input v-if="mode === 'reset'" v-model="form.token" placeholder="Reset token" required />
        <input v-if="mode === 'login'" v-model="form.identifier" placeholder="Email or username" required />
        <input v-if="mode !== 'forgot'" v-model="form.password" type="password" placeholder="Password" required />
        <label v-if="mode === 'login'" class="check">
          <input v-model="form.rememberMe" type="checkbox" />
          Remember me
        </label>
        <button type="submit" class="primary" :disabled="submitting">
          {{ submitting ? 'Working...' : mode === 'login' ? 'Login' : mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Reset Password' }}
        </button>
      </form>
      <p v-if="message" :class="['form-message', messageType]">{{ message }}</p>
      <div class="auth-links">
        <button type="button" :class="{ active: mode === 'login' }" @click="setMode('login')">Login</button>
        <button type="button" :class="{ active: mode === 'register' }" @click="setMode('register')">Register</button>
        <button type="button" :class="{ active: mode === 'forgot' }" @click="setMode('forgot')">Forgot</button>
        <button type="button" :class="{ active: mode === 'reset' }" @click="setMode('reset')">Reset</button>
      </div>
    </section>
  </div>
</template>
