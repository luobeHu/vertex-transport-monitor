import test from 'node:test';
import assert from 'node:assert/strict';
import { cabinSceneState } from '../src/model-state.js';
import { sampleElevatorDemo } from '../src/simulation.js';
import { DOOR_LEAVES,DIMENSIONS as D } from '../src/dimensions.js';

test('到站才显示当前层地板，经过整层或暂停于途中不显示地板',()=>{
  assert.equal(cabinSceneState(sampleElevatorDemo(4.5),true).landingFloor,4);
  assert.equal(cabinSceneState(sampleElevatorDemo(22.5),true).landingFloor,6);
  assert.equal(cabinSceneState(sampleElevatorDemo(13.6),true).landingFloor,null);
  assert.equal(cabinSceneState(sampleElevatorDemo(13.6,true),true).landingFloor,null);
  assert.equal(cabinSceneState(sampleElevatorDemo(33.7),true).landingFloor,null);
  assert.equal(cabinSceneState(sampleElevatorDemo(40),true).landingFloor,4);
});
test('近景不把目的层 AGV 显示成随梯返回，全景保留它的实际位置',()=>{
  assert.equal(cabinSceneState(sampleElevatorDemo(26),true).payloadVisible,true);
  assert.equal(cabinSceneState(sampleElevatorDemo(33.7),true).payloadVisible,false);
  assert.equal(cabinSceneState(sampleElevatorDemo(33.7),false).payloadVisible,true);
  assert.equal(cabinSceneState(sampleElevatorDemo(33.7),false).landingFloor,'all');
  assert.equal(cabinSceneState(sampleElevatorDemo(40),true).payloadVisible,false);
});
test('伸缩门闭合时覆盖门洞，全开时收入侧袋且两扇门不穿插',()=>{
  const positive=DOOR_LEAVES.filter(d=>d.side===1);
  assert.equal(positive[0].closedX-D.doorLeafWidth/2,0);
  assert.equal(positive[1].closedX+D.doorLeafWidth/2,D.clearDoorWidth/2);
  for(const d of positive){
    assert.ok(d.closedX+d.travel-D.doorLeafWidth/2>=D.clearDoorWidth/2);
    assert.ok(d.closedX+d.travel+D.doorLeafWidth/2<=1.6);
  }
  assert.ok(Math.abs(positive[0].depth-positive[1].depth)>.035);
});
