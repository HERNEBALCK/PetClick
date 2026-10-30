'use strict';
const { _electron, chromium } = require('playwright-core');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const { decode } = require('../src/store');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-output');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE; delete env.PETCLICK_TEST_DATA_DIR;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
(async () => {
  const realSave = path.join(process.env.APPDATA, 'PetClick/state.json');
  let originalCount = 0;
  try { originalCount = decode(await fs.readFile(realSave, 'utf8')).count; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const relocated = path.join(output, 'portable moved');
  await fs.mkdir(relocated, { recursive: true });
  const copied = path.join(relocated, 'PetClick-v'+require('../package.json').version+'.exe');
  await fs.copyFile(path.join(root, 'release/PetClick-'+require('../package.json').version+'-win-x64.exe'), copied);
  let app;
  try {
    app = await _electron.launch({ executablePath: path.join(root, 'release/win-unpacked/PetClick.exe'), args: [], env, timeout: 30000 });
    const page = await app.firstWindow();
    await page.waitForFunction(() => !document.getElementById('keyboard').disabled);
    assert.equal(await page.locator('#count').textContent(), String(originalCount));
    await page.waitForFunction(() => document.getElementById('pet').dataset.keyboard === 'ready', null, { timeout: 10000 });
    const runtime = await app.evaluate(({ app }) => ({ packaged: app.isPackaged, data: app.getPath('userData') }));
    assert.equal(runtime.packaged, true);
    assert.equal(path.normalize(runtime.data), path.normalize(path.dirname(realSave)));
    await page.screenshot({ path: path.join(output, 'unpacked.png'), omitBackground: true });
    console.log(JSON.stringify({ name: 'unpacked', passed: true, runtime, count: originalCount }));
  } finally { if (app) await app.close(); }
  const port = await freePort();
  const child = spawn(copied, [`--remote-debugging-port=${port}`], { env, windowsHide: true, stdio: 'ignore' });
  let browser;
  try {
    const end = Date.now() + 40000;
    while (Date.now() < end) {
      try { await fetch(`http://127.0.0.1:${port}/json/version`); break; }
      catch { await delay(250); }
    }
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 10000 });
    const page = browser.contexts()[0].pages()[0];
    await page.waitForFunction(() => !document.getElementById('keyboard').disabled);
    assert.equal(await page.locator('#count').textContent(), String(originalCount));
    await page.waitForFunction(() => document.getElementById('pet').dataset.keyboard === 'ready', null, { timeout: 10000 });
    await page.screenshot({ path: path.join(output, 'portable-moved.png'), omitBackground: true });
    assert.equal(decode(await fs.readFile(realSave, 'utf8')).count, originalCount);
    console.log(JSON.stringify({ name: 'portable-moved', passed: true, count: originalCount }));
    await page.evaluate(() => window.close()).catch(() => {});
  } finally {
    if (browser) await browser.close();
    await delay(1000);
    if (child.exitCode === null) spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
