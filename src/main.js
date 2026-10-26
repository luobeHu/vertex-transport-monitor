import '@fontsource-variable/dm-sans/standard.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './style.css';
import { createIcons, Activity, ArrowDown, ArrowUpRight, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Bell, Blocks, Boxes, Building2, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Circle, CircleCheck, CircleHelp, CirclePause, Clock3, Code2, Container, Copy, Cpu, Expand, ExternalLink, FileText, Filter, Gauge, Layers3, LayoutDashboard, ListFilter, ListOrdered, Maximize2, Minus, MoreHorizontal, MoveUpRight, MousePointer2, PanelsTopLeft, Package, PanelLeftClose, Play, Plus, Radio, RefreshCw, RotateCcw, Search, Settings2, ShieldCheck, SlidersHorizontal, TriangleAlert, Wifi, WifiOff, X, Zap } from 'lucide';
import { devices, tasks, TYPES, STATE, TASK_STATE, SNAPSHOT, getTasks } from './data.js';
import { createTwin } from './twin.js';

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

$('#app').innerHTML = `
  <a class="skip-link" href="#main">跳至监控内容</a>
  <aside class="rail" aria-label="主导航">
    <a class="brand-mark" href="?" aria-label="VERTEX 首页"><svg viewBox="0 0 32 32" fill="none"><path d="M6 7h7l5 12 5-12h5L18 28h-4L6 7Z" fill="currentColor"/><path d="m4 7 9 21h-3L1 7h3Z" fill="currentColor" opacity=".4"/></svg></a>
    <div class="rail-line"></div>
    <nav>
      <button class="rail-item active" data-nav="overview" aria-label="设备监控" title="设备监控">${icon('layout-dashboard')}<span>监控</span></button>
      <button class="rail-item" data-nav="commands" aria-label="任务指令" title="任务指令">${icon('list-ordered')}<span>指令</span></button>
      <button class="rail-item" data-nav="alerts" aria-label="设备告警" title="设备告警">${icon('bell')}<span>告警</span><b class="rail-dot"></b></button>
    </nav>
    <div class="rail-bottom"><button class="rail-item" id="agent-help" title="Agent 接入说明" aria-label="Agent 接入说明">${icon('code-2')}<span>接入</span></button><button class="avatar" id="about-button" aria-label="关于演示页面" title="关于演示页面">V</button></div>
  </aside>
  <header class="topbar">
    <div class="brand-title">VERTEX<span class="brand-divider"></span><span>垂直运输管理平台</span><span class="edition">WORKSPACE</span></div>
    <div class="topbar-right"><span class="demo-pill"><span></span>静态演示环境</span><span class="header-divider"></span><button class="help-button" id="help-button" aria-label="使用说明" title="使用说明">${icon('circle-help')}</button><span class="operator">OP<span>运营工作台</span></span></div>
  </header>
  <main id="main">
    <div class="page-heading"><div><div class="eyebrow">OPERATIONS / VERTICAL TRANSPORT</div><h1>垂直运输监控<span class="live-label">设备全景</span></h1><p>掌握每一次垂直流转，让设备状态与任务进度清晰可见。</p></div><div class="page-actions"><label class="select-shell">${icon('building-2')}<select id="building" aria-label="选择建筑"><option value="all">全部建筑</option><option>A 栋</option><option>B 栋</option><option>C 栋</option></select>${icon('chevron-down')}</label><button class="button" id="refresh">${icon('refresh-cw')}<span>刷新数据</span></button></div></div>
    <div class="typebar"><div class="type-tabs" role="tablist" aria-label="设备类型">${TYPES.map(t => `<button role="tab" data-type="${t.id}">${icon(t.icon)}${t.name}<span>04</span></button>`).join('')}</div><div class="snapshot">${icon('clock-3')}<span>数据快照&nbsp; 2026.10.26&nbsp; 14:32:08</span></div></div>
    <section class="metrics" id="metrics" aria-label="设备汇总统计"></section>
    <div class="workspace" id="workspace">
      <section class="panel devices-panel" aria-labelledby="devices-title"><div class="panel-heading"><h2 id="devices-title">设备列表 <span class="count" id="device-count"></span></h2><button class="icon-button" id="clear-device-filters" title="重置设备筛选" aria-label="重置设备筛选">${icon('list-filter')}</button></div><div class="device-search">${icon('search')}<input id="device-search" aria-label="搜索设备编号或名称" placeholder="搜索设备编号 / 名称" autocomplete="off"><span>⌘ K</span></div><div class="device-filter"><button class="filter-chip active" data-device-state="all">全部设备</button><button class="filter-chip" data-device-state="running">运行中</button><button class="filter-chip" data-device-state="alarm">告警 <span class="red-dot"></span></button></div><div id="devices-list" class="devices-list"></div><div class="device-panel-footer">${icon('mouse-pointer-2')}<span>选择设备，联动查看状态与指令</span></div></section>
      <section class="panel twin-panel" aria-label="设备数字孪生与状态"><div class="twin-main"><div class="twin-heading"><div><span class="small-eyebrow">DIGITAL TWIN</span><h2>设备数字孪生 <span class="tag tag-neutral">3D</span></h2></div><button class="icon-button" id="expand-twin" aria-label="放大三维视图" title="放大三维视图">${icon('maximize-2')}</button></div><div class="scene-label" id="scene-label"></div><div id="twin-canvas" class="twin-canvas"></div><div class="scene-empty" hidden>暂无符合条件的设备</div><div class="scene-floor-note" id="floor-note"></div><div class="view-toolbar"><button class="icon-button" id="zoom-in" title="放大" aria-label="放大模型">${icon('plus')}</button><button class="icon-button" id="zoom-out" title="缩小" aria-label="缩小模型">${icon('minus')}</button><span></span><button class="icon-button" id="reset-view" title="重置视角" aria-label="重置视角">${icon('rotate-ccw')}</button><button class="icon-button" id="front-view" title="正面视角" aria-label="正面视角">${icon('panels-top-left')}</button></div><div class="scene-bottom"><span><i class="legend-square"></i>当前楼层 <i class="legend-square gray"></i>楼层结构</span><span>拖动旋转 · 滚轮缩放</span></div></div><div class="telemetry" id="telemetry"></div></section>
    </div>
    <section class="panel tasks-panel" id="commands" aria-labelledby="commands-title"><div class="task-header"><div><h2 id="commands-title">任务指令 <span class="tag tag-neutral" id="task-device"></span></h2><span class="section-description">设备与任务联动，追踪完整执行过程</span></div><button class="button" id="export">${icon('arrow-down-to-line')}导出记录</button></div><div class="task-toolbar"><div class="status-tabs" role="tablist" aria-label="任务完成状态"><button data-status="pending" role="tab">未完成 <span id="pending-count"></span></button><button data-status="completed" role="tab">已完成 <span id="completed-count"></span></button></div><div class="task-filters"><label class="select-shell slim floor-select">${icon('layers-3')}<select id="floor-select" aria-label="按楼层筛选"><option value="all">全部楼层</option></select>${icon('chevron-down')}</label><button id="floor-filter" class="floor-filter" hidden></button><div class="task-search">${icon('search')}<input id="task-search" placeholder="搜索指令编号" aria-label="搜索指令编号"></div><label class="select-shell slim">${icon('sliders-horizontal')}<select id="priority-filter" aria-label="按优先级筛选"><option value="all">全部优先级</option><option value="high">高优先级</option><option value="normal">普通优先级</option></select>${icon('chevron-down')}</label></div></div><div class="table-wrap"><table><thead><tr><th>指令编号</th><th>任务类型</th><th>运输路径</th><th>执行状态</th><th>优先级</th><th><button class="sort-button" id="sort-time">下发时间 ${icon('arrow-down')}</button></th><th>任务耗时</th><th class="align-right">操作</th></tr></thead><tbody id="task-rows"></tbody></table></div><div class="table-footer"><span id="table-range"></span><div class="pagination"><span>6 条 / 页</span><button class="icon-button" id="previous-page" aria-label="上一页">${icon('chevron-left')}</button><span class="page-number" id="page-number">1</span><button class="icon-button" id="next-page" aria-label="下一页">${icon('chevron-right')}</button></div></div></section>
    <footer class="page-footer"><span><span class="footer-dot"></span> VERTEX · 让垂直运输有迹可循</span><span>所有设备与指令均为模拟数据 <span class="footer-divider">/</span> v1.0.0</span></footer>
  </main>
  <div class="modal-backdrop" id="modal-backdrop" hidden></div><dialog id="details-dialog" class="details-dialog" aria-labelledby="dialog-title"></dialog><div class="toast" id="toast" role="status" aria-live="polite"></div>
`;
// Icons are selected explicitly to keep the static bundle small.
const icons = () => createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.7, 'aria-hidden': 'true' } });
const current = () => devices.find(d => d.id === state.device);
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
function renderMetrics() {
  const ds = scopeDevices(), ids = new Set(ds.map(d => d.id)), ts = tasks.filter(t => ids.has(t.deviceId));
  const done = ts.filter(t => t.status === 'completed').length, pending = ts.length - done, online = ds.filter(d => d.online).length, alarms = ds.filter(d => d.alarm).length;
  const pct = ts.length ? (done / ts.length * 100).toFixed(1) : '0.0';
  $('#metrics').innerHTML = `
    <div class="metric"><div class="metric-top"><span>设备在线</span><span class="metric-icon green">${icon('radio')}</span></div><div class="metric-value">${String(online).padStart(2, '0')}<span>/ ${String(ds.length).padStart(2, '0')} 台</span><div class="mini-bars">${ds.map(d => `<i class="${d.online ? 'on' : ''}"></i>`).join('')}</div></div><div class="metric-bottom"><span class="green-text">${ds.length ? Math.round(online / ds.length * 100) : 0}% 在线率</span><span>${ds.filter(d => !d.online).length} 台离线</span></div></div>
    <button class="metric metric-link" data-metric="pending"><div class="metric-top"><span>未完成指令</span><span class="metric-icon amber">${icon('list-ordered')}</span></div><div class="metric-value">${String(pending).padStart(2, '0')}<span>条</span><svg class="sparkline" viewBox="0 0 108 32" aria-hidden="true"><path d="M0 25 14 25 25 15 39 21 51 8 63 12 77 6 92 14 108 4" fill="none" stroke="#d9a356" stroke-width="2"/></svg></div><div class="metric-bottom"><span>${ts.filter(t => t.status === 'running').length} 执行中 <b>·</b> ${ts.filter(t => t.status === 'waiting').length} 待执行 <b>·</b> ${ts.filter(t => t.status === 'blocked').length} 阻塞</span><span class="metric-arrow">${icon('arrow-up-right')}</span></div></button>
    <button class="metric metric-link" data-metric="completed"><div class="metric-top"><span>今日已完成</span><span class="metric-icon green">${icon('check-check')}</span></div><div class="metric-value">${done}<span>条</span><svg class="sparkline" viewBox="0 0 108 32" aria-hidden="true"><path d="M0 28 15 23 29 26 40 18 54 20 66 10 80 14 95 4 108 3" fill="none" stroke="#368c70" stroke-width="2"/></svg></div><div class="metric-bottom"><span class="green-text">任务完成率 ${pct}%</span><span class="metric-arrow">${icon('arrow-up-right')}</span></div></button>
    <button class="metric metric-link alert-metric" data-metric="alarms"><div class="metric-top"><span>设备告警</span><span class="metric-icon red">${icon('triangle-alert')}</span></div><div class="metric-value">${String(alarms).padStart(2, '0')}<span>台</span><span class="alert-chart">${icon('activity')}</span></div><div class="metric-bottom"><span class="red-text">${alarms ? '层门联锁异常，待处理' : '当前无设备告警'}</span><span class="metric-arrow">${icon('arrow-right')}</span></div></button>`;
}
function renderDevices() {
  const list = visibleDevices(); $('#device-count').textContent = list.length.toString().padStart(2, '0');
  $('#devices-list').innerHTML = list.length ? list.map(d => {
    const s = STATE[d.state], count = getTasks(d.id, 'pending').length;
    return `<button class="device-card ${d.id === state.device ? 'selected' : ''}" data-device="${d.id}" aria-pressed="${d.id === state.device}"><div class="device-card-top"><span class="device-icon ${s.tone}">${icon(TYPES.find(t => t.id === d.type).icon)}</span><span class="device-name">${d.name}<small>${d.id} <b>·</b> ${d.building}</small></span>${chip(s.label, s.tone)}</div><div class="device-card-bottom"><span><strong>${String(d.floor).padStart(2, '0')}</strong><small>F</small><span class="floor-direction ${d.state === 'running' ? 'green-text' : ''}">${icon(d.state === 'running' ? 'arrow-up' : 'minus')}</span></span><span class="pending-label">未完成 <b>${count}</b> 条</span>${icon('chevron-right')}</div></button>`;
  }).join('') : `<div class="empty-state">${icon('search')}<strong>未找到匹配设备</strong><p>试试其他关键词或重置筛选</p><button class="text-button" id="empty-reset">重置筛选</button></div>`;
  document.querySelectorAll('[data-device-state]').forEach(el => { el.classList.toggle('active', el.dataset.deviceState === state.deviceState); el.setAttribute('aria-pressed', String(el.dataset.deviceState === state.deviceState)); });
}
function renderTelemetry() {
  const d = current();
  $('#twin-canvas').style.visibility = d ? 'visible' : 'hidden'; $('.scene-empty').hidden = !!d;
  if (!d) { $('#telemetry').innerHTML = '<div class="empty-state">选择设备后查看运行状态</div>'; $('#scene-label').innerHTML = ''; $('#floor-note').innerHTML = ''; return; }
  const s = STATE[d.state];
  $('#scene-label').innerHTML = `<span class="scene-device-id">${d.id}</span>${chip(s.label, s.tone)}<span class="scene-building">${d.building} · ${d.floors} 层</span>`;
  $('#floor-note').innerHTML = `<span class="floor-note-line"></span><div><span>当前楼层</span><strong>${String(d.floor).padStart(2, '0')}<small> F</small></strong></div>`;
  $('#telemetry').innerHTML = `<div class="telemetry-title"><span>运行状态</span><span class="connection ${d.online ? '' : 'disconnected'}"><i></i>${d.online ? '设备在线' : '设备离线'}</span></div><div class="telemetry-device"><h3>${d.name}</h3><span>${d.location}</span></div><div class="floor-display"><div><span>所在楼层</span><strong>${String(d.floor).padStart(2, '0')}<small> F</small></strong></div><div class="target-floor">${icon(d.state === 'running' ? 'arrow-up' : 'minus')}<span>${d.state === 'running' ? `前往 ${d.target} F` : '当前停靠'}</span></div></div><dl class="telemetry-data"><div><dt>${icon('activity')}设备状态</dt><dd>${chip(s.label, s.tone)}</dd></div><div><dt>${icon('settings-2')}设备模式</dt><dd>${d.mode}</dd></div><div><dt>${icon('gauge')}运行速度</dt><dd><span class="mono">${d.speed.toFixed(1)}</span> <small>m/s</small></dd></div><div><dt>${icon('package')}额定载重</dt><dd class="mono">${d.capacity}</dd></div><div><dt>${icon('shield-check')}告警状态</dt><dd class="${d.alarm ? 'red-text' : 'green-text'}">${icon(d.alarm ? 'triangle-alert' : 'circle-check')}${d.alarm ? '1 项告警' : '无告警'}</dd></div></dl><div class="telemetry-notice ${d.alarm ? 'alarm-notice' : ''}">${icon(d.alarm ? 'triangle-alert' : d.online ? 'circle-check' : 'wifi-off')}<div><strong>${d.alarm ? '层门联锁异常' : d.online ? '设备运行状态正常' : '设备连接已断开'}</strong><span>${d.alarm ? 'E-032 · 请联系现场人员检查' : d.online ? '安全回路与通信状态正常' : '设备处于检修模式，等待恢复'}</span></div></div><div class="telemetry-time">${icon('clock-3')}快照时间 <span>14:32:08</span></div>`;
}
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
const twin = createTwin($('#twin-canvas'), floor => { if (!current()) return; state.floor = floor; state.page = 1; renderTasks(); icons(); toast(`已筛选途经 ${floor} F 的任务指令`); });
function render({ model = true } = {}) {
  document.querySelectorAll('[data-type]').forEach(el => { el.classList.toggle('active', el.dataset.type === state.type); el.setAttribute('aria-selected', String(el.dataset.type === state.type)); });
  renderMetrics(); renderDevices(); renderTelemetry(); renderTasks(); icons();
  if (model && current()) twin.update(current());
  syncUrl();
}
function selectDevice(id) {
  const d = devices.find(d => d.id === id); if (!d) throw new Error('设备不存在');
  if ($('#details-dialog').open) closeDialog();
  state.type = d.type; state.device = id; state.building = 'all'; state.deviceState = 'all'; state.query = ''; state.floor = null; state.page = 1; state.taskQuery = ''; state.priority = 'all';
  $('#device-search').value = ''; $('#task-search').value = ''; $('#priority-filter').value = 'all'; $('#building').value = 'all'; render(); return { ...d };
}
function applyDeviceFilters() { const list = visibleDevices(); if (!list.some(d => d.id === state.device)) { state.device = list[0]?.id || null; state.floor = null; state.page = 1; } render(); }
function resetDeviceFilters() { state.deviceState = 'all'; state.query = ''; $('#device-search').value = ''; applyDeviceFilters(); }

