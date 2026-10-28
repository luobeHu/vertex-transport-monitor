<script setup>
defineProps({ label: String, tone: { type: String, default: "gray" } });
</script>
<template>
  <span class="tag" :class="`tag-${tone}`"
    ><span class="tag-dot" />{{ label }}</span
  >
</template>
