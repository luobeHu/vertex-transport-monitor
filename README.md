# VERTEX · 垂直运输监控

电梯、提升机、蓝思提升机的静态监控工作台。以设备为主、任务为从，选择设备后同步更新三维模型、所在楼层、设备状态、设备模式、告警和指令明细。

**在线页面：<https://luobehu.github.io/vertex-transport-monitor/>**

## 本地运行

要求 Node.js 22 或更新版本。

```sh
npm ci
npm run dev
```

`npm test` 检查任务归属、分类统计、楼层范围、异常状态和时间线一致性。`npm run build` 生成静态数据快照和 `dist/`，可部署到任意静态服务。使用相对资源路径，支持 GitHub Pages 子路径。

## 页面功能

- 三类设备独立切换，共 12 台模拟设备、300 条指令。数据快照固定于 **2026-10-26 14:32:08**。
- 按建筑、设备编号、设备名称、运行状态和告警筛选设备。
- 设备统计与任务明细统一来源，未完成包含执行中、待执行和异常阻塞。
- 指令按未完成 / 已完成分类，支持搜索、优先级、时间排序、分页和 CSV 导出。导出范围为当前设备、状态及筛选条件下的全部匹配记录。
- 点击指令查看任务路径、来源、优先级和执行时间线。
- Three.js 程序化三维模型，包含井道、层板、导轨、牵引机、钢缆、轿厢和提升机防护结构；支持旋转、缩放、正视、复位和放大。点击层板筛选途经楼层的任务。图示停留在快照状态，不模拟实时运动。
- 无 WebGL 时显示降级提示，设备和任务数据仍可查看。
- 响应式布局、键盘操作、对话框焦点控制和减少动态效果支持。
- 字体、图标和脚本均随构建产物提供，不依赖在线 CDN。

顶部汇总按设备类型和建筑统计；左侧关键词与状态筛选仅影响设备列表；下方任务始终属于选中的设备。刷新按钮重新读取固定演示数据，不连接真实设备。

## 由服务或 Agent 打开

页面使用 URL 参数作为视图定位契约。参数不涉及设备控制。

| 参数 | 值 | 用途 |
| --- | --- | --- |
| `type` | `elevator` / `hoist` / `lans` | 设备类型 |
| `device` | `EL-01` / `HT-01` / `LS-01` 等 | 选择设备；优先采用设备所属类型 |
| `status` | `pending` / `completed` | 指令分类，默认未完成 |
| `command` | 完整指令编号 | 选择关联设备和状态，打开指令详情 |
| `embed` | `1` | 隐藏外层导航和顶栏 |

示例：

- [查看电梯 EL-01](https://luobehu.github.io/vertex-transport-monitor/?type=elevator&device=EL-01&status=pending)
- [查看蓝思提升机 LS-03 告警设备](https://luobehu.github.io/vertex-transport-monitor/?device=LS-03)
- [直接打开指令详情](https://luobehu.github.io/vertex-transport-monitor/?command=CMD-20261026-0001&embed=1)

### 静态数据接口

Agent 可先读取 [agent-manifest.json](https://luobehu.github.io/vertex-transport-monitor/agent-manifest.json) 获取视图和接口约定，再读取 [data/snapshot.json](https://luobehu.github.io/vertex-transport-monitor/data/snapshot.json) 中的设备、任务及数据时间戳，然后构建对应 URL 交给宿主展示。以上都是静态 JSON，不是 MCP 服务。

### iframe 嵌入

```html
<iframe
  id="transport-monitor"
  src="https://luobehu.github.io/vertex-transport-monitor/?embed=1&device=EL-01"
  title="垂直运输设备任务监控"
  style="width:100%;height:100vh;border:0"
></iframe>
```

跨域父页面可通过 `postMessage` 查询和导航：

```js
const frame = document.querySelector('#transport-monitor');
const origin = 'https://luobehu.github.io';

// 等待 iframe 的 load 事件后调用。
frame.contentWindow.postMessage({
  channel: 'vertex-monitor',
  requestId: 'device-1',
  action: 'selectDevice',
  deviceId: 'LS-01',
}, origin);

window.addEventListener('message', event => {
  if (event.origin !== origin || event.source !== frame.contentWindow) return;
  if (event.data?.channel !== 'vertex-monitor') return;
  console.log(event.data); // { channel, requestId, ok, data } 或 { ..., ok:false, error }
});
```

| action | 附加字段 | 返回 |
| --- | --- | --- |
| `getSnapshot` | 无 | `{ demo, snapshotAt, selection, devices, tasks }` |
| `selectDevice` | `deviceId` | 选中的设备 |
| `setStatus` | `status` | `{ status }` |
| `openCommand` | `commandId` | 对应指令 |

页面仅接受直接父窗口的消息，响应发回该窗口的源；不接受脚本或外部 URL。所有数据均为公开模拟数据。接入真实业务数据时，应由宿主配置可信来源与权限校验。

同源页面可直接访问：

```js
window.TransportMonitor.getSnapshot();
window.TransportMonitor.selectDevice('HT-01');
window.TransportMonitor.setStatus('completed');
window.TransportMonitor.openCommand('CMD-20261026-0401');
window.addEventListener('transport:selection', ({ detail }) => console.log(detail));
```

## 后续接真实业务

1. 将 `src/data.js` 的设备和指令替换为统一接口数据；保留任务归属、楼层范围及状态枚举。
2. 使用 WebSocket / SSE 更新状态，并显式区分数据时间戳、在线状态和过期数据。
3. 在 `src/twin.js` 中将程序化模型替换为真实 GLB / glTF，按设备坐标和楼层高度映射轿厢位置。
4. 静态页面当前只读；真实设备控制应经过独立的服务端权限、确认及审计流程。

## 自动部署

`.github/workflows/deploy.yml` 在推送 `main` 时自动执行安装、数据校验、静态构建和 GitHub Pages 发布。仓库的 **Settings → Pages → Source** 使用 **GitHub Actions**。

技术栈：Vite、原生 JavaScript、Three.js、Lucide。字体为 DM Sans 与 IBM Plex Mono，许可证随 npm 依赖提供。
