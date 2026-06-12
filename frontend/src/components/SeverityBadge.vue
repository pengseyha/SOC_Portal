<script setup>
defineProps({
  value: { type: String, default: 'info' }
});
</script>

<template>
  <span :class="['badge', value]">{{ value }}</span>
</template>
