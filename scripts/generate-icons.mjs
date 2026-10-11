// Renders the app icon (a red pennant on a pole) to PNG with no dependencies.
// Run with `npm run icons`; the output is committed under public/icons and app/.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [246, 243, 236];
const POLE = [74, 59, 47];
const FINIAL = [224, 165, 38];
const RED = [214, 40, 57];

/** Shapes in a 512-unit square, drawn in order. */
function shapes(scale, offset) {
  const p = (x, y) => [offset + x * scale, offset + y * scale];
  return [
    { kind: "rect", color: POLE, a: p(124, 96), b: p(154, 440), r: 12 * scale },
    { kind: "circle", color: FINIAL, c: p(139, 88), r: 22 * scale },
    { kind: "tri", color: RED, pts: [p(154, 116), p(404, 196), p(154, 276)] },
  ];
}

function inside(shape, x, y) {
  if (shape.kind === "circle") return (x - shape.c[0]) ** 2 + (y - shape.c[1]) ** 2 <= shape.r ** 2;
  if (shape.kind === "rect") {
    const [x0, y0] = shape.a;
    const [x1, y1] = shape.b;
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const r = shape.r;
    const cx = Math.min(Math.max(x, x0 + r), x1 - r);
    const cy = Math.min(Math.max(y, y0 + r), y1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  }
  const [[ax, ay], [bx, by], [cx, cy]] = shape.pts;
  const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  const d1 = s(x, y, ax, ay, bx, by);
  const d2 = s(x, y, bx, by, cx, cy);
  const d3 = s(x, y, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function render(size, { maskable = false } = {}) {
  const unit = size / 512;
  // Maskable icons keep the artwork inside the central 80% safe zone.
  const scale = maskable ? unit * 0.72 : unit;
  const offset = maskable ? (size - 512 * scale) / 2 : 0;
  const list = shapes(scale, offset);
  const SS = 4;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          let color = BG;
          for (const shape of list) if (inside(shape, px, py)) color = shape.color;
          r += color[0]; g += color[1]; b += color[2];
        }
      }
      const n = SS * SS;
      row[1 + x * 3] = Math.round(r / n);
      row[2 + x * 3] = Math.round(g / n);
      row[3 + x * 3] = Math.round(b / n);
    }
    rows.push(row);
  }
  return png(size, size, Buffer.concat(rows));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icons/icon-192.png", render(192));
writeFileSync("public/icons/icon-512.png", render(512));
writeFileSync("public/icons/maskable-512.png", render(512, { maskable: true }));
writeFileSync("app/apple-icon.png", render(180));
writeFileSync("app/icon.png", render(64));
console.log("Icons written.");
