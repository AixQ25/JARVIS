# Codex-JARVIS 集成说明

## 工作原理

当前 Codex Desktop 没有实际触发 `~/.codex/config.toml` 中的 `[hooks]` 配置。JARVIS 因此采用主动监听方案：

```
Codex Desktop → ~/.codex/sessions/**/*.jsonl → codex-session-watcher.js → JARVIS 状态
```

JARVIS 启动后会：

- 检测 `codex.exe` 进程是否存在，存在则进入 `waiting`
- 监听最新 Codex 会话日志追加内容
- 用户提交消息时进入 `thinking`
- 工具调用时进入 `executing`
- Assistant 输出文本时进入 `responding`
- 任务完成或一段时间无新日志后回到 `waiting`

## 状态映射

| Codex 日志事件 | JARVIS 状态 | 说明 |
|----------------|-------------|------|
| `role: "user"` / `user_message` | thinking | 用户提交 prompt |
| `payload.type: "reasoning"` | thinking | Agent 正在思考 |
| `payload.type: "function_call"` | executing | 工具执行开始 |
| `payload.type: "function_call_output"` | thinking | 工具返回后继续处理 |
| `role: "assistant"` / `agent_message` | responding | Agent 正在输出 |
| `task_complete` | waiting | 当前回合完成 |

## Hook 桥接脚本

`codex-bridge.js` 仍然保留，作用是兼容未来或其他环境里可用的 command hook。它会按 `3210-3215` 顺序尝试把事件转发到 JARVIS 的 `/state` 接口。

如果某个 Codex 版本真正支持 command hook，可以继续使用：

```powershell
node F:/vibe coding/apps/JARVIS/codex-bridge.js UserPromptSubmit
node F:/vibe coding/apps/JARVIS/codex-bridge.js PreToolUse
node F:/vibe coding/apps/JARVIS/codex-bridge.js Stop
```

## 故障排查

### JARVIS 没有反应

1. 检查 JARVIS 是否在运行：`Invoke-WebRequest http://127.0.0.1:3210/health`
2. 如果 `3210` 不通，检查 `3211-3215`，JARVIS 端口被占用时会自动后移
3. 检查 `C:\Users\AixQ\.codex\sessions` 下最新 `.jsonl` 是否在当前对话中持续更新
4. 手动测试桥接脚本：`node F:/vibe coding/apps/JARVIS/codex-bridge.js UserPromptSubmit`

### 监听延迟

日志监听默认每秒检查一次，长时间没有新日志后会自动回到 `waiting`。这是主动监听方案的正常行为。
