export function createCompactView(ctx) {
  const { $, state, tasks, TYPES, STATE, TASK_STATE, SNAPSHOT, getTasks, icon, chip, scopeDevices, visibleDevices, current, showDialog } = ctx;

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
      const status = STATE[d.state];
      return `<button class="compact-device ${d.id === state.device ? 'selected' : ''}" data-device="${d.id}" aria-pressed="${d.id === state.device}"><span class="compact-device-title"><span class="equipment-id">${d.id}</span>${chip(status.label, status.tone)}</span><span class="compact-device-meta">${d.name}<span>${String(d.floor).padStart(2, '0')} F</span></span></button>`;
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
    $('#twin-canvas').style.visibility = d ? 'visible' : 'hidden';
    $('.scene-empty').hidden = !!d;
    $('#floor-note').innerHTML = '';
    if (!d) {
      $('#telemetry').innerHTML = '<div class="empty-state">选择设备后查看运行状态</div>';
      $('#scene-label').innerHTML = '';
      return;
    }
    const status = STATE[d.state];
    const pending = getTasks(d.id, 'pending'), done = getTasks(d.id, 'completed');
    const active = pending.find(t => ['running', 'blocked'].includes(t.status));
    $('#scene-label').innerHTML = `<span class="scene-device-id">${d.id}</span><span class="scene-building">${d.floors} 层结构</span>`;
    $('#telemetry').innerHTML = `
      <div class="compact-selected-heading"><div><h2>${d.name}</h2><span>${d.building} · ${d.location}</span></div><button class="icon-button" data-device-details aria-label="查看设备详情" title="设备详情">${icon('more-horizontal')}</button></div>
      <div class="compact-floor"><div><span>所在楼层${d.online ? '' : ' · 最后记录'}</span><strong>${String(d.floor).padStart(2, '0')}<small> F</small></strong></div><span class="compact-direction">${icon(d.state === 'running' ? 'arrow-up' : 'minus')}${d.state === 'running' ? `前往 ${d.target} F` : '当前停靠'}</span></div>
      <div class="compact-state-grid"><button data-device-details><span>设备状态</span>${chip(status.label, status.tone)}</button><button data-device-details><span>设备模式</span><strong>${d.mode}</strong></button><button data-device-details class="compact-alarm"><span>告警状态</span><strong class="${d.alarm ? 'red-text' : 'green-text'}">${icon(d.alarm ? 'triangle-alert' : 'shield-check')}${d.alarm ? '1 项告警' : '无告警'}</strong></button></div>
      <div class="compact-current"><span class="compact-label">当前任务</span>${active ? `<button class="active-task" data-command="${active.id}"><span><strong>${active.origin}<small>F</small>${icon('arrow-right')}${active.destination}<small>F</small></strong>${chip(TASK_STATE[active.status].label, TASK_STATE[active.status].tone)}</span><span class="active-task-bottom">${active.kind}<span>查看详情 ${icon('chevron-right')}</span></span></button>` : `<div class="no-current-task">${icon(d.online ? 'circle-pause' : 'wifi-off')}<span>${d.online ? '设备空闲，等待调度' : '设备离线，任务等待中'}</span></div>`}</div>
      <div class="compact-task-actions"><button class="${state.status === 'pending' ? 'active' : ''}" data-history="pending"><span>未完成 <b>${pending.length}</b></span>${icon('chevron-right')}</button><button class="${state.status === 'completed' ? 'active' : ''}" data-history="completed"><span>已完成 <b>${done.length}</b></span>${icon('chevron-right')}</button></div>`;
  }

  function showOverview() {
    const list = scopeDevices(), ids = new Set(list.map(d => d.id));
    const rows = tasks.filter(t => ids.has(t.deviceId));
    showDialog(`<div class="dialog-heading"><h2 id="dialog-title">设备汇总</h2><button class="icon-button" data-close aria-label="关闭设备汇总">${icon('x')}</button></div><p class="overview-scope">${TYPES.find(t => t.id === state.type).name} · ${state.building === 'all' ? '全部建筑' : state.building}</p><div class="overview-totals"><div><span>设备在线</span><strong>${list.filter(d => d.online).length}<small> / ${list.length}</small></strong></div><div><span>未完成</span><strong>${rows.filter(t => t.status !== 'completed').length}<small> 条</small></strong></div><div><span>已完成</span><strong>${rows.filter(t => t.status === 'completed').length}<small> 条</small></strong></div></div><div class="overview-device-list">${list.map(d => `<button data-device="${d.id}"><span><strong>${d.name}</strong><small>${d.id} · ${d.building} · ${d.floor} F</small></span><span>${chip(STATE[d.state].label, STATE[d.state].tone)}<small>未完成 ${getTasks(d.id, 'pending').length} · 已完成 ${getTasks(d.id, 'completed').length}</small></span>${icon('chevron-right')}</button>`).join('') || '<p class="help-intro">当前建筑暂无该类型设备</p>'}</div><p class="help-note">点击设备，联动查看状态和任务。</p>`, true);
  }

  function showDeviceDetails() {
    const d = current();
    if (!d) return;
    showDialog(`<div class="dialog-heading"><h2 id="dialog-title">设备详情</h2><button class="icon-button" data-close aria-label="关闭设备详情">${icon('x')}</button></div><div class="dialog-command"><span>${d.name} · ${d.id}</span>${chip(STATE[d.state].label, STATE[d.state].tone)}</div><dl class="detail-grid device-detail-grid"><div><dt>所属位置</dt><dd>${d.building} · ${d.location}</dd></div><div><dt>设备类型</dt><dd>${TYPES.find(t => t.id === d.type).name}</dd></div><div><dt>设备模式</dt><dd>${d.mode}</dd></div><div><dt>所在楼层 / 总楼层</dt><dd>${d.floor} F / ${d.floors} F</dd></div><div><dt>运行速度</dt><dd>${d.speed.toFixed(1)} m/s</dd></div><div><dt>额定载重</dt><dd>${d.capacity}</dd></div><div><dt>通信状态</dt><dd>${d.online ? '设备在线' : '设备离线'}</dd></div><div><dt>数据快照</dt><dd class="mono">${SNAPSHOT}</dd></div></dl><div class="device-alert-detail ${d.alarm ? 'has-alarm' : ''}">${icon(d.alarm ? 'triangle-alert' : d.online ? 'shield-check' : 'wifi-off')}<div><strong>${d.alarm || (d.online ? '当前无告警' : '设备处于检修模式')}</strong><p>${d.alarm ? '层门联锁异常，设备已停止运行。请联系现场人员检查，关联运输任务处于阻塞状态。' : d.online ? '安全回路与通信状态正常。' : '连接已断开，楼层为最后记录，待执行指令等待设备恢复。'}</p></div></div><div class="dialog-footer"><span>静态演示数据</span><button class="button primary" data-close>知道了</button></div>`);
  }

  return { renderMetrics, renderDevices, renderTelemetry, showOverview, showDeviceDetails };
}
