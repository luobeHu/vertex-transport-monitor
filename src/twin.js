import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DEMO_DEVICE_ID, sampleElevatorDemo, DEMO_STAGE_TIMES } from './simulation.js';
import { DIMENSIONS as D, DOOR_LEAVES } from './dimensions.js';
import { createCabinPayload } from './cabin-model.js';
import { cabinSceneState } from './model-state.js';
import { journeyCameraBlend } from './journey-camera.js';

export function createTwin(container, onSelectFloor, onDemoUpdate, payloadOptions = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch {
    container.innerHTML = '<div class="webgl-fallback"><span>3D 视图暂不可用</span><p>当前浏览器未启用 WebGL，设备运行数据仍可正常查看。</p></div>';
    return { update() {}, reset() {}, zoom() {}, front() {}, toggleCabinView:()=>false, projectPayload() {}, toggleDemo() {}, restartDemo() {}, seekDemoStage() {}, getDemoState:()=>null, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xf3f4ef,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','货梯剖视三维模型，可拖动旋转、滚轮缩放');
  renderer.domElement.setAttribute('role','img');
  const scene=new THREE.Scene();
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;scene.environmentIntensity=.55;
  room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff,0xc3c9c4,2.1));
  const sun=new THREE.DirectionalLight(0xfffcf5,3.1);
  sun.position.set(10,35,14);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.015;
  Object.assign(sun.shadow.camera,{left:-12,right:12,top:36,bottom:-8,far:80});scene.add(sun);
  const fill=new THREE.DirectionalLight(0xdde9f0,1.8);fill.position.set(-10,20,8);scene.add(fill);
  const camera=new THREE.OrthographicCamera(-20,20,15,-15,.1,180);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2.5;
  controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI*.48;
  let cabinView=false,cameraBlend=0,lastCameraBlend=null,viewHeight=30,needsRender=true;
  let nearOffset=new THREE.Vector3(8,4.7,7),farOffset=new THREE.Vector3(),nearZoom=1,farZoom=1;
  let lastSceneKey='';
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const updateFrustum=()=>{
    const {width,height}=container.getBoundingClientRect(),aspect=width/Math.max(1,height);
    const h=Math.max(viewHeight,7.2*cameraBlend/aspect);
    camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
  };
  controls.addEventListener('change',()=>{needsRender=true;});
  let group=new THREE.Group();scene.add(group);
  let selectedDevice=null,cabin=null,payload=null,shaft=null,roof=null,observationWall=null;
  let doors=[],landings=[],dynamicMaterials=[],shaftMaterials=[],shellMaterial=null;
  let demoElapsed=0,demoPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastFrame=null,lastEmit=-Infinity;
  let poseY=0;
  const mat=(options)=>{const m=new THREE.MeshStandardMaterial(options);dynamicMaterials.push(m);return m;};
  function box(w,h,d,x,y,z,material,parent=group) {
    const radius=Math.min(.035,Math.min(w,h,d)*.12);
    const geometry=Math.min(w,h,d)>.10?new RoundedBoxGeometry(w,h,d,2,radius):new THREE.BoxGeometry(w,h,d);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function label(text,w,h,x,y,z,parent,{color='#4e6056',background=null,flat=false}={}) {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
    const ctx=canvas.getContext('2d');
    if(background){ctx.fillStyle=background;ctx.fillRect(0,0,768,128);}
    ctx.fillStyle=color;ctx.textAlign='center';ctx.font='500 64px sans-serif';ctx.fillText(text,384,88);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false});
    dynamicMaterials.push(material);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
    mesh.position.set(x,y,z);if(flat)mesh.rotation.x=-Math.PI/2;parent.add(mesh);return mesh;
  }
  function clear() {
    payload?.dispose();payload=null;
    group.traverse(o=>o.geometry?.dispose());
    dynamicMaterials.forEach(m=>{m.map?.dispose();m.dispose();});dynamicMaterials=[];
    scene.remove(group);group=new THREE.Group();scene.add(group);
    doors=[];landings=[];shaftMaterials=[];roof=null;observationWall=null;shaft=null;lastCameraBlend=null;lastSceneKey='';
  }
  function cloneMaterial(material){const clone=material.clone();clone.transparent=true;dynamicMaterials.push(clone);return clone;}
  function materialsOf(root){const materials=new Set();root.traverse(o=>{if(o.material)materials.add(o.material);});return [...materials];}
  function opacity(materials,value){for(const material of materials){material.opacity=value;material.depthWrite=value>.999;}}
  function buildLanding(f,device,shared) {
    const m=Object.fromEntries(['floor','joint','sill','marking'].map(key=>[key,cloneMaterial(shared[key])]));
    const y=(f-1)*D.floorPitch;
    const landing=new THREE.Group();landing.position.y=y;group.add(landing);
    const transfer=device.id===DEMO_DEVICE_ID&&[4,6].includes(f);
    const depth=transfer?3.4:1.25,center=D.doorZ+depth/2+.05;
    const slab=box(5.0,.16,depth,0,.22,center,m.floor,landing);slab.userData.floor=f;
    // A warehouse floor, flush with the cabin sill; no raised bridge or railings.
    for(const x of [-1.6,-.8,0,.8,1.6])box(.008,.002,depth-.08,x,.302,center,m.joint,landing);
    for(let z=D.doorZ+.8;z<center+depth/2;z+=.8)box(4.9,.002,.008,0,.302,z,m.joint,landing);
    box(2.04,.035,.13,0,.30,D.doorZ+.04,m.sill,landing);
    if(transfer){
      for(const x of [-.68,.68])box(.035,.004,1.5,x,.306,3.35,m.marking,landing);
      label(`${String(f).padStart(2,'0')} F`,.7,.2,-1.85,.31,2.35,landing,{flat:true,color:'#7c8980'});
    }
    landings.push({floor:f,group:landing,materials:materialsOf(landing)});
  }
  function update(device) {
    if(selectedDevice?.id===device.id){selectedDevice=device;applyPose(getDemoState()||staticPose(device));return;}
    selectedDevice=device;clear();
    const height=device.floors*D.floorPitch;
    const tint=device.state==='alarm'?0xa66a54:device.state==='offline'?0x87928c:0x506e60;
    const m={
      wall:mat({color:0xe1e4dc,roughness:.72,metalness:.08}),
      steel:mat({color:0xb4c0bd,roughness:.44,metalness:.6}),
      floor:mat({color:0xaeb8ad,roughness:.86}),joint:mat({color:0x8f9a90,roughness:1}),
      cabinFloor:mat({color:0x99a7a1,roughness:.65,metalness:.2}),
      trim:mat({color:tint,roughness:.5,metalness:.32}),
      door:mat({color:0xc3cbc8,roughness:.42,metalness:.65}),
      sill:mat({color:0x75837e,roughness:.4,metalness:.65}),
      marking:mat({color:0xb49e5c,roughness:.85}),
      light:mat({color:0xfff9df,emissive:0xfff3d4,emissiveIntensity:.55,roughness:.5}),
      seam:mat({color:0x697a73,roughness:.6}),
    };
    shaft=new THREE.Group();group.add(shaft);
    const context=Object.fromEntries(['wall','sill','trim','steel'].map(key=>[key,cloneMaterial(m[key])]));
    box(3.6,height+.3,.16,0,height/2,-1.58,context.wall,shaft);
    box(.13,height+.3,3.3,-1.75,height/2,0,context.wall,shaft);
    for(const x of [-1.15,1.15])box(.06,height,.07,x,height/2,-1.40,context.sill,shaft);
    box(3.65,.22,3.35,0,height+.2,0,context.trim,shaft);
    for(let f=1;f<=device.floors;f++){
      const y=(f-1)*D.floorPitch;
      box(3.6,.14,.16,0,y+.22,-1.43,context.steel,shaft);
      buildLanding(f,device,m);
    }
    shaftMaterials=materialsOf(shaft);
    cabin=new THREE.Group();group.add(cabin);
    shellMaterial=cloneMaterial(m.trim);
    // Opaque freight-cabin surfaces. The roof and observer-side wall are removed only in cutaway view.
    box(2.76,.16,2.72,0,.04,0,m.sill,cabin);
    box(2.48,.06,2.48,0,.12,0,m.cabinFloor,cabin);
    box(2.64,2.46,.10,0,1.38,-1.29,m.wall,cabin);
    box(.10,2.46,2.55,-1.29,1.38,0,m.wall,cabin);
    observationWall=box(.10,2.46,2.55,1.29,1.38,0,shellMaterial,cabin);
    roof=box(2.76,.12,2.72,0,D.cabinRoof,0,shellMaterial,cabin);
    for(const x of [-1.16,1.16])box(.025,2.26,.025,x,1.36,-1.22,m.steel,cabin);
    for(const y of [.52,.87,1.22])box(2.30,.07,.035,0,y,-1.22,m.steel,cabin);
    box(.035,.07,2.2,-1.22,.87,0,m.steel,cabin);
    box(2.10,.055,.07,0,2.46,-.85,m.light,cabin);
    // Four telescoping panels retract into the side pockets without protruding from the body.
    for(const side of [-1,1])box(.60,2.45,.24,side*1.30,1.38,D.doorZ+.03,m.trim,cabin);
    box(3.2,.30,.28,0,2.60,D.doorZ+.03,m.trim,cabin);
    label('VERTEX  /  FREIGHT',1.6,.13,0,2.61,D.doorZ+.18,cabin,{color:'#f3f6ef'});
    for(const definition of DOOR_LEAVES){
      const leaf=new THREE.Group();leaf.userData=definition;cabin.add(leaf);doors.push(leaf);
      box(D.doorLeafWidth,2.28,.035,0,1.30,D.doorZ+definition.depth,m.door,leaf);
      box(.008,2.20,.006,-definition.side*(D.doorLeafWidth/2-.02),1.30,D.doorZ+definition.depth+.02,m.seam,leaf);
    }
    box(2.05,.035,.15,0,.16,D.doorZ,m.sill,cabin);
    if(device.type!=='elevator'){
      for(let i=0;i<9;i++)box(.025,.38,.03,-.85+i*.2125,2.25,D.doorZ+.12,m.sill,cabin);
    }
    if(device.cabin)payload=createCabinPayload(cabin,device.cabin,box);
    setView(cabinView);
  }
  function staticPose(d){return {floor:d.floor,positionFloor:d.floor,agvZ:D.parkedZ,payloadFloor:d.floor,agvVisible:true,doorOpenFraction:d.doorStatus==='open'?1:0};}
  function getDemoState(){return selectedDevice?.id===DEMO_DEVICE_ID?sampleElevatorDemo(demoElapsed,demoPaused):null;}
  function applyPose(pose){
    if(!cabin)return;
    cabin.position.y=(pose.positionFloor-1)*D.floorPitch+D.cabinBase;
    const blend=cabinView?journeyCameraBlend(pose,reducedMotion.matches):0;
    const nearTarget=new THREE.Vector3(0,cabin.position.y+1.1,1);
    const h=selectedDevice.floors*D.floorPitch;
    const farTarget=new THREE.Vector3(0,h*.46,1);
    if(lastCameraBlend!==blend){
      if(lastCameraBlend===1){nearOffset.copy(camera.position).sub(new THREE.Vector3(0,poseY+1.1,1));nearZoom=camera.zoom;}
      if(lastCameraBlend===0){farOffset.copy(camera.position).sub(farTarget);farZoom=camera.zoom;}
      cameraBlend=blend;
      controls.target.copy(farTarget).lerp(nearTarget,blend);
      camera.position.copy(farOffset).lerp(nearOffset,blend).add(controls.target);
      viewHeight=THREE.MathUtils.lerp(h*1.24,5.5,blend);
      camera.zoom=THREE.MathUtils.lerp(farZoom,nearZoom,blend);
      updateFrustum();
    } else if(blend===1){
      const delta=cabin.position.y-poseY;controls.target.y+=delta;camera.position.y+=delta;
    }
    lastCameraBlend=blend;poseY=cabin.position.y;
    const transitioning=blend>0&&blend<1,contextAlpha=1-blend;
    controls.enabled=!transitioning;controls.enableDamping=!transitioning;
    shaft.visible=contextAlpha>.001;opacity(shaftMaterials,contextAlpha);
    roof.visible=observationWall.visible=contextAlpha>.001;opacity([shellMaterial],contextAlpha);
    for(const leaf of doors){const d=leaf.userData;leaf.position.x=d.side*(d.closedX+d.travel*pose.doorOpenFraction);}
    const closeState=cabinSceneState(pose,true),state=cabinSceneState(pose,blend===1);
    landings.forEach(item=>{
      const alpha=item.floor===closeState.landingFloor?1:contextAlpha;
      item.group.visible=alpha>.001;opacity(item.materials,alpha);
    });
    payload?.setPose({...pose,agvVisible:state.payloadVisible});
    container.dataset.landingFloor=state.landingFloor??'';
    container.dataset.cameraBlend=blend.toFixed(4);
    const view=blend>=.5?'cabin':'shaft',automatic=cabinView&&!!pose.simulation;
    const sceneKey=`${view}/${transitioning}/${automatic}`;
    container.dataset.cameraView=view;container.dataset.cameraTransition=String(transitioning);
    if(sceneKey!==lastSceneKey){lastSceneKey=sceneKey;payloadOptions.onSceneChange?.({view,transitioning,automatic});}
    needsRender=true;
  }
  function emitDemo(){const s=getDemoState();if(s){applyPose(s);onDemoUpdate?.(s);}return s;}
  function toggleDemo(){demoPaused=!demoPaused;return emitDemo();}
  function restartDemo(){demoElapsed=0;demoPaused=false;return emitDemo();}
  function seekDemoStage(index){if(!Number.isInteger(index)||DEMO_STAGE_TIMES[index]===undefined)return;demoElapsed=DEMO_STAGE_TIMES[index];return emitDemo();}
  function setView(focused){
    if(!cabin)return false;
    cabinView=focused;lastCameraBlend=null;nearOffset.set(8,4.7,7);nearZoom=farZoom=1;
    const h=selectedDevice.floors*D.floorPitch;
    farOffset.set(28,h*.18+8,35);
    applyPose(getDemoState()||staticPose(selectedDevice));controls.update();needsRender=true;
    payloadOptions.onViewChange?.(focused,{automatic:focused&&selectedDevice.id===DEMO_DEVICE_ID});return focused;
  }
  function reset(){setView(cabinView);}
  function toggleCabinView(){return setView(!cabinView);}
  function zoom(direction){camera.zoom=Math.max(.65,Math.min(2.5,camera.zoom*(direction>0?1.16:.86)));camera.updateProjectionMatrix();needsRender=true;}
  function front(){const y=controls.target.y;camera.position.set(0,y+(cabinView?3:4),cabinView?10:55);controls.update();needsRender=true;}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart;
  renderer.domElement.addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>5)return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
    const hit=raycaster.intersectObjects(group.children,true).find(h=>h.object.isMesh&&visible(h.object));
    if(hit?.object.userData.cabinPayload)payloadOptions.onSelect?.(hit.object.userData.cabinPayload);
    else if(hit?.object.userData.floor)onSelectFloor?.(hit.object.userData.floor);
  });
  function projectPayload(){
    if(!payload||!payloadOptions.onProject)return;
    scene.updateMatrixWorld();camera.updateMatrixWorld();const rect=container.getBoundingClientRect(),result={};
    for(const [kind,object] of Object.entries(payload.anchors)){
      const p=object.getWorldPosition(new THREE.Vector3()).project(camera);
      result[kind]={x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2+container.offsetTop,visible:object.parent.visible&&p.z>-1&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};
    }
    result.floors=landings.map(item=>{
      const p=new THREE.Vector3(-2.5,(item.floor-1)*D.floorPitch+.3,1.55).project(camera);
      return {floor:item.floor,x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2+container.offsetTop};
    });
    const carPoint=new THREE.Vector3(2.0,cabin.position.y+1.3,1.3).project(camera);
    result.car={x:(carPoint.x+1)*rect.width/2,y:(1-carPoint.y)*rect.height/2+container.offsetTop};
    payloadOptions.onProject(result);
  }
  const observer=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);updateFrustum();needsRender=true;});observer.observe(container);
  let raf;
  function draw(now=performance.now()){
    raf=requestAnimationFrame(draw);const dt=lastFrame===null?0:Math.min(.1,(now-lastFrame)/1000);lastFrame=now;
    if(selectedDevice?.id===DEMO_DEVICE_ID){
      if(!demoPaused&&!document.hidden){demoElapsed+=dt;applyPose(getDemoState());}
      if(now-lastEmit>120){onDemoUpdate?.(getDemoState());lastEmit=now;}
    }
    controls.update();if(needsRender){renderer.render(scene,camera);projectPayload();needsRender=false;}
  }
  draw();
  return {update,reset,zoom,front,toggleCabinView,projectPayload,toggleDemo,restartDemo,seekDemoStage,getDemoState,dispose(){cancelAnimationFrame(raf);observer.disconnect();controls.dispose();environment.dispose();renderer.dispose();clear();}};
}
