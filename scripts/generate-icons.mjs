import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const terracotta = [184, 92, 56, 255];
const cream = [246, 240, 232, 255];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function fillRect(pixels, size, x0, y0, x1, y1, color) {
  const minX = Math.round(Math.min(x0, x1));
  const maxX = Math.round(Math.max(x0, x1));
  const minY = Math.round(Math.min(y0, y1));
  const maxY = Math.round(Math.max(y0, y1));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      setPixel(pixels, size, x, y, color);
    }
  }
}

function drawMonogram(pixels, size, paddingRatio) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setPixel(pixels, size, x, y, terracotta);
    }
  }

  const pad = size * paddingRatio;
  const left = pad + size * 0.22;
  const right = size - pad - size * 0.18;
  const top = pad + size * 0.2;
  const bottom = size - pad - size * 0.2;
  const bar = size * 0.11;
  const midY = top + (bottom - top) * 0.42;

  fillRect(pixels, size, left, top, left + bar, bottom, cream);
  fillRect(pixels, size, left, top, right, top + bar, cream);
  fillRect(pixels, size, left, midY, left + (right - left) * 0.72, midY + bar * 0.85, cream);
}

function encodePng(size, paddingRatio) {
  const pixels = Buffer.alloc(size * size * 4);
  drawMonogram(pixels, size, paddingRatio);

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outputs = [
  ["public/icons/icon-192.png", 192, 0.08],
  ["public/icons/icon-512.png", 512, 0.08],
  ["public/icons/icon-192-maskable.png", 192, 0.18],
  ["public/icons/icon-512-maskable.png", 512, 0.18],
  ["public/apple-touch-icon.png", 180, 0.1],
];

for (const [relative, size, pad] of outputs) {
  const file = join(root, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(size, pad));
}

console.log("Wrote PWA icons");
