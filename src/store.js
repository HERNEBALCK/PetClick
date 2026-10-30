'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

const defaults = () => ({ version: 1, count: 0, scale: 1, alwaysOnTop: true, position: null, keyboardEnabled: true });

function validate(value) {
  return value && value.version === 1 && Number.isSafeInteger(value.count) && value.count >= 0 &&
    [0.75, 1, 1.25].includes(value.scale) && typeof value.alwaysOnTop === 'boolean' &&
    (value.keyboardEnabled === undefined || typeof value.keyboardEnabled === 'boolean') &&
    (value.position === null || (Number.isInteger(value.position?.x) && Number.isInteger(value.position?.y)));
}

function encode(state) {
  const data = JSON.stringify(state);
  return JSON.stringify({ data: state, sha256: crypto.createHash('sha256').update(data).digest('hex') }, null, 2) + '\n';
}

function decode(raw) {
  const envelope = JSON.parse(raw);
  if (!validate(envelope.data)) throw new Error('存档格式不正确');
  const hash = crypto.createHash('sha256').update(JSON.stringify(envelope.data)).digest('hex');
  if (hash !== envelope.sha256) throw new Error('存档校验失败');
  return envelope.data;
}

class Store extends EventEmitter {
  constructor(directory, options = {}) {
    super();
    this.directory = directory;
    this.file = path.join(directory, 'state.json');
    this.backup = path.join(directory, 'state.backup.json');
    this.io = options.io || fs;
    this.retryMs = options.retryMs ?? 2500;
    this.state = defaults();
    this.revision = 0;
    this.savedRevision = 0;
    this.tail = Promise.resolve();
    this.timer = null;
    this.lastError = null;
    this.notices = [];
    this.protectedFiles = [];
  }

  async load() {
    await this.io.mkdir(this.directory, { recursive: true });
    const read = async (file) => {
      try { return { state: decode(await this.io.readFile(file, 'utf8')) }; }
      catch (error) {
        if (error.code === 'ENOENT') return { missing: true };
        return { error };
      }
    };
    const primary = await read(this.file);
    const backup = await read(this.backup);
    for (const [result, file] of [[primary, this.file], [backup, this.backup]]) {
      if (result.error) this.protectedFiles.push(file);
    }
    if (primary.state) this.state = { ...defaults(), ...primary.state };
    else if (backup.state) {
      this.state = { ...defaults(), ...backup.state };
      this.notices.push('主存档无法读取，已恢复备份。');
    } else if (primary.error || backup.error) {
      this.notices.push('原存档无法读取，已保留故障文件；本次从 0 开始。');
    }
    // Preserve damaged originals before any replacement. A failed copy blocks writes.
    await this._preserveDamaged().catch((error) => { this.lastError = error.message; });
    if (!primary.state || !backup.state) this._queue();
    return this.snapshot();
  }

  snapshot() {
    return { ...structuredClone(this.state), revision: this.revision, savedRevision: this.savedRevision,
      saved: this.savedRevision >= this.revision && !this.lastError,
      error: this.lastError, notices: [...this.notices] };
  }

  increment() {
    if (this.state.count >= Number.MAX_SAFE_INTEGER) throw new Error('计数已达到上限');
    this.state.count += 1;
    return this._queue();
  }

  settings(patch) {
    const next = { ...this.state, ...patch };
    if (!validate(next)) throw new Error('设置不合法');
    this.state = next;
    return this._queue();
  }

  _queue() {
    const state = structuredClone(this.state);
    const revision = ++this.revision;
    this.emit('change', this.snapshot());
    this.tail = this.tail.then(async () => {
      try {
        await this._preserveDamaged();
        const raw = encode(state);
        await this._atomicWrite(this.file, raw);
        await this._atomicWrite(this.backup, raw);
        this.savedRevision = revision;
        this.lastError = null;
      } catch (error) {
        this.lastError = error.message;
        this._scheduleRetry();
      }
      this.emit('change', this.snapshot());
    });
    return this.snapshot();
  }

  async _preserveDamaged() {
    while (this.protectedFiles.length) {
      const file = this.protectedFiles[0];
      const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      await this.io.copyFile(file, `${file}.damaged-${suffix}`);
      this.protectedFiles.shift();
    }
  }

  async _atomicWrite(file, raw) {
    const temp = file + '.tmp';
    const handle = await this.io.open(temp, 'w');
    try {
      await handle.writeFile(raw, 'utf8');
      await handle.sync();
    } finally { await handle.close(); }
    await this.io.rename(temp, file);
  }

  _scheduleRetry() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.savedRevision < this.revision || this.lastError) this._queue();
    }, this.retryMs);
    this.timer.unref?.();
  }

  async flush() { await this.tail; return this.snapshot(); }
  dispose() { clearTimeout(this.timer); this.timer = null; }
}

module.exports = { Store, encode, decode, validate, defaults };
