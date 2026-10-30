'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {ArmMotion,PIVOTS,CONTACTS,contactAngle,contactPosition}=require('../src/arm-motion');
const layout=require('../src/keyboard-layout');
test('104 unique physical keycaps and left/right modifier/numpad mapping',()=>{
 assert.equal(layout.keys.length,104);assert.equal(new Set(layout.keys.map(k=>k.code)).size,104);
 for(const [scan,extended,vk,code] of [[30,false,65,'KeyA'],[30,false,0,'KeyA'],[28,false,13,'Enter'],[28,true,13,'NumpadEnter'],[29,false,17,'ControlLeft'],[29,true,17,'ControlRight'],[79,false,35,'Numpad1'],[79,true,35,'End'],[69,false,19,'Pause'],[55,true,44,'PrintScreen']])assert.equal(layout.nativeCode(scan,extended,vk),code);
 for(const key of layout.keys){assert.ok(key.x>=0&&key.y>=0&&key.x+key.w<=layout.width&&key.y+key.h<=layout.height);}
 assert.equal(layout.byCode.KeyF.side,0);assert.equal(layout.byCode.KeyJ.side,1);assert.equal(layout.byCode.KeyY.side,1);
 assert.equal(layout.nativeCode(69,true,144),'NumLock');
});
test('complete arms stay anchored at the shoulder and cuffs stay over the keyboard',()=>{
 for(const side of [0,1])for(const x of [-999,200,550,800,1100,9999]){
  const rig=new ArmMotion();rig.press(side,{x,y:1100},0);
  for(let t=0;t<=500;t+=5){const pose=rig.sample(t)[side];
   assert.deepEqual(pose.pivot,PIVOTS[side]);assert.ok(Number.isFinite(pose.angle));
   assert.ok(Math.abs(pose.angle)<=55.00001);
   // The complete image rotates about this point, with no translation or scaling.
   const p=pose.pivot,r=pose.angle*Math.PI/180,c=Math.cos(r),sn=Math.sin(r);
   const matrix={a:c,b:sn,c:-sn,d:c,e:p.x-c*p.x+sn*p.y,f:p.y-sn*p.x-c*p.y};
   assert.ok(Math.abs(matrix.a*p.x+matrix.c*p.y+matrix.e-p.x)<1e-9);
   assert.ok(Math.abs(matrix.b*p.x+matrix.d*p.y+matrix.f-p.y)<1e-9);
   assert.ok(pose.contact.x>=220&&pose.contact.x<=1100);
   assert.ok(pose.contact.y>=1000&&pose.contact.y<=1200);
  }
  assert.equal(rig.arms[side].phase,'hold');assert.ok(rig.settled());
  const held=rig.sample(4000)[side].angle;assert.equal(held,contactAngle(side,{x,y:1100}));
  rig.release(side,4000);for(let t=4000;t<=4500;t+=5)rig.sample(t);
  assert.equal(rig.arms[side].phase,'rest');assert.equal(rig.arms[side].angle,0);
 }
});

test('nearby key regions aim the cuff without moving its shoulder',()=>{
 for(const side of [0,1]){
  const left=contactPosition(side,contactAngle(side,{x:100}));
  const right=contactPosition(side,contactAngle(side,{x:1200}));assert.ok(left.x<right.x);
  assert.deepEqual(contactPosition(side,0),CONTACTS[side]);
 }
 const rig=new ArmMotion();rig.press(0,{x:200},0);const before=rig.sample(60)[0];rig.press(0,{x:550},60);
 assert.deepEqual(rig.sample(60)[0],before);
});

test('a short tap completes lift and downstroke, then returns exactly to the original pose',()=>{
 const rig=new ArmMotion();rig.press(0,{x:300},0);rig.release(0,12);rig.press(1,{x:1000},20);
 const poses=[];for(let t=24;t<600;t+=8)poses.push(rig.sample(t)[0]);
 assert.ok(poses.some(p=>p.phase==='lift'));assert.ok(poses.some(p=>p.phase==='fall'));assert.ok(poses.some(p=>p.phase==='return'));
 assert.equal(rig.arms[0].angle,0);assert.equal(rig.arms[1].phase,'hold');
 rig.reset();for(let t=600;t<1100;t+=8)rig.sample(t);assert.ok(rig.settled());
 for(const pose of rig.sample(1100)){assert.equal(pose.angle,0);assert.equal(pose.phase,'rest');}
});

test('rapid alternating inputs do not queue strokes or snap the arm back',()=>{
 const rig=new ArmMotion();
 for(let t=0;t<900;t+=9){const side=(t/9)%2,before=rig.sample(t)[side];rig.press(side,{x:side?1000:250},t);
  const after=rig.sample(t)[side];assert.equal(after.angle,before.angle);
 }
 rig.release(0,900);rig.release(1,900);for(let t=900;t<=1400;t+=5)rig.sample(t);
 assert.ok(rig.settled());assert.ok(rig.arms.every(a=>a.phase==='rest'&&a.angle===0));
});

test('keyboard pipe forwards only physical identities and never text',()=>{
 const {KeyboardInput}=require('../src/keyboard-input');const bridge=new KeyboardInput('unused');const events=[];bridge.on('key',e=>events.push(e));
 bridge.accept({type:'key',scan:30,vk:65,extended:false,down:true,text:'must not cross boundary'});
 bridge.accept({type:'key',scan:30,vk:65,extended:false,down:false});
 bridge.accept({type:'key',scan:-1,vk:65,extended:false,down:true});
 bridge.accept({type:'key',scan:255,vk:999,extended:false,down:true});
 bridge.accept({type:'text',text:'not accepted'});
 assert.deepEqual(events,[{code:'KeyA',down:true},{code:'KeyA',down:false}]);
});

test('holding a key keeps the contact pose until release; aiming back to a held key does not lift again',()=>{
 const rig=new ArmMotion();rig.press(0,{x:300,y:1100},0);
 for(let t=0;t<1000;t+=10)rig.sample(t);
 const held=rig.sample(1000)[0];assert.equal(held.phase,'hold');
 assert.deepEqual(rig.sample(10000)[0],held);
 rig.aim(0,{x:450,y:1140},10000);for(let t=10000;t<=10200;t+=10)rig.sample(t);
 assert.equal(rig.arms[0].phase,'hold');
 rig.release(0,10200);for(let t=10200;t<=10600;t+=10)rig.sample(t);
 assert.equal(rig.arms[0].phase,'rest');
});

test('typing halves independently drive both arms, including the centre boundary',()=>{
 for(const code of ['KeyQ','KeyT','KeyA','KeyG','KeyZ','KeyB','ShiftLeft','ControlLeft'])assert.equal(layout.armSide(code),1,code);
 for(const code of ['KeyY','KeyP','KeyH','KeyL','KeyN','KeyM','ShiftRight','ControlRight','Numpad7','ArrowLeft'])assert.equal(layout.armSide(code),0,code);
 assert.equal(layout.armSide('Space',0),0);assert.equal(layout.armSide('Space',1),1);
});
