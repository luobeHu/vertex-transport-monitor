export function renderShell(TYPES, icon) {
  return `
  <a class="skip-link" href="#main">跳至监控内容</a>
  <header class="compact-header">
    <a class="compact-brand" href="?" aria-label="VERTEX 首页"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 7h7l5 12 5-12h5L18 28h-4L6 7Z" fill="currentColor"/><path d="m4 7 9 21h-3L1 7h3Z" fill="currentColor" opacity=".4"/></svg><span>VERTEX<small>VERTICAL SYSTEMS</small></span></a>
    <div><span class="demo-pill"><span></span>模拟演示</span><button class="icon-button" id="agent-help" title="Agent 接入说明" aria-label="Agent 接入说明">${icon('code-2')}</button><button class="icon-button" id="help-button" title="使用说明" aria-label="使用说明">${icon('circle-help')}</button></div>
  </header>
  <main id="main" class="compact-main">
    <div class="compact-titlebar"><div><div class="premium-eyebrow"><span></span>OPERATIONS / VERTICAL TRANSPORT</div><h1>垂直运输监控</h1><p>设备全景与任务追踪</p></div><button class="button" id="refresh">${icon('refresh-cw')}<span>刷新</span></button></div>
    <div class="compact-typebar"><div class="type-tabs" role="tablist" aria-label="设备类型">${TYPES.map(t => `<button role="tab" data-type="${t.id}">${t.name}</button>`).join('')}</div><button class="overview-button" id="overview-button" aria-label="查看设备汇总统计"><span id="overview-summary"></span>${icon('chevron-right')}</button></div>

    <div class="compact-workspace" id="workspace">
      <section class="panel twin-panel" aria-label="设备数字孪生与状态">
    <section class="compact-device-section equipment-rail" aria-labelledby="devices-title"><div class="compact-section-heading"><h2 id="devices-title">选择设备 <span class="count" id="device-count"></span></h2><button class="text-button" id="open-filters" aria-label="筛选设备" title="筛选设备">${icon('sliders-horizontal')}<span id="filter-label">筛选</span></button></div><div id="devices-list" class="compact-device-list"></div></section>
        <div class="twin-main">
          <div class="twin-heading"><span class="small-eyebrow">数字孪生视图 <span id="demo-badge" class="simulation-badge" hidden>循环运行演示</span></span><button class="icon-button" id="expand-twin" aria-label="放大三维视图" title="放大三维视图">${icon('maximize-2')}</button></div>
          <div class="scene-label" id="scene-label"></div><div id="twin-canvas" class="twin-canvas"></div><div class="scene-empty" hidden>暂无符合条件的设备</div><div class="scene-floor-note" id="floor-note"></div>
          <div id="cabin-overlay" class="cabin-overlay" aria-label="轿厢内地码、货物与 AGV 标注" hidden></div>
          <div class="view-toolbar"><button class="icon-button" id="focus-cabin" aria-label="查看轿厢近景" aria-pressed="false" title="查看轿厢近景">${icon('container')}</button><button class="icon-button" id="zoom-in" title="放大" aria-label="放大模型">${icon('plus')}</button><button class="icon-button" id="zoom-out" title="缩小" aria-label="缩小模型">${icon('minus')}</button><span></span><button class="icon-button" id="reset-view" title="重置视角" aria-label="重置视角">${icon('rotate-ccw')}</button><button class="icon-button" id="front-view" title="正面视角" aria-label="正面视角">${icon('panels-top-left')}</button></div>
          <div id="demo-controls" class="simulation-controls" hidden><span data-demo-stage>上行中 · 门已关闭</span><button id="toggle-demo" aria-label="暂停演示">${icon('circle-pause')}<span data-demo-toggle>暂停</span></button><button id="restart-demo" aria-label="重播运行演示" title="重播运行演示">${icon('rotate-ccw')}</button></div>
          <div class="scene-bottom"><span>拖动旋转 · 点击楼层查看任务</span><span>示意模型</span></div>
        </div>
        <div class="telemetry" id="telemetry"></div>
      </section>
    </div>
    <footer class="compact-footer"><span>任务快照 · 2026.10.26 14:32:08</span><span>点击状态与任务，查看详细信息</span></footer>
  </main>
  <dialog id="filters-dialog" class="details-dialog filters-dialog" aria-labelledby="filters-title">
    <div class="dialog-heading"><h2 id="filters-title">筛选设备</h2><button class="icon-button" data-dismiss="filters-dialog" aria-label="关闭筛选">${icon('x')}</button></div>
    <label class="filter-field"><span>所属建筑</span><select id="building" aria-label="选择建筑"><option value="all">全部建筑</option><option>A 栋</option><option>B 栋</option><option>C 栋</option></select></label>
    <label class="filter-field"><span>设备名称 / 编号</span><input id="device-search" aria-label="搜索设备编号或名称" placeholder="输入设备名称或编号"></label>
    <div class="device-filter"><button class="filter-chip active" data-device-state="all">全部设备</button><button class="filter-chip" data-device-state="running">运行中</button><button class="filter-chip" data-device-state="alarm">告警</button></div>
    <p id="filter-results" class="filter-results"></p><div class="dialog-footer"><button class="text-button" id="clear-device-filters">重置筛选</button><button class="button primary" data-dismiss="filters-dialog">查看设备</button></div>
  </dialog>
  <dialog id="records-dialog" class="records-dialog" aria-labelledby="records-title"><div class="records-heading"><h2 id="records-title">任务记录</h2><button class="icon-button" data-dismiss="records-dialog" aria-label="关闭任务记录">${icon('x')}</button></div><div id="records-content"></div></dialog>
  <dialog id="details-dialog" class="details-dialog" aria-labelledby="dialog-title"></dialog><div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
}
