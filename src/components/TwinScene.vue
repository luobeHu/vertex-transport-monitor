<script setup>
import {
  computed,
  onMounted,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from "vue";
import { createTwin } from "../core/twin.js";
import {
  DEMO_DEVICE_ID,
  sampleElevatorDemo,
  DOOR_STATE,
} from "../core/simulation.js";
import CabinAnnotations from "./CabinAnnotations.vue";
import DiagramHud from "./DiagramHud.vue";
import Icon from "./Icon.vue";
const props = defineProps({
  device: Object,
  demo: { type: Boolean, default: true },
  initialView: { type: String, default: "cabin" },
  pending: Number,
  completed: Number,
});
const emit = defineEmits([
  "simulation",
  "scene-change",
  "view-change",
  "select-floor",
  "payload-select",
  "details",
  "records",
]);
const canvas = ref(),
  container = ref();
const projected = shallowRef({}),
  size = ref({ width: 1000, height: 640 });
const live = shallowRef(
  sampleElevatorDemo(
    0,
    typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  ),
);
const scene = shallowRef({
  view: "cabin",
  transitioning: false,
  automatic: false,
});
const preferred = ref(props.initialView !== "shaft"),
  expanded = ref(false);
const isDemo = computed(
  () => props.demo && props.device?.id === DEMO_DEVICE_ID,
);
const current = computed(() =>
  isDemo.value ? { ...props.device, ...live.value } : props.device,
);
const focusLabel = computed(() =>
  isDemo.value
    ? preferred.value
      ? "锁定井道全景"
      : "恢复自动视角"
    : preferred.value
      ? "返回设备全景"
      : "查看轿厢近景",
);
const cameraLabel = computed(() =>
  scene.value.automatic
    ? `自动视角 · ${scene.value.transitioning ? "镜头切换" : scene.value.view === "shaft" ? "运行全景" : "到站近景"}`
    : "循环运行演示",
);
let twin,
  observer,
  signature = "";
function create() {
  twin?.dispose();
  canvas.value.replaceChildren();
  twin = createTwin(
    canvas.value,
    (f) => emit("select-floor", f),
    (pose) => {
      live.value = pose;
      emit("simulation", pose);
    },
    {
      demoEnabled: props.demo,
      onProject: (p) => {
        projected.value = p;
      },
      onSelect: (item) => emit("payload-select", item.kind),
      onViewChange: (focused, meta) => {
        preferred.value = focused;
        emit("view-change", focused ? "cabin" : "shaft", meta);
      },
      onSceneChange: (state) => {
        scene.value = state;
        emit("scene-change", state);
      },
    },
  );
  if (props.device) {
    twin.update(props.device);
    const pose = twin.getDemoState();
    if (pose) {
      live.value = pose;
      emit("simulation", pose);
    }
    if (preferred.value) twin.toggleCabinView();
  }
}
function fingerprint() {
  return JSON.stringify([
    props.device?.id,
    props.device?.cabin,
    props.device?.floors,
    props.device?.state,
    props.device?.online,
    props.demo,
  ]);
}
onMounted(() => {
  // Three owns only its canvas; Vue owns all controls and labels.
  signature = fingerprint();
  const startPreferred = preferred.value;
  create();
  if (startPreferred && !preferred.value) twin.toggleCabinView();
  observer = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    size.value = { width, height };
    twin?.projectPayload();
  });
  observer.observe(container.value);
});
watch(
  () => props.device,
  () => {
    if (!twin) return;
    const next = fingerprint();
    if (next !== signature) {
      signature = next;
      const focus = preferred.value;
      create();
      if (focus && !preferred.value) twin.toggleCabinView();
    } else if (props.device) twin.update(props.device);
  },
  { deep: true },
);
watch(
  () => props.demo,
  () => {
    if (twin) {
      signature = fingerprint();
      const focus = preferred.value;
      create();
      if (focus && !preferred.value) twin.toggleCabinView();
    }
  },
);
onBeforeUnmount(() => {
  observer?.disconnect();
  twin?.dispose();
});
defineExpose({
  toggleDemo: () => twin?.toggleDemo(),
  restartDemo: () => twin?.restartDemo(),
  seekDemoStage: (i) => twin?.seekDemoStage(i),
  getDemoState: () => twin?.getDemoState(),
});
</script>
<template>
  <div
    ref="container"
    class="twin-main"
    :class="{
      'is-simulating': isDemo,
      'is-cabin-view': scene.view === 'cabin',
    }"
    :data-camera-view="scene.view"
    :style="expanded ? { minHeight: 'max(900px,85vh)' } : undefined"
  >
    <DiagramHud
      v-if="current"
      :device="current"
      :is-demo="isDemo"
      :pending="pending"
      :completed="completed"
      @details="emit('details')"
      @records="emit('records', $event)"
      @stage="twin?.seekDemoStage($event)"
    />
    <div class="twin-heading">
      <span class="small-eyebrow"
        >数字孪生视图
        <span v-if="isDemo" class="simulation-badge">{{
          cameraLabel
        }}</span></span
      ><button
        class="icon-button"
        :aria-label="expanded ? '收起三维视图' : '放大三维视图'"
        @click="expanded = !expanded"
      >
        <Icon :name="expanded ? 'minimize-2' : 'maximize-2'" />
      </button>
    </div>
    <div v-if="device" class="scene-label">
      <span class="scene-device-id">{{ device.id }}</span
      ><span class="scene-building"
        >{{ device.name }} · {{ device.floors }} 层结构</span
      >
    </div>
    <div
      ref="canvas"
      class="twin-canvas"
      data-twin-canvas
      :style="{ visibility: device ? 'visible' : 'hidden' }"
      :data-simulation-phase="isDemo ? live.phase : undefined"
      :data-position-floor="isDemo ? live.positionFloor.toFixed(4) : undefined"
      :data-door-open-fraction="
        isDemo ? live.doorOpenFraction.toFixed(4) : undefined
      "
      :data-demo-paused="isDemo ? String(live.paused) : undefined"
    />
    <div v-if="!device" class="scene-empty">暂无符合条件的设备</div>
    <CabinAnnotations
      v-if="current?.cabin"
      :device="current"
      :points="projected"
      v-bind="size"
      @select="emit('payload-select', $event)"
    />
    <div class="view-toolbar">
      <button
        class="icon-button focus-cabin"
        :aria-label="focusLabel"
        :title="focusLabel"
        :aria-pressed="preferred"
        @click="twin?.toggleCabinView()"
      >
        <Icon name="container" /></button
      ><button class="icon-button" aria-label="放大模型" @click="twin?.zoom(1)">
        <Icon name="plus" /></button
      ><button
        class="icon-button"
        aria-label="缩小模型"
        @click="twin?.zoom(-1)"
      >
        <Icon name="minus" /></button
      ><span /><button
        class="icon-button"
        aria-label="重置视角"
        @click="twin?.reset()"
      >
        <Icon name="rotate-ccw" /></button
      ><button class="icon-button" aria-label="正面视角" @click="twin?.front()">
        <Icon name="panels-top-left" />
      </button>
    </div>
    <div v-if="isDemo" class="simulation-controls">
      <span
        >{{ live.paused ? "演示暂停" : live.phaseLabel }} ·
        {{ DOOR_STATE[live.doorStatus] }}</span
      ><button
        :aria-label="live.paused ? '继续演示' : '暂停演示'"
        @click="twin?.toggleDemo()"
      >
        <Icon :name="live.paused ? 'play' : 'circle-pause'" /><span>{{
          live.paused ? "继续" : "暂停"
        }}</span></button
      ><button aria-label="重播运行演示" @click="twin?.restartDemo()">
        <Icon name="rotate-ccw" />
      </button>
    </div>
    <div class="scene-bottom">
      <span>拖动旋转 · 点击楼层查看任务</span><span>示意模型</span>
    </div>
  </div>
</template>
