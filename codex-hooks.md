# Codex-JARVIS 集成配置

## 工作原理

Codex CLI 不支持 HTTP Hook，只支持 Command Hook。因此需要一个桥接脚本作为中间层：

```
Codex Hook → codex-bridge.js → HTTP POST → JARVIS (localhost:3210)
```

## 配置步骤

### 1. 确认桥接脚本位置

桥接脚本位于 JARVIS 项目目录：`F:\vibe coding\apps\JARVIS\codex-bridge.js`

### 2. 配置 Codex Hooks

在 `~/.codex/config.toml` 中添加以下配置：

```toml
[hooks]
enabled = true

[[hooks.UserPromptSubmit]]
hooks = [
  { type = "command", command = "node F:/vibe coding/apps/JARVIS/codex-bridge.js UserPromptSubmit", timeout_sec = 10 }
]

[[hooks.PostToolUse]]
matcher = "Bash|Edit|Write"
hooks = [
  { type = "command", command = "node F:/vibe coding/apps/JARVIS/codex-bridge.js PostToolUse", timeout_sec = 10 }
]

[[hooks.Stop]]
hooks = [
  { type = "command", command = "node F:/vibe coding/apps/JARVIS/codex-bridge.js Stop", timeout_sec = 10 }
]

[[hooks.SubagentStart]]
hooks = [
  { type = "command", command = "node F:/vibe coding/apps/JARVIS/codex-bridge.js SubagentStart", timeout_sec = 10 }
]

[[hooks.SubagentStop]]
hooks = [
  { type = "command", command = "node F:/vibe coding/apps/JARVIS/codex-bridge.js SubagentStop", timeout_sec = 10 }
]
```

### 3. 重启 Codex

配置完成后重启 Codex CLI 使配置生效。

## 状态映射

| Codex 事件 | JARVIS 状态 | 说明 |
|------------|-------------|------|
| SessionStart | waiting | 会话开始 |
| UserPromptSubmit | thinking | 用户提交 prompt |
| PreToolUse | executing | 工具执行前 |
| PostToolUse | executing | 工具执行后 |
| Stop | idle | 响应完成 |
| SubagentStart | thinking | 子任务开始 |
| SubagentStop | idle | 子任务完成 |

## 进程检测

JARVIS 会每 3 秒检测一次 `codex.exe` 进程：

- 进程存在 → waiting（就绪等待输入）
- 进程不存在 → idle

## 注意事项

1. JARVIS 必须在运行状态才能接收 Hook（端口 3210）
2. 如果 JARVIS 没运行，桥接脚本会静默失败，不影响 Codex 正常工作
3. 桥接脚本使用 Node.js 运行，确保 Node.js 在系统 PATH 中
4. 配置路径使用正斜杠 `/`，不要使用反斜杠 `\`

## 故障排查

### Hook 没有触发

1. 检查 `~/.codex/config.toml` 配置是否正确
2. 检查桥接脚本路径是否正确
3. 手动运行 `node F:/vibe coding/apps/JARVIS/codex-bridge.js Stop` 测试

### JARVIS 没有反应

1. 检查 JARVIS 是否在运行：`curl http://localhost:3210/health`
2. 检查端口 3210 是否被占用
3. 查看 JARVIS 控制台日志
