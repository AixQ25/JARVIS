#!/usr/bin/env node
/**
 * Codex-JARVIS Bridge
 * 
 * 桥接脚本：接收Codex hooks的command调用，转发HTTP请求到JARVIS
 * 
 * 用法：node codex-bridge.js <EventName>
 * Codex通过stdin传入JSON，脚本通过stdout返回JSON
 */

const http = require('http');

// 从命令行参数获取事件名
const eventName = process.argv[2];

if (!eventName) {
  process.stdout.write('{}');
  process.exit(0);
}

// 事件到状态的映射
const STATE_MAP = {
  'SessionStart': 'waiting',
  'UserPromptSubmit': 'thinking',
  'PreToolUse': 'executing',
  'PostToolUse': 'executing',
  'Stop': 'idle',
  'SubagentStop': 'idle',
  'SubagentStart': 'thinking'
};

// 事件到强度的映射
const INTENSITY_MAP = {
  'SessionStart': 0.5,
  'UserPromptSubmit': 0.9,
  'PreToolUse': 0.7,
  'PostToolUse': 0.7,
  'Stop': 0.5,
  'SubagentStop': 0.5,
  'SubagentStart': 0.8
};

const state = STATE_MAP[eventName] || 'waiting';
const intensity = INTENSITY_MAP[eventName] || 0.5;

// 从stdin读取Codex传入的JSON
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  // 构造状态数据
  const postData = JSON.stringify({
    state,
    intensity,
    source: 'codex',
    timestamp: Date.now()
  });

  // 发送HTTP请求到JARVIS。JARVIS 端口被占用时会自动切到后续端口，
  // 所以桥接脚本也要按同样顺序尝试。
  const ports = [3210, 3211, 3212, 3213, 3214, 3215];
  postToJarvis(ports, postData);
});

function postToJarvis(ports, postData) {
  const [port, ...rest] = ports;
  if (!port) {
    // JARVIS没运行，静默失败
    process.stdout.write('{}');
    process.exit(0);
  }

  const req = http.request({
    hostname: 'localhost',
    port,
    path: '/state',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 1000
  }, () => {
    process.stdout.write('{}');
    process.exit(0);
  });

  req.on('error', () => {
    postToJarvis(rest, postData);
  });

  req.on('timeout', () => {
    req.destroy();
    postToJarvis(rest, postData);
  });

  req.write(postData);
  req.end();
}
