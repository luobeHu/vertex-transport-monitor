import '@fontsource-variable/dm-sans/standard.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './style.css';
import './compact.css';
import './premium.css';
import { createCompactView } from './compact-view.js';
import { renderShell } from './shell.js';
import { createIcons, Activity, ArrowDown, ArrowUpRight, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Bell, Blocks, Boxes, Building2, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Circle, CircleCheck, CircleHelp, CirclePause, Clock3, Code2, Container, Copy, Cpu, Expand, ExternalLink, FileText, Filter, Gauge, Layers3, LayoutDashboard, ListFilter, ListOrdered, Maximize2, Minus, MoreHorizontal, MoveUpRight, MousePointer2, PanelsTopLeft, Package, PanelLeftClose, Play, Plus, Radio, RefreshCw, RotateCcw, Search, Settings2, ShieldCheck, SlidersHorizontal, TriangleAlert, Wifi, WifiOff, X, Zap } from 'lucide';
import { devices, tasks, TYPES, STATE, TASK_STATE, SNAPSHOT, getTasks } from './data.js';
import { createTwin } from './twin.js';
import { DEMO_DEVICE_ID, sampleElevatorDemo } from './simulation.js';

const iconSet = { Activity, ArrowDown, ArrowUpRight, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Bell, Blocks, Boxes, Building2, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Circle, CircleCheck, CircleHelp, CirclePause, Clock3, Code2, Container, Copy, Cpu, Expand, ExternalLink, FileText, Filter, Gauge, Layers3, LayoutDashboard, ListFilter, ListOrdered, Maximize2, Minus, MoreHorizontal, MoveUpRight, MousePointer2, PanelsTopLeft, Package, PanelLeftClose, Play, Plus, Radio, RefreshCw, RotateCcw, Search, Settings2, ShieldCheck, SlidersHorizontal, TriangleAlert, Wifi, WifiOff, X, Zap };
const $ = s => document.querySelector(s);
const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const params = new URLSearchParams(location.search);
const requested = devices.find(d => d.id === params.get('device'));
const state = {
  type: requested?.type || (TYPES.some(t => t.id === params.get('type')) ? params.get('type') : 'elevator'),
  device: requested?.id || null,
  status: params.get('status') === 'completed' ? 'completed' : 'pending',
  building: 'all', deviceState: 'all', query: '', taskQuery: '', priority: 'all', floor: null, page: 1, descending: true,
};
state.device ||= devices.find(d => d.type === state.type).id;
const embed = params.get('embed') === '1';
document.body.classList.toggle('embedded', embed);

