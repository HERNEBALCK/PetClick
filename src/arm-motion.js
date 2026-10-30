'use strict';
(function (root) {
  // Every pose rotates the COMPLETE original shoulder-to-cuff image about its shoulder.
  // No translation/scale: the root cannot leave the body, even at extreme key positions.
  const PIVOTS = [{ x: 538, y: 888 }, { x: 812, y: 830 }];
  const CONTACTS = [{ x: 510, y: 1178 }, { x: 792, y: 1168 }];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ease = t => (1 - Math.cos(Math.PI * clamp(t, 0, 1))) / 2;
  function contactAngle(side, point) {
    const pivot=PIVOTS[side],rest=CONTACTS[side];
    const x=point?.x ?? rest.x,y=point?.y ?? rest.y;
    const bearing=Math.atan2(y-pivot.y,x-pivot.x);
    const neutral=Math.atan2(rest.y-pivot.y,rest.x-pivot.x);
    return clamp((bearing-neutral)*180/Math.PI,side ? -48 : -38,side ? 38 : 48) || 0;
  }
  function contactPosition(side, angle) {
    const p = PIVOTS[side], c = CONTACTS[side], radians = angle * Math.PI / 180;
    return { x: p.x + (c.x - p.x) * Math.cos(radians) - (c.y - p.y) * Math.sin(radians),
      y: p.y + (c.x - p.x) * Math.sin(radians) + (c.y - p.y) * Math.cos(radians) };
  }
  class ArmMotion {
    constructor() {
      this.now = 0;
      this.arms = PIVOTS.map((pivot, side) => ({ side, pivot, angle: 0, from: 0,
        contact: 0, phase: 'rest', started: 0, duration: 0, held: false, releaseAt: 0,
        pendingPulse: false }));
    }
    segment(a, phase, now, duration) {
      a.from = a.angle; a.phase = phase; a.started = now;
      a.duration = duration ?? (phase === 'lift' ? 90 : phase === 'fall' ? 75 : 130);
    }
    press(side, point, now) {
      this.sample(now);
      const a = this.arms[side], next = contactAngle(side, point), changed = next !== a.contact;
      a.held = true; a.releaseAt = 0; a.contact = next;
      if (a.phase === 'rest' || a.phase === 'hold' || a.phase === 'return') {
        a.pendingPulse = false; this.segment(a, 'lift', now);
      } else {
        // At most one fresh stroke; a burst can never build an animation queue.
        if (a.phase === 'fall') a.pendingPulse = true;
        if (changed) this.segment(a, a.phase, now, Math.max(24, a.started + a.duration - now));
      }
    }
    aim(side,point,now) {
      this.sample(now);const a=this.arms[side];
      a.contact=contactAngle(side,point);a.held=true;a.releaseAt=0;a.pendingPulse=false;
      this.segment(a,'fall',now,75);
    }
    release(side, now) {
      const a = this.arms[side]; a.held = false; a.releaseAt = now + 45; a.pendingPulse = false;
    }
    reset() {
      this.arms.forEach(a => { a.held = false; a.pendingPulse = false; a.releaseAt = 0; this.segment(a, 'return', this.now); });
    }
    sample(now) {
      this.now = now;
      for (const a of this.arms) {
        if (a.phase === 'hold' && !a.held && now >= a.releaseAt) this.segment(a, 'return', now);
        if (a.phase === 'rest' || a.phase === 'hold') continue;
        const t = (now - a.started) / a.duration;
        const goal = a.phase === 'return' ? 0 : a.contact + (a.phase === 'lift' ? (a.side ? -7 : 7) : 0);
        a.angle = a.from + (goal - a.from) * ease(t);
        if (t >= 1) {
          a.angle=goal;
          if (a.phase === 'lift') this.segment(a, 'fall', now);
          else if (a.phase === 'fall') {
            if (a.pendingPulse && a.held) { a.pendingPulse = false; this.segment(a, 'lift', now); }
            else this.segment(a, 'hold', now);
          } else { a.phase = 'rest'; a.angle = 0; }
        }
      }
      return this.arms.map(a => ({ angle: a.angle, pivot: { ...a.pivot },
        contact: contactPosition(a.side, a.angle), phase: a.phase, side: a.side }));
    }
    settled() { return this.arms.every(a => a.phase === 'rest' || (a.phase === 'hold' && a.held)); }
  }
  const api = { ArmMotion, PIVOTS, CONTACTS, contactAngle, contactPosition };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PetArms = api;
})(typeof window !== 'undefined' ? window : globalThis);
