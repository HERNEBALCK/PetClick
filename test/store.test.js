'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Store, encode, decode, defaults } = require('../src/store');
async function fixture(t, options) {
  await fs.mkdir(path.resolve(__dirname, '../test-output'), { recursive: true });
  const dir = await fs.mkdtemp(path.resolve(__dirname, '../test-output/store-'));
  const store = new Store(dir, options);
  t.after(async () => { store.dispose(); await store.flush(); });
  return { dir, store };
}
test('200 rapid clicks and window settings survive reopening with backup', async (t) => {
  const { dir, store } = await fixture(t); await store.load();
  for (let i = 0; i < 200; i++) store.increment();
  store.settings({ scale: 1.25, alwaysOnTop: false, position: { x: -123, y: 400 } });
  assert.equal((await store.flush()).saved, true);
  assert.equal(decode(await fs.readFile(store.backup, 'utf8')).count, 200);
  const reopened = new Store(dir); t.after(() => reopened.dispose());
  const state = await reopened.load();
  assert.equal(state.count, 200); assert.equal(state.scale, 1.25);
  assert.deepEqual(state.position, { x: -123, y: 400 }); assert.equal(state.alwaysOnTop, false);
});
test('corrupt main is preserved and backup recovers clicks', async (t) => {
  const { dir, store } = await fixture(t);
  await fs.writeFile(store.file, '{broken');
  await fs.writeFile(store.backup, encode({ ...defaults(), count: 1234 }));
  assert.equal((await store.load()).count, 1234); await store.flush();
  const damaged = (await fs.readdir(dir)).find((name) => name.startsWith('state.json.damaged-'));
  assert.equal(await fs.readFile(path.join(dir, damaged), 'utf8'), '{broken');
  assert.equal(decode(await fs.readFile(store.file, 'utf8')).count, 1234);
});
test('both corrupt files are preserved with explicit notice', async (t) => {
  const { dir, store } = await fixture(t);
  await fs.writeFile(store.file, 'broken-main'); await fs.writeFile(store.backup, 'broken-backup');
  assert.match((await store.load()).notices[0], /故障文件/); await store.flush();
  assert.equal((await fs.readdir(dir)).filter((name) => name.includes('.damaged-')).length, 2);
});
test('checksum detects corruption and rejects negative counts', () => {
  assert.throws(() => decode(encode({ ...defaults(), count: 15 }).replace('15', '16')), /校验/);
  assert.throws(() => decode(encode({ ...defaults(), count: -1 })), /格式/);
});
test('save failure retains clicks and automatic retry persists latest state', async (t) => {
  let writable = true; const io = Object.create(fs);
  io.rename = async (...args) => { if (!writable) throw new Error('simulated disk error'); return fs.rename(...args); };
  const { store } = await fixture(t, { io, retryMs: 25 });
  await store.load(); await store.flush(); writable = false;
  for (let i = 0; i < 5; i++) store.increment();
  const state = await store.flush(); assert.equal(state.count, 5); assert.equal(state.saved, false);
  writable = true;
  const saved = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 3000);
    const listener = (value) => { if (value.saved) { clearTimeout(timer); store.off('change', listener); resolve(true); } };
    store.on('change', listener);
  });
  assert.equal(await saved, true); await store.flush();
  assert.equal(decode(await fs.readFile(store.file, 'utf8')).count, 5);
});
test('damaged original cannot be overwritten before preservation', async (t) => {
  let allowCopy = false; const io = Object.create(fs);
  io.copyFile = async (...args) => { if (!allowCopy) throw new Error('copy failed'); return fs.copyFile(...args); };
  const { store } = await fixture(t, { io, retryMs: 5000 });
  await fs.writeFile(store.file, 'keep-me'); await store.load(); store.increment();
  assert.equal((await store.flush()).saved, false); assert.equal(await fs.readFile(store.file, 'utf8'), 'keep-me');
  allowCopy = true; store.increment(); assert.equal((await store.flush()).saved, true);
  assert.equal(decode(await fs.readFile(store.file, 'utf8')).count, 2);
});
test('every click writes in order; interrupted temporary file is ignored', async (t) => {
  const counts = []; const io = Object.create(fs);
  io.rename = async (from, to) => { await fs.rename(from, to); if (to.endsWith('state.json')) counts.push(decode(await fs.readFile(to, 'utf8')).count); };
  const { dir, store } = await fixture(t, { io }); await store.load(); await store.flush();
  for (let i = 0; i < 8; i++) store.increment(); await store.flush();
  assert.deepEqual(counts, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  await fs.writeFile(store.file + '.tmp', '{unfinished');
  const reopened = new Store(dir); t.after(() => reopened.dispose()); assert.equal((await reopened.load()).count, 8);
});
test('missing main recovers backup and corrupt backup is repaired from main', async (t) => {
  const { dir, store } = await fixture(t);
  await fs.writeFile(store.backup, encode({ ...defaults(), count: 42 }));
  assert.equal((await store.load()).count, 42); await store.flush();
  await fs.writeFile(store.backup, 'bad-backup');
  const reopened = new Store(dir); t.after(() => reopened.dispose());
  assert.equal((await reopened.load()).count, 42); await reopened.flush();
  assert.equal(decode(await fs.readFile(store.backup, 'utf8')).count, 42);
});
test('legacy v1 save without keyboard settings retains count and enables animation by default',async(t)=>{
 const {store}=await fixture(t);const legacy={...defaults(),count:123456,scale:1.25};delete legacy.keyboardEnabled;
 await fs.writeFile(store.file,encode(legacy));await fs.writeFile(store.backup,encode(legacy));
 const state=await store.load();assert.equal(state.count,123456);assert.equal(state.keyboardEnabled,true);
 store.settings({keyboardEnabled:false});await store.flush();assert.equal(decode(await fs.readFile(store.file,'utf8')).count,123456);
});
