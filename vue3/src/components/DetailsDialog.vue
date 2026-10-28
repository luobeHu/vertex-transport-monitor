<script setup>
import { computed } from "vue";
import { STATE, TASK_STATE, TYPES } from "../core/data.js";
import { DOOR_STATE } from "../core/simulation.js";
import { summarizeCabin, summarizeOnboard } from "../core/cabin-data.js";
import { makeMarkerCanvas } from "../core/marker-texture.js";
import MonitorDialog from "./MonitorDialog.vue";
import StatusChip from "./StatusChip.vue";
import Icon from "./Icon.vue";
const props = defineProps({ open: Boolean, detail: Object });
const emit = defineEmits(["update:open"]);
const kind = computed(() => props.detail?.kind),
  device = computed(() => props.detail?.device),
  command = computed(() => props.detail?.command);
const title = computed(
  () =>
    ({
      command: "任务指令详情",
      device: "设备详情",
      floorCodes: "轿厢地码",
      cargo: "轿厢货物",
      agv: "随梯 AGV",
      help: "使用说明",
      agent: "Agent 接入说明",
    })[kind.value] || "详情",
);
const stored = computed(() =>
  device.value?.cabin ? summarizeCabin(device.value.cabin) : null,
);
const load = computed(() =>
  device.value?.cabin
    ? summarizeOnboard(
        device.value.cabin,
        device.value.simulation ? device.value : null,
      )
    : null,
);
const agv = computed(() => device.value?.cabin?.agv);
const location = computed(() =>
  device.value?.simulation && !device.value.agvOnboard
    ? `${device.value.payloadFloor} F ${["boarding", "alighting"].includes(device.value.occupancy) ? "门区" : "站台"}`
    : `${device.value?.floor} F 轿厢内`,
);
const deviceStatus = computed(() =>
  device.value?.simulation
    ? {
        label: device.value.paused
          ? "演示暂停"
          : device.value.moving
            ? "运行中"
            : "停靠中",
        tone: device.value.paused
          ? "gray"
          : device.value.moving
            ? "green"
            : "blue",
      }
    : STATE[device.value?.state],
);
const deviceFields = computed(() =>
  device.value
    ? [
        ["所属位置", `${device.value.building} · ${device.value.location}`],
        ["设备类型", TYPES.find((t) => t.id === device.value.type)?.name],
        ["门状态", DOOR_STATE[device.value.doorStatus]],
        ["设备模式", device.value.mode],
        [
          "所在楼层 / 总楼层",
          `${device.value.floor} F / ${device.value.floors} F`,
        ],
        ["运行速度", `${device.value.speed.toFixed(1)} m/s`],
        ["额定载重", device.value.capacity],
        ["通信状态", device.value.online ? "设备在线" : "设备离线"],
      ]
    : [],
);
const markerImages = computed(() =>
  kind.value === "floorCodes"
    ? device.value.cabin.floorCodes.map((code) => ({
        ...code,
        image: makeMarkerCanvas(code.id).toDataURL(),
      }))
    : [],
);
</script>
<template>
  <MonitorDialog
    :open="open"
    :title="title"
    @update:open="emit('update:open', $event)"
  >
    <template v-if="device"
      ><p class="cabin-detail-subtitle">
        {{ device.name }} · {{ device.id }} · {{ device.building }} · 打开时状态
      </p></template
    >
    <template v-if="kind === 'command' && command"
      ><div class="dialog-command">
        <span class="mono">{{ command.id }}</span
        ><StatusChip v-bind="TASK_STATE[command.status]" />
      </div>
      <div class="dialog-route">
        <div>
          <span>起始楼层</span
          ><strong
            >{{ String(command.origin).padStart(2, "0")
            }}<small>F</small></strong
          >
        </div>
        <div class="route-track">
          <Icon name="arrow-right" /><span>{{ command.kind }}</span>
        </div>
        <div>
          <span>目标楼层</span
          ><strong
            >{{ String(command.destination).padStart(2, "0")
            }}<small>F</small></strong
          >
        </div>
      </div>
      <dl class="detail-grid">
        <div
          v-for="[label, value] in [
            ['执行设备', device.name + ' / ' + device.id],
            ['所属位置', device.building + ' · ' + device.location],
            ['指令来源', command.source],
            ['任务优先级', command.priority === 'high' ? '高优先级' : '普通'],
            ['下发时间', command.created],
            ['累计耗时', command.duration],
          ]"
          :key="label"
        >
          <dt>{{ label }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
      <h3 class="timeline-title">执行进度</h3>
      <ol class="timeline">
        <li class="done">
          <span><Icon name="check" /></span>
          <div>
            <strong>指令已下发</strong><small>调度中心已创建任务</small>
          </div>
          <time>{{ command.created.slice(11) }}</time>
        </li>
        <li :class="{ done: command.started }">
          <span><Icon :name="command.started ? 'check' : 'circle'" /></span>
          <div>
            <strong>{{
              command.started ? "设备已接收" : "等待设备接收"
            }}</strong
            ><small>设备确认任务，准备执行</small>
          </div>
          <time>{{ command.started || "—" }}</time>
        </li>
        <li
          :class="{
            done: command.status === 'completed',
            current: command.status === 'running',
            error: command.status === 'blocked',
          }"
        >
          <span
            ><Icon
              :name="
                command.status === 'blocked'
                  ? 'triangle-alert'
                  : command.status === 'completed'
                    ? 'check'
                    : 'play'
              "
          /></span>
          <div>
            <strong>{{ TASK_STATE[command.status].label }}</strong
            ><small>{{
              command.status === "blocked"
                ? device.alarm
                : `${command.origin} F → ${command.destination} F`
            }}</small>
          </div>
          <time>{{
            command.completed || (command.status === "running" ? "进行中" : "—")
          }}</time>
        </li>
      </ol></template
    >
    <template v-else-if="kind === 'device'"
      ><div class="dialog-command">
        <span>{{ device.name }} · {{ device.id }}</span
        ><StatusChip v-bind="deviceStatus" />
      </div>
      <dl class="detail-grid device-detail-grid">
        <div v-for="[label, value] in deviceFields" :key="label">
          <dt>{{ label }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>
      <div class="device-alert-detail" :class="{ 'has-alarm': device.alarm }">
        <Icon
          :name="
            device.alarm
              ? 'triangle-alert'
              : device.online
                ? 'shield-check'
                : 'wifi-off'
          "
        />
        <div>
          <strong>{{
            device.alarm || (device.online ? "当前无告警" : "设备处于检修模式")
          }}</strong>
          <p>
            {{
              device.alarm
                ? "层门联锁异常，设备已停止运行，请联系现场人员检查。"
                : device.online
                  ? "安全回路与通信状态正常。"
                  : "连接已断开，楼层为最后记录，等待设备恢复。"
            }}
          </p>
        </div>
      </div></template
    >
    <template
      v-else-if="['floorCodes', 'cargo', 'agv'].includes(kind) && device"
    >
      <div v-if="device.simulation" class="cabin-weight-note">
        当前：{{ device.loadLabel }} · {{ load.weightKg ?? "待确认" }} kg。AGV /
        货物位置：{{ location }}。
      </div>
      <template v-if="kind === 'floorCodes'"
        ><p class="help-intro">
          地码固定在轿厢地板，随轿厢移动，编码不随所在楼层变化。
        </p>
        <div class="cabin-marker-list">
          <div
            v-for="code in markerImages"
            :key="code.id"
            class="cabin-marker-row"
          >
            <img
              :src="code.image"
              :alt="`地码 ${code.id} 的二维码`"
              width="100"
              height="100"
            />
            <div>
              <strong>{{ code.id }}</strong
              ><span>{{ code.name }}</span
              ><small
                >识读：{{
                  code.recognized ? "已识别（模拟）" : "离线，状态未知"
                }}</small
              ><small
                >占用：{{
                  !stored.observed
                    ? "未知"
                    : device.simulation && !device.agvOnboard
                      ? "无占用"
                      : code.occupiedBy || "无占用"
                }}</small
              ><small
                >轿厢坐标：X {{ Math.round(code.x * 1000) }} / Z
                {{ Math.round(code.z * 1000) }} mm</small
              >
            </div>
          </div>
        </div></template
      >
      <div v-else-if="!stored.observed" class="cabin-detail-empty">
        设备离线，无法确认当前货物和 AGV 信息。
      </div>
      <template v-else-if="kind === 'cargo'"
        ><div class="cabin-load-summary">
          <span
            ><strong>{{ load.pallets }}</strong> 托</span
          ><span
            ><strong>{{ load.cartons }}</strong> 箱</span
          ><span
            ><strong>{{ load.cargoKg }}</strong> kg 货物</span
          >
        </div>
        <p class="help-note">本次运输货物清单 · 当前位置：{{ location }}</p>
        <div v-if="!device.cabin.cargo.length" class="cabin-detail-empty">
          {{
            agv
              ? `当前无货物，${agv.id} 空载随梯。`
              : "当前轿厢空载，无货物和随梯 AGV。"
          }}
        </div>
        <section
          v-for="item in device.cabin.cargo"
          :key="item.id"
          class="cabin-cargo-detail"
        >
          <div class="cabin-cargo-heading">
            <h3>{{ item.name }}</h3>
            <span>{{ item.cartons }} 箱 · {{ item.weightKg }} kg</span>
          </div>
          <p class="mono">{{ item.id }}</p>
          <dl class="detail-grid">
            <div>
              <dt>托盘编号</dt>
              <dd>{{ item.palletId }}</dd>
            </div>
            <div>
              <dt>承载方式</dt>
              <dd>
                {{
                  item.carrier === "agv"
                    ? `由 ${agv?.id} 搭载随梯`
                    : "货物直接随梯，无 AGV"
                }}
              </dd>
            </div>
            <div>
              <dt>目的位置</dt>
              <dd>{{ item.destination }}</dd>
            </div>
            <div>
              <dt>所在位置</dt>
              <dd>{{ location }}</dd>
            </div>
          </dl>
          <table class="cargo-items">
            <thead>
              <tr>
                <th>物料 / SKU</th>
                <th>数量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in item.items" :key="row.sku">
                <td>
                  {{ row.name }}<small>{{ row.sku }}</small>
                </td>
                <td>{{ row.quantity }} {{ row.unit }}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <div class="cabin-weight-note">
          运输货物 {{ stored.cargoKg }} kg + AGV 自重 {{ stored.agvKg }} kg =
          <strong>{{ stored.totalKg }} kg</strong
          >，不等同于进出梯时的当前梯内载荷。
        </div></template
      >
      <template v-else-if="kind === 'agv'"
        ><div v-if="!agv" class="cabin-detail-empty">当前无随梯 AGV。</div>
        <template v-else
          ><div class="cabin-agv-hero">
            <Icon name="bot" />
            <div>
              <strong>{{ agv.id }}</strong
              ><span
                >{{
                  device.simulation
                    ? device.agvStatus
                    : device.state === "running"
                      ? "随梯运行中"
                      : "随梯停靠"
                }}
                · {{ agv.model }}</span
              >
            </div>
            <b>{{ agv.batteryPct }}%<small>电量</small></b>
          </div>
          <dl class="detail-grid device-detail-grid">
            <div
              v-for="[label, value] in [
                ['定位地码', agv.floorCodeId],
                ['调度任务', agv.missionId],
                ['设备自重', agv.tareKg + ' kg'],
                ['货物重量', stored.cargoKg + ' kg'],
                ['AGV及货物合计', stored.totalKg + ' kg'],
                ['AGV所在位置', location],
                ['电梯 / 所在楼层', device.id + ' · ' + device.floor + ' F'],
              ]"
              :key="label"
            >
              <dt>{{ label }}</dt>
              <dd>{{ value }}</dd>
            </div>
          </dl>
          <h3 class="cabin-carried-title">搭载货物</h3>
          <div
            v-for="item in device.cabin.cargo.filter((c) =>
              agv.carryingCargoIds.includes(c.id),
            )"
            :key="item.id"
            class="cabin-carried-item"
          >
            <Icon name="package" /><span
              >{{ item.name }}<small>{{ item.id }}</small></span
            ><b>{{ item.cartons }} 箱</b>
          </div>
          <p class="help-note">
            出梯后 AGV 和货物留在目的楼层，轿厢空载返程。
          </p></template
        ></template
      >
    </template>
    <template v-else-if="kind === 'help'"
      ><p class="help-intro">
        Vue 3 组件版 · 静态数据演示，保留当前页面的设备、任务和 3D 联动。
      </p>
      <div
        v-for="[number, title, text] in [
          ['01', '选择设备', '切换三类设备，点击设备卡片联动三维模型。'],
          [
            '02',
            '观察自动镜头',
            '进出梯保持近景，上下行切到井道全景，到站后自动拉回。',
          ],
          [
            '03',
            '按需查看明细',
            '点击地码、货物、AGV 或任务状态，查看完整明细和任务进度。',
          ],
        ]"
        :key="number"
        class="guide-step"
      >
        <span>{{ number }}</span>
        <div>
          <h3>{{ title }}</h3>
          <p>{{ text }}</p>
        </div>
      </div></template
    >
    <template v-else-if="kind === 'agent'"
      ><p class="help-intro">
        支持 URL 定位、组件方法和父页面 postMessage，完整接入示例见
        vue3/README.md。
      </p>
      <div class="help-section">
        <h3>Vue 组件</h3>
        <code class="code-block"
          >&lt;TransportMonitor ref="monitor" :devices="devices" :tasks="tasks"
          :demo="false" embedded @selection-change="onSelection" /&gt;</code
        >
      </div>
      <div class="help-section">
        <h3>组件方法</h3>
        <code class="code-block"
          >monitor.selectDevice('LS-01')<br />monitor.setStatus('completed')<br />monitor.openCommand('CMD-20261026-0001')<br />monitor.getSnapshot()</code
        >
        <p class="help-note">
          独立演示页同时提供 window.TransportMonitor；iframe 使用 vertex-monitor
          通道。没有设备控制指令。
        </p>
      </div></template
    >
    <div class="dialog-footer">
      <span>Vue 3 · 静态演示数据</span
      ><button class="button primary" @click="emit('update:open', false)">
        知道了
      </button>
    </div>
  </MonitorDialog>
</template>
