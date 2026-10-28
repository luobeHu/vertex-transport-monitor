// The close view follows the cabin. Floors stay in world coordinates and are
// shown only after the car has stopped at their actual level.
export function cabinSceneState(pose, focused) {
  const floor=Math.round(pose.positionFloor);
  const docked=!pose.moving&&Math.abs(pose.positionFloor-floor)<.002;
  return {
    landingFloor:focused?(docked?floor:null):'all',
    payloadVisible:pose.agvVisible!==false&&(!focused||!pose.simulation||pose.agvOnboard||docked&&pose.payloadFloor===floor),
  };
}
