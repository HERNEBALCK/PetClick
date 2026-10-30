'use strict';
(function (root) {
  const keys = [];
  const add = (code, label, x, y, w = 1, h = 1) => keys.push({ code, label, x, y, w, h, side: x < 6.5 ? 0 : 1 });
  const row = (codes, labels, x, y) => codes.forEach((code, i) => add(code, labels[i], x + i, y));
  add('Escape','Esc',0,0);
  for (let n = 1; n <= 12; n++) add('F'+n,'F'+n,1.5+n-1+Math.floor((n-1)/4)*.4,0);
  row(['PrintScreen','ScrollLock','Pause'],['Prt','Scr','Pau'],15.5,0);
  row(['Backquote',...Array.from({length:9},(_,i)=>'Digit'+(i+1)),'Digit0','Minus','Equal'],['`','1','2','3','4','5','6','7','8','9','0','−','='],0,1.25);
  add('Backspace','←',13,1.25,2);
  add('Tab','Tab',0,2.25,1.5);
  row('QWERTYUIOP'.split('').map(c=>'Key'+c), 'QWERTYUIOP'.split(''),1.5,2.25);
  row(['BracketLeft','BracketRight'],['[',']'],11.5,2.25);
  add('Backslash','\\',13.5,2.25,1.5);
  add('CapsLock','Caps',0,3.25,1.75);
  row('ASDFGHJKL'.split('').map(c=>'Key'+c),'ASDFGHJKL'.split(''),1.75,3.25);
  row(['Semicolon','Quote'],[';',"'"],10.75,3.25);
  add('Enter','Enter',12.75,3.25,2.25);
  add('ShiftLeft','Shift',0,4.25,2.25);
  row('ZXCVBNM'.split('').map(c=>'Key'+c),'ZXCVBNM'.split(''),2.25,4.25);
  row(['Comma','Period','Slash'],[',','.','/'],9.25,4.25);
  add('ShiftRight','Shift',12.25,4.25,2.75);
  [['ControlLeft','Ctrl',1.25],['MetaLeft','◇',1.25],['AltLeft','Alt',1.25],['Space','',6.25],['AltRight','Alt',1.25],['MetaRight','◇',1.25],['ContextMenu','▤',1.25],['ControlRight','Ctrl',1.25]].reduce((x,[code,label,w])=>{add(code,label,x,5.25,w);return x+w;},0);
  row(['Insert','Home','PageUp'],['Ins','Hom','Pg↑'],15.5,1.25);
  row(['Delete','End','PageDown'],['Del','End','Pg↓'],15.5,2.25);
  add('ArrowUp','↑',16.5,4.25);
  row(['ArrowLeft','ArrowDown','ArrowRight'],['←','↓','→'],15.5,5.25);
  row(['NumLock','NumpadDivide','NumpadMultiply','NumpadSubtract'],['Num','/','×','−'],19,1.25);
  row(['Numpad7','Numpad8','Numpad9'],['7','8','9'],19,2.25);
  add('NumpadAdd','+',22,2.25,1,2);
  row(['Numpad4','Numpad5','Numpad6'],['4','5','6'],19,3.25);
  row(['Numpad1','Numpad2','Numpad3'],['1','2','3'],19,4.25);
  add('NumpadEnter','↵',22,4.25,1,2);
  add('Numpad0','0',19,5.25,2); add('NumpadDecimal','.',21,5.25);
  const normal = {
    1:'Escape',2:'Digit1',3:'Digit2',4:'Digit3',5:'Digit4',6:'Digit5',7:'Digit6',8:'Digit7',9:'Digit8',10:'Digit9',11:'Digit0',12:'Minus',13:'Equal',14:'Backspace',15:'Tab',
    16:'KeyQ',17:'KeyW',18:'KeyE',19:'KeyR',20:'KeyT',21:'KeyY',22:'KeyU',23:'KeyI',24:'KeyO',25:'KeyP',26:'BracketLeft',27:'BracketRight',28:'Enter',29:'ControlLeft',
    30:'KeyA',31:'KeyS',32:'KeyD',33:'KeyF',34:'KeyG',35:'KeyH',36:'KeyJ',37:'KeyK',38:'KeyL',39:'Semicolon',40:'Quote',41:'Backquote',42:'ShiftLeft',43:'Backslash',
    44:'KeyZ',45:'KeyX',46:'KeyC',47:'KeyV',48:'KeyB',49:'KeyN',50:'KeyM',51:'Comma',52:'Period',53:'Slash',54:'ShiftRight',55:'NumpadMultiply',56:'AltLeft',57:'Space',58:'CapsLock',
    59:'F1',60:'F2',61:'F3',62:'F4',63:'F5',64:'F6',65:'F7',66:'F8',67:'F9',68:'F10',69:'NumLock',70:'ScrollLock',71:'Numpad7',72:'Numpad8',73:'Numpad9',74:'NumpadSubtract',75:'Numpad4',76:'Numpad5',77:'Numpad6',78:'NumpadAdd',79:'Numpad1',80:'Numpad2',81:'Numpad3',82:'Numpad0',83:'NumpadDecimal',87:'F11',88:'F12'
  };
  const extended = {28:'NumpadEnter',29:'ControlRight',53:'NumpadDivide',55:'PrintScreen',56:'AltRight',71:'Home',72:'ArrowUp',73:'PageUp',75:'ArrowLeft',77:'ArrowRight',79:'End',80:'ArrowDown',81:'PageDown',82:'Insert',83:'Delete',91:'MetaLeft',92:'MetaRight',93:'ContextMenu'};
  function nativeCode(scan, isExtended, vk) {
    if (vk === 19) return 'Pause';
    if (vk === 144) return 'NumLock';
    return (isExtended ? extended : normal)[scan] || null;
  }
  // The keyboard faces Miku, so its physical left half is on the screen right.
  function armSide(code, spaceSide = 0) { return code === "Space" ? spaceSide : 1 - keys.find(key => key.code === code).side; }
  const api = { armSide, keys, byCode: Object.fromEntries(keys.map(k=>[k.code,k])), width:23, height:6.25, nativeCode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PetKeyboard = api;
})(typeof window !== 'undefined' ? window : globalThis);
