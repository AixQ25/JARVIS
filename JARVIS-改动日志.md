# JARVIS Desktop Pet 改动日志

日期：2026-05-29

## 项目初始化

- 创建 Electron + Three.js 桌面宠物应用
- 目标：用粒子特效可视化 AI 状态，类似钢铁侠中 JARVIS 的视觉效果
- 纯视觉装饰，无交互功能，状态通过 HTTP API 外部驱动

## 技术栈确定

- Electron 28：桌面窗口管理
- Three.js 0.160：3D 粒子渲染
- Express：HTTP REST API 服务
- 平台：Windows 桌面端

## 窗口行为实现

- 400x400px 透明无边框窗口
- 始终置顶、不可调整大小
- 支持拖拽移动
- 右键菜单（退出功能）

## 粒子系统实现

### 5层粒子结构
1. **Core（核心）**：中心发光球体 + 光晕层，金色调
2. **Light Rings（光环层）**：4个不同倾斜角度的粒子环，300粒子/环
3. **Particle Flow（粒子流层）**：2000粒子分布在球面，沿切线方向流动
4. **Energy Arcs（能量弧层）**：5条弧形粒子轨道，100粒子/弧
5. **Bottom Light（底部冷光）**：200个蓝调粒子，提供视觉对比

### 纹理系统
- Canvas 生成径向渐变纹理（中心白→边缘透明）
- 使用 AdditiveBlending 实现发光叠加效果

## 状态映射实现

6种状态，数字键1-6快速切换：

| 状态 | 粒子速度 | 颜色偏移 | 环速度 | 弧速度 | Bloom | 闪烁 |
|------|----------|----------|--------|--------|-------|------|
| idle (1) | 0.3 | 0.0 | 0.3 | 0.2 | 0.5 | - |
| waiting (2) | 0.5 | 0.1 | 0.4 | 0.3 | 0.7 | - |
| thinking (3) | 1.2 | 0.3 | 1.0 | 0.8 | 1.0 | - |
| responding (4) | 0.8 | 0.2 | 0.6 | 0.5 | 0.9 | - |
| executing (5) | 0.7 | 0.15 | 0.5 | 0.4 | 0.7 | - |
| error (6) | 1.5 | -0.5 | 1.2 | 1.0 | 1.2 | ✓ |

### 状态过渡
- 使用 easeInOutCubic 缓动函数
- 默认过渡时间 0.8秒，error 状态 0.3秒快速切换
- 所有参数线性插值，无跳变

## HTTP API

- 端口：3210（可配置）
- `POST /state`：设置状态，支持 intensity 参数（0-1）
- `GET /health`：健康检查，返回当前状态和运行时间
- `GET /config`：获取配置信息

## 关键问题解决

### 透明背景问题
- **问题**：Electron 窗口背景默认黑色
- **解决**：
  - BrowserWindow 添加 `backgroundColor: '#00000000'`
  - main.js 添加 `app.commandLine.appendSwitch('disable-gpu-compositing')`

### EffectComposer 冲突
- **问题**：Three.js EffectComposer 会破坏 alpha 通道，导致背景变黑
- **解决**：放弃后处理，直接使用 `renderer.render(scene, camera)`
- 发光效果改用 CSS `filter: brightness(1.2) contrast(1.1)` 模拟

### 粒子不可见
- **问题**：粒子尺寸太小（0.02-0.03），在透明背景上不可见
- **解决**：增大粒子尺寸到 0.06-0.1，提高透明度到 0.7-1.0

## 文件结构

```
jarvis-desktop-pet/
├── main.js              # Electron 主进程
├── preload.js           # IPC 桥接
├── server.js            # HTTP REST API
├── config.js            # 配置文件
├── package.json
└── renderer/
    ├── index.html       # 透明窗口入口
    └── app.js           # Three.js 场景 + 粒子系统
```

## 当前状态

- ✅ 透明背景正常工作
- ✅ 5层粒子清晰可见
- ✅ 6种状态切换正常
- ✅ HTTP API 响应正常
- ⚠️ 无 Bloom 后处理（与透明背景冲突）
- ⚠️ 粒子效果相对简陋，等待用户提供暖色参考图

## 待办

- [ ] 用户提供暖色参考图后调整配色
- [ ] 优化粒子动画细节
- [ ] 考虑替代 Bloom 方案（CSS filter 或自定义 shader）
- [ ] 系统托盘集成
- [ ] 开机自启动

---

## AI Agent 集成（2026-05-29）

### Claude Code 集成（HTTP Hook）

JARVIS 新增 4 个 Hook 端点，接收 Claude Code 的事件推送：

