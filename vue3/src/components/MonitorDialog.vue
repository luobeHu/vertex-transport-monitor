<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import Icon from "./Icon.vue";
const props = defineProps({ open: Boolean, title: String, wide: Boolean });
const emit = defineEmits(["update:open"]);
const dialog = ref();
watch(
  () => props.open,
  (open) => {
    if (!dialog.value) return;
    if (open && !dialog.value.open) dialog.value.showModal();
    else if (!open && dialog.value.open) dialog.value.close();
  },
  { flush: "post" },
);
function outside(event) {
  if (event.target !== dialog.value) return;
  const r = dialog.value.getBoundingClientRect();
  if (
    event.clientX < r.left ||
    event.clientX > r.right ||
    event.clientY < r.top ||
    event.clientY > r.bottom
  )
    emit("update:open", false);
}
onMounted(() => {
  if (props.open && !dialog.value.open) dialog.value.showModal();
});
onBeforeUnmount(() => dialog.value?.close());
</script>
<template>
  <dialog
    ref="dialog"
    :class="wide ? 'records-dialog' : 'details-dialog'"
    :aria-label="title"
    @close="emit('update:open', false)"
    @cancel="emit('update:open', false)"
    @click="outside"
  >
    <div :class="wide ? 'records-heading' : 'dialog-heading'">
      <h2>{{ title }}</h2>
      <button
        class="icon-button"
        :aria-label="`关闭${title}`"
        @click="emit('update:open', false)"
      >
        <Icon name="x" />
      </button>
    </div>
    <slot />
  </dialog>
</template>
