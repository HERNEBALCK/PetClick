'use strict';
const {_electron}=require('playwright-core'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output');
 const dir=await fs.mkdtemp(path.join(out,'visual-v153-'));
 const env={...process.env,PETCLICK_TEST_DATA_DIR:dir};delete env.ELECTRON_RUN_AS_NODE;
 let app;
 try {
  app=await _electron.launch({executablePath:require('electron'),args:[root],env,timeout:15000});
  const page=await app.firstWindow();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.getElementById('keyboard').disabled);
  await page.waitForFunction(()=>document.getElementById('pet').dataset.keyboard==='ready',null,{timeout:10000});
  await app.evaluate(({Menu})=>{const build=Menu.buildFromTemplate;Menu.buildFromTemplate=(...args)=>{const menu=build(...args);globalThis.visualMenu=menu;menu.popup=()=>{};return menu;};});
  await page.evaluate(()=>window.pet.menu());
  await app.evaluate(()=>globalThis.visualMenu.items.find(x=>x.label==='键盘联动').click({checked:false}));
  await page.waitForFunction(()=>document.getElementById('pet').dataset.keyboard==='off'&&document.getElementById('status').textContent==='');
  await page.evaluate(()=>{
   cancelAnimationFrame(frame);clearTimeout(blinkTimer);clearTimeout(blinkEndTimer);
   petElement.classList.remove('idle','blinking');
   window.visualRig=new PetArms.ArmMotion();draw(window.visualRig.sample(0));
  });
  assert.equal(await page.locator('.arm-layer').evaluate(n=>getComputedStyle(n).clipPath),'none');
  assert.equal(await page.locator('#left-body-cut').getAttribute('opacity'),'0');
  assert.equal(await page.locator('#right-body-cut').getAttribute('opacity'),'0');
  await page.screenshot({path:path.join(out,'v153-small.png'),omitBackground:true,scale:'css'});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:640,height:676}));
  const rest=await page.screenshot({path:path.join(out,'v153-detail.png'),omitBackground:true,scale:'css'});
  await page.evaluate(()=>{
   visualRig.press(0,targetFor('Numpad7'),0);visualRig.press(1,targetFor('KeyA'),0);draw(visualRig.sample(90));
   keyNodes.get('KeyA').classList.add('lit');keyNodes.get('Numpad7').classList.add('lit');
  });
  const roots=await page.evaluate(()=>armGroups.map((g,i)=>{
   const p=PetArms.PIVOTS[i],m=g.transform.baseVal.consolidate().matrix;
   return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};
  }));
  const {PIVOTS}=require('../src/arm-motion');
  roots.forEach((point,i)=>{assert.ok(Math.abs(point.x-PIVOTS[i].x)<.001);assert.ok(Math.abs(point.y-PIVOTS[i].y)<.001);});
  await page.screenshot({path:path.join(out,'v153-lift.png'),omitBackground:true,scale:'css'});
  await page.evaluate(()=>draw(visualRig.sample(165)));
  await page.screenshot({path:path.join(out,'v153-contact.png'),omitBackground:true,scale:'css'});
  await page.evaluate(()=>petElement.classList.add('blinking'));
  await page.screenshot({path:path.join(out,'v153-blink.png'),omitBackground:true,scale:'css'});
  await page.evaluate(()=>{
   petElement.classList.remove('blinking');keyNodes.forEach(n=>n.classList.remove('lit'));
   visualRig.release(0,200);visualRig.release(1,200);visualRig.sample(245);draw(visualRig.sample(375));
  });
  const restored=await page.screenshot({path:path.join(out,'v153-restored.png'),omitBackground:true,scale:'css'});
  const comparison=await app.evaluate(({nativeImage},buffers)=>{
   const images=buffers.map(b=>nativeImage.createFromBuffer(Buffer.from(b,'base64')).toBitmap());
   let changed=0,maxDelta=0;
   for(let i=0;i<images[0].length;i+=4){let diff=false;for(let c=0;c<4;c++){const delta=Math.abs(images[0][i+c]-images[1][i+c]);diff ||= delta>0;maxDelta=Math.max(maxDelta,delta);}if(diff)changed++;}
   return {changed,pixels:images[0].length/4,maxDelta};
  },[rest.toString('base64'),restored.toString('base64')]);
  // Chromium may rasterize a few transparent edge pixels differently after compositing.
  assert.ok(comparison.changed/comparison.pixels<.01&&comparison.maxDelta<=70,JSON.stringify(comparison));
  assert.equal(await page.locator('#count').textContent(),'0');
  const review=path.join(out,'v153-arm-review.html');
  await fs.writeFile(review,`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#e8eeec;color:#24484d;font:16px 'Microsoft YaHei',sans-serif}h1{font-size:22px;margin:0 0 8px}p{margin:0 0 24px;font-size:13px}main{display:flex;gap:16px}section{width:288px;background:#f9fcfa;border-radius:16px;padding:12px;text-align:center}h2{font-size:15px;margin:4px 0}img{width:264px;height:220px;object-fit:cover;object-position:top}small{color:#557176;font-size:12px}</style><h1>完整手臂 · 肩部固定</h1><p>保留同一张原画的上臂、袖套和袖口，围绕肩部抬起、落下，再回到原位。</p><main><section><h2>静止 / 回位</h2><img src="v153-detail.png"><small>原图姿势，未移动手臂</small></section><section><h2>抬手</h2><img src="v153-lift.png"><small>肩部连接，整条手臂一起运动</small></section><section><h2>落下</h2><img src="v153-contact.png"><small>手臂回落到键盘，按键亮起</small></section></main>`);
  await app.evaluate(async({BrowserWindow},file)=>{const w=BrowserWindow.getAllWindows()[0];w.setBounds({width:944,height:440});await w.loadFile(file);},review);
  await page.locator('img').first().waitFor();await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  await page.screenshot({path:path.join(out,'v153-arm-review.png'),scale:'css'});
  console.log(JSON.stringify({passed:true,completeArmsUnclipped:true,shoulderAnchorsFixed:true,restPoseRestored:true,restImageComparison:comparison,countUnchanged:0}));
 }finally{if(app)await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
