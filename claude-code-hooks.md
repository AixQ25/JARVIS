# Claude Code Hook 配置

将以下内容添加到你的 `~/.claude/settings.json` 文件中：

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:3210/hooks/prompt-submit",
            "timeout": 10
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:3210/hooks/stop",
            "timeout": 30
          }
        ]
      }
    ],
    "StopFailure": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:3210/hooks/stop-failure",
            "timeout": 30
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash|Edit|Write",
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:3210/hooks/post-tool-use",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## 状态映射

| Claude Code 事件 | JARVIS 状态 | 说明 |
|-----------------|-------------|------|
| UserPromptSubmit | thinking | 用户提交了 prompt，AI 开始思考 |
| PostToolUse (Bash) | executing | AI 在执行命令 |
| PostToolUse (Edit/Write) | executing | AI 在修改文件 |
| Stop | idle | AI 完成响应 |
| StopFailure | error | AI 遇到错误 |

## 注意事项

1. JARVIS 必须在运行状态才能接收 Hook（端口 3210）
2. 如果 JARVIS 没运行，Hook 会静默失败，不影响 Claude Code 正常工作
3. 可以通过 `GET http://localhost:3210/health` 检查 JARVIS 是否在运行
