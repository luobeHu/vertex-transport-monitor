import { summarizeCabin } from './cabin-data.js';

export function createCabinOverlay({ $, icon, getCurrent, showDialog }) {
  let cabin=null;
  function render(device) {
    const host=$('#cabin-overlay');
    if(!device) { host.hidden=true;return; }
    cabin=device.cabin;host.hidden=false;
    const s=summarizeCabin(cabin), agv=cabin.agv;
    host.innerHTML=`<svg class="cabin-leaders" aria-hidden="true"><polyline data-leader="floorCodes"/><circle data-point="floorCodes" r="3"/><polyline data-leader="cargo"/><circle data-point="cargo" r="3"/>${agv ? '<polyline data-leader="agv"/><circle data-point="agv" r="3"/>' : ''}</svg>
      <button class="cabin-callout marker-callout" data-cabin-info="floorCodes" aria-label="查看轿厢地码"><span>${icon('scan-line')}轿厢地码 <b>${s.floorCodes}</b></span><strong>${cabin.floorCodes[0].id}</strong><small>${cabin.observed ? '固定定位点 · 点击查看' : '离线 · 识读状态未知'}</small></button>
      <button class="cabin-callout cargo-callout" data-cabin-info="cargo" aria-label="查看轿厢货物"><span>${icon('package')}货物信息</span><strong>${!s.observed ? '载荷状态未知' : s.pallets ? `${s.pallets} 托 · ${s.cartons} 箱 · ${s.cargoKg} kg` : agv ? `仅 AGV · ${s.agvKg} kg` : '当前空载'}</strong><small>${!s.observed ? '设备离线，等待更新' : s.pallets ? cabin.cargo.map(c=>c.name).join(' / ') : agv ? 'AGV 空载随梯' : '无货物 · 无随梯 AGV'}</small>${s.observed && s.pallets ? `<small class="payload-code">${cabin.cargo.map(c=>c.id).join(' / ')}</small>` : ''}</button>
      ${agv ? `<button class="cabin-callout agv-callout" data-cabin-info="agv" aria-label="查看随梯 AGV"><span>${icon('bot')}随梯 AGV</span><strong>${agv.id}<em data-agv-riding>${device.paused ? '演示暂停' : device.state==='running' ? '随梯中' : '随梯停靠'}</em></strong><small>电量 ${agv.batteryPct}% · ${agv.floorCodeId.split('-').at(-1)} 定位点</small></button>` : ''}`;
    host.dataset.hasAgv=String(!!agv);
  }
  function project(points) {
    const host=$('#cabin-overlay');if(host.hidden || !cabin)return;
    const w=host.clientWidth,h=host.clientHeight, mobile=w<400;
    const positions=mobile ? {
      floorCodes:{x:12,y:h-203,w:(w-32)/3},cargo:{x:16+(w-32)/3,y:h-203,w:(w-32)/3},agv:{x:20+2*(w-32)/3,y:h-203,w:(w-32)/3},
    } : {
      floorCodes:{x:18,y:Math.max(116,Math.min(h-180,points.floorCodes.y+18)),w:w<550?135:154},
      cargo:{x:w-(w<550?153:178),y:Math.max(108,Math.min(h-246,points.cargo.y-68)),w:w<550?135:160},
      agv:{x:w-(w<550?153:178),y:Math.max(199,Math.min(h-153,points.agv.y+30)),w:w<550?135:160},
    };
    for(const kind of ['floorCodes','cargo','agv']) {
      const el=host.querySelector(`[data-cabin-info="${kind}"]`),p=points[kind];if(!el||!p)continue;
      const pos=positions[kind];el.style.width=`${pos.w}px`;el.style.transform=`translate(${pos.x}px,${pos.y}px)`;
      const line=host.querySelector(`[data-leader="${kind}"]`),dot=host.querySelector(`[data-point="${kind}"]`);
      if(line && dot) {
        const x=kind==='floorCodes'?pos.x+pos.w:pos.x,y=pos.y+32;
        line.setAttribute('points',`${x},${y} ${x+(kind==='floorCodes'?14:-14)},${y} ${p.x},${p.y}`);
        dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);
      }
    }
    host.classList.toggle('compact-cabin-labels',mobile);
  }
  function updateLive(live) {
    const el=$('[data-agv-riding]');if(el)el.textContent=live.paused?'演示暂停':live.phase==='moving'?'随梯中':'随梯停靠';
  }
  function show(kind, id) { showDialog(kind,id,getCurrent()); }
  return {render,project,updateLive,show};
}
