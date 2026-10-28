import { DEMO_CYCLE_SECONDS, DEMO_PHASES } from './simulation.js';

export const CAMERA_TRANSITION_SECONDS=1.1;
const phaseStart=name=>DEMO_PHASES.find(row=>row[2]===name)[0];
export const CAMERA_WINDOWS=Object.freeze([
  Object.freeze({start:phaseStart('readyLoaded'),from:1,to:0}),
  Object.freeze({start:phaseStart('arrivedLoaded'),from:0,to:1}),
  Object.freeze({start:phaseStart('readyEmpty'),from:1,to:0}),
  Object.freeze({start:phaseStart('returnOpening'),from:0,to:1}),
]);
const ease=t=>t*t*(3-2*t);
// One clock drives both the lift and the camera, including pause and seeking.
// 1 = cabin close-up, 0 = fixed shaft overview.
export function journeyCameraBlend(pose,reducedMotion=false) {
  if(!pose?.simulation)return 1;
  if(reducedMotion)return pose.moving?0:1;
  const t=pose.elapsedSeconds%DEMO_CYCLE_SECONDS;
  let value=1;
  for(const window of CAMERA_WINDOWS){
    if(t<window.start)break;
    const progress=Math.min(1,(t-window.start)/CAMERA_TRANSITION_SECONDS);
    value=window.from+(window.to-window.from)*ease(progress);
  }
  return value;
}
