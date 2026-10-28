import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DEMO_DEVICE_ID, sampleElevatorDemo, DEMO_STAGE_TIMES } from './simulation.js';
import { DIMENSIONS as D } from './dimensions.js';
import { createCabinPayload } from './cabin-model.js';

export function createTwin(container, onSelectFloor, onDemoUpdate, payloadOptions = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch {
    container.innerHTML = '<div class="webgl-fallback"><span>3D 视图暂不可用</span><p>当前浏览器未启用 WebGL，设备运行数据仍可正常查看。</p></div>';
    return { update() {}, reset() {}, zoom() {}, front() {}, toggleCabinView:()=>false, projectPayload() {}, toggleDemo() {}, restartDemo() {}, seekDemoStage() {}, getDemoState: () => null, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xeff1eb, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '垂直运输设备三维模型，可拖动旋转、滚轮缩放');
  renderer.domElement.setAttribute('role', 'img');
  const scene = new THREE.Scene();
  const environmentRoom = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentRoom, .035);
  scene.environment = environment.texture;
  scene.environmentIntensity = 1;
  environmentRoom.dispose();
  pmrem.dispose();
  scene.fog = new THREE.FogExp2(0xeff1e9, .012);
  const camera = new THREE.OrthographicCamera(-20,20,15,-15,.1,200);
  let viewHeight=30;
  function updateFrustum(){const rect=container.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height);const framedHeight=Math.max(viewHeight,cabinView?7.6/aspect:0);camera.left=-framedHeight*aspect/2;camera.right=framedHeight*aspect/2;camera.top=framedHeight/2;camera.bottom=-framedHeight/2;camera.updateProjectionMatrix();}
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minZoom=.65;controls.maxZoom=3;
  controls.enablePan = false;
  controls.minDistance = 24;
  controls.maxDistance = 90;
  controls.maxPolarAngle = Math.PI * .52;
  controls.target.set(0, 4, 0);
  scene.add(new THREE.HemisphereLight(0xf8fbf5, 0xb4c1b2, 1.4));
  const sun = new THREE.DirectionalLight(0xf2f0df, 4.2);
  sun.position.set(12, 32, 16); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 35, bottom: -8, far: 90 });
  sun.shadow.normalBias = .03; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xaac6e2, 2.6); fill.position.set(-12, 18, -8); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xc7edab, 3); rim.position.set(-5, 26, -10); scene.add(rim);
  const groundMaterial = new THREE.MeshStandardMaterial({color:0xe4e9df, roughness:.85, metalness:.06});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.25; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(45, 45, 0xaab5a4, 0xbfc8b9); grid.position.y = -.23; grid.material.transparent = true; grid.material.opacity = .21; scene.add(grid);
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(3.45,3.65,.2,96),new THREE.MeshStandardMaterial({color:0xc5cfc0,metalness:.5,roughness:.35}));
  stage.position.y = -.12; stage.receiveShadow = true; stage.castShadow = true; scene.add(stage);
  const ringMaterial = new THREE.MeshBasicMaterial({color:0x91a07f,transparent:true,opacity:.14,side:THREE.DoubleSide});
  for (const radius of [4.25,5.6]) { const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.012,120),ringMaterial); ring.rotation.x=-Math.PI/2; ring.position.y=-.235; scene.add(ring); }
  const steel = new THREE.MeshStandardMaterial({ color: 0x889a92, metalness: .85, roughness: .25 });
  const light = new THREE.MeshStandardMaterial({ color: 0xa3aea1, metalness: .75, roughness: .3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263335, metalness: .85, roughness: .28 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xa79665, metalness: .7, roughness: .34 });
  let group = new THREE.Group(), cabin = null, selectedDevice = null, floorMeshes = [], targetY = 0, dynamicMaterials = [];
  let doorGroups = [], floorHighlights = [], counterweight = null, wheels = [], landingLight = null, suspensionRopes = [];
  let payload = null;
  let cabinRoof = null, cabinGlass = null, doorMaterial = null;
  let cabinView = false;
  let demoElapsed = 0, demoPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastFrame = null, lastEmit = -Infinity, highlightedFloor = null;
  let needsRender = true;
  controls.addEventListener('change', () => { needsRender = true; });
  scene.add(group);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let pointerStart;
  renderer.domElement.addEventListener('pointerdown', e => { pointerStart = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!pointerStart || Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(group.children,true).find(h=>h.object.isMesh && !(h.object.material?.transparent && h.object.material.opacity<.8 && !h.object.userData.cabinPayload));
    if(hit?.object.userData.cabinPayload) payloadOptions.onSelect?.(hit.object.userData.cabinPayload);
    else if(hit?.object.userData.floor) onSelectFloor?.(hit.object.userData.floor);
  });
  function box(w, h, d, x, y, z, material, parent = group) {
    const geometry = Math.min(w,h,d) > .18 ? new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.15) : new THREE.BoxGeometry(w,h,d);
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function textLabel(text, y, color = '#6b8278', x = -2.65) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const ctx = c.getContext('2d'); ctx.font = '500 48px monospace'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(text, 128, 64);
    const texture = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.scale.set(1.15, .43, 1); sprite.position.set(x, y, .5); group.add(sprite);
  }
  function clear() {
    payload?.dispose(); payload = null;
    group.traverse(obj => { obj.geometry?.dispose(); if (obj.isSprite) { obj.material.map?.dispose(); obj.material.dispose(); } });
    dynamicMaterials.forEach(m => m.dispose()); dynamicMaterials = [];
    scene.remove(group); group = new THREE.Group(); scene.add(group); floorMeshes = []; needsRender = true;
    doorGroups = []; floorHighlights = []; wheels = []; suspensionRopes = []; counterweight = null; landingLight = null; cabinRoof = null; highlightedFloor = null;
  }
  function update(device) {
    if (selectedDevice?.id === device.id) { selectedDevice = device; applyPose(getDemoState() || staticPose(device)); return; }
    selectedDevice = device; clear();
    const isHoist = device.type !== 'elevator', floorH = D.floorPitch, height = device.floors * floorH;
    const tint = device.state === 'alarm' ? 0xb26650 : device.state === 'offline' ? 0x7d8982 : 0x4e7050;
    const green = new THREE.MeshStandardMaterial({ color: tint, metalness: .52, roughness: .25 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x496560, transparent: true, opacity: .5, roughness: .08, metalness: .35, depthWrite: false, side: THREE.DoubleSide });
    cabinGlass=glass;
    doorMaterial=green.clone();doorMaterial.transparent=true;doorMaterial.depthWrite=false;dynamicMaterials.push(doorMaterial);
    const led = new THREE.MeshStandardMaterial({color:tint,emissive:tint,emissiveIntensity:device.online ? 1.5 : .15,roughness:.3});
    dynamicMaterials.push(green, glass, led);
    box(5.2,.24,4.1,0,-.1,0,light);
    for(const x of [-1.8,1.8])for(const z of [-1.5,1.5]){
      box(.13,height+.5,.13,x,height/2,z,steel);box(.35,.08,.35,x,.08,z,dark);
    }
    for(const x of [-1.3,1.3])box(.06,height,.10,x,height/2,-1.3,dark);
    for(let f=1;f<=device.floors;f++){
      const structureStart=group.children.length;
      const y=(f-1)*floorH;
      for(const x of [-1.6,1.6]){
        const m=box(.5,.20,3.3,x,y+.20,0,light);m.userData={floor:f,normalMaterial:light};floorMeshes.push(m);floorHighlights.push(m);
      }
      const rear=box(2.7,.20,.25,0,y+.20,-1.525,light);rear.userData={floor:f,normalMaterial:light};floorMeshes.push(rear);floorHighlights.push(rear);
      const front=box(3.7,.18,.15,0,y+.21,1.575,steel);front.userData={floor:f,normalMaterial:steel};floorHighlights.push(front);
      box(3.7,.10,.10,0,y+floorH-.1,-1.5,steel);
      const brace=box(.055,Math.hypot(2.2,floorH),.055,0,y+floorH/2,-1.52,steel);brace.rotation.z=.60;
      const demoDock=device.id===DEMO_DEVICE_ID && [4,6].includes(f);
      const depth=demoDock?4.6:1.25,center=demoDock?3.55:1.9;
      const landing=box(3.0,.20,depth,0,y+.20,center,light);landing.userData.floor=f;floorMeshes.push(landing);
      box(3,.03,.06,0,y+.315,1.28,gold);
      for(const x of [-1.46,1.46]){
        for(const z of [center-depth/2+.15,center+depth/2-.15])box(.045,.85,.045,x,y+.73,z,steel);
        box(.045,.045,depth,x,y+1.16,center,steel);
      }
      textLabel(`${String(f).padStart(2,'0')} F`,y+.5,'#73846e',-2.4);
      group.children.slice(structureStart).forEach(obj=>obj.userData.floorStructure=f);
    }
    landingLight=box(3.7,.025,.025,0,(device.floor-1)*floorH+.32,1.66,led);group.userData.activeMaterial=green;
    for(const x of [-.6,.6])suspensionRopes.push(box(.03,1,.03,x,height,-.35,dark));
    box(3.9,.24,3.4,0,height+.2,0,steel);box(1.3,.5,.8,0,height+.56,-.1,dark);
    for(const x of [-.6,.6]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.18,24),steel);wheel.rotation.z=Math.PI/2;wheel.position.set(x,height+.65,0);group.add(wheel);wheels.push(wheel);}
    counterweight=box(.45,1.9,.22,1.5,height*.5,-1.2,dark);
    cabin=new THREE.Group();group.add(cabin);
    box(D.cabinWidth,.14,D.cabinDepth,0,.04,0,dark,cabin);
    box(2.45,.06,2.45,0,.12,0,light,cabin);
    cabinRoof=box(D.cabinWidth,.12,D.cabinDepth,0,D.cabinRoof,0,green,cabin);
    for(const x of [-1.25,1.25])for(const z of [-1.25,1.25])box(.075,2.4,.075,x,1.35,z,green,cabin);
    box(2.44,2.32,.045,0,1.35,-1.25,glass,cabin);
    for(const x of [-1.25,1.25])box(.045,2.32,2.45,x,1.35,0,glass,cabin);
    for(const x of [-1.12,1.12])box(.23,2.3,.06,x,1.30,D.doorZ,green,cabin);
    for(const side of [-1,1]){
      const leaf=new THREE.Group();leaf.userData.side=side;cabin.add(leaf);doorGroups.push(leaf);
      box(.98,.75,.055,0,.525,D.doorZ,doorMaterial,leaf);
      box(.98,.95,.055,0,1.975,D.doorZ,doorMaterial,leaf);
      for(const x of [-.37,.37])box(.24,.6,.055,x,1.2,D.doorZ,doorMaterial,leaf);
      box(.50,.6,.015,0,1.2,D.doorZ+.04,glass,leaf);
      box(.015,2.3,.06,-side*.49,1.30,D.doorZ+.04,dark,leaf);
    }
    box(2.2,.035,.05,0,1.15,-1.19,steel,cabin);
    box(2.2,.035,.05,0,2.48,-1.19,led,cabin);
    box(2.08,.03,.03,0,2.48,D.doorZ+.05,led,cabin);
    for(const x of [-1.04,1.04])box(.025,2.3,.025,x,1.3,D.doorZ+.05,led,cabin);
    if(isHoist)for(let j=0;j<11;j++)box(.035,1.8,.035,-1.04+j*.208,1.1,D.doorZ+.1,gold,cabin);
    if(device.cabin)payload=createCabinPayload(cabin,device.cabin,box);
    applyPose(getDemoState() || staticPose(device));
    controls.target.set(0, height * .47, 0); reset();
  }
  function staticPose(device) { return { floor:device.floor, positionFloor:device.floor, agvZ:D.parkedZ, payloadFloor:device.floor, agvVisible:true, doorOpenFraction:device.doorStatus === 'open' ? 1 : 0 }; }
  function getDemoState() { return selectedDevice?.id === DEMO_DEVICE_ID ? sampleElevatorDemo(demoElapsed, demoPaused) : null; }
  function applyPose(pose) {
    if (!cabin) return;
    cabin.position.y = (pose.positionFloor - 1) * D.floorPitch + D.cabinBase;
    if(cabinView) { const delta=cabin.position.y+1-controls.target.y; controls.target.y+=delta;camera.position.y+=delta; }
    for (const rope of suspensionRopes) {
      const bottom = cabin.position.y + 2.74, top = selectedDevice.floors * D.floorPitch + .4;
      rope.scale.y = Math.max(.05, top - bottom); rope.position.y = bottom + rope.scale.y / 2;
    }
    for (const leaf of doorGroups) leaf.position.x = leaf.userData.side * (D.doorCenterX + D.doorSlide * pose.doorOpenFraction);
    if (counterweight) counterweight.position.y = Math.max(.9, selectedDevice.floors * D.floorPitch - cabin.position.y - .7);
    for (const wheel of wheels) wheel.rotation.x = cabin.position.y / .27;
    if (highlightedFloor !== pose.floor) {
      highlightedFloor = pose.floor;
      floorHighlights.forEach(m => { m.material = m.userData.floor === pose.floor ? group.userData.activeMaterial : m.userData.normalMaterial; });
      if (landingLight) landingLight.position.y = (pose.floor - 1) * D.floorPitch + .32;
    }
    payload?.setPose(pose);
    group.children.forEach(obj=>{const f=obj.userData.floorStructure;if(f)obj.visible=!cabinView||(f-1)*D.floorPitch<=cabin.position.y+.6||(pose.simulation&&!pose.agvOnboard&&f===pose.payloadFloor);});
    needsRender = true;
  }
  function emitDemo() { const s = getDemoState(); if (s) { applyPose(s); onDemoUpdate?.(s); } }
  function toggleDemo() { demoPaused = !demoPaused; emitDemo(); return getDemoState(); }
  function restartDemo() { demoElapsed = 0; demoPaused = false; emitDemo(); return getDemoState(); }
  function reset(){cabinView=false;if(cabinRoof)cabinRoof.visible=true;if(cabinGlass)cabinGlass.opacity=.5;if(doorMaterial)doorMaterial.opacity=1;applyPose(getDemoState()||staticPose(selectedDevice));controls.minDistance=24;controls.maxDistance=90;const h=selectedDevice?.floors*D.floorPitch||25.6;viewHeight=h*1.15;camera.zoom=1;updateFrustum();camera.position.set(26,h*.65+7,36);controls.target.set(0,h*.46,1);controls.update();payloadOptions.onViewChange?.(false);}
  function zoom(direction){camera.zoom=Math.max(.65,Math.min(3,camera.zoom*(direction>0?1.16:.86)));camera.updateProjectionMatrix();controls.update();needsRender=true;}
  function front(){camera.position.set(0,controls.target.y+(cabinView?2.3:3),cabinView?8.5:55);controls.update();}
  function toggleCabinView(){if(!cabin)return false;if(cabinView){reset();return false;}cabinView=true;if(cabinRoof)cabinRoof.visible=false;if(cabinGlass)cabinGlass.opacity=.16;if(doorMaterial)doorMaterial.opacity=.28;applyPose(getDemoState()||staticPose(selectedDevice));controls.minDistance=4.5;controls.maxDistance=20;viewHeight=6.4;camera.zoom=1;updateFrustum();controls.target.set(0,cabin.position.y+1,1.6);camera.position.set(5,cabin.position.y+5,9);controls.update();needsRender=true;payloadOptions.onViewChange?.(true);return true;}
  function seekDemoStage(index){if(!Number.isInteger(index)||!DEMO_STAGE_TIMES[index])return;demoElapsed=DEMO_STAGE_TIMES[index];emitDemo();return getDemoState();}
  function projectPayload() {
    if(!payload || !payloadOptions.onProject)return;
    scene.updateMatrixWorld();camera.updateMatrixWorld();
    const rect=container.getBoundingClientRect(), result={};
    for(const [kind,object] of Object.entries(payload.anchors)) {
      const p=object.getWorldPosition(new THREE.Vector3()).project(camera);
      result[kind]={x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2+container.offsetTop,visible:object.parent.visible&&p.z>-1&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};
    }
    payloadOptions.onProject(result);
  }
  const observer = new ResizeObserver(() => { const { width, height } = container.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height); updateFrustum(); needsRender = true; }); observer.observe(container);
  let raf;
  function draw(now = performance.now()) {
    raf = requestAnimationFrame(draw);
    const dt = lastFrame === null ? 0 : Math.min(.1, (now - lastFrame) / 1000); lastFrame = now;
    if (selectedDevice?.id === DEMO_DEVICE_ID) {
      if (!demoPaused && !document.hidden) { demoElapsed += dt; applyPose(getDemoState()); }
      if (now - lastEmit > 120) { onDemoUpdate?.(getDemoState()); lastEmit = now; }
    }
    controls.update(); if (needsRender) { renderer.render(scene, camera); projectPayload(); needsRender = false; }
  }
  draw();
  return { update, reset, zoom, front, toggleCabinView, projectPayload, toggleDemo, restartDemo, seekDemoStage, getDemoState, dispose() { cancelAnimationFrame(raf); observer.disconnect(); controls.dispose(); environment.dispose(); renderer.dispose(); clear(); steel.dispose(); light.dispose(); dark.dispose(); gold.dispose(); ground.geometry.dispose(); groundMaterial.dispose(); stage.geometry.dispose(); stage.material.dispose(); ringMaterial.dispose(); } };
}
