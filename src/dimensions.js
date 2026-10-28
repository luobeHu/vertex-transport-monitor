// Illustrative metres; replace with site measurements for real equipment.
export const DIMENSIONS = Object.freeze({
  floorPitch:3.2,cabinBase:.15,cabinFloor:.15,cabinWidth:2.6,cabinDepth:2.6,cabinRoof:2.61,
  clearWidth:2.4,clearDepth:2.4,clearHeight:2.4,
  doorZ:1.26,doorLeafWidth:.50,clearDoorWidth:2.0,
  agvWidth:.90,agvLength:1.20,agvBodyHeight:.24,palletWidth:1.0,palletLength:1.2,
  parkedZ:-.25,outsideZ:3.8,fullyInsideZ:.55,fullyOutsideZ:1.95,
});

// Two panels on each side stack in the 0.6 m door pocket (1.0–1.6 m from centre).
export const DOOR_LEAVES=Object.freeze([-1,1].flatMap(side=>[
  Object.freeze({side,closedX:.25,travel:1.02,depth:-.025}),
  Object.freeze({side,closedX:.75,travel:.52,depth:.025}),
]));
