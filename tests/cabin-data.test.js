import test from 'node:test';
import assert from 'node:assert/strict';
import { devices } from '../src/data.js';
import { summarizeCabin } from '../src/cabin-data.js';

test('每台设备的轿厢地码唯一，AGV 占用与货物承载关系一致', () => {
  const ids=devices.flatMap(d=>d.cabin.floorCodes.map(c=>c.id));
  assert.equal(new Set(ids).size,ids.length);
  for(const d of devices) {
    const {agv,cargo,floorCodes}=d.cabin;
    if(agv) {
      assert.equal(floorCodes.find(c=>c.id===agv.floorCodeId)?.occupiedBy,agv.id);
      assert.ok(agv.carryingCargoIds.every(id=>cargo.some(c=>c.id===id && c.carrier==='agv')));
      assert.ok(agv.batteryPct>=0 && agv.batteryPct<=100);
    }
    for(const code of floorCodes) assert.ok(!code.occupiedBy || code.occupiedBy===agv?.id || cargo.some(c=>c.id===code.occupiedBy));
  }
});
test('载荷统计包含货物与 AGV 自重，区分空载与离线未知', () => {
  const get=id=>summarizeCabin(devices.find(d=>d.id===id).cabin);
  assert.deepEqual(get('EL-01'),{observed:true,floorCodes:2,pallets:1,cartons:4,cargoKg:240,agvKg:320,totalKg:560,hasAgv:true});
  assert.equal(get('EL-02').pallets,0); assert.equal(get('EL-02').observed,true);
  assert.equal(get('EL-03').pallets,2); assert.equal(get('EL-03').hasAgv,false);
  assert.equal(get('EL-04').observed,false);
});