| 端点 | 触发时机 | JARVIS 状态 |
|------|----------|-------------|
| `POST /hooks/prompt-submit` | 用户提交 prompt | thinking |
| `POST /hooks/post-tool-use` | AI 使用工具（Bash/Edit/Write） | executing |
| `POST /hooks/stop` | AI 完成响应 | idle |
| `POST /hooks/stop-failure` | AI 出错 | error |

配置方式：在 `~/.claude/settings.json` 中添加 hooks 配置，详见 `claude-code-hooks.md`。

### OpenCode 集成（进程检测）

通过定时检测 `opencode.exe` 进程是否存在来判断状态：

- 进程存在 → waiting（就绪等待输入）
- 进程不存在 → idle

精度有限，只能知道 OpenCode 是否在运行，无法区分思考/空闲。

### 状态优先级管理

新增状态来源标记（manual/claude/opencode）和优先级机制：

- 优先级：error (6) > executing (5) > thinking (4) > responding (3) > waiting (2) > idle (1)
- 高优先级状态总是覆盖低优先级
- 同优先级时，最新来源覆盖旧来源
- 手动（数字键）总是覆盖自动状态

### 文件变动

- `server.js`：新增 4 个 Hook 端点，状态数据增加 source 字段
- `main.js`：新增 OpenCode 进程检测（每 3 秒轮询）
- `renderer/app.js`：StateManager 增加来源和优先级逻辑
- `claude-code-hooks.md`：Claude Code Hook 配置说明

---

## 全息核心视觉重写（2026-05-29）

### 形态重构

基于用户提供的详细视觉描述，完全重写粒子系统：

- **机械瞳孔核心**：TorusGeometry圆环体 + 14个虹膜叶片 + 8条径向线
- **HUD瞄准结构**：5层带刻度的瞄准环 + 3个十字准星 + 3个半透明圆盘
- **放射状电路网络**：4层壳分布(0.2/0.4/0.65/0.9) + Bezier曲线连接 + 40个数据节点
- **数据弧线**：12条弧线用gapPattern定义断裂位置
- **粒子流场**：2000粒子，绕Y轴切向运动 + 小幅上下浮动
- **能量闪烁**：Sprite闪烁效果，随机位置出现

### 视觉描述文档

新增 `docs/visual-description.md`，记录完整的外观描述：

- 核心：机械瞳孔式核心，白金色能量核心
- 结构：破碎、不连续、层层嵌套的球形
- 颜色：高亮金橙色、琥珀色、熔金色
- 材质：全息投影 + 光子结构
- 动态：所有线条缓慢流动，像"活着的AI系统"

---

## 性能优化（2026-05-29）

### CPU占用降低80%

| 优化项 | 效果 |
|--------|------|
| 数学优化：sqrt改平方比较 | 每帧省2000次sqrt |
| 降低更新频率：电路线每3帧更新 | CPU省30% |
| 对象池化：flickerSprites预创建复用 | 避免频繁创建/销毁 |
| 条件needsUpdate | 粒子不动时跳过GPU上传 |
| 粒子数量：2000→800 | 渲染负载降低60% |
| 电路节点：40→20 | 线条数量降低50% |
| 数据弧线：12→8条 | 渲染对象减少33% |
| 帧率限制：60fps→30fps | CPU省50% |

**效果**：CPU从10秒/秒降到2秒/秒

---

## 状态映射重写（2026-05-29）

### 新状态视觉特征

| 状态 | 核心 | 粒子 | 电路线 | 整体感觉 |
|------|------|------|--------|----------|
| idle | 微弱呼吸 | 极缓慢漂移 | 暗淡 | 休眠 |
| waiting | 呼吸脉动 | 开始运动 | 逐渐亮起 | 唤醒 |
| thinking | 高亮稳定 | 有序高速旋转 | 全亮 | 高效计算 |
| responding | 中等亮度 | 向外扩散 | 脉冲波 | 输出中 |
| executing | 脉动节奏 | 有节奏脉动 | 闪烁 | 执行中 |
| error | 变色闪烁 | 混沌发散 | 全亮 | 异常 |

### 关键改进

- 拉大各状态参数差异（idle→waiting差异从0.2→0.3）
- 去掉updateFull限制，状态变化立即生效
- 新增呼吸效果（waiting 1.5Hz）、脉动效果（executing）、混沌效果（error）
- 旋转速度整体提升1.5倍
- 新增参数：breathAmp（呼吸幅度）、breathFreq（呼吸频率）、chaos（混沌程度）、outward（扩散力）、pulse（脉动强度）

---

