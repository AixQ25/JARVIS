const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const config = require('./config');
const httpServer = require('./server');
const { CodexSessionWatcher } = require('./codex-session-watcher');

app.commandLine.appendSwitch('disable-gpu-compositing');
app.disableHardwareAcceleration();

let mainWindow;
let httpServerInstance;
let opencodeCheckInterval;
let lastOpenCodeState = false;
let codexCheckInterval;
let lastCodexState = false;
let codexSessionWatcher;

// 键盘活动检测相关
let activityCheckInterval;
let lastActivityState = false;
let lastInputTime = Date.now();
let currentStatePriority = 0; // 当前状态的优先级，用于避免低优先级覆盖高优先级

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

function emitState(state, intensity = 0.5, source = 'manual') {
  const stateData = {
    state,
    intensity,
    source,
    timestamp: Date.now()
  };

  global.currentState = stateData.state;
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-state', stateData);
  }
}

app.whenReady().then(() => {
  createWindow();

  httpServerInstance = httpServer.start(config.httpPort, (stateData) => {
    emitState(stateData.state, stateData.intensity, stateData.source || 'manual');
  });

  // 启动OpenCode进程检测
  startOpenCodeDetection();
  
  // 启动Codex进程检测
  startCodexDetection();

  // 启动Codex会话日志监听。Codex Desktop 当前不触发 config.toml hooks，
  // 所以这里主动读取本地 session jsonl 来感知用户输入和工具调用。
  startCodexSessionWatcher();

  // 启动键盘活动检测
  startActivityDetection();

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
        emitState('waiting', 0.5, 'opencode');
      } else {
        console.log('[OpenCode] Process not found → idle');
        emitState('idle', 0.5, 'opencode');
      }
    }
  });
}

app.on('window-all-closed', () => {
  if (httpServerInstance) httpServerInstance.close();
  if (opencodeCheckInterval) clearInterval(opencodeCheckInterval);
  if (codexCheckInterval) clearInterval(codexCheckInterval);
  if (codexSessionWatcher) codexSessionWatcher.stop();
  if (activityCheckInterval) clearInterval(activityCheckInterval);
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
        emitState('waiting', 0.5, 'codex');
      } else {
        console.log('[Codex] Process not found → idle');
        emitState('idle', 0.5, 'codex');
      }
    }
  });
}

function startCodexSessionWatcher() {
  console.log('[Main] Starting Codex session watcher...');

  codexSessionWatcher = new CodexSessionWatcher({
    onStateChange: (stateData) => {
      console.log(`[CodexSession] ${stateData.state} (intensity: ${stateData.intensity})`);
      emitState(stateData.state, stateData.intensity, stateData.source);
    }
  });

  codexSessionWatcher.start();
}

// 键盘活动检测
function startActivityDetection() {
  console.log('[Main] Starting activity detection...');
  
  // 每1秒检查一次用户活动
  activityCheckInterval = setInterval(() => {
    checkUserActivity();
  }, 1000);
}

function checkUserActivity() {
  // 使用PowerShell脚本文件检测键盘活动
  const scriptPath = path.join(__dirname, 'get-idle-time.ps1');
  
  exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout) => {
    if (error) {
      console.error('[Activity] PowerShell error:', error.message);
      return;
    }
    
    const result = parseInt(stdout.trim());
    
    if (isNaN(result)) {
      console.error('[Activity] Invalid result:', stdout);
      return;
    }
    
    // result为0表示键盘活动，99999表示空闲
    const isKeyboardActive = result === 0;
    
    // 状态变化时才发送
    if (isKeyboardActive !== lastActivityState) {
      lastActivityState = isKeyboardActive;
      
      if (isKeyboardActive) {
        // 检测到键盘活动 → waiting状态
        console.log('[Activity] Keyboard active → waiting');
        emitState('waiting', 0.5, 'activity');
      } else {
        // 键盘空闲 → idle状态
        console.log('[Activity] Keyboard idle → idle');
        emitState('idle', 0.5, 'activity');
      }
    }
  });
}
