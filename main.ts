// Writes /entry.png: a 1024x1024 RGB PNG of a news-room broadsheet -- cream
// background, a black masthead band at the top, a red horizontal rule under
// it, a blue globe circle in the middle and three grey story blocks at the
// bottom. Self-contained: Node 22 standard library only (zlib, fs).
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const W = 1024, H = 1024;
const canvas = new Uint8Array(W * H * 3);

function setPixel(x, y, r, g, b) {
  const i = (y * W + x) * 3;
  canvas[i] = r; canvas[i + 1] = g; canvas[i + 2] = b;
}
function fillRect(x, y, w, h, r, g, b) {
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++)
    for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++)
      setPixel(xx, yy, r, g, b);
}
function fillCircle(cx, cy, r, rr, g, b) {
  for (let yy = Math.max(0, cy - r); yy <= Math.min(H - 1, cy + r); yy++)
    for (let xx = Math.max(0, cx - r); xx <= Math.min(W - 1, cx + r); xx++)
      if ((xx - cx) ** 2 + (yy - cy) ** 2 <= r * r) setPixel(xx, yy, rr, g, b);
}

// ---- crc32 (PNG) ----
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

// ---- PNG encode ----
function encode() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolor (RGB)
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const out = y * (1 + W * 3);
    raw[out] = 0; // filter type: none
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3, o = out + 1 + x * 3;
      raw[o] = canvas[i]; raw[o + 1] = canvas[i + 1]; raw[o + 2] = canvas[i + 2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const FONT = {
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function drawText(x, y, text, scale, r, g, b) {
  for (let i = 0; i < text.length; i++) {
    const glyph = FONT[text[i].toUpperCase()] ?? FONT[' '];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (glyph[row][col] === '1')
          fillRect(x + (i * 6 + col) * scale, y + row * scale, scale, scale, r, g, b);
  }
}

// ---- draw ----
fillRect(0, 0, W, H, 246, 241, 231);            // cream background
fillRect(0, 0, W, 78, 25, 25, 25);             // black masthead band at top
fillRect(0, 78, W, 10, 200, 30, 30);           // red horizontal rule
fillCircle(W / 2, 512, 210, 40, 64, 110, 200); // blue globe circle in the middle
fillRect(60, 656, 920, 88, 160, 160, 160);     // grey story block 1
fillRect(60, 756, 920, 88, 160, 160, 160);     // grey story block 2
fillRect(60, 856, 920, 88, 160, 160, 160);     // grey story block 3

drawText(40, 20, 'THE WORLD', 6, 246, 241, 231);
drawText(40, 104, 'WORLD NEWS', 3, 200, 30, 30);
drawText(40, 140, 'NOVEMBER 18 2026', 3, 25, 25, 25);
drawText(80, 672, 'NEWS 1', 3, 25, 25, 25);
drawText(80, 772, 'NEWS 2', 3, 25, 25, 25);
drawText(80, 872, 'NEWS 3', 3, 25, 25, 25);
writeFileSync(`${process.env.MAKEFUN_OUTPUT_DIR ?? '/output'}/entry.png`, encode());
