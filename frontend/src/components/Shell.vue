<script setup>
import { Activity, Bell, Contact, FileUp, LayoutDashboard, LogOut, Moon, Shield, Users } from '@lucide/vue';
import { computed } from 'vue';
import { useAuth } from '../composables/useAuth.js';

const props = defineProps({
  view: { type: String, required: true }
});
const emit = defineEmits(['update:view']);
const { user, logout } = useAuth();

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'audit', label: 'Audit Logs', icon: Activity },
  { id: 'events', label: 'Security Events', icon: Bell },
  { id: 'timeline', label: 'Timeline', icon: Shield },
  { id: 'profile', label: 'Profile', icon: Users },
  { id: 'uploads', label: 'Uploads', icon: FileUp },
  { id: 'contact', label: 'Contact', icon: Contact },
  { id: 'admin', label: 'Admin', icon: Users, admin: true }
];

const visibleNav = computed(() => nav.filter((item) => !item.admin || user.value?.role === 'admin'));
const title = computed(() => nav.find((item) => item.id === props.view)?.label || 'Dashboard');
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <Shield :size="28" />
        <div>
          <strong>SOC Portal</strong>
          <span>Detection & Alerting</span>
        </div>
      </div>
      <nav>
        <button
          v-for="item in visibleNav"
          :key="item.id"
          :class="{ active: view === item.id }"
          @click="emit('update:view', item.id)"
        >
          <component :is="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <button class="logout" @click="logout">
        <LogOut :size="18" />
        <span>Logout</span>
      </button>
    </aside>
    <main>
      <header class="topbar">
        <div>
          <p>Security Operations Center</p>
          <h1>{{ title }}</h1>
        </div>
        <div class="user-chip">
          <Moon :size="16" />
          <span>{{ user?.name }}</span>
          <strong>{{ user?.role }}</strong>
        </div>
      </header>
      <slot />
    </main>
  </div>
</template>
