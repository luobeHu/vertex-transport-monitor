import qrcode from "qrcode-generator";

export function makeMarkerCanvas(value, size = 256) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d"),
    n = qr.getModuleCount(),
    margin = 4,
    step = size / (n + margin * 2);
  ctx.fillStyle = "#fafcf5";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#253c2a";
  for (let row = 0; row < n; row++)
    for (let col = 0; col < n; col++)
      if (qr.isDark(row, col)) {
        const x = Math.floor((col + margin) * step),
          y = Math.floor((row + margin) * step);
        ctx.fillRect(x, y, Math.ceil(step), Math.ceil(step));
      }
  return canvas;
}
