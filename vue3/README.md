# VERTEX · Vue 3 垂直运输监控

与原版并行的 **Vue 3 + Vite + Three.js** 实现，使用 `<script setup>`、Composition API 和响应式模板。保留当前浅色界面与完整 44 秒演示：AGV 载货进梯、关门上行、到站开门出梯、空载下行、到站复位。行进时自动拉远到井道全景，到站后恢复轿厢近景。

**在线演示：[Vue 3 版](https://luobehu.github.io/vertex-transport-monitor/vue3/?device=EL-01&view=cabin)**。原版地址保持可用。

本目录是完整、独立项目。复制整个 `vue3/` 目录即可运行，不依赖仓库上层源码。这里包含当前已验证的建模、镜头、模拟数据和样式副本。

## 启动和构建

Node.js 22 或更高版本。

```sh
cd vue3
npm ci
npm run dev
# http://127.0.0.1:5174
npm test
npm run build
```

`dist/` 可以部署到任意静态服务；资源采用相对路径，支持 GitHub Pages 子路径。依赖和字体随构建产物打包，不使用运行时 CDN。仓库根目录还提供 `npm run dev:vue`、`npm run build:vue`；根目录 `npm run build` 同时构建原版与 Vue 版到 `dist/` 和 `dist/vue3/`。

## 文件结构

```text
src/
  components/
    TransportMonitor.vue   # 完整监控组件、设备列表、筛选和汇总、公开方法
    TwinScene.vue          # Three.js 创建/更新/卸载、镜头和运行控制
    DiagramHud.vue         # 图内楼层、门、运行状态、载荷、任务入口
    CabinAnnotations.vue   # Vue 响应式地码/货物/AGV 标注和引线
    TaskRecords.vue        # 未完成/已完成、搜索、筛选、分页、CSV
    DetailsDialog.vue      # 设备、指令、地码、货物、AGV 明细
    MonitorDialog.vue      # 原生 dialog 与焦点/关闭处理
    Icon.vue               # Vue 图标组件
    StatusChip.vue         # 状态标签
  composables/useMonitor.js # 响应式设备选择、筛选、主从统计
  core/                    # Three.js 模型、镜头时间轴、数据和纯函数
  styles/monitor.css       # 样式仅作用于 .vertex-monitor 内部
  index.js                 # 组件和静态数据导出
  main.js                  # 独立演示入口
```

Three.js 对象保持在组件的非响应式局部变量中，只将状态与屏幕投影坐标交给 Vue。`TwinScene.vue` 在 `onMounted` 建立渲染器，在 `onBeforeUnmount` 取消动画帧、断开 ResizeObserver、销毁 OrbitControls 并释放模型、纹理和渲染器。没有整页 innerHTML、v-html 或全局点击委托。

## 接入现有 Vue 3 服务

将 `src/` 内容复制到服务的业务模块目录，安装本项目 `package.json` 中的运行依赖；服务需要启用 Vite 的 Vue SFC 插件。下面的 `devices`、`tasks` 是你自己的接口返回数据，字段结构可参考 `core/data.js` 与 `core/cabin-data.js`。

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { TransportMonitor } from './transport-monitor/index.js'

const monitor = ref()
const devices = ref([])
const tasks = ref([])
const snapshotAt = ref('')

async function reload() {
  const response = await fetch('/api/transport/snapshot')
  if (!response.ok) throw new Error('读取设备快照失败')
  const data = await response.json()
  devices.value = data.devices
  tasks.value = data.tasks
  snapshotAt.value = data.snapshotAt
}
function onSelection(selection) {
  console.log(selection.type, selection.device, selection.status)
}
// 示例 API 路径请替换为你的服务地址；也可由 WebSocket 更新这两个数组。
onMounted(reload)
</script>

<template>
  <TransportMonitor
    ref="monitor"
    :devices="devices"
    :tasks="tasks"
    :snapshot-at="snapshotAt"
    :demo="false"
    initial-type="elevator"
    embedded
    @selection-change="onSelection"
    @refresh="reload"
  />
</template>
```

**接真实数据时设置 `:demo="false"`**：示例 EL-01 的模拟轨迹不会覆盖外部设备的楼层、门状态和载荷。外部数据更新后，组件同步统计与画面；货物清单或设备结构变更时重建对应场景。当前自动行程镜头绑定示例演示时间轴；接真实设备后显示传入的实时静态姿态，自动行程编排可继续在 `TwinScene.vue` / `core/journey-camera.js` 对接真实事件。

| Prop | 默认值 | 用途 |
| --- | --- | --- |
| `devices` | 12 台示例设备 | 替换为接口设备列表 |
| `tasks` | 300 条示例任务 | 替换为接口任务列表 |
| `snapshotAt` | 示例快照时间 | 传入接口返回的数据时间戳 |
| `demo` | `true` | 是否启用 EL-01 本地模拟动画 |
| `embedded` | `false` | 隐藏外层品牌栏/标题，适应服务容器 |
| `initialDevice` | 当前类型第一台 | 初始设备编号 |
| `initialType` | `elevator` | `elevator` / `hoist` / `lans` |
| `initialStatus` | `pending` | `pending` / `completed` |
| `initialView` | `cabin` | `cabin` 自动演示 / `shaft` 锁定全景 |
| `syncUrl` | `false` | 是否读取并更新页面 URL；嵌入组件时保持关闭 |
| `exposeAgentApi` | `false` | 是否安装 window.TransportMonitor 与父 iframe 通道 |

默认不改变宿主的 URL、全局 API 或 body 样式。独立演示入口开启 `syncUrl` 和 `exposeAgentApi`（挂载时配置）。多实例服务中只对一个实例开启全局 Agent API，其余实例使用各自的组件 Ref。CSS 带 `.vertex-monitor` 前缀，原生 dialog 留在组件 DOM 内；可在一个服务中挂载多个组件实例。字段尺寸是示意值，统一在 `core/dimensions.js` 调整。

### Ref 方法与事件

```js
monitor.value.selectDevice('LS-03')
monitor.value.setStatus('completed')
monitor.value.openCommand('CMD-20261026-0001')
monitor.value.openCabinInfo('cargo') // floorCodes / cargo / agv
const snapshot = monitor.value.getSnapshot()
```

- `selection-change`：`{ type, device, status, view }`。
- `simulation-change`：当前本地模拟状态，每约 120ms 更新；非演示设备不触发。
- `ready`：组件方法对象。
- `refresh`：用户点击刷新，宿主可接入重新拉取数据的逻辑。

`getSnapshot()` 返回 `{ demo, snapshotAt, selection, devices, tasks, simulation }`。`devices/tasks` 为输入数据副本，`simulation` 是当前 EL-01 演示状态，其他情况为 `null`。示例重量为样例估算；货物与 AGV 出梯后归属目的楼层，空载返程时梯内重量为 0 kg。弹窗内容保存打开时快照。

### URL / iframe / Agent

Agent 也可直接读取 [`agent-manifest.json`](https://luobehu.github.io/vertex-transport-monitor/vue3/agent-manifest.json) 和 [`data/snapshot.json`](https://luobehu.github.io/vertex-transport-monitor/vue3/data/snapshot.json)，再生成 URL。独立演示支持原版参数：`type`、`device`、`status`、`command`、`cabin`、`view`、`embed=1`。

```html
<iframe
  id="transport"
  src="https://luobehu.github.io/vertex-transport-monitor/vue3/?device=EL-01&view=cabin&embed=1"
  title="垂直运输监控"
  style="width:100%;height:100vh;border:0"
></iframe>
```

iframe 加载完成后，父页面可发送：

```js
const frame = document.querySelector('#transport')
frame.contentWindow.postMessage({
  channel: 'vertex-monitor', requestId: 'select-1',
  action: 'selectDevice', deviceId: 'LS-03',
}, 'https://luobehu.github.io')
```

响应为 `{ channel, requestId, ok, data }` 或 `{ channel, requestId, ok:false, error }`。读取响应时校验 `event.origin` 和 `event.source`。其他动作：`getSnapshot`、`setStatus`（status）、`openCommand`（commandId）、`openCabinInfo`（kind）。只接受当前 iframe 父页面，不提供实际设备控制。

## 验证

`npm test` 检查动画/镜头时间轴、通行净空、固定楼层地板、空载与离线状态、设备/任务统计、Vue 响应式数据替换与筛选、CSV 导出。

开发服务上的浏览器验收入口（不进入生产构建）：

- `/tests/host.html`：外部传入实时数据、组件 ref 方法、卸载/重新挂载、宿主样式隔离。
- `/tests/iframe.html`：通过真实 iframe 的父页面按钮发送 postMessage。

参考：[Vue 组合式函数](https://vuejs.org/guide/reusability/composables.html)、[Vite 项目根目录与相对资源路径](https://vite.dev/config/shared-options.html#root)。
