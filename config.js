module.exports = {
  // HTTP服务器配置
  httpPort: 3210,
  
  // 默认状态
  defaultState: 'idle',
  
  // 粒子总数
  particleCount: 3000,
  
  // 窗口配置
  window: {
    width: 400,
    height: 400,
    transparent: true,
    frameless: true,
    alwaysOnTop: true
  },
  
  // 状态过渡时间（毫秒）
  transitionDuration: 1000,
  
  // 粒子层级配置
  layers: {
    core: {
      enabled: true,
      particleCount: 1,
      color: { r: 1.0, g: 0.97, b: 0.88 }, // #FFF8E1
      glowColor: { r: 1.0, g: 0.84, b: 0.31 }, // #FFD54F
      size: 0.15,
      pulseSpeed: 1.5
    },
    lightRings: {
      enabled: true,
      ringCount: 4,
      particlesPerRing: 300,
      colors: [
        { r: 1.0, g: 0.7, b: 0.0 }, // #FFB300
        { r: 1.0, g: 0.56, b: 0.0 }  // #FF8F00
      ],
      tiltAngles: [15, 45, -30, 70],
      rotationSpeeds: [0.3, 0.5, 0.4, 0.6]
    },
    particleFlow: {
      enabled: true,
      particleCount: 2000,
      colors: [
        { r: 1.0, g: 0.76, b: 0.03 }, // #FFC107
        { r: 1.0, g: 0.44, b: 0.0 }   // #FF6F00
      ],
      sphereRadius: 1.2,
      flowSpeed: 0.5
    },
    energyArcs: {
      enabled: true,
      arcCount: 5,
      particlesPerArc: 100,
      color: { r: 1.0, g: 0.84, b: 0.31 }, // #FFD54F
      highlightColor: { r: 1.0, g: 1.0, b: 1.0 },
      orbitSpeed: 0.2
    },
    bottomLight: {
      enabled: true,
      particleCount: 200,
      colors: [
        { r: 0.31, g: 0.76, b: 0.97 }, // #4FC3F7
        { r: 0.08, g: 0.4, b: 0.75 }   // #1565C0
      ],
      position: { x: 0, y: -1.5, z: 0 }
    }
  },
  
  // 状态参数映射
  states: {
    idle: {
      particleSpeed: 0.3,
      colorShift: 0.0,
      ringSpeed: 0.3,
      arcSpeed: 0.2,
      bloomIntensity: 0.5,
      description: '空闲 - 粒子缓慢漂浮'
    },
    waiting: {
      particleSpeed: 0.5,
      colorShift: 0.1,
      ringSpeed: 0.4,
      arcSpeed: 0.3,
      bloomIntensity: 0.7,
      description: '等待输入 - 粒子轻微脉冲'
    },
    thinking: {
      particleSpeed: 1.2,
      colorShift: 0.3,
      ringSpeed: 1.0,
      arcSpeed: 0.8,
      bloomIntensity: 1.0,
      description: '思考中 - 粒子聚拢、旋转加速'
    },
    responding: {
      particleSpeed: 0.8,
      colorShift: 0.2,
      ringSpeed: 0.6,
      arcSpeed: 0.5,
      bloomIntensity: 0.9,
      description: '响应中 - 粒子向外扩散'
    },
    executing: {
      particleSpeed: 0.7,
      colorShift: 0.15,
      ringSpeed: 0.5,
      arcSpeed: 0.4,
      bloomIntensity: 0.7,
      description: '执行中 - 分层轨道模式'
    },
    error: {
      particleSpeed: 1.5,
      colorShift: -0.5,
      ringSpeed: 1.2,
      arcSpeed: 1.0,
      bloomIntensity: 1.2,
      flickering: true,
      description: '出错 - 粒子闪烁、变色'
    }
  }
};
