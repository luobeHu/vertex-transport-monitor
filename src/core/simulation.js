import { DIMENSIONS as D } from "./dimensions.js";
export const DEMO_DEVICE_ID = "EL-01";
export const DOOR_STATE = {
  closed: "门已关闭",
  opening: "开门中",
  open: "门已打开",
  closing: "关门中",
  unknown: "门状态未知",
};
export const DEMO_CYCLE_SECONDS = 44;
export const DEMO_STAGE_TIMES = [4.5, 13.6, 22.5, 33.7];
export const DEMO_PHASES = [
  [0, 1.6, "originOpening", "起点开门", 0],
  [1.6, 2.5, "waiting", "载货 AGV 候梯", 0],
  [2.5, 6.5, "boarding", "AGV 载货进梯", 0],
  [6.5, 7.4, "confirming", "载荷入位确认", 0],
  [7.4, 9, "originClosing", "载货关门", 0],
  [9, 9.6, "readyLoaded", "准备载货运行", 1],
  [9.6, 17.6, "loadedTravel", "载货上行", 1],
  [17.6, 18.3, "arrivedLoaded", "载货到站", 1],
  [18.3, 19.9, "destinationOpening", "到站开门", 2],
  [19.9, 20.5, "destinationOpen", "准备出梯", 2],
  [20.5, 24.5, "alighting", "AGV 载货出梯", 2],
  [24.5, 27.5, "emptyHold", "电梯空载 · 货物已出梯", 3],
  [27.5, 29.1, "emptyClosing", "空载关门", 3],
  [29.1, 29.7, "readyEmpty", "准备空载返程", 3],
  [29.7, 37.7, "emptyReturn", "空载返程", 3],
  [37.7, 39.3, "returnOpening", "空载到站开门", 3],
  [39.3, 42, "returnedEmpty", "空载待命", 3],
  [42, 44, "resetting", "下一轮演示准备", 3],
];
const ease = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
export function sampleElevatorDemo(elapsedSeconds, paused = false) {
  const elapsed = Math.max(
      0,
      Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0,
    ),
    t = elapsed % DEMO_CYCLE_SECONDS;
  const [start, end, phase, phaseLabel, journeyStage] = DEMO_PHASES.find(
    (row) => t >= row[0] && t < row[1],
  );
  const p = (t - start) / (end - start);
  let positionFloor = 4,
    agvZ = D.outsideZ,
    payloadFloor = 4,
    doorStatus = "open",
    doorOpenFraction = 1,
    speed = 0;
  if (t >= 9.6 && t < 17.6) {
    positionFloor = 4 + 2 * ease(p);
    speed = 6 * p * (1 - p) * ((2 * D.floorPitch) / 8);
  } else if (t >= 17.6 && t < 29.7) positionFloor = 6;
  else if (t >= 29.7 && t < 37.7) {
    positionFloor = 6 - 2 * ease(p);
    speed = 6 * p * (1 - p) * ((2 * D.floorPitch) / 8);
  }
  if (t >= 2.5 && t < 6.5)
    agvZ = D.outsideZ + (D.parkedZ - D.outsideZ) * ease(p);
  else if (t >= 6.5 && t < 20.5) agvZ = D.parkedZ;
  else if (t >= 20.5 && t < 24.5)
    agvZ = D.parkedZ + (D.outsideZ - D.parkedZ) * ease(p);
  if (t >= 6.5 && t < 20.5) payloadFloor = positionFloor;
  else if (t >= 20.5) payloadFloor = 6;
  const moving = ["loadedTravel", "emptyReturn"].includes(phase);
  if (
    ["originOpening", "destinationOpening", "returnOpening"].includes(phase)
  ) {
    doorStatus = "opening";
    doorOpenFraction = ease(p);
  } else if (["originClosing", "emptyClosing"].includes(phase)) {
    doorStatus = "closing";
    doorOpenFraction = 1 - ease(p);
  } else if (
    [
      "readyLoaded",
      "loadedTravel",
      "arrivedLoaded",
      "readyEmpty",
      "emptyReturn",
    ].includes(phase)
  ) {
    doorStatus = "closed";
    doorOpenFraction = 0;
  }
  const inside = agvZ <= D.fullyInsideZ,
    outside = agvZ >= D.fullyOutsideZ;
  const occupancy = inside
    ? "loaded"
    : outside
      ? "empty"
      : phase === "boarding"
        ? "boarding"
        : "alighting";
  const agvStatus =
    phase === "resetting"
      ? "循环重置"
      : phase === "boarding"
        ? "载货进梯中"
        : phase === "alighting"
          ? "载货出梯中"
          : inside
            ? moving
              ? "随梯运行中"
              : "梯内已就位"
            : t >= 24.5
              ? "已出梯 · 6 F 站台"
              : "候梯 · 4 F 站台";
  return {
    deviceId: DEMO_DEVICE_ID,
    simulation: true,
    phase,
    phaseLabel,
    paused,
    journeyStage,
    origin: journeyStage === 3 ? 6 : 4,
    target: journeyStage === 3 ? 4 : 6,
    positionFloor,
    floor: moving
      ? phase === "emptyReturn"
        ? Math.ceil(positionFloor - 1e-8)
        : Math.floor(positionFloor + 1e-8)
      : Math.round(positionFloor),
    direction: phase === "emptyReturn" ? "down" : "up",
    state: moving ? "running" : "idle",
    speed: paused ? 0 : speed,
    doorStatus,
    doorOpenFraction,
    elapsedSeconds: elapsed,
    agvZ,
    payloadFloor,
    agvVisible: phase !== "resetting",
    agvOnboard: inside,
    cargoOnboard: inside,
    occupancy,
    loadLabel: {
      loaded: "载货 · AGV 随梯",
      empty: "电梯空载",
      boarding: "载货进梯中",
      alighting: "载货出梯中",
    }[occupancy],
    agvStatus,
    moving,
  };
}
