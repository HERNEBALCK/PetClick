'use strict';
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { EventEmitter } = require('node:events');
const { nativeCode } = require('./keyboard-layout');

class KeyboardInput extends EventEmitter {
  constructor(executable) {
    super(); this.executable = executable; this.child = null; this.enabled = false;
    this.ready = false; this.error = null; this.retry = null; this.startup = null;
  }
  snapshot() { return { enabled: this.enabled, ready: this.ready, error: this.error }; }
  accept(message) {
    if (message.type === 'ready') {
      clearTimeout(this.startup); this.ready = true; this.error = null; this.emit('status', this.snapshot()); return;
    }
    if (message.type === 'error') { this.error = '无法连接系统键盘'; this.emit('status', this.snapshot()); return; }
    if (message.type !== 'key' || typeof message.down !== 'boolean' || typeof message.extended !== 'boolean' ||
        !Number.isInteger(message.scan) || message.scan < 0 || message.scan > 255 ||
        !Number.isInteger(message.vk) || message.vk < 1 || message.vk > 254) return;
    const code = nativeCode(message.scan, message.extended, message.vk);
    if (code) {
      this.emit('key', { code, down: message.down });
      if (code === 'Pause' && message.down) {
        const timer = setTimeout(() => this.emit('key', { code, down: false }), 110); timer.unref();
      }
    }
  }
  start() {
    this.enabled = true;
    if (this.child) return;
    this.error = null;
    const child = spawn(this.executable, [String(process.pid)], { windowsHide: true, stdio: ['pipe','pipe','pipe'] });
    this.child = child;
    child.stdin.on('error', () => {});
    child.stderr.resume();
    const lines = createInterface({ input: child.stdout });
    lines.on('line', (line) => {
      if (this.child !== child || line.length > 256) return;
      try { this.accept(JSON.parse(line)); } catch { /* Never log keystrokes or raw pipe data. */ }
    });
    const failed = () => {
      if (this.child !== child) return;
      clearTimeout(this.startup); this.child = null; this.ready = false;
      this.emit('reset');
      if (this.enabled) {
        this.error = '键盘联动暂不可用，正在重试';
        this.retry = setTimeout(() => this.start(), 5000); this.retry.unref();
      }
      this.emit('status', this.snapshot());
    };
    child.once('error', failed); child.once('exit', failed);
    this.startup = setTimeout(() => {
      if (this.child === child && !this.ready) { this.error = '连接键盘超时'; child.kill(); }
    }, 5000);
    this.startup.unref();
    this.emit('status', this.snapshot());
  }
  stop() {
    this.enabled = false; this.ready = false; this.error = null;
    clearTimeout(this.retry); clearTimeout(this.startup);
    const child = this.child; this.child = null;
    if (child) {
      child.stdin.end();
      const timer = setTimeout(() => { if (child.exitCode === null) child.kill(); }, 1500); timer.unref();
    }
    this.emit('reset'); this.emit('status', this.snapshot());
  }
}
module.exports = { KeyboardInput };
