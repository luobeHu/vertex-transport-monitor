import test from "node:test";
import assert from "node:assert/strict";
import { tasks } from "../src/core/data.js";
import { filterRecords, recordsCsv } from "../src/core/records.js";
test("任务过滤只返回选中设备和分类，组合楼层、优先级和关键词筛选", () => {
  assert.equal(filterRecords(tasks, { deviceId: "EL-01" }).length, 5);
  assert.equal(
    filterRecords(tasks, { deviceId: "EL-01", status: "completed" }).length,
    19,
  );
  const rows = filterRecords(tasks, {
    deviceId: "EL-01",
    floor: 6,
    priority: "high",
    query: "0001",
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "CMD-20261026-0001");
});
test("导出为所有匹配记录，保留中文、转义引号并阻止单元格公式执行", () => {
  const rows = filterRecords(tasks, { deviceId: "EL-01", status: "completed" });
  const text = recordsCsv(rows);
  assert.equal(text.split("\r\n").length, 20);
  assert.ok(text.startsWith("\uFEFF"));
  const escaped = recordsCsv([
    { ...rows[0], id: "=SUM(1,2)", deviceId: '含"引号' },
  ]);
  assert.ok(escaped.includes("'=SUM(1,2)"));
  assert.ok(escaped.includes('含""引号'));
});