$('#app').innerHTML = renderShell(TYPES, icon);
$('#records-content').innerHTML = `    <section class="panel tasks-panel" id="commands" aria-labelledby="commands-title"><div class="task-header"><div><h2 id="commands-title">任务指令 <span class="tag tag-neutral" id="task-device"></span></h2><span class="section-description">设备与任务联动，追踪完整执行过程</span></div><button class="button" id="export">${icon('arrow-down-to-line')}导出记录</button></div><div class="task-toolbar"><div class="status-tabs" role="tablist" aria-label="任务完成状态"><button data-status="pending" role="tab">未完成 <span id="pending-count"></span></button><button data-status="completed" role="tab">已完成 <span id="completed-count"></span></button></div><div class="task-filters"><label class="select-shell slim floor-select">${icon('layers-3')}<select id="floor-select" aria-label="按楼层筛选"><option value="all">全部楼层</option></select>${icon('chevron-down')}</label><button id="floor-filter" class="floor-filter" hidden></button><div class="task-search">${icon('search')}<input id="task-search" placeholder="搜索指令编号" aria-label="搜索指令编号"></div><label class="select-shell slim">${icon('sliders-horizontal')}<select id="priority-filter" aria-label="按优先级筛选"><option value="all">全部优先级</option><option value="high">高优先级</option><option value="normal">普通优先级</option></select>${icon('chevron-down')}</label></div></div><div class="table-wrap"><table><thead><tr><th>指令编号</th><th>任务类型</th><th>运输路径</th><th>执行状态</th><th>优先级</th><th><button class="sort-button" id="sort-time">下发时间 ${icon('arrow-down')}</button></th><th>任务耗时</th><th class="align-right">操作</th></tr></thead><tbody id="task-rows"></tbody></table></div><div class="table-footer"><span id="table-range"></span><div class="pagination"><span>6 条 / 页</span><button class="icon-button" id="previous-page" aria-label="上一页">${icon('chevron-left')}</button><span class="page-number" id="page-number">1</span><button class="icon-button" id="next-page" aria-label="下一页">${icon('chevron-right')}</button></div></div></section>`;
// Icons are selected explicitly to keep the static bundle small.
const icons = () => createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.7, 'aria-hidden': 'true' } });
let simulationState = sampleElevatorDemo(0, matchMedia('(prefers-reduced-motion: reduce)').matches);
const current = () => {
  const d = devices.find(d => d.id === state.device);
  return d?.id === DEMO_DEVICE_ID ? { ...d, ...simulationState } : d;
};
const scopeDevices = () => devices.filter(d => d.type === state.type && (state.building === 'all' || d.building === state.building));
const visibleDevices = () => scopeDevices().filter(d => (state.deviceState === 'all' || d.state === state.deviceState) && `${d.id} ${d.name} ${d.location}`.toLowerCase().includes(state.query.toLowerCase()));
const chip = (label, tone, dot = true) => `<span class="tag tag-${tone}">${dot ? '<span class="tag-dot"></span>' : ''}${label}</span>`;
let toastTimeout;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
function syncUrl() {
  const p = new URLSearchParams(location.search); p.set('type', state.type); state.device ? p.set('device', state.device) : p.delete('device'); p.set('status', state.status);
  history.replaceState(null, '', `${location.pathname}?${p}${location.hash}`);
  window.dispatchEvent(new CustomEvent('transport:selection', { detail: { type: state.type, device: state.device, status: state.status } }));
}
const compactView = createCompactView({ $, state, tasks, TYPES, STATE, TASK_STATE, SNAPSHOT, getTasks, icon, chip, scopeDevices, visibleDevices, current, showDialog, icons, getDemoState: () => simulationState });
function renderMetrics() { compactView.renderMetrics(); }
function renderDevices() { compactView.renderDevices(); }
function renderTelemetry() { compactView.renderTelemetry(); }
function filteredTasks() {
  if (!state.device) return [];
  const rows = getTasks(state.device, state.status).filter(t => t.id.toLowerCase().includes(state.taskQuery.toLowerCase()) && (state.priority === 'all' || t.priority === state.priority) && (state.floor === null || t.origin === state.floor || t.destination === state.floor));
  return rows.sort((a,b) => state.descending ? b.created.localeCompare(a.created) : a.created.localeCompare(b.created));
}
function renderTasks() {
  $('#task-device').textContent = state.device || '未选择设备';
  $('#floor-select').innerHTML = '<option value="all">全部楼层</option>' + Array.from({ length: current()?.floors || 0 }, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')} F 楼层</option>`).join('');
  $('#floor-select').value = state.floor === null ? 'all' : String(state.floor);
  $('#pending-count').textContent = state.device ? getTasks(state.device, 'pending').length : 0;
  $('#completed-count').textContent = state.device ? getTasks(state.device, 'completed').length : 0;
  document.querySelectorAll('[data-status]').forEach(el => { el.classList.toggle('active', el.dataset.status === state.status); el.setAttribute('aria-selected', String(el.dataset.status === state.status)); });
  $('#floor-filter').hidden = state.floor === null; $('#floor-filter').innerHTML = `${state.floor} F ${icon('x')}`;
  const rows = filteredTasks(); state.page = Math.max(1, Math.min(state.page, Math.ceil(rows.length / 6)));
  const start = (state.page - 1) * 6, pageRows = rows.slice(start, start + 6);
  $('#task-rows').innerHTML = pageRows.length ? pageRows.map(t => `<tr><td><button class="command-id" data-command="${t.id}">${t.id}</button><span class="task-source">${t.source}</span></td><td><span class="task-kind">${icon(t.kind === '物料运输' ? 'package' : t.kind === '呼梯任务' ? 'arrow-up-down' : 'container')}${t.kind}</span></td><td><span class="route"><b>${String(t.origin).padStart(2, '0')}<small>F</small></b>${icon('arrow-right')}<b>${String(t.destination).padStart(2, '0')}<small>F</small></b></span></td><td>${chip(TASK_STATE[t.status].label, TASK_STATE[t.status].tone)}</td><td><span class="priority ${t.priority === 'high' ? 'high' : ''}"><i></i>${t.priority === 'high' ? '高优先级' : '普通'}</span></td><td class="time-cell"><span>${t.created.slice(11)}</span><small>2026-10-26</small></td><td class="duration">${t.duration}</td><td class="align-right"><button class="detail-button" data-command="${t.id}" aria-label="查看指令 ${t.id} 详情">详情 ${icon('chevron-right')}</button></td></tr>`).join('') : `<tr><td colspan="8"><div class="table-empty">${icon('list-filter')}<strong>暂无${state.status === 'completed' ? '已完成' : '未完成'}指令</strong><span>${state.taskQuery || state.floor !== null || state.priority !== 'all' ? '请尝试调整搜索或筛选条件' : '当前设备在该分类下没有任务'}</span></div></td></tr>`;
  $('#table-range').textContent = rows.length ? `共 ${rows.length} 条记录，显示第 ${start + 1}–${Math.min(start + 6, rows.length)} 条` : '共 0 条记录';
  $('#page-number').textContent = state.page;
  $('#previous-page').disabled = state.page <= 1; $('#next-page').disabled = start + 6 >= rows.length;
  $('#sort-time').innerHTML = `下发时间 ${icon(state.descending ? 'arrow-down' : 'arrow-up')}`;
  $('#sort-time').closest('th').setAttribute('aria-sort', state.descending ? 'descending' : 'ascending');
}
const twin = createTwin($('#twin-canvas'), floor => { if (!current()) return; state.floor = floor; state.page = 1; renderTasks(); icons(); openRecords(); }, live => {
  simulationState = live;
  compactView.updateSimulation(live);
});
function render({ model = true } = {}) {
  document.querySelectorAll('[data-type]').forEach(el => { el.classList.toggle('active', el.dataset.type === state.type); el.setAttribute('aria-selected', String(el.dataset.type === state.type)); });
  renderMetrics(); renderDevices(); renderTelemetry(); renderTasks(); icons();
  if (model && current()) twin.update(current());
  syncUrl();
}
function selectDevice(id) {
  const d = devices.find(d => d.id === id); if (!d) throw new Error('设备不存在');
  if ($('#details-dialog').open) closeDialog();
  if ($('#records-dialog').open) $('#records-dialog').close();
  if ($('#filters-dialog').open) $('#filters-dialog').close();
  state.type = d.type; state.device = id; state.building = 'all'; state.deviceState = 'all'; state.query = ''; state.floor = null; state.page = 1; state.taskQuery = ''; state.priority = 'all';
  $('#device-search').value = ''; $('#task-search').value = ''; $('#priority-filter').value = 'all'; $('#building').value = 'all'; render(); return { ...d };
}
function applyDeviceFilters() { const list = visibleDevices(); if (!list.some(d => d.id === state.device)) { state.device = list[0]?.id || null; state.floor = null; state.page = 1; } render(); }
function resetDeviceFilters() { state.deviceState = 'all'; state.query = ''; $('#device-search').value = ''; applyDeviceFilters(); }

document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.type) { state.type = button.dataset.type; state.device = null; state.query = ''; state.deviceState = 'all'; state.floor = null; state.page = 1; state.taskQuery = ''; $('#device-search').value = ''; $('#task-search').value = ''; applyDeviceFilters(); }
  if (button.dataset.device) { if ($('#details-dialog').open) closeDialog(); const id = button.dataset.device; state.device = id; state.floor = null; state.page = 1; render(); }
  if (button.dataset.deviceState) { state.deviceState = button.dataset.deviceState; applyDeviceFilters(); }
  if (button.dataset.status) { state.status = button.dataset.status; state.page = 1; render({ model: false }); }
  if (button.dataset.command) showCommand(button.dataset.command);
  if (button.dataset.history) { state.status = button.dataset.history; state.floor = null; state.page = 1; render({ model: false }); openRecords(); }
  if (button.hasAttribute('data-device-details')) compactView.showDeviceDetails();
  if (button.dataset.dismiss) $(`#${button.dataset.dismiss}`).close();
  if (button.id === 'empty-reset') resetDeviceFilters();
  if (button.dataset.close !== undefined) closeDialog();
});
$('#device-search').addEventListener('input', event => { state.query = event.target.value; applyDeviceFilters(); });
$('#building').addEventListener('change', event => { state.building = event.target.value; applyDeviceFilters(); });
$('#clear-device-filters').addEventListener('click', resetDeviceFilters);
$('#task-search').addEventListener('input', event => { state.taskQuery = event.target.value; state.page = 1; renderTasks(); icons(); });
$('#priority-filter').addEventListener('change', event => { state.priority = event.target.value; state.page = 1; renderTasks(); icons(); });
$('#floor-select').addEventListener('change', e => { state.floor = e.target.value === 'all' ? null : Number(e.target.value); state.page = 1; renderTasks(); icons(); });
$('#floor-filter').addEventListener('click', () => { state.floor = null; renderTasks(); icons(); });
$('#sort-time').addEventListener('click', () => { state.descending = !state.descending; renderTasks(); icons(); });
$('#previous-page').addEventListener('click', () => { state.page--; renderTasks(); icons(); });
$('#next-page').addEventListener('click', () => { state.page++; renderTasks(); icons(); });
$('#refresh').addEventListener('click', () => { $('#refresh').classList.add('refreshing'); render(); setTimeout(() => $('#refresh').classList.remove('refreshing'), 600); toast('已重新读取演示数据 · 数据快照 2026-10-26 14:32:08'); });
$('#zoom-in').addEventListener('click', () => twin.zoom(1)); $('#zoom-out').addEventListener('click', () => twin.zoom(-1)); $('#reset-view').addEventListener('click', () => twin.reset()); $('#front-view').addEventListener('click', () => twin.front());
$('#toggle-demo').addEventListener('click', () => twin.toggleDemo());
$('#restart-demo').addEventListener('click', () => twin.restartDemo());
$('#expand-twin').addEventListener('click', () => { const expanded = $('.twin-panel').classList.toggle('expanded'); $('#expand-twin').setAttribute('aria-label', expanded ? '退出放大视图' : '放大三维视图'); });
document.querySelectorAll('[role="tablist"]').forEach(list => list.addEventListener('keydown', e => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')]; const index = tabs.indexOf(document.activeElement);
  if (index < 0) return; e.preventDefault();
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].click(); tabs[next].focus();
}));
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); $('#filters-dialog').showModal(); $('#device-search').focus(); } if (e.key === 'Escape') $('.twin-panel').classList.remove('expanded'); });
$('#export').addEventListener('click', () => {
  const rows = filteredTasks(); if (!rows.length) return toast('当前筛选下没有可导出的记录');
  const csv = [['指令编号', '设备编号', '任务类型', '起始楼层', '目标楼层', '状态', '优先级', '下发时间', '任务耗时'], ...rows.map(t => [t.id, t.deviceId, t.kind, t.origin, t.destination, TASK_STATE[t.status].label, t.priority === 'high' ? '高' : '普通', t.created, t.duration])].map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })); const a = document.createElement('a'); a.href = url; a.download = `VERTEX-${state.device}-${state.status}-20261026.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast(`已导出 ${rows.length} 条指令记录`);
});

let lastFocused;
function showDialog(html, wide = false) { lastFocused = document.activeElement; const dialog = $('#details-dialog'); dialog.classList.toggle('wide-dialog', wide); dialog.innerHTML = html; dialog.showModal(); icons(); }
function closeDialog() { $('#details-dialog').close(); lastFocused?.focus(); const p = new URLSearchParams(location.search); p.delete('command'); history.replaceState(null, '', `${location.pathname}?${p}`); }
$('#details-dialog').addEventListener('click', e => { if (e.target === $('#details-dialog')) { const rect = e.target.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeDialog(); } });
$('#details-dialog').addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
function openRecords() {
  if (!current()) return toast('请先选择设备');
  $('#records-title').textContent = `${current().name} · 任务记录`;
  if (!$('#records-dialog').open) $('#records-dialog').showModal();
}
$('#open-filters').addEventListener('click', () => $('#filters-dialog').showModal());
$('#overview-button').addEventListener('click', () => compactView.showOverview());
$('#records-dialog').addEventListener('close', () => document.querySelector(`[data-history="${state.status}"]`)?.focus());
for (const id of ['records-dialog', 'filters-dialog']) {
  const dialog = $(`#${id}`);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
