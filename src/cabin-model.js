import * as THREE from 'three';
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
  const anchor=(kind,x,y,z)=> { const p=new THREE.Object3D(); p.position.set(x,y,z); cabin.add(p); anchors[kind]=p; };
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
    mark(box(.38,.008,.38,code.x,.127,code.z,metal,cabin),'floorCodes',code.id);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.35,.35),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(code.x,.133,code.z);cabin.add(mesh);mark(mesh,'floorCodes',code.id);
  }
  anchor('floorCodes',content.floorCodes[0].x,.16,content.floorCodes[0].z);
  anchor('cargo',0,content.agv ? .72 : .49,-.06);
  anchor('agv',.43,.32,.39);
  function palletAndCargo(item,x,z,base,w=.85,d=.85) {
    const g=new THREE.Group();g.position.set(x,base,z);cabin.add(g);
    for(const zz of [-d*.35,0,d*.35]) mark(box(w,.07,.12,0,.035,zz,wood,g),'cargo',item.id);
    const count=Math.min(item.cartons,4);
    for(let i=0;i<count;i++) {
      const xx=(i%2 ? 1 : -1)*w*.24, zz=(i<2 ? -.19 : .19);
      mark(box(w*.44,.25,.34,xx,.195,zz,cardboard,g),'cargo',item.id);
      mark(box(.025,.253,.344,xx,.195,zz,tape,g),'cargo',item.id);
    }
    label(item.palletId,.64,.10,0,.21,.365,g,'cargo',item.id);
  }
  if(content.observed && content.agv) {
    const agv=content.agv, g=new THREE.Group();g.position.set(.05,0,-.10);cabin.add(g);
    mark(box(1.1,.23,1.02,0,.3,0,agvPaint,g),'agv',agv.id);
    mark(box(1.02,.045,.92,0,.435,0,metal,g),'agv',agv.id);
    mark(box(.64,.025,.02,0,.3,.52,lamp,g),'agv',agv.id);
    for(const x of [-.53,.53]) for(const z of [-.35,.35]) {
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.09,16),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.21,z);g.add(wheel);mark(wheel,'agv',agv.id);
    }
    const lidar=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.09,20),rubber);lidar.position.set(.34,.48,.40);g.add(lidar);mark(lidar,'agv',agv.id);
    label(agv.id,.50,.095,0,.3,.522,g,'agv',agv.id);
    content.cargo.forEach(item=>palletAndCargo(item,.05,-.17,.46,.92,.82));
  } else if(content.observed) {
    content.cargo.forEach((item,i)=>palletAndCargo(item,content.cargo.length>1 ? (i===0 ? -.47:.47):0,-.05,.14,.80,.90));
  }
  return {anchors,pickables,dispose(){textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());}};
}