document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.type) { state.type = button.dataset.type; state.device = null; state.query = ''; state.deviceState = 'all'; state.floor = null; state.page = 1; state.taskQuery = ''; $('#device-search').value = ''; $('#task-search').value = ''; applyDeviceFilters(); }
  if (button.dataset.device) { const id = button.dataset.device; state.device = id; state.floor = null; state.page = 1; render(); }
  if (button.dataset.deviceState) { state.deviceState = button.dataset.deviceState; applyDeviceFilters(); }
  if (button.dataset.status) { state.status = button.dataset.status; state.page = 1; render({ model: false }); }
  if (button.dataset.command) showCommand(button.dataset.command);
  if (button.dataset.metric) { if (button.dataset.metric === 'alarms') { state.deviceState = 'alarm'; applyDeviceFilters(); $('#workspace').scrollIntoView({ behavior: 'smooth', block: 'center' }); } else { state.status = button.dataset.metric; state.page = 1; render({ model: false }); $('#commands').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  if (button.dataset.nav) { document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b === button)); if (button.dataset.nav === 'alerts') { state.deviceState = 'alarm'; applyDeviceFilters(); } (button.dataset.nav === 'commands' ? $('#commands') : $('#workspace')).scrollIntoView({ behavior: 'smooth', block: 'start' }); }
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
$('#expand-twin').addEventListener('click', () => { const expanded = $('.twin-panel').classList.toggle('expanded'); $('#expand-twin').setAttribute('aria-label', expanded ? '退出放大视图' : '放大三维视图'); });
document.querySelectorAll('[role="tablist"]').forEach(list => list.addEventListener('keydown', e => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')]; const index = tabs.indexOf(document.activeElement);
  if (index < 0) return; e.preventDefault();
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].click(); tabs[next].focus();
}));
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); $('#device-search').focus(); } if (e.key === 'Escape') $('.twin-panel').classList.remove('expanded'); });
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
function showCommand(id) {
  const t = tasks.find(t => t.id === id); if (!t) throw new Error('指令不存在');
  const d = devices.find(d => d.id === t.deviceId), s = TASK_STATE[t.status];
  showDialog(`<div class="dialog-heading"><div><span class="small-eyebrow">COMMAND DETAILS</span><h2 id="dialog-title">任务指令详情</h2></div><button class="icon-button" data-close aria-label="关闭详情">${icon('x')}</button></div><div class="dialog-command"><span class="mono">${t.id}</span>${chip(s.label, s.tone)}</div><div class="dialog-route"><div><span>起始楼层</span><strong>${String(t.origin).padStart(2, '0')}<small>F</small></strong></div><div class="route-track">${icon('arrow-right')}<span>${t.kind}</span></div><div><span>目标楼层</span><strong>${String(t.destination).padStart(2, '0')}<small>F</small></strong></div></div><dl class="detail-grid"><div><dt>执行设备</dt><dd>${d.name} / ${d.id}</dd></div><div><dt>所属位置</dt><dd>${d.building} · ${d.location}</dd></div><div><dt>指令来源</dt><dd>${t.source}</dd></div><div><dt>任务优先级</dt><dd>${t.priority === 'high' ? '高优先级' : '普通'}</dd></div><div><dt>下发时间</dt><dd class="mono">${t.created}</dd></div><div><dt>累计耗时</dt><dd>${t.duration}</dd></div></dl><h3 class="timeline-title">执行进度</h3><ol class="timeline"><li class="done"><span>${icon('check')}</span><div><strong>指令已下发</strong><small>调度中心已创建任务</small></div><time>${t.created.slice(11)}</time></li><li class="${t.started ? 'done' : ''}"><span>${icon(t.started ? 'check' : 'circle')}</span><div><strong>${t.started ? '设备已接收' : '等待设备接收'}</strong><small>${t.started ? '设备确认任务，准备执行' : '任务进入调度队列'}</small></div><time>${t.started || '—'}</time></li><li class="${t.status === 'completed' ? 'done' : t.status === 'running' ? 'current' : t.status === 'blocked' ? 'error' : ''}"><span>${icon(t.status === 'blocked' ? 'triangle-alert' : t.status === 'completed' ? 'check' : 'play')}</span><div><strong>${t.status === 'blocked' ? '执行异常 · 任务阻塞' : t.status === 'completed' ? '运输已完成' : t.status === 'running' ? '设备运输中' : '等待运输'}</strong><small>${t.status === 'blocked' ? esc(d.alarm) : `${t.origin} F → ${t.destination} F`}</small></div><time>${t.completed || (t.status === 'running' ? '进行中' : '—')}</time></li></ol><div class="dialog-footer"><span>静态数据 · 仅用于界面演示</span><button class="button primary" data-close>完成</button></div>`);
  const p = new URLSearchParams(location.search); p.set('command', id); history.replaceState(null, '', `${location.pathname}?${p}`); return { ...t };
}
function showHelp(agent = false) {
  const base = `${location.origin}${location.pathname}`;
  showDialog(`<div class="dialog-heading"><div><span class="small-eyebrow">${agent ? 'AGENT INTEGRATION' : 'WORKSPACE GUIDE'}</span><h2 id="dialog-title">${agent ? '为你的 Agent 准备就绪' : '垂直运输监控工作台'}</h2></div><button class="icon-button" data-close aria-label="关闭说明">${icon('x')}</button></div><p class="help-intro">${agent ? '使用 URL 直接定位设备和任务；通过页面公开接口读取静态数据、切换设备，或将页面嵌入你的服务。' : '从设备总览到单条指令，一次选择即可联动查询。所有数据为固定演示快照，页面不会向真实设备下发控制指令。'}</p>${agent ? `<div class="help-section"><h3>嵌入服务</h3><code class="code-block">&lt;iframe src="${esc(base)}?embed=1&amp;type=elevator&amp;device=EL-01" title="垂直运输监控"&gt;&lt;/iframe&gt;</code></div><div class="help-section"><h3>URL 定位参数</h3><div class="param-row"><code>type</code><span>elevator / hoist / lans</span></div><div class="param-row"><code>device</code><span>EL-01 / HT-01 / LS-01 等设备编号</span></div><div class="param-row"><code>status</code><span>pending / completed</span></div><div class="param-row"><code>command</code><span>指令编号，打开对应明细</span></div><div class="param-row"><code>embed=1</code><span>隐藏外层导航，适应嵌入容器</span></div></div><div class="help-section"><h3>页面内 JavaScript API</h3><code class="code-block">window.TransportMonitor.getSnapshot()<br>window.TransportMonitor.selectDevice('LS-01')<br>window.TransportMonitor.setStatus('completed')<br>window.TransportMonitor.openCommand('CMD-20261026-0001')</code><p class="help-note">跨域 iframe 使用 postMessage；事件契约见仓库 README。当前接口仅读取和浏览演示数据。</p></div>` : `<div class="guide-step"><span>01</span><div><h3>选择设备类型与建筑</h3><p>在电梯、提升机、蓝思提升机之间切换，查看对应设备统计。</p></div></div><div class="guide-step"><span>02</span><div><h3>点击设备，联动数字孪生</h3><p>拖动旋转模型，点击楼层筛选相关指令。右侧查看楼层、状态、设备模式和告警。</p></div></div><div class="guide-step"><span>03</span><div><h3>追踪每一条任务</h3><p>切换未完成 / 已完成，按指令编号和优先级筛选，查看任务进度或导出 CSV。</p></div></div><div class="help-tip">${icon('code-2')}点击左侧“接入”，查看 Agent 和 iframe 接入方式。</div>`}<div class="dialog-footer"><span>VERTEX / 静态演示 v1.0</span><button class="button primary" data-close>知道了</button></div>`, true);
}
$('#agent-help').addEventListener('click', () => showHelp(true)); $('#help-button').addEventListener('click', () => showHelp()); $('#about-button').addEventListener('click', () => showHelp());
const api = {
  version: '1.0.0',
  getSnapshot: () => ({ demo: true, snapshotAt: SNAPSHOT, selection: { type: state.type, device: state.device, status: state.status }, devices: devices.map(d => ({ ...d })), tasks: tasks.map(t => ({ ...t })) }),
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
window.addEventListener('pagehide', () => twin.dispose(), { once: true });
