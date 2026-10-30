'use strict';
const {_electron}=require('playwright-core'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output'),dir=await fs.mkdtemp(path.join(out,'idle-v153-'));
 const env={...process.env,PETCLICK_TEST_DATA_DIR:dir};delete env.ELECTRON_RUN_AS_NODE;
 let app;
 try{
  app=await _electron.launch({executablePath:require('electron'),args:[root],env,timeout:30000});
  const page=await app.firstWindow();await page.waitForFunction(()=>!document.getElementById('keyboard').disabled);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setIgnoreMouseEvents(true));
  await page.waitForFunction(()=>document.getElementById('pet').dataset.keyboard==='ready');
  await app.evaluate(({Menu})=>{const build=Menu.buildFromTemplate;Menu.buildFromTemplate=(...args)=>{const menu=build(...args);globalThis.idleMenu=menu;menu.popup=()=>{};return menu;};});
  await page.evaluate(()=>window.pet.menu());await app.evaluate(()=>globalThis.idleMenu.items.find(x=>x.label==='键盘联动').click({checked:false}));
  await page.waitForFunction(()=>document.getElementById('pet').dataset.keyboard==='off'&&document.getElementById('pet').classList.contains('idle'));
  const poses=()=>page.evaluate(()=>[...document.querySelectorAll('.breathing-layer')].map(n=>({y:new DOMMatrixReadOnly(getComputedStyle(n).transform).f,play:getComputedStyle(n).animationPlayState,left:n.getBoundingClientRect().left})));
  await page.evaluate(()=>document.querySelectorAll('.breathing-layer').forEach(n=>n.getAnimations()[0].currentTime=2250));
  const peak=await poses();assert.equal(peak.length,4);for(const p of peak){assert.ok(p.y<=-3.8&&p.y>=-3.85);assert.ok(Math.abs(p.y-peak[0].y)<.01);assert.ok(Math.abs(p.left-peak[0].left)<.01);}
  await page.screenshot({path:path.join(out,'v153-breath-small.png'),omitBackground:true,scale:'css'});
  const key=(code,down)=>app.evaluate(({BrowserWindow},data)=>BrowserWindow.getAllWindows()[0].webContents.send('pet:key',{type:'key',...data}),{code,down});
  await key('KeyA',true);await key('KeyJ',true);
  await page.waitForFunction(()=>document.getElementById('left-arm').dataset.phase==='hold'&&document.getElementById('right-arm').dataset.phase==='hold');
  const paused=await poses();assert.ok(paused.every(p=>p.play==='paused'));assert.ok(Math.abs(paused[0].y-peak[0].y)<.1);
  assert.ok(await page.evaluate(()=>droolTimer===null&&!droolLayer.classList.contains('dropping')));
  await page.waitForTimeout(550);const held=await poses();assert.deepEqual(held,paused);
  await key('KeyA',false);assert.ok(await page.evaluate(()=>!petElement.classList.contains('idle')&&droolTimer===null));
  await key('KeyJ',false);await page.waitForFunction(()=>document.getElementById('pet').classList.contains('idle'));
  assert.ok((await poses()).every(p=>p.play==='running'));
  const singleTimer=await page.evaluate(()=>{const first=droolTimer;for(let i=0;i<20;i++)setIdle(true);return first!==null&&first===droolTimer;});assert.ok(singleTimer);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:640,height:676}));
  await page.waitForFunction(()=>document.getElementById('drool-layer').classList.contains('dropping'),null,{timeout:10000,polling:10});
  const dropMotion=await page.evaluate(()=>{const n=document.getElementById('droplet'),a=n.getAnimations()[0];a.pause();a.currentTime=1300;const m=new DOMMatrixReadOnly(getComputedStyle(n).transform);return {y:m.f,opacity:Number(getComputedStyle(n).opacity),pointer:getComputedStyle(document.getElementById('drool-layer')).pointerEvents};});
  assert.ok(dropMotion.y>3&&dropMotion.y<160);assert.ok(dropMotion.opacity>.9);assert.equal(dropMotion.pointer,'none');
  await page.screenshot({path:path.join(out,'v153-drool-detail.png'),omitBackground:true,scale:'css'});
  await page.evaluate(()=>document.getElementById('droplet').getAnimations()[0].play());
  await page.waitForFunction(()=>!document.getElementById('drool-layer').classList.contains('dropping'));
  assert.ok(await page.evaluate(()=>droolTimer!==null));
  await page.evaluate(()=>droolLayer.classList.add('dropping'));await key('KeyA',true);
  await page.waitForFunction(()=>!document.getElementById('drool-layer').classList.contains('dropping'));
  assert.ok(await page.evaluate(()=>droolTimer===null));await key('KeyA',false);await page.waitForFunction(()=>document.getElementById('pet').classList.contains('idle'));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>droolTimer===null);
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.breathing-layer')].every(n=>n.getAnimations().length===0)));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>droolTimer!==null);
  assert.equal(await page.locator('#count').textContent(),'0');
  await page.evaluate(()=>{
   cancelDrool();clearTimeout(blinkTimer);clearTimeout(blinkEndTimer);petElement.classList.remove('blinking');
   document.querySelectorAll('.breathing-layer').forEach(n=>n.getAnimations()[0].pause());
  });
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const region=await page.evaluate(()=>{const b=character.getBoundingClientRect();return {body:{left:b.left,top:b.top,right:b.right,bottom:b.bottom},left:b.x+580/1274*b.width,right:b.x+690/1274*b.width,top:b.y+745/1234*b.height,bottom:b.y+1234/1234*b.height};});
  const rest=await page.screenshot({path:path.join(out,'v153-drool-rest.png'),omitBackground:true,scale:'css'});
  await page.evaluate(()=>{droolLayer.classList.add('dropping');petElement.classList.add('drooling');[document.getElementById('drool-strand'),document.getElementById('droplet')].forEach(n=>{const a=n.getAnimations()[0];a.pause();a.currentTime=1000;});});
  const stretched=await page.screenshot({path:path.join(out,'v153-drool-stretched.png'),omitBackground:true,scale:'css'});
  const outsideChanges=await app.evaluate(({nativeImage},{images,region,sourceFile})=>{
   const bitmap=images.map(b=>nativeImage.createFromBuffer(Buffer.from(b,'base64'))),width=bitmap[0].getSize().width,data=bitmap.map(b=>b.toBitmap()),source=nativeImage.createFromPath(sourceFile),sourceSize=source.getSize(),sourcePixels=source.toBitmap();let changed=0;
   for(let i=0;i<data[0].length;i+=4){const x=i/4%width,y=Math.floor(i/4/width);if(x<region.body.left||x>region.body.right||y<region.body.top||y>region.body.bottom)continue;if(x>=region.left&&x<=region.right&&y>=region.top&&y<=region.bottom)continue;const sx=Math.floor((x-region.body.left)/(region.body.right-region.body.left)*sourceSize.width),sy=Math.floor((y-region.body.top)/(region.body.bottom-region.body.top)*sourceSize.height);if(sourcePixels[(sy*sourceSize.width+sx)*4+3]<128)continue;
    if([0,1,2,3].some(c=>Math.abs(data[0][i+c]-data[1][i+c])>2))changed++;
   }return changed;
  },{images:[rest.toString('base64'),stretched.toString('base64')],region,sourceFile:path.join(root,'assets/pet.png')});
  assert.equal(outsideChanges,0,'Pixels outside the drool area must remain unchanged');
  await page.evaluate(()=>{
   document.querySelectorAll('.keyboard,.arm-layer,.tie-layer,.counter-card,.status,.blink-art,.drag-handle').forEach(n=>n.style.display='none');
   document.querySelectorAll('.character,.drool-layer,.shoulder-layer').forEach(n=>{n.style.cssText='left:0!important;top:0;width:100%;height:100%;aspect-ratio:auto';n.querySelector('svg').setAttribute('viewBox','550 735 140 350');});
  });
  for(const [name,time] of [['stretch',1000],['break',1250],['fall',1600]]){
   await page.evaluate(t=>[document.getElementById('drool-strand'),document.getElementById('droplet')].forEach(n=>n.getAnimations()[0].currentTime=t),time);
   await page.screenshot({path:path.join(out,'v153-mouth-'+name+'.png'),omitBackground:true,scale:'css'});
  }
  const result={passed:true,outsideDroolPixelsUnchanged:outsideChanges===0,peakAt160px:peak[0].y,layersStayAligned:true,inputPausesBreath:true,heldHandsStable:true,singleIdleTimer:true,naturalDroplet:true,dropMotion,reducedMotion:true,countUnchanged:0};
  await fs.writeFile(path.join(out,'v153-idle-smoke.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{if(app)await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
