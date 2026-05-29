const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_SESSIONS_DIR = path.join(os.homedir(), '.codex', 'sessions');

const STATE_BY_EVENT = {
  user_message: { state: 'thinking', intensity: 0.9 },
  reasoning: { state: 'thinking', intensity: 0.8 },
  function_call: { state: 'executing', intensity: 0.8 },
  function_call_output: { state: 'thinking', intensity: 0.75 },
  assistant_message: { state: 'responding', intensity: 0.7 },
  task_complete: { state: 'waiting', intensity: 0.5 },
  error: { state: 'error', intensity: 1.0 }
};

class CodexSessionWatcher {
  constructor(options = {}) {
    this.sessionsDir = options.sessionsDir || DEFAULT_SESSIONS_DIR;
    this.onStateChange = options.onStateChange || (() => {});
    this.pollIntervalMs = options.pollIntervalMs || 1000;
    this.scanIntervalMs = options.scanIntervalMs || 5000;
    this.quietDelayMs = options.quietDelayMs || 8000;
    this.timer = null;
    this.quietTimer = null;
    this.currentFile = null;
    this.offset = 0;
    this.pending = '';
    this.lastScanAt = 0;
    this.lastEmittedState = null;
  }

  start() {
    if (this.timer) return;

    const latest = this.findLatestSessionFile();
    if (latest) {
      this.currentFile = latest.filePath;
      this.offset = latest.size;
      console.log(`[CodexSession] Watching ${this.currentFile}`);
    } else {
      console.log(`[CodexSession] No session files found in ${this.sessionsDir}`);
    }

    this.timer = setInterval(() => this.tick(), this.pollIntervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.quietTimer) clearTimeout(this.quietTimer);
    this.timer = null;
    this.quietTimer = null;
  }

  tick() {
    try {
      this.refreshSessionFile();
      this.readAppendedLines();
    } catch (err) {
      console.warn('[CodexSession] Watch tick failed:', err.message);
    }
  }

  refreshSessionFile() {
    const now = Date.now();
    if (this.currentFile && now - this.lastScanAt < this.scanIntervalMs) return;

    this.lastScanAt = now;
    const latest = this.findLatestSessionFile();
    if (!latest) return;

    if (latest.filePath !== this.currentFile) {
      this.currentFile = latest.filePath;
      this.offset = 0;
      this.pending = '';
      this.lastEmittedState = null;
      console.log(`[CodexSession] Switched to ${this.currentFile}`);
    }
  }

  readAppendedLines() {
    if (!this.currentFile) return;

    const stat = fs.statSync(this.currentFile);
    if (stat.size < this.offset) {
      this.offset = 0;
      this.pending = '';
    }
    if (stat.size === this.offset) return;

    const fd = fs.openSync(this.currentFile, 'r');
    try {
      const length = stat.size - this.offset;
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, this.offset);
      this.offset = stat.size;
      this.consumeText(buffer.toString('utf8'));
    } finally {
      fs.closeSync(fd);
    }
  }

  consumeText(text) {
    const parts = (this.pending + text).split(/\r?\n/);
    this.pending = parts.pop() || '';

    for (const line of parts) {
      if (!line.trim()) continue;
      this.consumeLine(line);
    }
  }

  consumeLine(line) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      return;
    }

    const eventName = classifyEntry(entry);
    if (!eventName) return;

    const stateData = STATE_BY_EVENT[eventName];
    this.emitState(stateData.state, stateData.intensity);

    if (eventName === 'task_complete' || eventName === 'error') {
      this.clearQuietTimer();
    } else {
      this.scheduleQuietState();
    }
  }

  emitState(state, intensity) {
    if (this.lastEmittedState === state) return;

    this.lastEmittedState = state;
    this.onStateChange({
      state,
      intensity,
      source: 'codex',
      timestamp: Date.now()
    });
  }

  scheduleQuietState() {
    this.clearQuietTimer();
    this.quietTimer = setTimeout(() => {
      this.emitState('waiting', 0.5);
    }, this.quietDelayMs);
  }

  clearQuietTimer() {
    if (this.quietTimer) clearTimeout(this.quietTimer);
    this.quietTimer = null;
  }

  findLatestSessionFile() {
    const files = listJsonlFiles(this.sessionsDir);
    let latest = null;

    for (const filePath of files) {
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }

      if (!latest || stat.mtimeMs > latest.mtimeMs) {
        latest = { filePath, size: stat.size, mtimeMs: stat.mtimeMs };
      }
    }

    return latest;
  }
}

function classifyEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  if (entry.type === 'event_msg') {
    const type = entry.payload && entry.payload.type;
    if (type === 'user_message') return 'user_message';
    if (type === 'agent_message') return 'assistant_message';
    if (type === 'task_complete') return 'task_complete';
    if (type === 'error') return 'error';
    return null;
  }

  if (entry.type !== 'response_item') return null;

  const payload = entry.payload || {};
  if (payload.type === 'function_call') return 'function_call';
  if (payload.type === 'function_call_output') return 'function_call_output';
  if (payload.type === 'reasoning') return 'reasoning';

  if (payload.type === 'message') {
    if (payload.role === 'user') return 'user_message';
    if (payload.role === 'assistant') return 'assistant_message';
  }

  return null;
}

function listJsonlFiles(rootDir) {
  const results = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        results.push(entryPath);
      }
    }
  }

  walk(rootDir);
  return results;
}

module.exports = {
  CodexSessionWatcher,
  classifyEntry,
  listJsonlFiles
};
