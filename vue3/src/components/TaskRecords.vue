<script setup>
import { computed, reactive, ref, watch } from "vue";
import { TASK_STATE } from "../core/data.js";
import { filterRecords, recordsCsv } from "../core/records.js";
import MonitorDialog from "./MonitorDialog.vue";
import Icon from "./Icon.vue";
import StatusChip from "./StatusChip.vue";
const props = defineProps({
  open: Boolean,
  device: Object,
  tasks: Array,
  status: String,
  initialFloor: { type: [String, Number], default: "all" },
});
const emit = defineEmits(["update:open", "update:status", "command"]);
const filter = reactive({
  query: "",
  floor: "all",
  priority: "all",
  descending: true,
});
const page = ref(1),
  size = 6;
const list = computed(() =>
  filterRecords(props.tasks, {
    deviceId: props.device?.id,
    status: props.status,
    ...filter,
  }),
);
const pages = computed(() => Math.max(1, Math.ceil(list.value.length / size)));
const shown = computed(() =>
  list.value.slice((page.value - 1) * size, page.value * size),
);
const count = (status) =>
  props.tasks.filter(
    (t) =>
      t.deviceId === props.device?.id &&
      (status === "completed"
        ? t.status === "completed"
        : t.status !== "completed"),
  ).length;
watch(
  () => [props.device?.id, props.status, props.open],
  () => {
    if (props.open) {
      Object.assign(filter, {
        query: "",
        floor: props.initialFloor,
        priority: "all",
        descending: true,
      });
      page.value = 1;
    }
  },
);
watch(filter, () => {
  page.value = 1;
});
watch(pages, (total) => {
  page.value = Math.min(page.value, total);
});
function download() {
  const url = URL.createObjectURL(
      new Blob([recordsCsv(list.value)], { type: "text/csv;charset=utf-8;" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `${props.device.id}-${props.status}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
</script>
<template>
  <MonitorDialog
    :open="open"
    :title="`${device?.name || '设备'} · 任务记录`"
    wide
    @update:open="emit('update:open', $event)"
  >
    <section class="panel tasks-panel">
      <div class="task-header">
        <div>
          <h2>
            任务指令 <span class="tag tag-neutral">{{ device?.id }}</span>
          </h2>
          <span class="section-description"
            >设备与任务联动，追踪完整执行过程</span
          >
        </div>
        <button class="button" @click="download">
          <Icon name="arrow-down-to-line" />导出记录
        </button>
      </div>
      <div class="task-toolbar">
        <div class="status-tabs" role="tablist" aria-label="任务完成状态">
          <button
            v-for="(label, key) in { pending: '未完成', completed: '已完成' }"
            :key="key"
            role="tab"
            :aria-selected="status === key"
            :class="{ active: status === key }"
            @click="emit('update:status', key)"
          >
            {{ label }} <span>{{ count(key) }}</span>
          </button>
        </div>
        <div class="task-filters">
          <label class="select-shell slim floor-select"
            ><Icon name="layers-3" /><select
              v-model="filter.floor"
              aria-label="按楼层筛选"
            >
              <option value="all">全部楼层</option>
              <option v-for="f in device?.floors || 0" :key="f" :value="f">
                {{ String(f).padStart(2, "0") }} F 楼层
              </option></select
            ><Icon name="chevron-down"
          /></label>
          <div class="task-search">
            <Icon name="search" /><input
              v-model="filter.query"
              placeholder="搜索指令编号"
              aria-label="搜索指令编号"
            />
          </div>
          <label class="select-shell slim"
            ><Icon name="sliders-horizontal" /><select
              v-model="filter.priority"
              aria-label="按优先级筛选"
            >
              <option value="all">全部优先级</option>
              <option value="high">高优先级</option>
              <option value="normal">普通优先级</option></select
            ><Icon name="chevron-down"
          /></label>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>指令编号</th>
              <th>任务类型</th>
              <th>运输路径</th>
              <th>执行状态</th>
              <th>优先级</th>
              <th :aria-sort="filter.descending ? 'descending' : 'ascending'">
                <button
                  class="sort-button"
                  @click="filter.descending = !filter.descending"
                >
                  下发时间
                  <Icon
                    name="arrow-up"
                    :style="{
                      transform: filter.descending
                        ? 'rotate(180deg)'
                        : undefined,
                    }"
                  />
                </button>
              </th>
              <th>任务耗时</th>
              <th class="align-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in shown" :key="t.id">
              <td>
                <button class="command-id" @click="emit('command', t.id)">
                  {{ t.id }}</button
                ><span class="task-source">{{ t.source }}</span>
              </td>
              <td>
                <span class="task-kind"
                  ><Icon
                    :name="t.kind === '物料运输' ? 'package' : 'container'"
                  />{{ t.kind }}</span
                >
              </td>
              <td>
                <span class="route"
                  ><b>{{ String(t.origin).padStart(2, "0") }}<small>F</small></b
                  ><Icon name="arrow-right" /><b
                    >{{ String(t.destination).padStart(2, "0")
                    }}<small>F</small></b
                  ></span
                >
              </td>
              <td><StatusChip v-bind="TASK_STATE[t.status]" /></td>
              <td>
                <span class="priority" :class="{ high: t.priority === 'high' }"
                  ><i />{{ t.priority === "high" ? "高优先级" : "普通" }}</span
                >
              </td>
              <td class="time-cell">
                <span>{{ t.created.slice(11) }}</span
                ><small>{{ t.created.slice(0, 10) }}</small>
              </td>
              <td class="duration">{{ t.duration }}</td>
              <td class="align-right">
                <button
                  class="detail-button"
                  :aria-label="`查看指令 ${t.id} 详情`"
                  @click="emit('command', t.id)"
                >
                  详情 <Icon name="chevron-right" />
                </button>
              </td>
            </tr>
            <tr v-if="!shown.length">
              <td colspan="8">
                <div class="table-empty">
                  <Icon name="list-filter" /><strong>暂无匹配指令</strong
                  ><span>请调整搜索或筛选条件</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span
          >共 {{ list.length }} 条记录<span v-if="list.length"
            >，显示第 {{ (page - 1) * size + 1 }}–{{
              Math.min(page * size, list.length)
            }}
            条</span
          ></span
        >
        <div class="pagination">
          <span>6 条 / 页</span
          ><button
            class="icon-button"
            :disabled="page === 1"
            aria-label="上一页"
            @click="page--"
          >
            <Icon name="chevron-left" /></button
          ><span class="page-number">{{ page }}</span
          ><button
            class="icon-button"
            :disabled="page === pages"
            aria-label="下一页"
            @click="page++"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      </div>
    </section>
  </MonitorDialog>
</template>
