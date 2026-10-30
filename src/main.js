'use strict';

const { app, BrowserWindow, ipcMain, Menu, screen, dialog, Tray, nativeImage, powerMonitor } = require('electron');
const path = require('node:path');
const { Store } = require('./store');
const { windowBounds } = require('./window-state');
const { KeyboardInput } = require('./keyboard-input');

app.setName('PetClick');
const dataDirectory = !app.isPackaged && process.env.PETCLICK_TEST_DATA_DIR
  ? path.resolve(process.env.PETCLICK_TEST_DATA_DIR) : path.join(app.getPath('appData'), 'PetClick');
app.setPath('userData', dataDirectory);

let win;
let store;
let tray;
let moveTimer;
let quitting = false;
let flushed = false;
let keyboardInput;

function appState() { return { ...store.snapshot(), keyboard: keyboardInput?.snapshot() || { enabled: false, ready: false, error: null } }; }

function showPet() {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function applyBounds() {
  win.setBounds(windowBounds(store.state, screen.getAllDisplays(), screen.getPrimaryDisplay()));
}

function rememberPosition() {
  if (!win || win.isDestroyed()) return;
  const { x, y } = win.getBounds();
  if (store.state.position?.x !== x || store.state.position?.y !== y) store.settings({ position: { x, y } });
}

function contextMenu() {
  return Menu.buildFromTemplate([
    { label: `累计 ${store.state.count.toLocaleString('zh-CN')} 次`, enabled: false },
    { type: 'separator' },
    { label: '显示桌宠', click: showPet },
    { label: '始终置顶', type: 'checkbox', checked: store.state.alwaysOnTop, click: (item) => {
      store.settings({ alwaysOnTop: item.checked });
      win.setAlwaysOnTop(item.checked);
    } },
    { label: '键盘联动', type: 'checkbox', checked: store.state.keyboardEnabled !== false, click: (item) => {
      store.settings({ keyboardEnabled: item.checked });
      if (item.checked) keyboardInput.start(); else keyboardInput.stop();
    } },
    { label: '移回屏幕右下角', click: () => { store.settings({ position: null }); applyBounds(); } },
    { type: 'separator' },
    { label: '退出 PetClick', click: () => app.quit() }
  ]);
}

function broadcast() {
  if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send('pet:state', appState());
}

function registerIpc() {
  const trusted = (event) => event.sender === win?.webContents && event.senderFrame === win.webContents.mainFrame;
  ipcMain.handle('pet:read', (event) => { if (trusted(event)) return appState(); });
  ipcMain.handle('pet:increment', (event) => {
    if (!trusted(event)) throw new Error('无效请求');
    store.increment();
    return appState();
  });
  ipcMain.on('pet:menu', (event) => { if (trusted(event)) contextMenu().popup({ window: win }); });
}

async function createWindow() {
  store = new Store(dataDirectory);
  await store.load();
  keyboardInput = new KeyboardInput(app.isPackaged
    ? path.join(process.resourcesPath, 'native/PetClick.Keyboard.exe')
    : path.join(__dirname, '../native/bin/PetClick.Keyboard.exe'));
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    ...windowBounds(store.state, screen.getAllDisplays(), screen.getPrimaryDisplay()),
    title: 'PetClick', transparent: true, backgroundColor: '#00000000', frame: false,
    resizable: false, maximizable: false, fullscreenable: false, hasShadow: false,
    alwaysOnTop: store.state.alwaysOnTop, show: false, skipTaskbar: true,
    icon: path.join(__dirname, '../assets/app-icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, backgroundThrottling: false,
      devTools: !app.isPackaged
    }
  });
  registerIpc();
  store.on('change', broadcast);
  keyboardInput.on('status', broadcast);
  const sendKey = (data) => { if (!win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send('pet:key', data); };
  keyboardInput.on('key', (data) => sendKey({ type: 'key', ...data }));
  keyboardInput.on('reset', () => sendKey({ type: 'reset' }));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.on('move', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(rememberPosition, 250);
  });
  win.once('ready-to-show', () => win.showInactive());
  win.on('close', () => { clearTimeout(moveTimer); rememberPosition(); });
  screen.on('display-removed', applyBounds);
  screen.on('display-metrics-changed', applyBounds);
  await win.loadFile(path.join(__dirname, 'index.html'));
  if (store.state.keyboardEnabled !== false) keyboardInput.start();
  const resumeKeyboard = () => { if (store.state.keyboardEnabled !== false) keyboardInput.start(); };
  powerMonitor.on('suspend', () => keyboardInput.stop());
  powerMonitor.on('lock-screen', () => keyboardInput.stop());
  powerMonitor.on('resume', resumeKeyboard);
  powerMonitor.on('unlock-screen', resumeKeyboard);
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '../assets/app-icon.ico')).resize({ width: 24 }));
  tray.setToolTip('PetClick · 拍一下，记一下');
  tray.on('click', showPet);
  tray.on('right-click', () => contextMenu().popup());
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', showPet);
  app.whenReady().then(createWindow).catch((error) => {
    dialog.showErrorBox('PetClick 启动失败', `无法启动桌宠。已有存档不会被清空。\n\n${error.message}`);
    app.exit(1);
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', (event) => {
    if (!store || flushed) return;
    event.preventDefault();
    if (quitting) return;
    quitting = true;
    clearTimeout(moveTimer);
    rememberPosition();
    store.flush().then((state) => {
      if (!state.saved) {
        const answer = dialog.showMessageBoxSync(win, {
          type: 'warning', title: '还有次数未保存',
          message: '存档暂时写不进去，退出会丢失尚未保存的次数。',
          detail: `本次累计：${state.count}\n${state.error || ''}\n可先保持运行，程序会自动重试。`,
          buttons: ['继续运行', '仍然退出'], defaultId: 0, cancelId: 0
        });
        if (answer === 0) { quitting = false; return; }
      }
      flushed = true;
      keyboardInput?.stop();
      store.dispose();
      tray?.destroy();
      app.quit();
    });
  });
}
