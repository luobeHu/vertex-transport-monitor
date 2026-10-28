import { createApp } from "vue";
import "@fontsource-variable/dm-sans/standard.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import TransportMonitor from "./components/TransportMonitor.vue";
createApp(TransportMonitor, { syncUrl: true, exposeAgentApi: true }).mount(
  "#app",
);
