import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleElevatorDemo, DEMO_CYCLE_SECONDS } from '../src/simulation.js';

test('运行阶段始终关门，到站后才允许开门', () => {
  for (let t = 0; t < DEMO_CYCLE_SECONDS * 3; t += .025) {
    const s = sampleElevatorDemo(t);
    assert.ok(s.positionFloor >= 4 && s.positionFloor <= 6);
    assert.ok(s.doorOpenFraction >= 0 && s.doorOpenFraction <= 1);
    if (s.phase === 'moving') {
      assert.equal(s.doorOpenFraction, 0);
      assert.equal(s.doorStatus, 'closed');
    }
    if (s.doorOpenFraction > 0) {
      assert.equal(s.positionFloor, s.target);
      assert.equal(s.speed, 0);
    }
  }
});
test('到站、开门、停留、关门的阶段顺序正确', () => {
  const phases = [0, 7.2, 8.5, 10, 12.5, 13.5].map(t => sampleElevatorDemo(t).phase);
  assert.deepEqual(phases, ['moving', 'arrived', 'opening', 'open', 'closing', 'ready']);
  assert.equal(sampleElevatorDemo(10).doorOpenFraction, 1);
  assert.equal(sampleElevatorDemo(13.5).doorOpenFraction, 0);
});
test('返程与循环衔接保持位置连续，暂停时速度为零', () => {
  assert.equal(sampleElevatorDemo(14).origin, 6);
  assert.equal(sampleElevatorDemo(14).target, 4);
  assert.equal(sampleElevatorDemo(28).positionFloor, 4);
  assert.equal(sampleElevatorDemo(3, true).speed, 0);
  assert.equal(sampleElevatorDemo(3, true).positionFloor, sampleElevatorDemo(3).positionFloor);
  assert.equal(sampleElevatorDemo(10).doorStatus, 'open');
});
