<script setup>
import { computed } from "vue";
import {
  ArrowUp,
  ArrowRight,
  ArrowDownToLine,
  Bot,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  CircleHelp,
  CirclePause,
  Code2,
  Container,
  Filter,
  Layers3,
  ListFilter,
  Maximize2,
  Minimize2,
  Minus,
  MoreHorizontal,
  Package,
  PanelsTopLeft,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  WifiOff,
  X,
} from "@lucide/vue";
const props = defineProps({ name: String });
const icons = {
  "arrow-up": ArrowUp,
  "arrow-right": ArrowRight,
  "arrow-down-to-line": ArrowDownToLine,
  bot: Bot,
  box: Box,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  check: Check,
  circle: Circle,
  "circle-help": CircleHelp,
  "circle-pause": CirclePause,
  "code-2": Code2,
  container: Container,
  filter: Filter,
  "layers-3": Layers3,
  "list-filter": ListFilter,
  "maximize-2": Maximize2,
  "minimize-2": Minimize2,
  minus: Minus,
  "more-horizontal": MoreHorizontal,
  package: Package,
  "panels-top-left": PanelsTopLeft,
  play: Play,
  plus: Plus,
  "refresh-cw": RefreshCw,
  "rotate-ccw": RotateCcw,
  "scan-line": ScanLine,
  search: Search,
  "shield-check": ShieldCheck,
  "sliders-horizontal": SlidersHorizontal,
  "triangle-alert": TriangleAlert,
  "wifi-off": WifiOff,
  x: X,
};
const component = computed(() => icons[props.name] || CircleHelp);
</script>
<template>
  <component
    :is="component"
    :size="18"
    :stroke-width="1.7"
    aria-hidden="true"
  />
</template>
