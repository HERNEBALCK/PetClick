'use strict';
const {_electron}=require('playwright-core'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {extractFile}=require('@electron/asar'),{decode}=require('../src/store');
(async()=>{
 const root=path.resolve(__dirname,'..'),archive=path.join(root,'release/win-unpacked/resources/app.asar');
 for(const name of ['src/main.js','src/index.html','src/style.css','src/renderer.js','src/arm-motion.js','assets/pet.png','assets/pet-backing-v14.png','assets/drool-backing-v153.png','assets/app-icon.png','assets/app-icon.ico'])assert.ok(extractFile(archive,name).equals(await fs.readFile(path.join(root,name))),name);
 const saved=path.join(process.env.APPDATA,'PetClick/state.json'),before=decode(await fs.readFile(saved,'utf8')).count;
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.PETCLICK_TEST_DATA_DIR;
 let instance;
 try{
  instance=await _electron.launch({executablePath:path.join(root,'release/win-unpacked/PetClick.exe'),args:[],env,timeout:30000});
  const page=await instance.firstWindow();await page.waitForFunction(()=>!document.getElementById('keyboard').disabled);
  const snapshot=await page.evaluate(()=>window.pet.read());
  if(snapshot.keyboard.enabled)await page.waitForFunction(()=>document.getElementById('pet').dataset.keyboard==='ready');
  const version=await instance.evaluate(({app})=>app.getVersion());assert.equal(version,'1.5.3');
  assert.equal(await page.locator('#count').textContent(),String(before));
  assert.equal(await page.locator('.arm-layer').evaluate(n=>getComputedStyle(n).clipPath),'none');
  await page.screenshot({path:path.join(root,'test-output/v153-packaged.png'),omitBackground:true,scale:'css'});
  console.log(JSON.stringify({passed:true,version,sourceMatchesPackage:true,count:before,keyboard:await page.locator('#pet').getAttribute('data-keyboard')}));
 }finally{if(instance)await instance.close();}
 assert.equal(decode(await fs.readFile(saved,'utf8')).count,before);
})().catch(e=>{console.error(e);process.exitCode=1;});
