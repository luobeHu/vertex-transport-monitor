import test from "node:test";
import assert from "node:assert/strict";
import {
  journeyCameraBlend,
  CAMERA_WINDOWS,
  CAMERA_TRANSITION_SECONDS,
} from "../src/core/journey-camera.js";
import {
  sampleElevatorDemo,
  DEMO_CYCLE_SECONDS,
} from "../src/core/simulation.js";

test("进出梯保持近景，上下行保持井道全景，到站后拉回近景", () => {
  for (const t of [0, 4.5, 7.5, 20, 22.5, 26, 40, 43])
    assert.equal(journeyCameraBlend(sampleElevatorDemo(t)), 1);
  for (const t of [12, 13.6, 16, 32, 33.7, 36])
    assert.equal(journeyCameraBlend(sampleElevatorDemo(t)), 0);
  assert.equal(journeyCameraBlend({ simulation: false }), 1);
});
test("四段镜头过渡连续、有界且方向正确，与同一模拟时钟同步暂停", () => {
  for (const window of CAMERA_WINDOWS) {
    assert.equal(
      journeyCameraBlend(sampleElevatorDemo(window.start)),
      window.from,
    );
    assert.equal(
      journeyCameraBlend(
        sampleElevatorDemo(window.start + CAMERA_TRANSITION_SECONDS),
      ),
      window.to,
    );
    let prev = window.from;
    for (let dt = 0.01; dt < CAMERA_TRANSITION_SECONDS; dt += 0.01) {
      const live = sampleElevatorDemo(window.start + dt),
        value = journeyCameraBlend(live);
      assert.ok(value >= 0 && value <= 1);
      assert.ok(window.to > window.from ? value >= prev : value <= prev);
      assert.equal(value, journeyCameraBlend({ ...live, paused: true }));
      prev = value;
    }
  }
  assert.equal(journeyCameraBlend(sampleElevatorDemo(DEMO_CYCLE_SECONDS)), 1);
});
test("减少动态效果时直接切换视图，不播放镜头推拉", () => {
  assert.equal(journeyCameraBlend(sampleElevatorDemo(9.4), true), 1);
  assert.equal(journeyCameraBlend(sampleElevatorDemo(10), true), 0);
  assert.equal(journeyCameraBlend(sampleElevatorDemo(18), true), 1);
});
