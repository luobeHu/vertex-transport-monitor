import test from "node:test";
import assert from "node:assert/strict";
import { detailQuery } from "../src/core/navigation.js";
test("打开轿厢明细替换原指令深链并保留设备、状态与视图", () => {
  const p = new URLSearchParams(
    detailQuery(
      "?device=EL-01&status=completed&view=cabin&command=OLD",
      "cargo",
    ),
  );
  assert.equal(p.get("command"), null);
  assert.equal(p.get("cabin"), "cargo");
  assert.equal(p.get("device"), "EL-01");
  assert.equal(p.get("status"), "completed");
  assert.equal(p.get("view"), "cabin");
});
test("打开指令深链移除原轿厢明细定位", () => {
  const p = new URLSearchParams(
    detailQuery("?device=EL-01&cabin=agv", "command", "CMD-1"),
  );
  assert.equal(p.get("command"), "CMD-1");
  assert.equal(p.get("cabin"), null);
});
test("关闭明细清除深链，刷新后不重复打开已关闭弹窗", () => {
  const p = new URLSearchParams(
    detailQuery("?device=EL-01&cabin=cargo&command=CMD-1", null),
  );
  assert.equal(p.get("command"), null);
  assert.equal(p.get("cabin"), null);
  assert.equal(p.get("device"), "EL-01");
});