function showCommand(id) {
  const t = tasks.find(t => t.id === id); if (!t) throw new Error('指令不存在');
  const d = devices.find(d => d.id === t.deviceId), s = TASK_STATE[t.status];
  showDialog(`<div class="dialog-heading"><div><span class="small-eyebrow">COMMAND DETAILS</span><h2 id="dialog-title">任务指令详情</h2></div><button class="icon-button" data-close aria-label="关闭详情">${icon('x')}</button></div><div class="dialog-command"><span class="mono">${t.id}</span>${chip(s.label, s.tone)}</div><div class="dialog-route"><div><span>起始楼层</span><strong>${String(t.origin).padStart(2, '0')}<small>F</small></strong></div><div class="route-track">${icon('arrow-right')}<span>${t.kind}</span></div><div><span>目标楼层</span><strong>${String(t.destination).padStart(2, '0')}<small>F</small></strong></div></div><dl class="detail-grid"><div><dt>执行设备</dt><dd>${d.name} / ${d.id}</dd></div><div><dt>所属位置</dt><dd>${d.building} · ${d.location}</dd></div><div><dt>指令来源</dt><dd>${t.source}</dd></div><div><dt>任务优先级</dt><dd>${t.priority === 'high' ? '高优先级' : '普通'}</dd></div><div><dt>下发时间</dt><dd class="mono">${t.created}</dd></div><div><dt>累计耗时</dt><dd>${t.duration}</dd></div></dl><h3 class="timeline-title">执行进度</h3><ol class="timeline"><li class="done"><span>${icon('check')}</span><div><strong>指令已下发</strong><small>调度中心已创建任务</small></div><time>${t.created.slice(11)}</time></li><li class="${t.started ? 'done' : ''}"><span>${icon(t.started ? 'check' : 'circle')}</span><div><strong>${t.started ? '设备已接收' : '等待设备接收'}</strong><small>${t.started ? '设备确认任务，准备执行' : '任务进入调度队列'}</small></div><time>${t.started || '—'}</time></li><li class="${t.status === 'completed' ? 'done' : t.status === 'running' ? 'current' : t.status === 'blocked' ? 'error' : ''}"><span>${icon(t.status === 'blocked' ? 'triangle-alert' : t.status === 'completed' ? 'check' : 'play')}</span><div><strong>${t.status === 'blocked' ? '执行异常 · 任务阻塞' : t.status === 'completed' ? '运输已完成' : t.status === 'running' ? '设备运输中' : '等待运输'}</strong><small>${t.status === 'blocked' ? esc(d.alarm) : `${t.origin} F → ${t.destination} F`}</small></div><time>${t.completed || (t.status === 'running' ? '进行中' : '—')}</time></li></ol><div class="dialog-footer"><span>静态数据 · 仅用于界面演示</span><button class="button primary" data-close>完成</button></div>`);
  const p = new URLSearchParams(location.search); p.set('command', id); history.replaceState(null, '', `${location.pathname}?${p}`); return { ...t };
}
function showHelp(agent = false) {
  const base = `${location.origin}${location.pathname}`;
  showDialog(`<div class="dialog-heading"><div><span class="small-eyebrow">${agent ? 'AGENT INTEGRATION' : 'WORKSPACE GUIDE'}</span><h2 id="dialog-title">${agent ? '为你的 Agent 准备就绪' : '垂直运输监控工作台'}</h2></div><button class="icon-button" data-close aria-label="关闭说明">${icon('x')}</button></div><p class="help-intro">${agent ? '使用 URL 直接定位设备和任务；通过页面公开接口读取静态数据、切换设备，或将页面嵌入你的服务。' : '从设备总览到单条指令，一次选择即可联动查询。EL-01 提供循环运行与开关门演示，其余设备和任务记录为固定快照；页面不连接真实设备。'}</p>${agent ? `<div class="help-section"><h3>嵌入服务</h3><code class="code-block">&lt;iframe src="${esc(base)}?embed=1&amp;type=elevator&amp;device=EL-01" title="垂直运输监控"&gt;&lt;/iframe&gt;</code></div><div class="help-section"><h3>URL 定位参数</h3><div class="param-row"><code>type</code><span>elevator / hoist / lans</span></div><div class="param-row"><code>device</code><span>EL-01 / HT-01 / LS-01 等设备编号</span></div><div class="param-row"><code>status</code><span>pending / completed</span></div><div class="param-row"><code>command</code><span>指令编号，打开对应明细</span></div><div class="param-row"><code>embed=1</code><span>隐藏外层导航，适应嵌入容器</span></div></div><div class="help-section"><h3>页面内 JavaScript API</h3><code class="code-block">window.TransportMonitor.getSnapshot()<br>window.TransportMonitor.selectDevice('LS-01')<br>window.TransportMonitor.setStatus('completed')<br>window.TransportMonitor.openCommand('CMD-20261026-0001')</code><p class="help-note">跨域 iframe 使用 postMessage；事件契约见仓库 README。当前接口仅读取和浏览演示数据。</p></div>` : `<div class="guide-step"><span>01</span><div><h3>选择设备类型与建筑</h3><p>切换三类设备，点击设备卡片查看状态；点击“设备在线”查看汇总统计。</p></div></div><div class="guide-step"><span>02</span><div><h3>点击设备，联动数字孪生</h3><p>拖动旋转模型，点击楼层筛选相关指令。右侧保留楼层、状态、模式和告警，点击状态查看完整参数。</p></div></div><div class="guide-step"><span>03</span><div><h3>追踪每一条任务</h3><p>点击未完成 / 已完成打开任务记录弹窗，再筛选、查看进度或导出 CSV。</p></div></div><div class="help-tip">${icon('code-2')}点击右上角接入图标，查看 Agent 和 iframe 接入方式。</div>`}<div class="dialog-footer"><span>VERTEX / 模拟演示 v1.3</span><button class="button primary" data-close>知道了</button></div>`, true);
}
$('#agent-help').addEventListener('click', () => showHelp(true)); $('#help-button').addEventListener('click', () => showHelp());
const api = {
  version: '1.3.0',
  getSnapshot: () => ({ demo: true, snapshotAt: SNAPSHOT, selection: { type: state.type, device: state.device, status: state.status }, devices: devices.map(d => ({ ...d })), tasks: tasks.map(t => ({ ...t })), simulation: twin.getDemoState() }),
  selectDevice,
  setStatus(status) { if (!['pending', 'completed'].includes(status)) throw new Error('status 必须为 pending 或 completed'); state.status = status; state.page = 1; render({ model: false }); return { status }; },
  openCommand(id) { const t = tasks.find(t => t.id === id); if (!t) throw new Error('指令不存在'); selectDevice(t.deviceId); api.setStatus(t.status === 'completed' ? 'completed' : 'pending'); return showCommand(id); },
};
window.TransportMonitor = Object.freeze(api);
// Only the embedding parent may invoke the read-only navigation contract. No arbitrary scripts or URLs are accepted.
window.addEventListener('message', event => {
  if (event.source !== window.parent || window.parent === window) return;
  const msg = event.data; if (!msg || msg.channel !== 'vertex-monitor' || typeof msg.requestId !== 'string') return;
  const actions = { getSnapshot: () => api.getSnapshot(), selectDevice: () => api.selectDevice(msg.deviceId), setStatus: () => api.setStatus(msg.status), openCommand: () => api.openCommand(msg.commandId) };
  if (!Object.hasOwn(actions, msg.action)) return;
  try { event.source.postMessage({ channel: 'vertex-monitor', requestId: msg.requestId, ok: true, data: actions[msg.action]() }, event.origin); }
  catch (e) { event.source.postMessage({ channel: 'vertex-monitor', requestId: msg.requestId, ok: false, error: e.message }, event.origin); }
});
render();
if (params.get('command')) { try { api.openCommand(params.get('command')); } catch { toast('该指令不存在，已显示默认设备视图'); } }
window.addEventListener('pagehide', event => { if (!event.persisted) twin.dispose(); });
