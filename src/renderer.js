'use strict';
const petElement=document.getElementById('pet'),character=document.querySelector('.character');
const keyboard=document.getElementById('keyboard'),counter=document.getElementById('count'),counterBoard=document.getElementById('counter-board');
const statusElement=document.getElementById('status'),notice=document.getElementById('notice'),keyContainer=document.getElementById('keys');
const droolLayer=document.getElementById('drool-layer');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const motion=new window.PetArms.ArmMotion();
const armGroups=[document.getElementById('left-arm'),document.getElementById('right-arm')];
const armCuts=['left','right'].map(side=>document.getElementById(side+'-body-cut'));
const armBackings=['left','right'].map(side=>document.getElementById(side+'-backing'));
const keyNodes=new Map(),pressed=new Map(),mouseTimers=new Set();
let droolTimer=null;
let frame=0,blinkTimer,blinkEndTimer,pressOrigin=null,mouseId=0,alternate=0;
let lastTap=0,lastBlink=0,burst=0,lastCount=0,lastRevision=-1,lastSavedRevision=-1,shownNotices='',transportFailed=false;

for(const key of window.PetKeyboard.keys){
 const node=document.createElement('span');node.className='keycap';node.dataset.code=key.code;node.textContent=key.label;
 node.style.left=`${key.x/window.PetKeyboard.width*100}%`;node.style.top=`${key.y/window.PetKeyboard.height*100}%`;
 node.style.width=`${key.w/window.PetKeyboard.width*100-.35}%`;node.style.height=`${key.h/window.PetKeyboard.height*100-1.3}%`;
 keyContainer.appendChild(node);keyNodes.set(key.code,node);
}
function alignTypingArea(){
 const first=keyNodes.get('Backquote').getBoundingClientRect(),last=keyNodes.get('Backspace').getBoundingClientRect();
 const typingCenter=(Math.min(first.left,last.left)+Math.max(first.right,last.right))/2;
 const pet=petElement.getBoundingClientRect(),body=character.getBoundingClientRect();
 const shoulders=(PetArms.PIVOTS[0].x+PetArms.PIVOTS[1].x)/2/1274;
 const left=(typingCenter-pet.left-body.width*shoulders)/pet.width*100;
 document.querySelectorAll('.breathing-layer').forEach(node=>node.style.left=left+'%');
}
window.addEventListener('resize',alignTypingArea);
alignTypingArea();
function update(state){
 if(!state||state.revision<lastRevision||(state.revision===lastRevision&&state.savedRevision<lastSavedRevision))return;
 lastRevision=state.revision;lastSavedRevision=state.savedRevision;lastCount=state.count;
 counter.value=String(state.count);counter.textContent=String(state.count);
 counter.style.fontSize=`${Math.min(6.5,24/(String(state.count).length*.65+1))}vw`;
 keyboard.setAttribute('aria-label',`累计 ${state.count} 次，鼠标点击键盘加一；打字不计数`);
 if(!transportFailed){
  statusElement.textContent=state.error?'尚未保存 · 正在重试':'';
  statusElement.classList.toggle('error',Boolean(state.error));statusElement.title=state.error||'';
 }
 if(state.keyboard){petElement.dataset.keyboard=state.keyboard.ready?'ready':state.keyboard.enabled?'connecting':'off';
  if(state.keyboard.error&&!state.error){statusElement.textContent='键盘联动重连中';statusElement.title=state.keyboard.error;}
 }
 const text=state.notices.join(' ');if(text&&text!==shownNotices){shownNotices=text;notice.textContent=text+'（点击收起）';notice.hidden=false;}
}
function draw(poses){
 poses.forEach((pose,i)=>{
  armGroups[i].setAttribute('transform',`rotate(${pose.angle.toFixed(4)} ${pose.pivot.x} ${pose.pivot.y})`);
  armGroups[i].dataset.phase=pose.phase;
  const active=pose.phase==='rest'?'0':'1';
  armCuts[i].setAttribute('opacity',active);armBackings[i].setAttribute('opacity',active);
 });
}
function cancelDrool(){clearTimeout(droolTimer);droolTimer=null;droolLayer.classList.remove('dropping');petElement.classList.remove('drooling');}
function scheduleDrool(){
 if(reducedMotion.matches||!petElement.classList.contains('idle')||droolTimer!==null||droolLayer.classList.contains('dropping'))return;
 droolTimer=setTimeout(()=>{droolTimer=null;droolLayer.classList.add('dropping');petElement.classList.add('drooling');},4000+Math.random()*4000);
}
function setIdle(idle){
 const wasIdle=petElement.classList.contains('idle');petElement.classList.toggle('idle',idle);
 if(!idle)cancelDrool();else if(!wasIdle)scheduleDrool();
}
droolLayer.addEventListener('animationend',event=>{
 if(event.animationName==='droplet-fall'){droolLayer.classList.remove('dropping');petElement.classList.remove('drooling');scheduleDrool();}
});
reducedMotion.addEventListener('change',()=>{cancelDrool();if(!reducedMotion.matches)scheduleDrool();});
function tick(now){
 frame=0;draw(motion.sample(now));
 if(!motion.settled()){frame=requestAnimationFrame(tick);}else if(!pressed.size)setIdle(true);
}
function wake(){setIdle(false);if(!frame)frame=requestAnimationFrame(tick);}
function blink(duration=145){clearTimeout(blinkEndTimer);petElement.classList.add('blinking');lastBlink=performance.now();blinkEndTimer=setTimeout(()=>petElement.classList.remove('blinking'),duration);}
function scheduleBlink(){clearTimeout(blinkTimer);blinkTimer=setTimeout(()=>{blink();scheduleBlink();},3000+Math.random()*4000);}
function react(){
 const now=performance.now();burst=now-lastTap<300?burst+1:1;lastTap=now;
 if(burst>=3&&now-lastBlink>650){blink(110);burst=0;}
 scheduleBlink();
}
function targetFor(code){
 const node=keyNodes.get(code);if(!node)return null;
 const key=node.getBoundingClientRect(),body=character.getBoundingClientRect();
 return {x:(key.x+key.width/2-body.x)/body.width*1274,y:(key.y+key.height/2-body.y)/body.height*1234};
}
function light(code){const on=[...pressed.values()].some(p=>p.code===code);keyNodes.get(code)?.classList.toggle('lit',on);}
function press(token,code){
 if(pressed.has(token)||!keyNodes.has(code))return;
 wake();
 const target=targetFor(code),side=PetKeyboard.armSide(code,code==='Space'?alternate++%2:0);
 pressed.set(token,{code,side});light(code);motion.press(side,target,performance.now());react();
}
function release(token){
 const item=pressed.get(token);if(!item)return;pressed.delete(token);light(item.code);
 const same=[...pressed.values()].filter(p=>p.side===item.side).at(-1);
 if(same){if(same.code!==item.code)motion.aim(item.side,targetFor(same.code),performance.now());}else motion.release(item.side,performance.now());wake();
}
function reset(){for(const timer of mouseTimers)clearTimeout(timer);mouseTimers.clear();pressed.clear();keyNodes.forEach(node=>node.classList.remove('lit'));motion.reset();wake();}
window.pet.subscribeKeys((data)=>{
 if(data.type==='reset'){reset();return;}if(data.type!=='key')return;
 if(data.down)press('real:'+data.code,data.code);else release('real:'+data.code);
});
for(const button of [keyboard,counterBoard])button.addEventListener('pointerdown',e=>{if(e.button===0)pressOrigin={x:e.clientX,y:e.clientY};});
for(const button of [keyboard,counterBoard])button.addEventListener('pointercancel',()=>{pressOrigin=null;});
async function countClick(e){
 if(e.button!==0||(e.detail===0&&e.isTrusted))return;
 if(pressOrigin&&Math.hypot(e.clientX-pressOrigin.x,e.clientY-pressOrigin.y)>6){pressOrigin=null;return;}pressOrigin=null;
 const code=e.target.closest('[data-code]')?.dataset.code||(alternate++%2?'KeyJ':'KeyF'),token='mouse:'+(++mouseId);
 press(token,code);const timer=setTimeout(()=>{mouseTimers.delete(timer);release(token);},110);mouseTimers.add(timer);
 try{update(await window.pet.increment());}catch{transportFailed=true;keyboard.disabled=true;counterBoard.disabled=true;statusElement.textContent=`计数连接中断 · 已记录 ${lastCount} 次`;statusElement.classList.add('error');}
}
for(const button of [keyboard,counterBoard]){button.addEventListener('click',countClick);button.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'||e.code==='NumpadEnter')e.preventDefault();});}
document.addEventListener('contextmenu',e=>{e.preventDefault();window.pet.menu();});
document.addEventListener('dragstart',e=>e.preventDefault());
notice.addEventListener('click',()=>{notice.hidden=true;});
window.addEventListener('beforeunload',()=>{reset();cancelAnimationFrame(frame);clearTimeout(blinkTimer);clearTimeout(blinkEndTimer);cancelDrool();});
window.pet.subscribe(update);
window.pet.read().then(state=>{update(state);keyboard.disabled=false;counterBoard.disabled=false;scheduleBlink();draw(motion.sample(performance.now()));setIdle(true);}).catch(()=>{statusElement.textContent='读取计数失败，请重启';statusElement.classList.add('error');});
