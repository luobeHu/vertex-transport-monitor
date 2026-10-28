<script setup>
import {
  computed,
  onMounted,
  onBeforeUnmount,
  ref,
  shallowRef,
  useId,
  watch,
} from "vue";
import "@fontsource-variable/dm-sans/standard.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "../styles/monitor.css";
import {
  devices as demoDevices,
  tasks as demoTasks,
  TYPES,
  STATE,
  SNAPSHOT,
} from "../core/data.js";
import { DEMO_DEVICE_ID } from "../core/simulation.js";
import { useMonitor } from "../composables/useMonitor.js";
import { detailQuery } from "../core/navigation.js";
import TwinScene from "./TwinScene.vue";
import Icon from "./Icon.vue";
import StatusChip from "./StatusChip.vue";
import MonitorDialog from "./MonitorDialog.vue";
import TaskRecords from "./TaskRecords.vue";
import DetailsDialog from "./DetailsDialog.vue";
const props = defineProps({
  devices: { type: Array, default: () => demoDevices },
  tasks: { type: Array, default: () => demoTasks },
  demo: { type: Boolean, default: true },
  embedded: Boolean,
  snapshotAt: { type: String, default: SNAPSHOT },
  initialDevice: { type: String, default: "" },
  initialType: { type: String, default: "elevator" },
  initialStatus: { type: String, default: "pending" },
  initialView: { type: String, default: "cabin" },
  syncUrl: Boolean,
  exposeAgentApi: Boolean,
});
const emit = defineEmits([
  "selection-change",
  "simulation-change",
  "ready",
  "refresh",
]);
const params = new URLSearchParams(
  props.syncUrl && typeof window !== "undefined" ? window.location.search : "",
);
const type = TYPES.some(
  (t) => t.id === (params.get("type") || props.initialType),
)
  ? params.get("type") || props.initialType
  : "elevator";
const initialView =
  params.get("view") === "shaft" ? "shaft" : props.initialView;
const monitor = useMonitor({
  get devices() {
    return props.devices;
  },
  get tasks() {
    return props.tasks;
  },
  get demo() {
    return props.demo;
  },
  initialDevice: props.initialDevice || params.get("device"),
  initialType: type,
  initialStatus:
    (params.get("status") || props.initialStatus) === "completed"
      ? "completed"
      : "pending",
});
const {
  state,
  simulation,
  current,
  selected,
  visibleDevices,
  scopeDevices,
  pending,
  completed,
  scopeSummary,
} = monitor;
const mainId = useId(),
  twin = ref(),
  view = ref(initialView);
const embedded = computed(() => props.embedded || params.get("embed") === "1");
const filtersOpen = ref(false),
  overviewOpen = ref(false),
  recordsOpen = ref(false),
  detailsOpen = ref(false),
  recordFloor = ref("all");
const detail = shallowRef(null),
  message = ref("");
