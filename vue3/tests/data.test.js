import test from "node:test";
import assert from "node:assert/strict";
import {
  devices,
  tasks,
  TYPES,
  SNAPSHOT,
  getTasks,
  summarize,
} from "../src/core/data.js";

test("每条指令都关联有效设备，并且楼层路径与设备范围一致", () => {
  assert.equal(devices.length, 12);
  assert.equal(tasks.length, 300);
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length);
  for (const t of tasks) {
    const d = devices.find((d) => d.id === t.deviceId);
    assert.ok(d, t.id);
    assert.ok(t.origin >= 1 && t.origin <= d.floors, t.id);
    assert.ok(t.destination >= 1 && t.destination <= d.floors, t.id);
    assert.notEqual(t.origin, t.destination, t.id);
  }
});
test("未完成与已完成分类无遗漏，设备汇总与明细完全相等", () => {
  for (const type of TYPES) {
    const s = summarize(type.id);
    const ids = devices.filter((d) => d.type === type.id).map((d) => d.id);
    const pending = ids.flatMap((id) => getTasks(id, "pending"));
    const done = ids.flatMap((id) => getTasks(id, "completed"));
    assert.equal(s.pending, pending.length);
    assert.equal(s.completed, done.length);
    assert.equal(s.tasks, pending.length + done.length);
    assert.equal(s.total, 4);
    assert.equal(s.online, 3);
    assert.equal(s.alarms, 1);
    assert.ok(pending.every((t) => t.status !== "completed"));
    assert.ok(done.every((t) => t.status === "completed"));
  }
});
test("已完成指令时间线与耗时一致，所有事件均不晚于快照", () => {
  const seconds = (t) =>
    t
      .split(":")
      .map(Number)
      .reduce((a, b) => a * 60 + b, 0);
  const snapshot = seconds(SNAPSHOT.slice(11));
  for (const t of tasks) {
    const created = seconds(t.created.slice(11));
    assert.ok(created <= snapshot, t.id);
    if (t.started) assert.ok(seconds(t.started) >= created, t.id);
    if (t.completed) {
      assert.equal(
        seconds(t.completed) - seconds(t.started),
        Number.parseInt(t.duration),
      );
      assert.ok(seconds(t.completed) <= snapshot, t.id);
    } else assert.notEqual(t.status, "completed");
  }
});
test("异常设备指令阻塞，离线设备不会执行新任务", () => {
  for (const d of devices) {
    assert.ok(d.floor >= 1 && d.floor <= d.floors);
    const pending = getTasks(d.id, "pending");
    if (d.state === "alarm")
      assert.equal(pending.filter((t) => t.status === "blocked").length, 1);
    if (!d.online) assert.ok(pending.every((t) => t.status === "waiting"));
  }
});
