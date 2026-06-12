<script setup>
import { computed, provide, readonly, ref } from 'vue';
import Shell from './components/Shell.vue';
import { api, clearToken, getToken, setToken } from './services/api.js';
import Admin from './pages/Admin.vue';
import AuditLogs from './pages/AuditLogs.vue';
import AuthPage from './pages/AuthPage.vue';
import Contact from './pages/Contact.vue';
import Dashboard from './pages/Dashboard.vue';
import Profile from './pages/Profile.vue';
import Timeline from './pages/Timeline.vue';
import Uploads from './pages/Uploads.vue';

const user = ref(null);
const loading = ref(Boolean(getToken()));
const view = ref('dashboard');
const isAuthenticated = computed(() => Boolean(user.value));

async function restoreSession() {
  if (!getToken()) return;
  try {
    const data = await api('/auth/me');
    user.value = data.user;
  } catch {
    clearToken();
  } finally {
    loading.value = false;
  }
}

async function login(identifier, password, rememberMe) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password })
    });
  setToken(data.token, rememberMe);
  user.value = data.user;
  view.value = 'dashboard';
}

async function register(payload) {
  const data = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  setToken(data.token, false);
  user.value = data.user;
}

async function logout() {
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
  clearToken();
  user.value = null;
  view.value = 'dashboard';
}

function setUser(nextUser) {
  user.value = nextUser;
}

provide('auth', {
  user: readonly(user),
  loading: readonly(loading),
  login,
  register,
  logout,
  setUser
});

const activePage = computed(() => {
  const pages = {
    dashboard: Dashboard,
    audit: AuditLogs,
    events: AuditLogs,
    timeline: Timeline,
    profile: Profile,
    uploads: Uploads,
    contact: Contact,
    admin: Admin
  };
  return pages[view.value] || Dashboard;
});

restoreSession();
</script>

<template>
  <div v-if="loading" class="loading full">Restoring secure session...</div>
  <AuthPage v-else-if="!isAuthenticated" />
  <Shell v-else v-model:view="view">
    <component :is="activePage" :security="view === 'events'" />
  </Shell>
</template>
