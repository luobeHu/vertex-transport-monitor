import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createTwin(container, onSelectFloor) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch {
    container.innerHTML = '<div class="webgl-fallback"><span>3D 视图暂不可用</span><p>当前浏览器未启用 WebGL，设备运行数据仍可正常查看。</p></div>';
    return { update() {}, reset() {}, zoom() {}, front() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xeff3f2, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '垂直运输设备三维模型，可拖动旋转、滚轮缩放');
  renderer.domElement.setAttribute('role', 'img');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 150);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 10;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * .52;
  controls.target.set(0, 4, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x80958e, 3));
  const sun = new THREE.DirectionalLight(0xffffff, 4);
  sun.position.set(6, 14, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 16, bottom: -6 });
  sun.shadow.normalBias = .03; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdce9ff, 2); fill.position.set(-8, 6, -4); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x39594b, opacity: .12 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.25; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(35, 50, 0xc8d5ce, 0xdce4df); grid.position.y = -.23; scene.add(grid);
  const steel = new THREE.MeshStandardMaterial({ color: 0x96aaa4, metalness: .65, roughness: .35 });
  const light = new THREE.MeshStandardMaterial({ color: 0xe5ebe8, metalness: .3, roughness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2f4b43, metalness: .65, roughness: .35 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe9bd58, metalness: .25, roughness: .6 });
  let group = new THREE.Group(), cabin = null, selectedDevice = null, floorMeshes = [], targetY = 0, dynamicMaterials = [];
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
    const hit = raycaster.intersectObjects(floorMeshes)[0];
    if (hit) onSelectFloor?.(hit.object.userData.floor);
  });
  function box(w, h, d, x, y, z, material, parent = group) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
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
    group.traverse(obj => { obj.geometry?.dispose(); if (obj.isSprite) { obj.material.map?.dispose(); obj.material.dispose(); } });
    dynamicMaterials.forEach(m => m.dispose()); dynamicMaterials = [];
    scene.remove(group); group = new THREE.Group(); scene.add(group); floorMeshes = []; needsRender = true;
  }
  function update(device) {
    selectedDevice = device; clear();
    const isHoist = device.type !== 'elevator', floorH = 1.22, height = device.floors * floorH;
    const tint = device.state === 'alarm' ? 0xcc6759 : device.state === 'offline' ? 0x87938e : 0x338b6c;
    const green = new THREE.MeshStandardMaterial({ color: tint, metalness: .35, roughness: .32 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xa2c5b4, transparent: true, opacity: .22, roughness: .12, metalness: .1, depthWrite: false, side: THREE.DoubleSide });
    dynamicMaterials.push(green, glass);
    // A complete procedural twin: structure, floor decks, guide rails, counterweight, ropes and cabin.
    box(4.9, .22, 3.6, 0, -.1, 0, light);
    box(4.6, .1, 3.4, 0, .04, 0, steel);
    for (const x of [-1.65, 1.65]) for (const z of [-1.1, 1.1]) {
      box(.12, height + .5, .12, x, height / 2, z, steel);
      box(.32, .08, .32, x, .12, z, dark);
    }
    for (const x of [-.95, .95]) box(.055, height, .09, x, height / 2, -.95, dark);
    for (let f = 1; f <= device.floors; f++) {
      const y = (f - 1) * floorH;
      const m = box(3.6, .095, 2.8, 0, y + .15, 0, f === device.floor ? green : light); m.userData.floor = f; floorMeshes.push(m);
      box(3.6, .12, .08, 0, y + .17, 1.4, f === device.floor ? green : steel);
      box(3.6, .09, .09, 0, y + 1.17, -1.12, steel);
      // Rear bracing and a cutaway landing on the right side leave the car visible.
      const brace = box(.045, 1.55, .045, 0, y + .7, -1.14, steel); brace.rotation.z = .68;
      box(.82, .1, 1.3, 2.13, y + .14, .36, light);
      box(.8, .07, .05, 2.13, y + .2, 1.03, gold);
      for (const x of [1.75, 2.5]) box(.035, .55, .035, x, y + .47, .98, steel);
      box(.8, .045, .045, 2.13, y + .75, .98, steel);
      textLabel(`${String(f).padStart(2, '0')} F`, y + .27, f === device.floor ? '#12745c' : '#73847c');
    }
    for (const x of [-.52, .52]) box(.025, height + .3, .025, x, height / 2, -.25, dark);
    box(3.65, .22, 2.65, 0, height + .2, 0, steel);
    box(1.12, .44, .65, 0, height + .53, -.1, dark);
    for (const x of [-.48, .48]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .17, 24), steel); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, height + .65, 0); group.add(wheel);
    }
    box(.45, 1.2, .18, 1.38, height * .5, -.75, dark);
    cabin = new THREE.Group(); group.add(cabin);
    targetY = (device.floor - 1) * floorH + .21; cabin.position.y = targetY;
    box(2.1, .13, 1.85, 0, 0, 0, dark, cabin);
    box(2.1, .12, 1.85, 0, 1.08, 0, green, cabin);
    for (const x of [-1, 1]) for (const z of [-.85, .85]) box(.07, 1, .07, x, .54, z, green, cabin);
    box(1.93, .92, .045, 0, .55, -.85, glass, cabin);
    for (const x of [-1, 1]) box(.04, .92, 1.7, x, .55, 0, glass, cabin);
    box(.94, .93, .055, -.49, .55, .86, green, cabin);
    box(.94, .93, .055, .49, .55, .86, green, cabin);
    box(.015, .93, .06, 0, .55, .9, dark, cabin);
    for (const x of [-.48, .48]) box(.53, .28, .015, x, .67, .9, glass, cabin);
    box(.9, .1, .015, 0, 1.05, .94, gold, cabin);
    if (isHoist) {
      for (let j = 0; j < 9; j++) { box(.035, .8, .035, -.9 + j * .225, .52, .96, gold, cabin); }
      box(1.3, .12, 1.05, 0, .18, 0, gold, cabin);
      box(.65, .5, .65, 0, .49, -.15, light, cabin);
    }
    controls.target.set(0, height * .47, 0); reset();
  }
  function reset() { const h = selectedDevice?.floors * 1.22 || 9.76; camera.position.set(12, h * .7 + 4, 16); controls.target.set(0, h * .47, 0); controls.update(); }
  function zoom(direction) { const delta = camera.position.clone().sub(controls.target); delta.multiplyScalar(direction > 0 ? .86 : 1.16); const l = Math.max(10, Math.min(30, delta.length())); delta.setLength(l); camera.position.copy(controls.target).add(delta); controls.update(); }
  function front() { camera.position.set(0, controls.target.y + 1.2, 21); controls.update(); }
  const observer = new ResizeObserver(() => { const { width, height } = container.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); needsRender = true; }); observer.observe(container);
  let raf;
  function draw() { raf = requestAnimationFrame(draw); controls.update(); if (needsRender) { renderer.render(scene, camera); needsRender = false; } }
  draw();
  return { update, reset, zoom, front, dispose() { cancelAnimationFrame(raf); observer.disconnect(); controls.dispose(); renderer.dispose(); clear(); steel.dispose(); light.dispose(); dark.dispose(); gold.dispose(); } };
}
