const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Uncompressed scanlines
  const rawData = Buffer.alloc(size * (1 + size * 4));
  const center = size / 2;
  const radius = size * 0.42;

  let offset = 0;
  for (let y = 0; y < size; y++) {
    rawData[offset++] = 0; // Filter byte 0 (None)
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - center + 0.5) ** 2 + (y - center + 0.5) ** 2);
      if (dist <= radius) {
        // Glowing periwinkle / cyan dot: #A5AEFF -> R=165, G=174, B=255
        rawData[offset++] = 165;
        rawData[offset++] = 174;
        rawData[offset++] = 255;
        const alpha = Math.max(0, Math.min(255, Math.round((1 - (dist / radius) * 0.4) * 255)));
        rawData[offset++] = alpha;
      } else if (dist <= radius + 1.5) {
        // Soft antialiased fringe
        const t = (radius + 1.5 - dist) / 1.5;
        rawData[offset++] = 165;
        rawData[offset++] = 174;
        rawData[offset++] = 255;
        rawData[offset++] = Math.round(t * 128);
      } else {
        // Transparent
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));
  const ihdrChunk = createChunk('IHDR', ihdr);

  return Buffer.concat([signature, ihdrChunk, idat, iend]);
}

const assetsDir = path.resolve(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), generatePng(16));
fs.writeFileSync(path.join(assetsDir, 'icon.png'), generatePng(64));
console.log('Successfully generated assets/tray-icon.png and assets/icon.png');
