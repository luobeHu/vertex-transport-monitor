import { summarizeCabin } from './cabin-data.js';
import { makeMarkerCanvas } from './marker-texture.js';

export function showCabinDetails({kind,id,device,icon,esc,showDialog}) {
  if(!device?.cabin) return;
  const cabin=device.cabin,s=summarizeCabin(cabin),agv=cabin.agv;
  const title={floorCodes:'轿厢地码',cargo:'轿厢货物',agv:'随梯 AGV'}[kind];
  if(!title)throw new Error('无效的轿厢信息类型');
  const head=`<div class="dialog-heading"><div><span class="small-eyebrow">CABIN / ${esc(device.id)}</span><h2 id="dialog-title">${title}</h2></div><button class="icon-button" data-close aria-label="关闭轿厢信息">${icon('x')}</button></div><p class="cabin-detail-subtitle">${esc(device.name)} · ${esc(device.building)} · 模拟数据</p>`;
  let content='';
  if(kind==='floorCodes') {
    content=`<p class="help-intro">地码固定在轿厢地板，随轿厢移动，编码不随所在楼层变化。</p><div class="cabin-marker-list">${cabin.floorCodes.map(code=>`<div class="cabin-marker-row ${id===code.id?'highlighted':''}"><img src="${makeMarkerCanvas(code.id).toDataURL()}" alt="地码 ${esc(code.id)} 的二维码" width="100" height="100"><div><strong>${esc(code.id)}</strong><span>${esc(code.name)}</span><small>识读：${code.recognized?'已识别（模拟）':'离线，状态未知'}</small><small>占用：${!cabin.observed?'未知':esc(code.occupiedBy||'无占用')}</small><small>轿厢坐标：X ${Math.round(code.x*1000)} / Z ${Math.round(code.z*1000)} mm</small></div></div>`).join('')}</div>`;
  } else if(kind==='cargo') {
    if(!cabin.observed) content='<div class="cabin-detail-empty">设备离线，无法确认当前货物和 AGV 信息。</div>';
    else if(!cabin.cargo.length)content=`<div class="cabin-detail-empty">${agv ? `当前无货物，${esc(agv.id)} 空载随梯，自重 ${agv.tareKg} kg。` : '当前轿厢空载，无货物和随梯 AGV。'}</div>`;
    else content=`<div class="cabin-load-summary"><span><strong>${s.pallets}</strong> 托</span><span><strong>${s.cartons}</strong> 箱</span><span><strong>${s.cargoKg}</strong> kg 货物</span></div>${cabin.cargo.map(item=>`<section class="cabin-cargo-detail ${id===item.id?'highlighted':''}"><div class="cabin-cargo-heading"><h3>${esc(item.name)}</h3><span>${item.cartons} 箱 · ${item.weightKg} kg</span></div><p class="mono">${esc(item.id)}</p><dl class="detail-grid"><div><dt>托盘编号</dt><dd>${esc(item.palletId)}</dd></div><div><dt>承载方式</dt><dd>${item.carrier==='agv'?`由 ${esc(agv?.id)} 搭载随梯`:'货物直接随梯，无 AGV'}</dd></div><div><dt>目的位置</dt><dd>${esc(item.destination)}</dd></div><div><dt>地码 / 站位</dt><dd>${esc(item.carrier==='agv'?agv?.floorCodeId:cabin.floorCodes.find(c=>c.occupiedBy===item.id)?.id)}</dd></div></dl><table class="cargo-items"><thead><tr><th>物料 / SKU</th><th>数量</th></tr></thead><tbody>${item.items.map(row=>`<tr><td>${esc(row.name)}<small>${esc(row.sku)}</small></td><td>${row.quantity} ${esc(row.unit)}</td></tr>`).join('')}</tbody></table></section>`).join('')}<div class="cabin-weight-note">载荷样例估算：货物 ${s.cargoKg} kg${s.hasAgv?` + AGV 自重 ${s.agvKg} kg`:''} = <strong>${s.totalKg} kg</strong>（额定 ${esc(device.capacity)}）</div>`;
  } else {
    if(!cabin.observed)content='<div class="cabin-detail-empty">设备离线，随梯 AGV 状态未知。</div>';
    else if(!agv)content='<div class="cabin-detail-empty">当前无随梯 AGV。</div>';
    else content=`<div class="cabin-agv-hero">${icon('bot')}<div><strong>${esc(agv.id)}</strong><span>${device.paused?'演示暂停':device.state==='running'?'随梯运行中':'随梯停靠'} · ${esc(agv.model)}</span></div><b>${agv.batteryPct}%<small>电量</small></b></div><dl class="detail-grid device-detail-grid"><div><dt>定位地码</dt><dd>${esc(agv.floorCodeId)}</dd></div><div><dt>调度任务</dt><dd>${esc(agv.missionId)}</dd></div><div><dt>设备自重</dt><dd>${agv.tareKg} kg</dd></div><div><dt>货物重量</dt><dd>${s.cargoKg} kg</dd></div><div><dt>随梯总载荷估算</dt><dd>${s.totalKg} kg</dd></div><div><dt>当前设备 / 楼层</dt><dd>${esc(device.id)} · ${device.floor} F</dd></div></dl><h3 class="cabin-carried-title">搭载货物</h3>${cabin.cargo.filter(c=>agv.carryingCargoIds.includes(c.id)).map(item=>`<div class="cabin-carried-item">${icon('package')}<span>${esc(item.name)}<small>${esc(item.id)}</small></span><b>${item.cartons} 箱</b></div>`).join('')}<p class="help-note">AGV 与货物位于轿厢内，随轿厢一起移动。本演示不模拟进出梯或装卸交接。</p>`;
  }
  showDialog(`${head}${content}<div class="dialog-footer"><span>轿厢载荷样例 · 打开时状态</span><button class="button primary" data-close>知道了</button></div>`,true);
}
