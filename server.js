const express = require('express');
const config = require('./config');

const VALID_STATES = ['idle', 'waiting', 'thinking', 'responding', 'executing', 'error'];

function start(port, onStateChange) {
  console.log(`[HTTP] Starting server on port ${port}...`);
  
  const app = express();
  
  // 解析JSON请求体
  app.use(express.json());
  
  // CORS支持
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // POST /state - 设置状态（通用接口）
  app.post('/state', (req, res) => {
    const { state, intensity, source } = req.body;
    
    // 验证状态
    if (!state || !VALID_STATES.includes(state)) {
      return res.status(400).json({ 
        error: 'Invalid state',
        validStates: VALID_STATES 
      });
    }
    
    // 验证intensity
    const validIntensity = Math.max(0, Math.min(1, intensity || 0.5));
    
    const stateData = {
      state,
      intensity: validIntensity,
      source: source || 'manual',
      timestamp: Date.now()
    };
    
    // 触发回调
    if (onStateChange) {
      onStateChange(stateData);
    }
    
    console.log(`[State] ${state} (intensity: ${validIntensity}, source: ${stateData.source})`);
    res.json({ ok: true });
  });

  // ========== Claude Code Hook 端点 ==========
  
  // POST /hooks/prompt-submit - 用户提交prompt
  app.post('/hooks/prompt-submit', (req, res) => {
    console.log('[Hook] Claude Code: prompt-submit');
    const stateData = {
      state: 'thinking',
      intensity: 0.9,
      source: 'claude',
      timestamp: Date.now()
    };
    if (onStateChange) {
      onStateChange(stateData);
    }
    res.json({ ok: true });
  });

  // POST /hooks/post-tool-use - AI使用工具
  app.post('/hooks/post-tool-use', (req, res) => {
    const { tool_name } = req.body;
    console.log(`[Hook] Claude Code: post-tool-use (${tool_name})`);
    const stateData = {
      state: 'executing',
      intensity: 0.8,
      source: 'claude',
      timestamp: Date.now()
    };
    if (onStateChange) {
      onStateChange(stateData);
    }
    res.json({ ok: true });
  });

  // POST /hooks/stop - AI完成响应
  app.post('/hooks/stop', (req, res) => {
    console.log('[Hook] Claude Code: stop');
    const stateData = {
      state: 'idle',
      intensity: 0.5,
      source: 'claude',
      timestamp: Date.now()
    };
    if (onStateChange) {
      onStateChange(stateData);
    }
    res.json({ ok: true });
  });

  // POST /hooks/stop-failure - AI出错
  app.post('/hooks/stop-failure', (req, res) => {
    console.log('[Hook] Claude Code: stop-failure');
    const stateData = {
      state: 'error',
      intensity: 1.0,
      source: 'claude',
      timestamp: Date.now()
    };
    if (onStateChange) {
      onStateChange(stateData);
    }
    res.json({ ok: true });
  });

  // GET /health - 健康检查
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'running',
      currentState: global.currentState || config.defaultState,
      uptime: process.uptime()
    });
  });

  // GET /config - 获取配置
  app.get('/config', (req, res) => {
    res.json({
      port: port,
      defaultState: config.defaultState,
      particleCount: config.particleCount,
      windowSize: config.window
    });
  });

  // 启动服务器
  console.log(`[HTTP] Calling listen on port ${port}...`);
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[HTTP] Server running on port ${port}`);
    console.log(`[HTTP] POST http://localhost:${port}/state`);
    console.log(`[HTTP] GET  http://localhost:${port}/health`);
  });

  // 处理端口占用
  server.on('error', (err) => {
    console.error('[HTTP] Server error event:', err);
    if (err.code === 'EADDRINUSE') {
      console.warn(`[HTTP] Port ${port} in use, trying ${port + 1}`);
      server.close();
      // 尝试下一个端口
      return start(port + 1, onStateChange);
    }
    console.error('[HTTP] Server error:', err);
  });
  
  // 添加连接事件处理
  server.on('connection', (socket) => {
    console.log('[HTTP] New connection');
  });

  return server;
}

module.exports = { start };