let toastTimer;
const buildings = computed(() => [
  ...new Set(props.devices.map((d) => d.building)),
]);
const clone = (value) => JSON.parse(JSON.stringify(value));
const selection = () => ({
  type: state.type,
  device: state.device,
  status: state.status,
  view: view.value,
});
function notify(text) {
  message.value = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    message.value = "";
  }, 3000);
}
function liveDevice(d) {
  return props.demo && d.id === DEMO_DEVICE_ID
    ? { ...d, ...simulation.value }
    : d;
}
function status(d) {
  const live = liveDevice(d);
  return live.simulation
    ? {
        label: live.paused ? "演示暂停" : live.moving ? "运行中" : "停靠中",
        tone: live.paused ? "gray" : live.moving ? "green" : "blue",
      }
    : STATE[d.state];
}
function deviceCount(id, status) {
  return props.tasks.filter(
    (t) =>
      t.deviceId === id &&
      (status === "completed"
        ? t.status === "completed"
        : t.status !== "completed"),
  ).length;
}
function chooseDevice(id) {
  recordsOpen.value = detailsOpen.value = overviewOpen.value = false;
  return clone(monitor.selectDevice(id));
}
function chooseType(type) {
  recordsOpen.value = detailsOpen.value = false;
  monitor.selectType(type);
}
function showRecords(status = state.status, floor = "all") {
  if (!current.value) return notify("请先选择设备");
  monitor.setStatus(status);
  recordFloor.value = floor;
  recordsOpen.value = true;
}
function syncDetailUrl(kind, commandId) {
  if (!props.syncUrl || typeof window === "undefined") return;
  const query = detailQuery(location.search, kind, commandId);
  history.replaceState(
    null,
    "",
    `${location.pathname}?${query}${location.hash}`,
  );
}
watch(detailsOpen, (open) => {
  if (!open) syncDetailUrl(null);
});
function showDetail(kind, extra = {}) {
  if (!current.value && !["help", "agent"].includes(kind))
    throw new Error("请先选择设备");
  detail.value = {
    kind,
    device: current.value ? clone(current.value) : null,
    ...extra,
  };
  detailsOpen.value = true;
  syncDetailUrl(kind, extra.command?.id);
}
function openCommand(id, fromRecords = false) {
  const command = props.tasks.find((t) => t.id === id);
  if (!command) throw new Error(`指令不存在：${id}`);
  if (!fromRecords) {
    chooseDevice(command.deviceId);
    monitor.setStatus(command.status === "completed" ? "completed" : "pending");
  }
  showDetail("command", { command: clone(command) });
  return clone(command);
}
function openCabinInfo(kind) {
  if (!["floorCodes", "cargo", "agv"].includes(kind))
    throw new Error("无效的轿厢信息类型");
  showDetail(kind);
  return clone(current.value.cabin);
}
function onSimulation(pose) {
  simulation.value = pose;
  emit("simulation-change", clone(pose));
}
const api = Object.freeze({
  version: "1.0.0-vue3",
  getSnapshot: () => ({
    demo: props.demo,
    snapshotAt: props.snapshotAt,
    selection: selection(),
    devices: clone(props.devices),
    tasks: clone(props.tasks),
    simulation:
      props.demo && state.device === DEMO_DEVICE_ID
        ? twin.value?.getDemoState() || clone(simulation.value)
        : null,
  }),
  selectDevice: chooseDevice,
  setStatus: monitor.setStatus,
  openCommand,
  openCabinInfo,
});
defineExpose(api);
watch(
  () => [state.type, state.device, state.status, view.value],
  () => {
    const value = selection();
    emit("selection-change", value);
    if (props.syncUrl && typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      p.set("type", state.type);
      state.device ? p.set("device", state.device) : p.delete("device");
      p.set("status", state.status);
      p.set("view", view.value);
      history.replaceState(
        null,
        "",
        `${location.pathname}?${p}${location.hash}`,
      );
      window.dispatchEvent(
        new CustomEvent("transport:selection", { detail: value }),
      );
    }
  },
);
let previousApi;
function parentMessage(event) {
  if (event.source !== window.parent || window.parent === window) return;
  const msg = event.data;
  if (
    !msg ||
    msg.channel !== "vertex-monitor" ||
    typeof msg.requestId !== "string"
  )
    return;
  const actions = {
    getSnapshot: () => api.getSnapshot(),
    selectDevice: () => api.selectDevice(msg.deviceId),
    setStatus: () => api.setStatus(msg.status),
    openCommand: () => api.openCommand(msg.commandId),
    openCabinInfo: () => api.openCabinInfo(msg.kind),
  };
  if (!Object.hasOwn(actions, msg.action)) return;
  try {
    event.source.postMessage(
      {
        channel: "vertex-monitor",
        requestId: msg.requestId,
        ok: true,
        data: actions[msg.action](),
      },
      event.origin,
    );
  } catch (error) {
    event.source.postMessage(
      {
        channel: "vertex-monitor",
        requestId: msg.requestId,
        ok: false,
        error: error.message,
      },
      event.origin,
    );
  }
}
onMounted(() => {
  if (props.exposeAgentApi) {
    previousApi = window.TransportMonitor;
    window.TransportMonitor = api;
    window.addEventListener("message", parentMessage);
  }
  emit("ready", api);
  try {
    if (params.get("command")) openCommand(params.get("command"));
    else if (params.get("cabin")) openCabinInfo(params.get("cabin"));
  } catch (error) {
    notify(error.message);
  }
});
onBeforeUnmount(() => {
  clearTimeout(toastTimer);
  window.removeEventListener("message", parentMessage);
  if (window.TransportMonitor === api) {
    if (previousApi === undefined) delete window.TransportMonitor;
    else window.TransportMonitor = previousApi;
  }
});
</script>
<template>
  <div class="vertex-monitor" :class="{ embedded }">
    <a class="skip-link" :href="`#${mainId}`">跳至监控内容</a>
    <header class="compact-header">
      <a class="compact-brand" href="?" aria-label="VERTEX 首页"
        ><svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M6 7h7l5 12 5-12h5L18 28h-4L6 7Z" fill="currentColor" />
          <path d="m4 7 9 21h-3L1 7h3Z" fill="currentColor" opacity=".4" /></svg
        ><span>VERTEX<small>VERTICAL SYSTEMS</small></span></a
      >
      <div>
        <span class="demo-pill"
          ><span />{{ demo ? "模拟演示" : "设备监控" }} · Vue 3</span
        ><button
          class="icon-button"
          aria-label="Agent 接入说明"
          @click="showDetail('agent')"
        >
          <Icon name="code-2" /></button
        ><button
          class="icon-button"
          aria-label="使用说明"
          @click="showDetail('help')"
        >
          <Icon name="circle-help" />
        </button>
      </div>
    </header>
    <main :id="mainId" class="compact-main">
      <div class="compact-titlebar">
        <div>
          <div class="premium-eyebrow">
            <span />OPERATIONS / VERTICAL TRANSPORT
          </div>
          <h1>垂直运输监控</h1>
          <p>设备全景与任务追踪</p>
        </div>
        <button
          class="button"
          @click="
            emit('refresh');
            notify(
              demo
                ? `已重新读取演示数据 · ${snapshotAt}`
                : '已请求刷新设备数据',
            );
          "
        >
          <Icon name="refresh-cw" /><span>刷新</span>
        </button>
      </div>
      <div class="compact-typebar">
        <div class="type-tabs" role="tablist" aria-label="设备类型">
          <button
            v-for="t in TYPES"
            :key="t.id"
            role="tab"
            :class="{ active: state.type === t.id }"
            :aria-selected="state.type === t.id"
            @click="chooseType(t.id)"
          >
            {{ t.name }}
          </button>
        </div>
        <button
          class="overview-button"
          aria-label="查看设备汇总统计"
          @click="overviewOpen = true"
        >
          <span class="overview-summary"
            ><span
              >{{ scopeSummary.online }}/{{ scopeSummary.total }} 设备在线</span
            ><span v-if="scopeSummary.alarms" class="overview-alert"
              >{{ scopeSummary.alarms }} 台告警</span
            ></span
          ><Icon name="chevron-right" />
        </button>
      </div>
      <div class="compact-workspace">
        <section class="panel twin-panel" aria-label="设备数字孪生与状态">
          <section
            class="compact-device-section equipment-rail"
            aria-label="选择设备"
          >
            <div class="compact-section-heading">
              <h2>
                选择设备 <span class="count">{{ visibleDevices.length }}</span>
              </h2>
              <button
                class="text-button"
                aria-label="筛选设备"
                @click="filtersOpen = true"
              >
                <Icon name="sliders-horizontal" />
              </button>
            </div>
            <div class="compact-device-list">
              <button
                v-for="d in visibleDevices"
                :key="d.id"
                class="compact-device"
                :class="{ selected: state.device === d.id }"
                :aria-pressed="state.device === d.id"
                @click="chooseDevice(d.id)"
              >
                <span class="compact-device-title"
                  ><span class="equipment-id">{{ d.id }}</span
                  ><StatusChip v-bind="status(d)" /></span
                ><span class="compact-device-meta"
                  >{{ d.name
                  }}<span
                    >{{ String(liveDevice(d).floor).padStart(2, "0") }} F</span
                  ></span
                >
              </button>
              <div v-if="!visibleDevices.length" class="compact-empty">
                <Icon name="search" /><span>没有匹配的设备</span
                ><button class="text-button" @click="monitor.clearFilters()">
                  重置筛选
                </button>
              </div>
            </div>
          </section>
          <TwinScene
            ref="twin"
            :device="selected"
            :demo="demo"
            :initial-view="initialView"
            :pending="pending.length"
            :completed="completed.length"
            @simulation="onSimulation"
            @view-change="view = $event"
            @details="showDetail('device')"
            @payload-select="openCabinInfo"
            @records="showRecords($event)"
            @select-floor="showRecords(state.status, $event)"
          />
        </section>
      </div>
      <footer class="compact-footer">
        <span>任务快照 · {{ snapshotAt.replaceAll("-", ".") }}</span
        ><span>点击状态与任务，查看详细信息</span>
      </footer>
    </main>
    <MonitorDialog v-model:open="filtersOpen" title="筛选设备"
      ><label class="filter-field"
        ><span>所属建筑</span
        ><select v-model="state.building" aria-label="选择建筑">
          <option value="all">全部建筑</option>
          <option v-for="name in buildings" :key="name">{{ name }}</option>
        </select></label
      ><label class="filter-field"
        ><span>设备名称 / 编号</span
        ><input
          v-model="state.query"
          aria-label="搜索设备编号或名称"
          placeholder="输入设备名称或编号"
      /></label>
      <div class="device-filter">
        <button
          v-for="[key, label] in [
            ['all', '全部设备'],
            ['running', '运行中'],
            ['alarm', '告警'],
          ]"
          :key="key"
          class="filter-chip"
          :class="{ active: state.deviceState === key }"
          :aria-pressed="state.deviceState === key"
          @click="state.deviceState = key"
        >
          {{ label }}
        </button>
      </div>
      <p class="filter-results">匹配 {{ visibleDevices.length }} 台设备</p>
      <div class="dialog-footer">
        <button class="text-button" @click="monitor.clearFilters()">
          重置筛选</button
        ><button class="button primary" @click="filtersOpen = false">
          查看设备
        </button>
      </div></MonitorDialog
    >
    <MonitorDialog v-model:open="overviewOpen" title="设备汇总"
      ><p class="overview-scope">
        {{ TYPES.find((t) => t.id === state.type)?.name }} ·
        {{ state.building === "all" ? "全部建筑" : state.building }}
      </p>
      <div class="overview-totals">
        <div>
          <span>设备在线</span
          ><strong
            >{{ scopeSummary.online
            }}<small> / {{ scopeSummary.total }}</small></strong
          >
        </div>
        <div>
          <span>未完成</span
          ><strong>{{ scopeSummary.pending }}<small> 条</small></strong>
        </div>
        <div>
          <span>已完成</span
          ><strong>{{ scopeSummary.completed }}<small> 条</small></strong>
        </div>
      </div>
      <div class="overview-device-list">
        <button
          v-for="d in scopeDevices"
          :key="d.id"
          @click="chooseDevice(d.id)"
        >
          <span
            ><strong>{{ d.name }}</strong
            ><small
              >{{ d.id }} · {{ d.building }} · {{ d.floor }} F</small
            ></span
          ><span
            ><StatusChip v-bind="status(d)" /><small
              >未完成 {{ deviceCount(d.id, "pending") }} · 已完成
              {{ deviceCount(d.id, "completed") }}</small
            ></span
          ><Icon name="chevron-right" />
        </button></div
    ></MonitorDialog>
    <TaskRecords
      v-model:open="recordsOpen"
      :device="selected"
      :tasks="tasks"
      :status="state.status"
      :initial-floor="recordFloor"
      @update:status="monitor.setStatus"
      @command="openCommand($event, true)"
    />
    <DetailsDialog v-model:open="detailsOpen" :detail="detail" />
    <div
      class="toast"
      :class="{ visible: message }"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </div>
  </div>
</template>
