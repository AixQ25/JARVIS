const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const config = require('./config');
const httpServer = require('./server');

app.commandLine.appendSwitch('disable-gpu-compositing');
app.disableHardwareAcceleration();

let mainWindow;
let httpServerInstance;
let opencodeCheckInterval;
let lastOpenCodeState = false;
let codexCheckInterval;
let lastCodexState = false;

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught:', err);
});

function createWindow() {
  console.log('[Main] Creating window...');
  const { width, height } = config.window;

  mainWindow = new BrowserWindow({
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer/index.html');
  mainWindow.center();

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('[Renderer] Load failed:', code, desc);
  });

  mainWindow.webContents.on('console-message', (e, level, msg) => {
    console.log('[Renderer]', msg);
  });

  console.log('[Main] Window created');
}

app.whenReady().then(() => {
  createWindow();

  httpServerInstance = httpServer.start(config.httpPort, (stateData) => {
    global.currentState = stateData.state;
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-state', stateData);
    }
  });

  // 启动OpenCode进程检测
  startOpenCodeDetection();
  
  // 启动Codex进程检测
  startCodexDetection();

  console.log('[Main] App ready');
}).catch(err => console.error('[Main] Failed:', err));

// OpenCode进程检测
function startOpenCodeDetection() {
  console.log('[Main] Starting OpenCode process detection...');
  
  opencodeCheckInterval = setInterval(() => {
    checkOpenCodeProcess();
  }, 3000);
  
  // 立即检查一次
  checkOpenCodeProcess();
}

function checkOpenCodeProcess() {
  // Windows: tasklist检查opencode.exe
  exec('tasklist /FI "IMAGENAME eq opencode.exe" /NH', (error, stdout) => {
    if (error) {
      // 命令执行失败，忽略
      return;
    }
    
    const isRunning = stdout.includes('opencode.exe');
    
    // 状态变化时才发送
    if (isRunning !== lastOpenCodeState) {
      lastOpenCodeState = isRunning;
      
      if (isRunning) {
        console.log('[OpenCode] Process detected → waiting');
        const stateData = {
          state: 'waiting',
          intensity: 0.5,
          source: 'opencode',
          timestamp: Date.now()
        };
        global.currentState = stateData.state;
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('update-state', stateData);
        }
      } else {
        console.log('[OpenCode] Process not found → idle');
        const stateData = {
          state: 'idle',
          intensity: 0.5,
          source: 'opencode',
          timestamp: Date.now()
        };
        global.currentState = stateData.state;
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('update-state', stateData);
        }
      }
    }
  });
}

app.on('window-all-closed', () => {
  if (httpServerInstance) httpServerInstance.close();
  if (opencodeCheckInterval) clearInterval(opencodeCheckInterval);
  if (codexCheckInterval) clearInterval(codexCheckInterval);
  app.quit();
});

// Codex进程检测
function startCodexDetection() {
  console.log('[Main] Starting Codex process detection...');
  
  codexCheckInterval = setInterval(() => {
    checkCodexProcess();
  }, 3000);
  
  // 立即检查一次
  checkCodexProcess();
}

function checkCodexProcess() {
  // Windows: tasklist检查codex.exe
  exec('tasklist /FI "IMAGENAME eq codex.exe" /NH', (error, stdout) => {
    if (error) {
      // 命令执行失败，忽略
      return;
    }
    
    const isRunning = stdout.includes('codex.exe');
    
    // 状态变化时才发送
    if (isRunning !== lastCodexState) {
      lastCodexState = isRunning;
      
      if (isRunning) {
        console.log('[Codex] Process detected → waiting');
        const stateData = {
          state: 'waiting',
          intensity: 0.5,
          source: 'codex',
          timestamp: Date.now()
        };
        global.currentState = stateData.state;
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('update-state', stateData);
        }
      } else {
        console.log('[Codex] Process not found → idle');
        const stateData = {
          state: 'idle',
          intensity: 0.5,
          source: 'codex',
          timestamp: Date.now()
        };
        global.currentState = stateData.state;
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('update-state', stateData);
        }
      }
    }
  });
}
