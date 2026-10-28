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

默认界面采用精简布局：只展示设备切换、3D 示意、所在楼层、设备状态、模式、告警和当前任务。完整信息按需弹出：

视觉采用暖白、雾灰和深绿，桌面为“左侧设备索引 + 三维监控主图”的布局，楼层、门状态、模式、告警、载荷及任务入口集中在图内。三维场景使用本地生成的环境反射、柔和灯光与实体金属材质；手机端将设备索引和状态优先排列，模型随后展示。

**运行演示设备：[EL-01](https://luobehu.github.io/vertex-transport-monitor/?device=EL-01)**。选中后自动循环播放 **4 F 载货进梯 → 关门上行 → 6 F 载货出梯 → 空载关门返程**（每轮 44 秒）。轿厢、伸缩门、镜头和文字状态使用同一模拟时钟；支持暂停、重播及点击图内四个步骤定位。AGV 仅在门完全打开且轿厢停稳后跨门，货物随 AGV 同步移动；进出梯时显示“载荷待确认”，空载时为 0 kg。离开该设备或页面不可见时停止推进；系统开启减少动态效果时默认暂停，可主动播放。

模拟行程独立于 300 条任务记录，不会改写任务数量或完成状态。主界面展示实时模拟楼层、方向与门状态；其他设备使用快照中的门状态，离线设备显示“门状态未知”。

### 轿厢内地码、货物与 AGV

关键数据直接标注在三维图内：地码编号、货物托数/箱数/重量/货物编号，以及随梯 AGV 编号、电量和定位点。引线连接到轿厢里的对应位置，随轿厢升降及视角变化实时更新。点击标注或可见模型对象打开完整明细。

默认采用自动视角，保留目前的轿厢剖视及 AGV 进出梯动画：关门后镜头用约 1.1 秒拉远，显示固定井道、所有楼层和轿厢上下运行；目标楼层停稳后，再用约 1.1 秒拉回近景，接续开门和进出梯。全景具有固定楼层编号与跟随轿厢的位置标记。视角与运行共用同一时钟，暂停会冻结镜头，点击四个步骤会直接定位到相应场景；系统减少动态效果时不播放推拉。

近景的实体后壁、左壁、地板及四扇伸缩门保留，顶部和观察侧做固定剖切，不使用透明门板。每一层定义独立、固定高度的地板，到站近景仅显示当前层地面，井道全景显示所有层；其他层的 AGV 留在其实际位置，不随空载轿厢返回。镜头推拉时，井道、楼层结构及轿厢外壳逐渐显隐。

图中货箱按钮可“锁定井道全景”，再次点击“恢复自动视角”。其余静态设备仍支持近景 / 全景手动切换；复位只重置当前观察方式。[打开自动视角演示](https://luobehu.github.io/vertex-transport-monitor/?device=EL-01&view=cabin)。

- `EL-01`：AGV-007 搭载 1 托 4 箱精密结构件，货物 240 kg；加上 AGV 自重 320 kg，示例总载荷 560 kg。
- `EL-02`：空载、无随梯 AGV。
- `EL-03`：2 托 6 箱货物直接随梯，无 AGV。
- `EL-04`：离线，载荷与地码识读状态未知，不当作空载。

地码固定在轿厢地板，编码不随楼层变化；二维码纹理编码值与展示编号一致。AGV 搭载货物沿站台进出电梯；出梯后停留在 6 F 站台，轿厢空载返程，地码始终固定在轿厢。每轮最后明确显示“下一轮演示准备”，随后重置场景。三维图采用正交投影避免近大远小导致的比例误判；轿厢净空间为 2.4 × 2.4 × 2.4 m，AGV 0.9 × 1.2 × 0.3 m，托盘 1.0 × 1.2 m。以上均为设计示意尺寸，可在 `src/dimensions.js` 统一调整，并非实测工程模型。手机端将摘要排列在图内底部，详情仍按需弹出。

静态 JSON 和 `getSnapshot().devices` 中的 `cabin` 字段提供：

| 字段 | 含义 |
| --- | --- |
| `observed` | 是否能确认载荷信息，离线为 false |
| `floorCodes` | 地码 id、轿厢局部坐标 x/z、识读状态和占用对象 |
| `cargo` | 货物 id、托盘编号、箱数、重量、物料清单、目的位置和承载方式 |
| `agv` | 随梯 AGV 编号、电量、自重、定位地码、调度任务和搭载货物关系，无随梯 AGV 时为 null |

静态 `cabin` 字段保存关联货物清单；`getSnapshot().simulation` 包含当前模拟载荷位置、进出阶段、是否在梯内等信息。页面按模拟阶段统计当前梯内载荷，弹窗另列本次运输货物清单。重量为样例估算，不代表称重传感器实时读数。

- 点击顶部“设备在线”查看设备汇总，选择设备后联动主界面。
- 点击设备状态、模式、告警或右上角更多按钮查看完整参数和告警说明。
- 点击“未完成 / 已完成”打开任务记录弹窗，继续搜索、筛选、分页和导出；关闭单条指令详情后返回任务记录。
- 点击“筛选”打开建筑、设备名称和状态筛选；点击模型楼层直接打开该楼层的相关任务。

- 三类设备独立切换，共 12 台模拟设备、300 条指令。数据快照固定于 **2026-10-26 14:32:08**。
- 按建筑、设备编号、设备名称、运行状态和告警筛选设备。
- 设备统计与任务明细统一来源，未完成包含执行中、待执行和异常阻塞。
- 指令按未完成 / 已完成分类，支持搜索、优先级、时间排序、分页和 CSV 导出。导出范围为当前设备、状态及筛选条件下的全部匹配记录。
- 点击指令查看任务路径、来源、优先级和执行时间线。
- Three.js 程序化三维模型，包含简化剖面井道、独立楼层地面、导轨、实体轿厢、四扇伸缩门和提升机防护结构；支持旋转、缩放、正视、复位和放大。点击层板筛选途经楼层的任务。EL-01 播放本地模拟运动，其余设备显示固定快照。
- 无 WebGL 时显示降级提示，设备和任务数据仍可查看。
- 响应式布局、键盘操作、对话框焦点控制和减少动态效果支持。
- 字体、图标和脚本均随构建产物提供，不依赖在线 CDN。

顶部汇总按设备类型和建筑统计；筛选弹窗中的关键词与状态仅影响设备列表；任务弹窗中的记录始终属于选中的设备。刷新按钮重新读取固定演示数据，不连接真实设备。

## 由服务或 Agent 打开

页面使用 URL 参数作为视图定位契约。参数不涉及设备控制。

| 参数 | 值 | 用途 |
| --- | --- | --- |
| `type` | `elevator` / `hoist` / `lans` | 设备类型 |
| `device` | `EL-01` / `HT-01` / `LS-01` 等 | 选择设备；优先采用设备所属类型 |
| `status` | `pending` / `completed` | 指令分类，默认未完成 |
| `command` | 完整指令编号 | 选择关联设备和状态，打开指令详情 |
| `embed` | `1` | 隐藏外层导航和顶栏 |
| `cabin` | `floorCodes` / `cargo` / `agv` | 打开当前设备的轿厢地码、货物或 AGV 明细 |
| `view` | `cabin` / `shaft` | 默认自动视角（EL-01 行进时全景、到站后近景）/ 锁定完整井道全景；静态设备分别为近景 / 全景 |

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
| `getSnapshot` | 无 | `{ demo, snapshotAt, selection, devices, tasks, simulation }` |
| `selectDevice` | `deviceId` | 选中的设备 |
| `setStatus` | `status` | `{ status }` |
| `openCommand` | `commandId` | 对应指令 |
| `openCabinInfo` | `kind`，取值 floorCodes / cargo / agv | 当前设备的轿厢信息，并打开对应明细 |

页面仅接受直接父窗口的消息，响应发回该窗口的源；不接受脚本或外部 URL。所有数据均为公开模拟数据。接入真实业务数据时，应由宿主配置可信来源与权限校验。

`devices` 和 `tasks` 保持静态样例数据；选中 EL-01 时，`simulation` 返回当前模拟楼层、位置、方向、速度、阶段、门状态、开门比例和暂停标志，其余设备下为 `null`。`doorStatus` 的取值为 `closed / opening / open / closing / unknown`。实时模拟状态不写入静态 JSON 快照。

同源页面可直接访问：

```js
window.TransportMonitor.getSnapshot();
window.TransportMonitor.selectDevice('HT-01');
window.TransportMonitor.setStatus('completed');
window.TransportMonitor.openCommand('CMD-20261026-0401');
window.TransportMonitor.openCabinInfo('cargo');
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

## Vue 3 组件版本

新增独立的 [`vue3/`](./vue3/) 项目，保留本页面的模型、自动镜头、AGV 进出梯和主从查询功能。

- [Vue 3 在线演示](https://luobehu.github.io/vertex-transport-monitor/vue3/?device=EL-01&view=cabin)
- [运行、组件 Props / Ref 方法与服务接入说明](./vue3/README.md)
- 原版页面继续位于根路径；Vue 版部署于 `/vue3/`，可独立运行和构建。
