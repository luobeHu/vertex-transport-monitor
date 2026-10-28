import test from "node:test";
import assert from "node:assert/strict";
import { reactive, effectScope, nextTick } from "vue";
import { useMonitor } from "../src/composables/useMonitor.js";
import { devices, tasks } from "../src/core/data.js";
import { sampleElevatorDemo } from "../src/core/simulation.js";
function setup(extra = {}) {
  const scope = effectScope(),
    props = reactive({
      devices,
      tasks,
      initialDevice: "EL-01",
      initialType: "elevator",
      initialStatus: "pending",
      demo: true,
      ...extra,
    });
  return { props, scope, m: scope.run(() => useMonitor(props)) };
}
test("Vue 设备选择同步三类设备、指令归属和汇总数量", () => {
  const { scope, m } = setup();
  try {
    assert.equal(m.pending.value.length, 5);
    assert.equal(m.completed.value.length, 19);
    m.selectDevice("LS-03");
    assert.equal(m.state.type, "lans");
    assert.ok(m.deviceTasks.value.every((t) => t.deviceId === "LS-03"));
    m.selectType("hoist");
    assert.equal(m.state.device, "HT-01");
    assert.equal(m.scopeSummary.value.total, 4);
    assert.throws(() => m.selectDevice("INVALID"));
    assert.throws(() => m.setStatus("other"));
  } finally {
    scope.stop();
  }
});
test("接入真实数据时关闭演示，不覆盖输入设备的楼层和状态", () => {
  const { scope, m } = setup({ demo: false });
  try {
    m.simulation.value = sampleElevatorDemo(22.5);
    assert.equal(m.current.value.floor, 4);
    assert.equal(m.current.value.simulation, undefined);
  } finally {
    scope.stop();
  }
});
test("筛选无结果时清空选择，恢复筛选后选择有效设备", async () => {
  const { scope, m } = setup();
  try {
    m.state.query = "不存在的设备";
    await nextTick();
    assert.equal(m.state.device, null);
    assert.equal(m.current.value, null);
    m.clearFilters();
    await nextTick();
    assert.equal(m.state.device, "EL-01");
  } finally {
    scope.stop();
  }
});
test("父服务替换 devices 和 tasks 后同步显示新数据，不修改调用方对象", async () => {
  const { scope, props, m } = setup({ demo: false });
  try {
    const input = devices.map((d) => ({
      ...d,
      floor: d.id === "EL-01" ? 7 : d.floor,
    }));
    props.devices = input;
    props.tasks = tasks.filter(
      (t) => t.deviceId !== "EL-01" || t.status === "completed",
    );
    await nextTick();
    assert.equal(m.current.value.floor, 7);
    assert.equal(m.pending.value.length, 0);
    assert.equal(m.completed.value.length, 19);
    assert.equal(devices[0].floor, 4);
  } finally {
    scope.stop();
  }
});

test("只有某一类设备或空数据时，初始选择仍然一致", () => {
  const one = setup({
    devices: devices.filter((d) => d.type === "lans"),
    initialDevice: "",
  });
  try {
    assert.equal(one.m.state.type, "lans");
    assert.equal(one.m.state.device, "LS-01");
  } finally {
    one.scope.stop();
  }
  const empty = setup({ devices: [], tasks: [] });
  try {
    assert.equal(empty.m.current.value, null);
    assert.equal(empty.m.scopeSummary.value.total, 0);
  } finally {
    empty.scope.stop();
  }
});

test("异步加载设备列表后仍定位到指定 initialDevice", async () => {
  const { scope, props, m } = setup({
    devices: [],
    tasks: [],
    initialDevice: "LS-03",
  });
  try {
    props.devices = devices;
    props.tasks = tasks;
    await nextTick();
    assert.equal(m.state.type, "lans");
    assert.equal(m.state.device, "LS-03");
  } finally {
    scope.stop();
  }
});
