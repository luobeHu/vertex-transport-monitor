import { computed, reactive, shallowRef, watch } from "vue";
import { TYPES } from "../core/data.js";
import { DEMO_DEVICE_ID, sampleElevatorDemo } from "../core/simulation.js";

export function useMonitor(props) {
  const requested = props.devices.find((d) => d.id === props.initialDevice);
  const seed =
    requested ||
    props.devices.find((d) => d.type === props.initialType) ||
    props.devices[0];
  const state = reactive({
    type: seed?.type || props.initialType,
    device: seed?.id || null,
    status: props.initialStatus,
    building: "all",
    deviceState: "all",
    query: "",
  });
  const simulation = shallowRef(
    sampleElevatorDemo(
      0,
      typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  );
  const scopeDevices = computed(() =>
    props.devices.filter(
      (d) =>
        d.type === state.type &&
        (state.building === "all" || d.building === state.building),
    ),
  );
  const visibleDevices = computed(() =>
    scopeDevices.value.filter(
      (d) =>
        (state.deviceState === "all" || d.state === state.deviceState) &&
        `${d.id} ${d.name} ${d.location}`
          .toLowerCase()
          .includes(state.query.toLowerCase()),
    ),
  );
  const selected = computed(
    () => props.devices.find((d) => d.id === state.device) || null,
  );
  const current = computed(() =>
    selected.value?.id === DEMO_DEVICE_ID && props.demo
      ? { ...selected.value, ...simulation.value }
      : selected.value,
  );
  const deviceTasks = computed(() =>
    props.tasks.filter((t) => t.deviceId === state.device),
  );
  const pending = computed(() =>
    deviceTasks.value.filter((t) => t.status !== "completed"),
  );
  const completed = computed(() =>
    deviceTasks.value.filter((t) => t.status === "completed"),
  );
  const scopeSummary = computed(() => {
    const ids = new Set(scopeDevices.value.map((d) => d.id)),
      rows = props.tasks.filter((t) => ids.has(t.deviceId));
    return {
      total: ids.size,
      online: scopeDevices.value.filter((d) => d.online).length,
      alarms: scopeDevices.value.filter((d) => d.alarm).length,
      pending: rows.filter((t) => t.status !== "completed").length,
      completed: rows.filter((t) => t.status === "completed").length,
    };
  });
  function selectDevice(id) {
    const d = props.devices.find((d) => d.id === id);
    if (!d) throw new Error(`设备不存在：${id}`);
    Object.assign(state, {
      type: d.type,
      device: id,
      building: "all",
      deviceState: "all",
      query: "",
    });
    return d;
  }
  function selectType(type) {
    if (!TYPES.some((t) => t.id === type)) throw new Error("无效的设备类型");
    Object.assign(state, {
      type,
      device: props.devices.find((d) => d.type === type)?.id || null,
      building: "all",
      deviceState: "all",
      query: "",
    });
  }
  function setStatus(status) {
    if (!["pending", "completed"].includes(status))
      throw new Error("status 必须为 pending 或 completed");
    state.status = status;
    return { status };
  }
  function clearFilters() {
    Object.assign(state, { building: "all", deviceState: "all", query: "" });
  }
  let initialized = Boolean(seed);
  watch(
    () => props.devices.length,
    (count) => {
      if (initialized || !count) return;
      const initial =
        props.devices.find((d) => d.id === props.initialDevice) ||
        props.devices.find((d) => d.type === props.initialType) ||
        props.devices[0];
      state.type = initial.type;
      state.device = initial.id;
      initialized = true;
    },
  );
  watch(visibleDevices, (list) => {
    if (!list.some((d) => d.id === state.device))
      state.device = list[0]?.id || null;
  });
  return {
    state,
    simulation,
    scopeDevices,
    visibleDevices,
    selected,
    current,
    deviceTasks,
    pending,
    completed,
    scopeSummary,
    selectDevice,
    selectType,
    setStatus,
    clearFilters,
  };
}
