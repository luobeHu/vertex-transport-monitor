import test from "node:test";
import assert from "node:assert/strict";
import { devices } from "../src/core/data.js";
import { sampleElevatorDemo } from "../src/core/simulation.js";
import { summarizeCabin, summarizeOnboard } from "../src/core/cabin-data.js";

test("每台设备的轿厢地码唯一，AGV 占用与货物承载关系一致", () => {
  const ids = devices.flatMap((d) => d.cabin.floorCodes.map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const d of devices) {
    const { agv, cargo, floorCodes } = d.cabin;
    if (agv) {
      assert.equal(
        floorCodes.find((c) => c.id === agv.floorCodeId)?.occupiedBy,
        agv.id,
      );
      assert.ok(
        agv.carryingCargoIds.every((id) =>
          cargo.some((c) => c.id === id && c.carrier === "agv"),
        ),
      );
      assert.ok(agv.batteryPct >= 0 && agv.batteryPct <= 100);
    }
    for (const code of floorCodes)
      assert.ok(
        !code.occupiedBy ||
          code.occupiedBy === agv?.id ||
          cargo.some((c) => c.id === code.occupiedBy),
      );
  }
});
test("载荷统计包含货物与 AGV 自重，区分空载与离线未知", () => {
  const get = (id) => summarizeCabin(devices.find((d) => d.id === id).cabin);
  assert.deepEqual(get("EL-01"), {
    observed: true,
    floorCodes: 2,
    pallets: 1,
    cartons: 4,
    cargoKg: 240,
    agvKg: 320,
    totalKg: 560,
    hasAgv: true,
  });
  assert.equal(get("EL-02").pallets, 0);
  assert.equal(get("EL-02").observed, true);
  assert.equal(get("EL-03").pallets, 2);
  assert.equal(get("EL-03").hasAgv, false);
  assert.equal(get("EL-04").observed, false);
});

test("模拟载荷只统计实际在梯内的 AGV 和货物", () => {
  const cabin = devices.find((d) => d.id === "EL-01").cabin;
  const loaded = summarizeOnboard(cabin, sampleElevatorDemo(13.6));
  assert.equal(loaded.weightKg, 560);
  assert.equal(loaded.pallets, 1);
  const empty = summarizeOnboard(cabin, sampleElevatorDemo(33.7));
  assert.equal(empty.weightKg, 0);
  assert.equal(empty.hasAgv, false);
  assert.equal(empty.pallets, 0);
  assert.equal(
    summarizeOnboard(cabin, sampleElevatorDemo(22.5)).weightKg,
    null,
  );
  assert.equal(
    summarizeOnboard(devices.find((d) => d.id === "EL-04").cabin).weightKg,
    null,
  );
});
