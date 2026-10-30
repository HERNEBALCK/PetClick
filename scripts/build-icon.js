'use strict';

// Store several PNG resolutions in one Windows ICO so desktop and tray stay sharp.
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.whenReady().then(() => {
  const root = path.resolve(__dirname, '..');
  const source = nativeImage.createFromPath(path.join(root, 'assets/app-icon.png'));
  if (source.isEmpty()) throw new Error('Unable to load assets/app-icon.png');
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = sizes.map(size => source.resize({ width: size, height: size, quality: 'best' }).toPNG());
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[index].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[index].length;
  });
  fs.writeFileSync(path.join(root, 'assets/app-icon.ico'), Buffer.concat([header, ...images]));
  console.log('Created assets/app-icon.ico (16–256 px)');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
