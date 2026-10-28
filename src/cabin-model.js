import * as THREE from 'three';
import { DIMENSIONS as D } from './dimensions.js';
import { makeMarkerCanvas } from './marker-texture.js';

export function createCabinPayload(cabin, content, box) {
  const materials=[], textures=[], pickables=[];
  const mat = options => { const m=new THREE.MeshStandardMaterial(options); materials.push(m); return m; };
  const agvPaint=mat({color:0x6d8a91,metalness:.45,roughness:.35});
  const rubber=mat({color:0x28332f,roughness:.8});
  const metal=mat({color:0xa8b8a4,metalness:.65,roughness:.35});
  const cardboard=mat({color:0xcbb58c,roughness:.8});
  const tape=mat({color:0xa78f64,roughness:.75});
  const wood=mat({color:0xb59e76,roughness:.8});
  const lamp=mat({color:0x95bf80,emissive:0x6a9a51,emissiveIntensity:.65});
  const anchors={};
  const mobile=new THREE.Group();cabin.add(mobile);
  const anchor=(kind,x,y,z,parent=cabin)=> { const p=new THREE.Object3D(); p.position.set(x,y,z); parent.add(p); anchors[kind]=p; };
  function mark(mesh,kind,id) { mesh.userData.cabinPayload={kind,id}; pickables.push(mesh); return mesh; }
  function label(text,w,h,x,y,z,parent,kind,id) {
    const c=document.createElement('canvas'); c.width=512;c.height=128;
    const ctx=c.getContext('2d'); ctx.fillStyle='#f4f7ed';ctx.fillRect(0,0,512,128);
    ctx.fillStyle='#304535';ctx.font='600 40px monospace';ctx.textAlign='center';ctx.fillText(text,256,82);
    const texture=new THREE.CanvasTexture(c);textures.push(texture);
    const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});materials.push(material);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);parent.add(mesh);mark(mesh,kind,id);
  }
  for(const code of content.floorCodes) {
    const texture=new THREE.CanvasTexture(makeMarkerCanvas(code.id)); textures.push(texture);
    texture.minFilter=THREE.LinearFilter;
    const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});materials.push(material);
    mark(box(.38,.008,.38,code.x,D.cabinFloor+.006,code.z,metal,cabin),'floorCodes',code.id);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.35,.35),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(code.x,D.cabinFloor+.012,code.z);cabin.add(mesh);mark(mesh,'floorCodes',code.id);
  }
  anchor('floorCodes',content.floorCodes[0].x,D.cabinFloor+.03,content.floorCodes[0].z);
  anchor('cargo',0,content.agv?1.03:.65,0,content.agv?mobile:cabin);
  anchor('agv',.34,.36,.60,content.agv?mobile:cabin);
  function palletAndCargo(item,x,z,base,w=1,d=1.2,parent=cabin) {
    const g=new THREE.Group();g.position.set(x,base,z);parent.add(g);
    for(const zz of [-d*.35,0,d*.35]) mark(box(w,.12,.15,0,.06,zz,wood,g),'cargo',item.id);
    const count=Math.min(item.cartons,4);
    for(let i=0;i<count;i++) {
      const xx=(i%2 ? 1 : -1)*w*.24, zz=(i<2 ? -.30 : .30);
      mark(box(w*.44,.50,.50,xx,.37,zz,cardboard,g),'cargo',item.id);
      mark(box(.025,.503,.504,xx,.37,zz,tape,g),'cargo',item.id);
    }
    label(item.palletId,.66,.12,0,.38,.558,g,'cargo',item.id);
  }
  if(content.observed && content.agv) {
    const agv=content.agv, g=new THREE.Group();g.position.set(0,0,0);mobile.add(g);
    mark(box(D.agvWidth,.24,D.agvLength,0,.35,0,agvPaint,g),'agv',agv.id);
    mark(box(.86,.035,1.12,0,.49,0,metal,g),'agv',agv.id);
    mark(box(.60,.025,.02,0,.35,.61,lamp,g),'agv',agv.id);
    for(const x of [-.44,.44]) for(const z of [-.42,.42]) {
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.08,16),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.25,z);g.add(wheel);mark(wheel,'agv',agv.id);
    }
    const lidar=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.09,20),rubber);lidar.position.set(.30,.50,.63);g.add(lidar);mark(lidar,'agv',agv.id);
    label(agv.id,.50,.095,0,.35,.612,g,'agv',agv.id);
    content.cargo.forEach(item=>palletAndCargo(item,0,-.04,.51,D.palletWidth,D.palletLength,mobile));
  } else if(content.observed) {
    content.cargo.forEach((item,i)=>palletAndCargo(item,content.cargo.length>1 ? (i===0 ? -.58:.58):0,-.05,D.cabinFloor,1,1.2));
  }
  return {anchors,pickables,setPose(pose){mobile.position.y=((pose.payloadFloor??pose.positionFloor)-pose.positionFloor)*D.floorPitch;mobile.position.z=pose.agvZ??D.parkedZ;mobile.visible=pose.agvVisible!==false;},dispose(){textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());}};
}
