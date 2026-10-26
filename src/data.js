export const TYPES = [
  { id: 'elevator', name: '电梯监控', short: '电梯', icon: 'arrow-up-down' },
  { id: 'hoist', name: '提升机监控', short: '提升机', icon: 'container' },
  { id: 'lans', name: '蓝思提升机监控', short: '蓝思提升机', icon: 'boxes' },
];
export const SNAPSHOT = '2026-10-26 14:32:08';
export const devices = TYPES.flatMap((type, ti) => Array.from({ length: 4 }, (_, i) => ({
  id: `${['EL', 'HT', 'LS'][ti]}-${String(i + 1).padStart(2, '0')}`,
  name: `${['客货电梯', '物流提升机', '蓝思提升机'][ti]} ${String(i + 1).padStart(2, '0')}`,
  type: type.id,
  building: ['A 栋', 'A 栋', 'B 栋', 'C 栋'][i],
  location: ['生产一区 · 东侧', '生产一区 · 西侧', '仓储二区 · 北侧', '装配三区 · 南侧'][i],
  floor: [4, 1, 3, 2][i], target: [6, 1, 5, 2][i], floors: ti === 0 ? 8 : 6,
  state: ['running', 'idle', 'alarm', 'offline'][i],
  mode: i === 3 ? '检修模式' : '自动模式',
  doorStatus: i === 1 ? 'open' : i === 3 ? 'unknown' : 'closed',
  alarm: i === 2 ? 'E-032 · 层门联锁异常' : null,
  capacity: ti === 0 ? '1,600 kg' : ti === 1 ? '2,000 kg' : '1,000 kg',
  speed: i === 0 ? (ti === 0 ? 1.5 : 0.8) : 0,
  online: i !== 3, updated: SNAPSHOT,
})));
export const STATE = {
  running: { label: '运行中', tone: 'green', icon: 'arrow-up' },
  idle: { label: '空闲', tone: 'blue', icon: 'circle-pause' },
  alarm: { label: '故障停机', tone: 'red', icon: 'triangle-alert' },
  offline: { label: '离线', tone: 'gray', icon: 'wifi-off' },
};
export const tasks = devices.flatMap((device, di) => Array.from({ length: 24 + di % 3 }, (_, j) => {
  const pendingCount = [5, 2, 4, 3][di % 4];
  const done = j >= pendingCount;
  const phase = done ? 'completed' : device.state === 'alarm' ? (j === 0 ? 'blocked' : 'waiting') : device.state === 'offline' ? 'waiting' : j === 0 && device.state === 'running' ? 'running' : 'waiting';
  const origin = j === 0 ? 1 : ((j + di) % device.floors) + 1;
  const destination = j === 0 && ['running', 'alarm'].includes(device.state) ? device.target : (origin + 2) % device.floors + 1;
  const minutes = done ? 14 * 60 + 18 - (j - pendingCount) * 9 : 14 * 60 + 30 - j * 3;
  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String((j * 7 + 12) % 60).padStart(2, '0')}`;
  const seconds = (j * 7 + 12) % 60;
  const asTime = total => { const h = Math.floor(total / 3600); const m = Math.floor(total % 3600 / 60); const s = total % 60; return [h,m,s].map(v => String(v).padStart(2, '0')).join(':'); };
  const createdSeconds = minutes * 60 + seconds;
  const elapsed = 65 + j * 3;
  return {
    id: `CMD-20261026-${String(di * 100 + j + 1).padStart(4, '0')}`,
    deviceId: device.id, origin, destination, status: phase,
    kind: j % 3 === 0 ? '物料运输' : j % 3 === 1 ? '呼梯任务' : '空载调度',
    source: j % 3 === 0 ? 'WMS 系统' : j % 3 === 1 ? '楼层终端' : '调度中心',
    priority: j % 9 === 0 || j === 2 ? 'high' : 'normal',
    created: `2026-10-26 ${time}`, started: done || phase === 'running' || phase === 'blocked' ? asTime(createdSeconds + 12) : null,
    completed: done ? asTime(createdSeconds + 12 + elapsed) : null,
    duration: done ? `${65 + j * 3} 秒` : phase === 'running' ? '执行中' : '—',
  };
}));
export const TASK_STATE = {
  completed: { label: '已完成', tone: 'green' },
  running: { label: '执行中', tone: 'green' },
  waiting: { label: '待执行', tone: 'gray' },
  blocked: { label: '异常阻塞', tone: 'red' },
};
export function getTasks(deviceId, status = 'all') {
  return tasks.filter(t => (!deviceId || t.deviceId === deviceId) && (status === 'all' || (status === 'completed' ? t.status === 'completed' : t.status !== 'completed')));
}
export function summarize(type) {
  const list = devices.filter(d => !type || d.type === type);
  const ids = new Set(list.map(d => d.id));
  const rows = tasks.filter(t => ids.has(t.deviceId));
  return { total: list.length, online: list.filter(d => d.online).length, running: list.filter(d => d.state === 'running').length, alarms: list.filter(d => d.alarm).length, pending: rows.filter(t => t.status !== 'completed').length, completed: rows.filter(t => t.status === 'completed').length, tasks: rows.length };
}
