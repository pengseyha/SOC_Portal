<script setup>
defineProps({
  user: { type: Object, required: true }
});
defineEmits(['disable', 'reset', 'remove']);
</script>

<template>
  <div class="row-actions">
    <button @click="$emit('disable', user.id)">Disable</button>
    <button @click="$emit('reset', user.id)">Reset</button>
    <button @click="$emit('remove', user.id)">Delete</button>
  </div>
</template>
