import { createApp, defineComponent, h, ref } from "vue";
import TransportMonitor from "../src/components/TransportMonitor.vue";
import { devices, tasks } from "../src/core/data.js";
createApp(
  defineComponent({
    setup() {
      const mounted = ref(true),
        monitor = ref(),
        input = ref(
          devices.map((d) => ({ ...d, floor: d.id === "EL-01" ? 2 : d.floor })),
        ),
        result = ref("");
      return () =>
        h("div", [
          h("div", { id: "host-controls" }, [
            h(
              "button",
              {
                onClick: () => {
                  input.value = input.value.map((d) => ({
                    ...d,
                    floor: d.id === "EL-01" ? 7 : d.floor,
                    doorStatus: d.id === "EL-01" ? "open" : d.doorStatus,
                  }));
                },
              },
              "更新外部数据到 7 层",
            ),
            h(
              "button",
              {
                disabled: !mounted.value,
                onClick: () => {
                  monitor.value.selectDevice("LS-03");
                  result.value = JSON.stringify(
                    monitor.value.getSnapshot().selection,
                  );
                },
              },
              "组件方法：选择 LS-03",
            ),
            h(
              "button",
              {
                onClick: () => {
                  mounted.value = !mounted.value;
                },
              },
              mounted.value ? "卸载监控组件" : "重新挂载监控组件",
            ),
          ]),
          h("pre", { id: "host-result" }, result.value),
          mounted.value
            ? h(TransportMonitor, {
                ref: monitor,
                devices: input.value,
                tasks,
                demo: false,
                embedded: true,
              })
            : h("p", "组件已卸载"),
        ]);
    },
  }),
).mount("#host");
