<template>
  <div class="memory-aid">
    <div
      v-if="coreLogic"
      class="core-logic"
    >
      {{ coreLogic }}
    </div>
    <ul v-if="points && points.length">
      <li
        v-for="(point, index) in points"
        :key="index"
        v-html="point"
      ></li>
    </ul>
    <div
      v-if="oneLiner"
      class="one-liner"
    >
      {{ oneLiner }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  coreLogic: {
    type: String,
    default: '',
  },
  points: {
    type: Array,
    default: () => [],
  },
  oneLiner: {
    type: String,
    default: '',
  },
})
</script>

<style scoped>
/* Styles are in custom.css */
</style>
