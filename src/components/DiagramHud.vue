<script setup>
import { computed } from "vue";
import { STATE } from "../core/data.js";
import { DOOR_STATE } from "../core/simulation.js";
import { summarizeOnboard } from "../core/cabin-data.js";
import Icon from "./Icon.vue";
import StatusChip from "./StatusChip.vue";
const props = defineProps({
  device: { type: Object, required: true },
  pending: Number,
  completed: Number,
  isDemo: Boolean,
});
const emit = defineEmits(["details", "stage", "records"]);
const load = computed(() =>
  summarizeOnboard(props.device.cabin, props.isDemo ? props.device : null),
);
const status = computed(() =>
  props.isDemo
    ? {
        label: props.device.paused
          ? "演示暂停"
          : props.device.moving
            ? "运行中"
            : "停靠中",
        tone: props.device.paused
          ? "gray"
          : props.device.moving
            ? "green"
            : "blue",
      }
    : STATE[props.device.state],
);
const direction = computed(() =>
  props.isDemo
    ? props.device.paused
      ? "演示暂停"
      : props.device.moving
        ? `${props.device.direction === "up" ? "上行" : "下行"} → ${props.device.target} F`
        : `停靠 ${props.device.floor} F`
    : props.device.state === "running"
      ? `前往 ${props.device.target} F`
      : "当前停靠",
);
const loadLabel = computed(() =>
  props.isDemo
    ? props.device.loadLabel
    : { empty: "电梯空载", loaded: "载货 / AGV 随梯", unknown: "载荷未知" }[
        load.value.occupancy
      ] || "载荷交接中",
);
</script>
<template>
  <div class="diagram-hud">
    <div class="diagram-key-state">
      <div>
        <span>{{
          device.moving
            ? "经过楼层"
            : `所在楼层${device.online ? "" : " · 最后记录"}`
        }}</span
        ><strong
          >{{ String(device.floor).padStart(2, "0") }}<small> F</small></strong
        >
      </div>
      <div class="diagram-status">
        <span class="door-state">{{ DOOR_STATE[device.doorStatus] }}</span
        ><span class="compact-direction"
          ><Icon
            v-if="device.moving && !device.paused"
            name="arrow-up"
            :style="{
              transform:
                device.direction === 'down' ? 'rotate(180deg)' : undefined,
            }"
          />{{ direction }}</span
        ><button @click="emit('details')">
          <StatusChip v-bind="status" /><small
            >{{ device.mode }} ·
            {{ device.alarm ? "1 项告警" : "无告警" }}</small
          >
        </button>
      </div>
    </div>
    <nav v-if="isDemo" class="diagram-process" aria-label="演示流程定位">
      <button
        v-for="(label, i) in ['载货进梯', '载货上行', '载货出梯', '空载返程']"
        :key="label"
        :class="{ active: device.journeyStage === i }"
        :aria-label="`演示定位：${label}`"
        :aria-current="device.journeyStage === i ? 'step' : undefined"
        @click="emit('stage', i)"
      >
        <b>{{ String(i + 1).padStart(2, "0") }}</b
        ><span>{{ label }}</span>
      </button>
    </nav>
    <div class="diagram-load" :data-occupancy="load.occupancy">
      <span data-diagram-load
        >{{ loadLabel }} · {{ load.weightKg ?? "—" }} kg</span
      ><small>{{
        load.occupancy === "empty"
          ? "轿厢内无 AGV、无货物"
          : load.occupancy === "loaded"
            ? `${load.pallets} 托 / ${load.cartons} 箱 · 含 AGV 自重`
            : load.occupancy === "unknown"
              ? "设备离线，等待更新"
              : "AGV 正在跨越门区"
      }}</small>
    </div>
    <div class="diagram-phase">
      <span data-demo-phase>{{
        isDemo
          ? `${device.phaseLabel}${device.paused ? " · 已暂停" : ""}`
          : "静态数据快照"
      }}</span
      ><small>{{
        isDemo ? "循环演示 · 可点击上方步骤定位" : "点击图内标注查看详情"
      }}</small>
    </div>
    <button
      class="diagram-device-details"
      aria-label="查看设备详情"
      title="设备参数"
      @click="emit('details')"
    >
      <Icon name="more-horizontal" />
    </button>
    <div class="diagram-dimensions">
      示意比例：轿厢 2.4 × 2.4 × 2.4 m · AGV 0.9 × 1.2 × 0.3 m
    </div>
    <div class="diagram-task-actions">
      <button @click="emit('records', 'pending')">
        未完成 <b>{{ pending }}</b
        ><Icon name="chevron-right" /></button
      ><button @click="emit('records', 'completed')">
        已完成 <b>{{ completed }}</b
        ><Icon name="chevron-right" />
      </button>
    </div>
  </div>
</template>
