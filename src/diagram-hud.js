import { summarizeOnboard } from './cabin-data.js';
import { DOOR_STATE } from './simulation.js';

export function renderDiagramHud({d,isDemo,status,pending,done,icon,chip}) {
  const load=summarizeOnboard(d.cabin,isDemo?d:null);
  return `<div class="diagram-key-state"><div><span data-live-floor-label>所在楼层${d.online?'':' · 最后记录'}</span><strong><span data-live-floor>${String(d.floor).padStart(2,'0')}</span><small> F</small></strong></div><div class="diagram-status"><span class="door-state" data-live-door>${DOOR_STATE[d.doorStatus]}</span><span class="compact-direction">${icon('arrow-up')}<span data-live-direction>${d.state==='running'?`前往 ${d.target} F`:'当前停靠'}</span></span><button data-device-details><span data-live-state>${chip(status.label,status.tone)}</span><small>${d.mode} · ${d.alarm?'1 项告警':'无告警'}</small></button></div></div>
    ${isDemo?`<nav class="diagram-process" aria-label="演示流程定位">${['载货进梯','载货上行','载货出梯','空载返程'].map((label,i)=>`<button data-demo-stage-index="${i}" aria-label="演示定位：${label}"><b>${String(i+1).padStart(2,'0')}</b><span>${label}</span></button>`).join('')}</nav>`:''}
    <div class="diagram-load" data-diagram-load-box data-occupancy="${load.occupancy}"><span data-diagram-load>${load.occupancy==='empty'?'电梯空载':load.occupancy==='loaded'?'载货 / AGV 随梯':load.occupancy==='unknown'?'载荷未知':'载荷交接中'} · ${load.weightKg??'—'} kg</span><small data-load-detail>${load.occupancy==='empty'?'轿厢内无 AGV、无货物':load.occupancy==='loaded'?`${load.pallets} 托 / ${load.cartons} 箱 · 含 AGV 自重`:'进出梯时不显示完整载荷估算'}</small></div>
    <div class="diagram-phase"><span data-demo-phase>${isDemo?d.phaseLabel:'静态数据快照'}</span><small>${isDemo?'循环演示 · 可点击上方步骤定位':'点击图内标注查看详情'}</small></div>
    <button class="diagram-device-details" data-device-details aria-label="查看设备详情" title="设备参数">${icon('more-horizontal')}</button>
    <div class="diagram-dimensions">示意比例：轿厢 2.4 × 2.4 × 2.4 m · AGV 0.9 × 1.2 × 0.3 m</div>
    <div class="diagram-task-actions"><button data-history="pending">未完成 <b>${pending.length}</b>${icon('chevron-right')}</button><button data-history="completed">已完成 <b>${done.length}</b>${icon('chevron-right')}</button></div>`;
}
