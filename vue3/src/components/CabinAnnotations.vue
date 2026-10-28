<script setup>
import { computed } from "vue";
import { summarizeCabin, summarizeOnboard } from "../core/cabin-data.js";
import Icon from "./Icon.vue";
const props = defineProps({
  device: Object,
  points: Object,
  width: Number,
  height: Number,
});
const emit = defineEmits(["select"]);
const stored = computed(() => summarizeCabin(props.device.cabin));
const load = computed(() =>
  summarizeOnboard(
    props.device.cabin,
    props.device.simulation ? props.device : null,
  ),
);
const mobile = computed(() => props.width < 400);
const positions = computed(() => {
  const w = props.width,
    h = props.height,
    p = props.points;
  if (mobile.value)
    return {
      floorCodes: { x: 12, y: h - 225, w: (w - 32) / 3 },
      cargo: { x: 16 + (w - 32) / 3, y: h - 225, w: (w - 32) / 3 },
      agv: { x: 20 + (2 * (w - 32)) / 3, y: h - 225, w: (w - 32) / 3 },
    };
  return {
    floorCodes: {
      x: 18,
      y: Math.max(172, Math.min(h - 250, (p.floorCodes?.y || 200) + 18)),
      w: w < 550 ? 135 : 154,
    },
    cargo: {
      x: w - (w < 550 ? 153 : 178),
      y: Math.max(172, Math.min(h - 290, (p.cargo?.y || 250) - 68)),
      w: w < 550 ? 135 : 160,
    },
    agv: {
      x: w - (w < 550 ? 153 : 178),
      y: Math.max(265, Math.min(h - 190, (p.agv?.y || 310) + 30)),
      w: w < 550 ? 135 : 160,
    },
  };
});
const kinds = computed(() =>
  props.device.cabin.agv
    ? ["floorCodes", "cargo", "agv"]
    : ["floorCodes", "cargo"],
);
const style = (kind) => ({
  width: `${positions.value[kind].w}px`,
  transform: `translate(${positions.value[kind].x}px,${positions.value[kind].y}px)`,
});
function leader(kind) {
  const pos = positions.value[kind],
    p = props.points[kind];
  if (!p) return "";
  const x = kind === "floorCodes" ? pos.x + pos.w : pos.x,
    y = pos.y + 32;
  return `${x},${y} ${x + (kind === "floorCodes" ? 14 : -14)},${y} ${p.x},${p.y}`;
}
const cargoTitle = computed(() =>
  !stored.value.observed
    ? "载荷状态未知"
    : props.device.simulation
      ? load.value.occupancy === "loaded"
        ? `载货 · ${load.value.totalKg} kg`
        : load.value.occupancy === "empty"
          ? "空载 · 0 kg"
          : props.device.loadLabel
      : stored.value.pallets
        ? `${stored.value.pallets} 托 · ${stored.value.cartons} 箱 · ${stored.value.cargoKg} kg`
        : stored.value.hasAgv
          ? `仅 AGV · ${stored.value.agvKg} kg`
          : "当前空载",
);
const cargoNote = computed(() =>
  !stored.value.observed
    ? "设备离线，等待更新"
    : props.device.simulation && load.value.occupancy === "empty"
      ? `AGV / 货物在 ${props.device.payloadFloor} F 站台`
      : props.device.simulation && load.value.weightKg === null
        ? "跨门区中 · 载荷待确认"
        : `${stored.value.pallets} 托 · ${stored.value.cartons} 箱 · 货物 ${stored.value.cargoKg} kg`,
);
</script>
<template>
  <div
    class="cabin-overlay"
    :class="{ 'compact-cabin-labels': mobile }"
    aria-label="轿厢内地码、货物与 AGV 标注"
    :data-occupancy="load.occupancy"
  >
    <div class="shaft-floor-markers" aria-label="井道楼层">
      <span
        v-for="p in points.floors || []"
        :key="p.floor"
        :class="{ active: device.floor === p.floor }"
        :style="{ transform: `translate(${p.x - 36}px,${p.y - 9}px)` }"
        >{{ String(p.floor).padStart(2, "0") }} F</span
      >
    </div>
    <div
      v-if="points.car"
      class="shaft-car-label"
      :style="{
        transform: `translate(${points.car.x + 8}px,${points.car.y - 15}px)`,
      }"
    >
      <strong>{{ device.id }}</strong
      ><small>{{
        device.moving
          ? `${device.direction === "up" ? "↑" : "↓"} ${device.floor} F → ${device.target} F`
          : `停靠 ${device.floor} F`
      }}</small>
    </div>
    <svg class="cabin-leaders" aria-hidden="true">
      <template v-for="kind in kinds" :key="kind">
        <polyline
          v-if="points[kind]?.visible !== false"
          :data-leader="kind"
          :points="leader(kind)"
        />
        <circle
          v-if="points[kind]?.visible !== false"
          :data-point="kind"
          :cx="points[kind]?.x"
          :cy="points[kind]?.y"
          r="3"
        />
      </template>
    </svg>
    <button
      class="cabin-callout marker-callout"
      :style="style('floorCodes')"
      aria-label="查看轿厢地码"
      @click="emit('select', 'floorCodes')"
    >
      <span
        ><Icon name="scan-line" />轿厢地码 <b>{{ stored.floorCodes }}</b></span
      ><strong>{{ device.cabin.floorCodes[0]?.id }}</strong
      ><small>{{
        !stored.observed
          ? "离线 · 识读状态未知"
          : device.simulation
            ? device.agvOnboard
              ? "C02 地码已占用"
              : "轿厢定位点空闲"
            : "固定定位点 · 点击查看"
      }}</small>
    </button>
    <button
      class="cabin-callout cargo-callout"
      :style="style('cargo')"
      aria-label="查看轿厢货物"
      @click="emit('select', 'cargo')"
    >
      <span
        ><Icon name="package" />{{
          device.simulation ? "轿厢载荷" : "货物信息"
        }}</span
      ><strong>{{ cargoTitle }}</strong
      ><small>{{ cargoNote }}</small
      ><small v-if="stored.pallets" class="payload-code">{{
        device.cabin.cargo.map((c) => c.id).join(" / ")
      }}</small>
    </button>
    <button
      v-if="device.cabin.agv"
      class="cabin-callout agv-callout"
      :style="style('agv')"
      aria-label="查看随梯 AGV"
      @click="emit('select', 'agv')"
    >
      <span
        ><Icon name="bot" />{{
          device.simulation && !device.agvOnboard ? "AGV 位置" : "随梯 AGV"
        }}</span
      ><strong
        >{{ device.cabin.agv.id
        }}<em>{{
          device.simulation
            ? device.agvStatus
            : device.state === "running"
              ? "随梯中"
              : "随梯停靠"
        }}</em></strong
      ><small
        >{{
          device.simulation && !device.agvOnboard
            ? `${device.payloadFloor} F 站台 · `
            : ""
        }}电量 {{ device.cabin.agv.batteryPct }}%{{
          !device.simulation || device.agvOnboard ? " · C02 定位点" : ""
        }}</small
      >
    </button>
  </div>
</template>
