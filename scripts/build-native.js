'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
if (process.platform !== 'win32') throw new Error('PetClick keyboard bridge requires Windows');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'native/bin');
fs.mkdirSync(output, { recursive: true });
const compiler = path.join(process.env.WINDIR || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
const result = spawnSync(compiler, ['/nologo', '/target:winexe', '/platform:x64', '/optimize+',
  '/reference:System.Windows.Forms.dll', '/reference:System.dll', '/reference:System.Core.dll',
  '/out:' + path.join(output, 'PetClick.Keyboard.exe'), path.join(root, 'native/KeyboardBridge.cs')],
  { encoding: 'utf8', windowsHide: true });
if (result.error) throw result.error;
if (result.status !== 0) { console.error(result.stdout, result.stderr); process.exit(result.status || 1); }
console.log('Built native/PetClick.Keyboard.exe');
