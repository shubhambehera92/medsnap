// Generates the MedSnap PWA icons as PNGs using only Node built-ins.
// Run: node scripts/gen-icons.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function insideCross(px, py, cx, cy, arm, thickness) {
  const v = sdRoundRect(px, py, cx, cy, thickness / 2, arm, thickness / 2);
  const h = sdRoundRect(px, py, cx, cy, arm, thickness / 2, thickness / 2);
  return Math.min(v, h) <= 0;
}

function makeIcon(size, { maskable = false } = {}) {
  const SS = 3; // supersampling
  const S = size * SS;
  const out = Buffer.alloc(size * size * 4);
  const cx = S / 2;
  const cy = S / 2;

  const inset = maskable ? 0 : S * 0.02;
  const radius = maskable ? 0 : S * 0.22;
  const bgHalf = S / 2 - inset;

  const arm = S * (maskable ? 0.24 : 0.29);
  const thickness = S * (maskable ? 0.115 : 0.135);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x * SS + sx + 0.5;
          const py = y * SS + sy + 0.5;
          const inBg = sdRoundRect(px, py, cx, cy, bgHalf, bgHalf, radius) <= 0;
          if (!inBg) continue;
          if (insideCross(px, py, cx, cy, arm, thickness)) {
            r += 255; g += 255; b += 255; a += 255;
          } else {
            // vertical gradient #2563eb -> #1d4ed8
            const t = py / S;
            r += 37 + (29 - 37) * t;
            g += 99 + (78 - 99) * t;
            b += 235 + (216 - 235) * t;
            a += 255;
          }
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
      out[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, out);
}

const outputs = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['icon-maskable-192.png', 192, { maskable: true }],
];

for (const [name, size, opts] of outputs) {
  fs.writeFileSync(path.join(OUT, name), makeIcon(size, opts));
  console.log('wrote', name);
}
