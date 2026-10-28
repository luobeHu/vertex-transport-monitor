import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleElevatorDemo,
  DEMO_CYCLE_SECONDS,
  DEMO_STAGE_TIMES,
} from "../src/core/simulation.js";
import { DIMENSIONS as D } from "../src/core/dimensions.js";
test("AGV 只能在开门且电梯停稳时穿越门区", () => {
  for (let t = 0; t < DEMO_CYCLE_SECONDS; t += 0.02) {
    const s = sampleElevatorDemo(t);
    if (["boarding", "alighting"].includes(s.phase)) {
      assert.equal(s.doorStatus, "open");
      assert.equal(s.doorOpenFraction, 1);
      assert.equal(s.speed, 0);
    }
    if (s.moving) {
      assert.equal(s.doorOpenFraction, 0);
      assert.ok(s.agvZ <= D.fullyInsideZ || s.agvZ >= D.fullyOutsideZ);
    }
    assert.ok(s.positionFloor >= 4 && s.positionFloor <= 6);
    assert.ok(s.doorOpenFraction >= 0 && s.doorOpenFraction <= 1);
  }
});
test("完整流程包含进梯、载货运行、出梯、空载返程", () => {
  const [boarding, travel, outgoing, empty] = DEMO_STAGE_TIMES.map((t) =>
    sampleElevatorDemo(t),
  );
  assert.equal(boarding.phase, "boarding");
  assert.equal(travel.phase, "loadedTravel");
  assert.equal(outgoing.phase, "alighting");
  assert.equal(empty.phase, "emptyReturn");
  assert.equal(travel.occupancy, "loaded");
  assert.equal(empty.occupancy, "empty");
  assert.equal(sampleElevatorDemo(26).cargoOnboard, false);
});
test("空载返程时 AGV 和货物留在目的站台，不随轿厢返回", () => {
  const s = sampleElevatorDemo(34);
  assert.ok(s.positionFloor < 6);
  assert.equal(s.payloadFloor, 6);
  assert.equal(s.agvZ, D.outsideZ);
  assert.equal(s.occupancy, "empty");
  assert.equal(sampleElevatorDemo(40).positionFloor, 4);
  assert.equal(sampleElevatorDemo(43).agvVisible, false);
});
test("暂停保持轨迹，模型比例和通行净空合理", () => {
  assert.equal(sampleElevatorDemo(4, true).agvZ, sampleElevatorDemo(4).agvZ);
  assert.equal(sampleElevatorDemo(14, true).speed, 0);
  assert.ok(D.agvWidth < D.clearWidth * 0.5);
  assert.ok(D.palletWidth + 0.3 < D.clearDoorWidth);
  assert.ok(D.agvLength < D.clearDepth * 0.6);
  assert.ok(D.clearHeight >= 2.3);
  assert.equal(sampleElevatorDemo(DEMO_CYCLE_SECONDS).positionFloor, 4);
});
