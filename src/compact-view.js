import { renderDiagramHud } from './diagram-hud.js';
import { summarizeOnboard } from './cabin-data.js';
import { DEMO_DEVICE_ID, DOOR_STATE } from './simulation.js';

export function createCompactView(ctx) {
  const { $, state, tasks, TYPES, STATE, TASK_STATE, SNAPSHOT, getTasks, icon, chip, scopeDevices, visibleDevices, current, showDialog, getDemoState, icons } = ctx;

  function renderMetrics() {
    const list = scopeDevices();
    const online = list.filter(d => d.online).length;
    const alarms = list.filter(d => d.alarm).length;
    $('#overview-summary').innerHTML = `<span>${online}/${list.length} 设备在线</span>${alarms ? `<span class="overview-alert">${alarms} 台告警</span>` : ''}`;
  }

  function renderDevices() {
    const list = visibleDevices();
    $('#device-count').textContent = list.length;
    $('#devices-list').innerHTML = list.length ? list.map(d => {
      const live = d.id === DEMO_DEVICE_ID ? getDemoState() : null;
      const status = STATE[live?.state || d.state];
      const tag = d.id === DEMO_DEVICE_ID ? chip(status.label,status.tone).replace('class="tag ', 'data-demo-list-state class="tag ') : chip(status.label,status.tone);
      return `<button class="compact-device ${d.id === state.device ? 'selected' : ''}" data-device="${d.id}" aria-pressed="${d.id === state.device}"><span class="compact-device-title"><span class="equipment-id">${d.id}</span>${tag}</span><span class="compact-device-meta">${d.name}<span ${d.id === DEMO_DEVICE_ID ? 'data-demo-list-floor' : ''}>${String(live?.floor || d.floor).padStart(2, '0')} F</span></span></button>`;
    }).join('') : `<div class="compact-empty">${icon('search')}<span>没有匹配的设备</span><button class="text-button" id="empty-reset">重置筛选</button></div>`;
    $('#filter-label').textContent = state.building !== 'all' || state.query || state.deviceState !== 'all' ? '已筛选' : '筛选';
    $('#filter-results').textContent = `匹配 ${list.length} 台设备`;
    document.querySelectorAll('[data-device-state]').forEach(el => {
      el.classList.toggle('active', el.dataset.deviceState === state.deviceState);
      el.setAttribute('aria-pressed', String(el.dataset.deviceState === state.deviceState));
    });
  }

  function renderTelemetry() {
    const d = current();
    const isDemo = d?.id === DEMO_DEVICE_ID;
    $('#demo-controls').hidden = !isDemo;
    $('#demo-badge').hidden = !isDemo;
    $('.twin-main').classList.toggle('is-simulating', isDemo);
    $('#twin-canvas').style.visibility = d ? 'visible' : 'hidden';
    $('.scene-empty').hidden = !!d;
    $('#floor-note').innerHTML = '';
    if (!d) {
      $('#telemetry').innerHTML = '<div class="empty-state">选择设备后查看运行状态</div>';
      $('#scene-label').innerHTML = '';
      return;
    }
    const status=STATE[d.state],pending=getTasks(d.id,'pending'),done=getTasks(d.id,'completed');
    $('#scene-label').innerHTML=`<span class="scene-device-id">${d.id}</span><span class="scene-building">${d.name} · ${d.floors} 层结构</span>`;
    $('#telemetry').innerHTML=renderDiagramHud({d,isDemo,status,pending,done,icon,chip});
    if(isDemo&&getDemoState())updateSimulation(getDemoState());
  }

  function updateSimulation(live) {
    if (!live || state.device !== DEMO_DEVICE_ID) return;
    const put = (selector, text) => { const el=$(selector); if (el && el.textContent !== text) el.textContent=text; };
    put('[data-live-floor]', String(live.floor).padStart(2,'0'));
    put('[data-live-floor-label]', live.moving ? '经过楼层' : '所在楼层');
    put('[data-live-door]', DOOR_STATE[live.doorStatus]);
    put('[data-live-direction]', live.paused ? '演示暂停' : live.moving ? `${live.direction === 'up' ? '上行' : '下行'} → ${live.target} F` : `停靠 ${live.floor} F`);
    const arrow=$('.compact-direction>svg'); if (arrow) { arrow.style.transform=live.direction === 'down' ? 'rotate(180deg)' : ''; arrow.style.visibility=live.moving && !live.paused ? 'visible' : 'hidden'; }
    const label=live.paused ? '演示暂停' : live.moving ? '运行中' : '停靠中';
    const tone=live.paused ? 'gray' : live.moving ? 'green' : 'blue';
    const machine=$('[data-live-state]'); if (machine && machine.dataset.value !== label) { machine.innerHTML=chip(label,tone); machine.dataset.value=label; }
    const list=$('[data-demo-list-state]'); if(list && list.dataset.value !== label) { list.className=`tag tag-${tone}`; list.innerHTML=`<span class="tag-dot"></span>${label}`; list.dataset.value=label; }
    put('[data-demo-list-floor]', `${String(live.floor).padStart(2,'0')} F`);
    put('[data-demo-origin]', String(live.origin)); put('[data-demo-target]', String(live.target));
    put('[data-demo-phase]', `${live.phaseLabel}${live.paused?' · 已暂停':''}`);
    const load=summarizeOnboard(current().cabin,live);
    put('[data-diagram-load]',`${live.loadLabel} · ${load.weightKg??'—'} kg`);
    put('[data-load-detail]',load.occupancy==='empty'?'轿厢内无 AGV、无货物':load.occupancy==='loaded'?`${load.pallets} 托 / ${load.cartons} 箱 · 含 AGV 自重`:'AGV 正在跨越门区');
    const loadBox=$('[data-diagram-load-box]');if(loadBox)loadBox.dataset.occupancy=load.occupancy;
    document.querySelectorAll('[data-demo-stage-index]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.demoStageIndex)===live.journeyStage);b.setAttribute('aria-current',Number(b.dataset.demoStageIndex)===live.journeyStage?'step':'false');});

    put('[data-demo-stage]', `${live.paused ? '演示暂停' : live.phaseLabel} · ${DOOR_STATE[live.doorStatus]}`);
    const toggle=$('#toggle-demo');
    if (toggle && toggle.dataset.paused !== String(live.paused)) {
      toggle.dataset.paused=String(live.paused);
      toggle.setAttribute('aria-label', live.paused ? '继续演示' : '暂停演示');
      toggle.innerHTML=`${icon(live.paused ? 'play' : 'circle-pause')}<span>${live.paused ? '继续' : '暂停'}</span>`;
      icons();
    }
    $('#twin-canvas').dataset.simulationPhase=live.phase;
    $('#twin-canvas').dataset.positionFloor=live.positionFloor.toFixed(4);
    $('#twin-canvas').dataset.doorOpenFraction=live.doorOpenFraction.toFixed(4);
    $('#twin-canvas').dataset.demoPaused=String(live.paused);
  }

  function showOverview() {
    const list = scopeDevices(), ids = new Set(list.map(d => d.id));
    const rows = tasks.filter(t => ids.has(t.deviceId));
    showDialog(`<div class="dialog-heading"><h2 id="dialog-title">设备汇总</h2><button class="icon-button" data-close aria-label="关闭设备汇总">${icon('x')}</button></div><p class="overview-scope">${TYPES.find(t => t.id === state.type).name} · ${state.building === 'all' ? '全部建筑' : state.building}</p><div class="overview-totals"><div><span>设备在线</span><strong>${list.filter(d => d.online).length}<small> / ${list.length}</small></strong></div><div><span>未完成</span><strong>${rows.filter(t => t.status !== 'completed').length}<small> 条</small></strong></div><div><span>已完成</span><strong>${rows.filter(t => t.status === 'completed').length}<small> 条</small></strong></div></div><div class="overview-device-list">${list.map(d => `<button data-device="${d.id}"><span><strong>${d.name}</strong><small>${d.id} · ${d.building} · ${d.floor} F</small></span><span>${chip(STATE[d.state].label, STATE[d.state].tone)}<small>未完成 ${getTasks(d.id, 'pending').length} · 已完成 ${getTasks(d.id, 'completed').length}</small></span>${icon('chevron-right')}</button>`).join('') || '<p class="help-intro">当前建筑暂无该类型设备</p>'}</div><p class="help-note">点击设备，联动查看状态和任务。</p>`, true);
  }

  function showDeviceDetails() {
    const d = current();
    if (!d) return;
    const detailsStatus = d.simulation ? { label:d.paused ? '演示暂停' : d.moving ? '运行中' : '停靠中', tone:d.paused ? 'gray' : d.moving ? 'green' : 'blue' } : STATE[d.state];
    showDialog(`<div class="dialog-heading"><h2 id="dialog-title">设备详情</h2><button class="icon-button" data-close aria-label="关闭设备详情">${icon('x')}</button></div><div class="dialog-command"><span>${d.name} · ${d.id}</span>${chip(detailsStatus.label, detailsStatus.tone)}</div><dl class="detail-grid device-detail-grid"><div><dt>所属位置</dt><dd>${d.building} · ${d.location}</dd></div><div><dt>设备类型</dt><dd>${TYPES.find(t => t.id === d.type).name}</dd></div><div><dt>门状态</dt><dd>${DOOR_STATE[d.doorStatus] || DOOR_STATE.unknown}</dd></div><div><dt>设备模式</dt><dd>${d.mode}</dd></div><div><dt>所在楼层 / 总楼层</dt><dd>${d.floor} F / ${d.floors} F</dd></div><div><dt>运行速度</dt><dd>${d.speed.toFixed(1)} m/s</dd></div><div><dt>额定载重</dt><dd>${d.capacity}</dd></div><div><dt>通信状态</dt><dd>${d.online ? '设备在线' : '设备离线'}</dd></div><div><dt>${d.simulation ? '状态来源' : '数据快照'}</dt><dd class="mono">${d.simulation ? '本地运行演示（打开详情时）' : SNAPSHOT}</dd></div></dl><div class="device-alert-detail ${d.alarm ? 'has-alarm' : ''}">${icon(d.alarm ? 'triangle-alert' : d.online ? 'shield-check' : 'wifi-off')}<div><strong>${d.alarm || (d.online ? '当前无告警' : '设备处于检修模式')}</strong><p>${d.alarm ? '层门联锁异常，设备已停止运行。请联系现场人员检查，关联运输任务处于阻塞状态。' : d.online ? '安全回路与通信状态正常。' : '连接已断开，楼层为最后记录，待执行指令等待设备恢复。'}</p></div></div><div class="dialog-footer"><span>静态演示数据</span><button class="button primary" data-close>知道了</button></div>`);
  }

  return { renderMetrics, renderDevices, renderTelemetry, showOverview, showDeviceDetails, updateSimulation };
}
