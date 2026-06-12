<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  empty: { type: String, default: 'No records found' }
});
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="empty">{{ empty }}</td>
        </tr>
        <tr v-for="row in rows" :key="row.id || `${row.timestamp}-${row.eventType}`">
          <td v-for="column in columns" :key="column.key">
            <component v-if="column.component" :is="column.component" v-bind="column.props(row)" />
            <span v-else>{{ column.render ? column.render(row) : row[column.key] }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
