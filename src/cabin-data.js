// Demo cabin payloads: fixed cabin markers, direct cargo, AGV-carried cargo and unknown offline data.
export function createCabinContent(deviceId, index, typeIndex = 0) {
  const short = deviceId.replaceAll('-', '');
  const observed = index !== 3;
  const floorCodes = [
    { id:`DM-${short}-C01`, name:'轿厢前部定位点', x:-.65, z:.56, recognized:observed, occupiedBy:null },
    { id:`DM-${short}-C02`, name:'轿厢后部定位点', x:.52, z:-.46, recognized:observed, occupiedBy:null },
  ];
  const cargo = [];
  let agv = null;
  if (index === 0) {
    const cargoId = `HU-20261026-${String(typeIndex * 100 + 1).padStart(4,'0')}`;
    cargo.push({ id:cargoId, name:'精密结构件', palletId:`PLT-${short}-001`, cartons:4, weightKg:240,
      destination:'6 F · 线边暂存区', carrier:'agv',
      items:[{sku:'MAT-AL-102',name:'铝合金结构件',quantity:80,unit:'件'},{sku:'MAT-FX-208',name:'装配支架',quantity:40,unit:'件'}] });
    agv = { id:`AGV-${String(typeIndex * 10 + 7).padStart(3,'0')}`, model:'潜伏举升式', tareKg:320, batteryPct:87,
      floorCodeId:floorCodes[1].id, carryingCargoIds:[cargoId], missionId:`RCS-${short}-1026-01`, accompanying:true };
    floorCodes[1].occupiedBy = agv.id;
  } else if (index === 2) {
    for (let j=0;j<2;j++) {
      const id=`HU-20261026-${String(typeIndex * 100 + 21 + j).padStart(4,'0')}`;
      cargo.push({id,name:j ? '电子组件' : '机加工件',palletId:`PLT-${short}-00${j+1}`,cartons:3,weightKg:j ? 220 : 180,
        destination:'5 F · 待交接区',carrier:'direct',items:[{sku:j ? 'MAT-PC-305' : 'MAT-MC-113',name:j ? '电子组件' : '机加工件',quantity:j ? 60 : 90,unit:'件'}]});
      floorCodes[j].occupiedBy = id;
    }
  }
  return { observed, floorCodes, cargo, agv };
}

export function summarizeCabin(cabin) {
  const cargoKg = cabin.cargo.reduce((sum, item) => sum + item.weightKg, 0);
  return { observed:cabin.observed, floorCodes:cabin.floorCodes.length, pallets:cabin.cargo.length,
    cartons:cabin.cargo.reduce((sum,item)=>sum+item.cartons,0), cargoKg, agvKg:cabin.agv?.tareKg || 0,
    totalKg:cargoKg + (cabin.agv?.tareKg || 0), hasAgv:!!cabin.agv };
}
