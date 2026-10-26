// A presentation-only 4 F ↔ 6 F loop. It never changes the recorded task dataset.
export const DEMO_DEVICE_ID = 'EL-01';
export const DEMO_LEG_SECONDS = 14;
export const DEMO_CYCLE_SECONDS = DEMO_LEG_SECONDS * 2;
export const DOOR_STATE = {
  closed: '门已关闭', opening: '开门中', open: '门已打开', closing: '关门中', unknown: '门状态未知',
};
const ease = x => x * x * (3 - 2 * x);

export function sampleElevatorDemo(elapsedSeconds, paused = false) {
  const elapsed = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  const cycleTime = elapsed % DEMO_CYCLE_SECONDS;
  const reverse = cycleTime >= DEMO_LEG_SECONDS;
  const t = cycleTime % DEMO_LEG_SECONDS;
  const origin = reverse ? 6 : 4, target = reverse ? 4 : 6;
  let phase, doorStatus = 'closed', openness = 0, fraction = 1, speed = 0;
  if (t < 7) {
    phase = 'moving'; fraction = ease(t / 7);
    speed = (6 * (t / 7) * (1 - t / 7)) * (2 * 3.6 / 7);
  } else if (t < 7.7) {
    phase = 'arrived';
  } else if (t < 9.3) {
    phase = 'opening'; doorStatus = 'opening'; openness = ease((t - 7.7) / 1.6);
  } else if (t < 11.6) {
    phase = 'open'; doorStatus = 'open'; openness = 1;
  } else if (t < 13.2) {
    phase = 'closing'; doorStatus = 'closing'; openness = 1 - ease((t - 11.6) / 1.6);
  } else {
    phase = 'ready';
  }
  const positionFloor = origin + (target - origin) * fraction;
  const floor = phase === 'moving' ? (reverse ? Math.ceil(positionFloor - 1e-8) : Math.floor(positionFloor + 1e-8)) : target;
  return {
    deviceId: DEMO_DEVICE_ID, simulation: true, phase, paused,
    origin, target, positionFloor, floor, direction: reverse ? 'down' : 'up',
    state: phase === 'moving' ? 'running' : 'idle',
    speed: paused ? 0 : speed,
    doorStatus, doorOpenFraction: openness,
    elapsedSeconds: elapsed,
    phaseLabel: { moving: reverse ? '下行中' : '上行中', arrived: '已到站', opening: '开门中', open: '开门停留', closing: '关门中', ready: '准备运行' }[phase],
  };
}
