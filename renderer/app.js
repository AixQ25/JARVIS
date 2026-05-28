import * as THREE from 'three';

console.log('[JARVIS] Starting...');

// ==================== State Manager ====================
const STATE_PARAMS = {
  idle:       { coreGlow: 0.3, arcSpeed: 0.2, circuitBright: 0.2, pulseRate: 0.002, scanSpeed: 0.3, particleSpeed: 0.3, flickering: false },
  waiting:    { coreGlow: 0.5, arcSpeed: 0.4, circuitBright: 0.4, pulseRate: 0.005, scanSpeed: 0.5, particleSpeed: 0.5, flickering: false },
  thinking:   { coreGlow: 1.0, arcSpeed: 1.0, circuitBright: 0.8, pulseRate: 0.02,  scanSpeed: 1.2, particleSpeed: 1.2, flickering: false },
  responding: { coreGlow: 0.7, arcSpeed: 0.6, circuitBright: 0.6, pulseRate: 0.01,  scanSpeed: 0.7, particleSpeed: 0.8, flickering: false },
  executing:  { coreGlow: 0.6, arcSpeed: 0.5, circuitBright: 0.7, pulseRate: 0.008, scanSpeed: 0.6, particleSpeed: 0.7, flickering: false },
  error:      { coreGlow: 1.2, arcSpeed: 1.5, circuitBright: 1.0, pulseRate: 0.03,  scanSpeed: 1.5, particleSpeed: 1.5, flickering: true  }
};

const STATE_PRIORITY = {
  idle: 1, waiting: 2, responding: 3, thinking: 4, executing: 5, error: 6
};

class StateManager {
  constructor() {
    this.current = { ...STATE_PARAMS.idle };
    this.target = { ...STATE_PARAMS.idle };
    this.from = { ...STATE_PARAMS.idle };
    this.progress = 1.0;
    this.duration = 1.0;
    this.intensity = 0.5;
    this.currentStateName = 'idle';
    this.source = 'manual';
    this.sourceTimestamp = 0;
  }

  setState(state, intensity = 0.5, source = 'manual') {
    if (!STATE_PARAMS[state]) return;
    const newPriority = STATE_PRIORITY[state] || 0;
    const currentPriority = STATE_PRIORITY[this.currentStateName] || 0;
    const shouldUpdate = newPriority > currentPriority || 
      (newPriority === currentPriority && source === this.source) ||
      source === 'manual';
    if (!shouldUpdate) return;
    
    this.from = { ...this.current };
    this.target = { ...STATE_PARAMS[state] };
    this.progress = 0.0;
    this.intensity = intensity;
    this.duration = state === 'error' ? 0.3 : 0.8;
    this.currentStateName = state;
    this.source = source;
    this.sourceTimestamp = Date.now();
    console.log(`[State] -> ${state} (source: ${source})`);
  }

  update(dt) {
    if (this.progress < 1.0) {
      this.progress = Math.min(1.0, this.progress + dt / this.duration);
      const t = this.progress < 0.5
        ? 4 * this.progress * this.progress * this.progress
        : 1 - Math.pow(-2 * this.progress + 2, 3) / 2;
      for (const k in this.current) {
        if (k === 'flickering') {
          this.current[k] = t > 0.5 ? this.target[k] : this.from[k];
        } else {
          this.current[k] = this.from[k] + (this.target[k] - this.from[k]) * t;
        }
      }
    }
    return { ...this.current };
  }
}

// ==================== Textures ====================
function makeGlowTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.5, 'rgba(255,220,150,0.3)');
  g.addColorStop(1, 'rgba(255,180,50,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeOverexposedTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g1 = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g1.addColorStop(0, 'rgba(255,255,255,1)');
  g1.addColorStop(0.1, 'rgba(255,255,255,0.9)');
  g1.addColorStop(0.3, 'rgba(255,230,180,0.4)');
  g1.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// ==================== Holographic Core System ====================
class JarvisCore {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    
    this.tex = makeGlowTexture();
    this.overexposedTex = makeOverexposedTexture();
    
    // Layers
    this.coreStar = null;
    this.coreGlowLayers = [];
    this.holoWireframes = [];
    this.brokenArcs = [];
    this.scanRings = [];
    this.circuitLines = [];
    this.dataNodes = [];
    this.flowParticles = null;
    this.flowData = null;
    this.energyPulses = [];
    this.energyBursts = [];
    this.bottomLight = null;
    
    this.time = 0;
    this.init();
  }

  init() {
    this.createCoreStar();
    this.createHoloWireframes();
    this.createBrokenArcs();
    this.createScanRings();
    this.createCircuitNetwork();
    this.createFlowParticles();
    this.createBottomLight();
  }

  // ========== 1. Core Star (白金色恒星核心) ==========
  createCoreStar() {
    // 中心极亮小点
    const coreGeo = new THREE.SphereGeometry(0.04, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 1.0
    });
    this.coreStar = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.coreStar);

    // 中心Sprite光晕（最关键的发光感）
    const spriteMat = new THREE.SpriteMaterial({
      map: this.overexposedTex,
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.coreSprite = new THREE.Sprite(spriteMat);
    this.coreSprite.scale.setScalar(0.5);
    this.group.add(this.coreSprite);

    // 多层球形光晕
    const glowLayers = [
      { size: 0.08, color: 0xFFFDE7, opacity: 0.8 },
      { size: 0.15, color: 0xFFF8E1, opacity: 0.5 },
      { size: 0.25, color: 0xFFD54F, opacity: 0.3 },
      { size: 0.4,  color: 0xFFB300, opacity: 0.15 },
      { size: 0.6,  color: 0xFF8F00, opacity: 0.08 }
    ];

    for (const layer of glowLayers) {
      const geo = new THREE.SphereGeometry(layer.size, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Mesh(geo, mat);
      this.coreGlowLayers.push(glow);
      this.group.add(glow);
    }
  }

  // ========== 2. Holographic Wireframes (全息线框) ==========
  createHoloWireframes() {
    // 内层二十面体线框
    const innerGeo = new THREE.IcosahedronGeometry(0.6, 1);
    const innerEdges = new THREE.EdgesGeometry(innerGeo);
    const innerMat = new THREE.LineBasicMaterial({
      color: 0xFFB300,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const innerWire = new THREE.LineSegments(innerEdges, innerMat);
    innerWire.userData = { speed: 0.2, direction: 1 };
    this.holoWireframes.push(innerWire);
    this.group.add(innerWire);

    // 外层更稀疏线框
    const outerGeo = new THREE.IcosahedronGeometry(1.0, 0);
    const outerEdges = new THREE.EdgesGeometry(outerGeo);
    const outerMat = new THREE.LineBasicMaterial({
      color: 0xFF8F00,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const outerWire = new THREE.LineSegments(outerEdges, outerMat);
    outerWire.userData = { speed: 0.15, direction: -1 };
    this.holoWireframes.push(outerWire);
    this.group.add(outerWire);
  }

  // ========== 3. Broken Arcs (断裂弧线) ==========
  createBrokenArcs() {
    // 每条弧线：完整圆弧 + 有规律地跳过若干段
    const arcConfigs = [
      { r: 0.7, tilt: 20, segments: 4, gapRatio: 0.25 },
      { r: 0.8, tilt: 55, segments: 5, gapRatio: 0.2 },
      { r: 0.9, tilt: -25, segments: 3, gapRatio: 0.3 },
      { r: 1.0, tilt: 70, segments: 4, gapRatio: 0.25 },
      { r: 1.1, tilt: 40, segments: 5, gapRatio: 0.2 },
      { r: 1.2, tilt: -50, segments: 3, gapRatio: 0.3 },
      { r: 1.3, tilt: 15, segments: 4, gapRatio: 0.25 },
    ];

    for (const cfg of arcConfigs) {
      const orbitR = cfg.r;
      const tilt = cfg.tilt * Math.PI / 180;
      const totalSegments = cfg.segments + Math.ceil(cfg.segments * cfg.gapRatio);
      const points = [];

      // 从随机起始角度开始
      const startAngle = Math.random() * Math.PI * 2;
      const segmentArc = (Math.PI * 2) / totalSegments;

      for (let s = 0; s < totalSegments; s++) {
        // 交替：绘制段 / 跳过段
        if (s % Math.round(1 / cfg.gapRatio + 1) === 0) continue;

        const segStart = startAngle + s * segmentArc;
        const segEnd = segStart + segmentArc;
        const segPoints = 25;

        for (let j = 0; j < segPoints; j++) {
          const t = j / segPoints;
          const a = segStart + t * segmentArc;
          const x = Math.cos(a) * orbitR;
          const y = Math.sin(a) * orbitR * Math.cos(tilt);
          const z = Math.sin(a) * orbitR * Math.sin(tilt);
          points.push(new THREE.Vector3(x, y, z));
        }
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const col = new Float32Array(points.length * 3);
      for (let j = 0; j < points.length; j++) {
        col[j*3]   = 1.0;
        col[j*3+1] = 0.75;
        col[j*3+2] = 0.15;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.06,
        map: this.tex,
        transparent: true,
        opacity: 0.85,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const arc = new THREE.Points(geo, mat);
      arc.userData = { tilt, speed: 0.2 + Math.random() * 0.3, orbitR };
      this.brokenArcs.push(arc);
      this.group.add(arc);
    }
  }

  // ========== 4. Scan Rings (扫描环) ==========
  createScanRings() {
    for (let i = 0; i < 2; i++) {
      const ringR = 0.9 + i * 0.3;
      const n = 200;
      const points = [];
      const colors = [];

      for (let j = 0; j < n; j++) {
        const t = j / n;
        const a = t * Math.PI * 2;
        // 断点效果
        const gap = Math.sin(t * 15) > 0.2 ? 1.0 : 0.0;
        if (gap > 0) {
          points.push(new THREE.Vector3(
            Math.cos(a) * ringR,
            Math.sin(a) * ringR * 0.1,
            Math.sin(a) * ringR
          ));
          // 亮斑
          const bright = Math.pow(Math.sin(t * Math.PI * 3), 2);
          colors.push(1.0, 0.85 + bright * 0.15, 0.3 + bright * 0.5);
        }
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.03,
        map: this.tex,
        transparent: true,
        opacity: 0.6,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Points(geo, mat);
      ring.userData = { speed: 1.5 + i * 0.5, tilt: (i * 45) * Math.PI / 180 };
      this.scanRings.push(ring);
      this.group.add(ring);
    }
  }

  // ========== 5. Circuit Network (电路线网络) ==========
  createCircuitNetwork() {
    const nodeCount = 12;
    const nodes = [];

    // 生成数据节点位置
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 0.4 + Math.random() * 0.5;
      nodes.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ));
    }

    // 创建电路线
    for (let i = 0; i < nodeCount; i++) {
      const target = (i + 1 + Math.floor(Math.random() * 3)) % nodeCount;
      const start = nodes[i];
      const end = nodes[target];

      // 生成折线路径（带拐角）
      const mid1 = new THREE.Vector3(
        start.x + (end.x - start.x) * 0.3 + (Math.random() - 0.5) * 0.2,
        start.y + (end.y - start.y) * 0.3 + (Math.random() - 0.5) * 0.2,
        start.z + (end.z - start.z) * 0.3 + (Math.random() - 0.5) * 0.2
      );
      const mid2 = new THREE.Vector3(
        start.x + (end.x - start.x) * 0.7 + (Math.random() - 0.5) * 0.2,
        start.y + (end.y - start.y) * 0.7 + (Math.random() - 0.5) * 0.2,
        start.z + (end.z - start.z) * 0.7 + (Math.random() - 0.5) * 0.2
      );

      const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
      const linePoints = curve.getPoints(30);

      // 外层光晕线
      const glowGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const glowMat = new THREE.LineBasicMaterial({
        color: 0xFF8F00,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glowLine = new THREE.Line(glowGeo, glowMat);
      this.circuitLines.push(glowLine);
      this.group.add(glowLine);

      // 内层核心线
      const coreGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const coreMat = new THREE.LineBasicMaterial({
        color: 0xFFD54F,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const coreLine = new THREE.Line(coreGeo, coreMat);
      this.circuitLines.push(coreLine);
      this.group.add(coreLine);
    }

    // 创建数据节点
    for (const node of nodes) {
      const nodeGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: 0xFFD54F,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(node);
      this.dataNodes.push(nodeMesh);
      this.group.add(nodeMesh);
    }
  }

  // ========== 6. Flow Particles (粒子流) ==========
  createFlowParticles() {
    const n = 2000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const basePos = new Float32Array(n * 3);
    const speeds = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      // 不均匀分布：部分区域密集，部分稀疏
      const cluster = Math.random() < 0.3;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = cluster ? (0.5 + Math.random() * 0.3) : (0.7 + Math.random() * 0.8);

      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      basePos[i*3] = pos[i*3];
      basePos[i*3+1] = pos[i*3+1];
      basePos[i*3+2] = pos[i*3+2];

      // 金橙色，更亮
      const t = Math.random();
      col[i*3]   = 1.0;
      col[i*3+1] = 0.7 + t * 0.25;
      col[i*3+2] = 0.1 + t * 0.2;

      speeds[i] = 0.5 + Math.random() * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.08,
      map: this.tex,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flowParticles = new THREE.Points(geo, mat);
    this.flowData = { basePos, speeds };
    this.group.add(this.flowParticles);
  }

  // ========== 7. Bottom Light (底部冷光) ==========
  createBottomLight() {
    const n = 150;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.5;
      pos[i*3]   = Math.cos(a) * r;
      pos[i*3+1] = -1.2 - Math.random() * 0.5;
      pos[i*3+2] = Math.sin(a) * r;
      const t = Math.random();
      col[i*3]   = 0.2 + t * 0.1;
      col[i*3+1] = 0.5 + t * 0.2;
      col[i*3+2] = 0.8 + t * 0.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.04,
      map: this.tex,
      transparent: true,
      opacity: 0.3,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.bottomLight = new THREE.Points(geo, mat);
    this.group.add(this.bottomLight);
  }

  // ========== Energy Pulse (能量脉冲) ==========
  spawnPulse(origin) {
    const n = 40 + Math.floor(Math.random() * 30);
    const pos = new Float32Array(n * 3);
    const vel = [];
    const col = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 1.5;
      vel.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
      pos[i*3] = origin.x;
      pos[i*3+1] = origin.y;
      pos[i*3+2] = origin.z;
      col[i*3] = 1.0;
      col[i*3+1] = 0.8 + Math.random() * 0.2;
      col[i*3+2] = 0.3 + Math.random() * 0.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.08,
      map: this.tex,
      transparent: true,
      opacity: 1.0,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    this.energyPulses.push({
      points, vel, mat,
      age: 0,
      maxAge: 1.0 + Math.random() * 0.5
    });
  }

  // ========== Energy Burst (能量爆点) ==========
  spawnBurst(position) {
    const spriteMat = new THREE.SpriteMaterial({
      map: this.overexposedTex,
      color: 0xFFFFFF,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(position);
    sprite.scale.setScalar(0.3);
    this.group.add(sprite);

    this.energyBursts.push({
      sprite, mat: spriteMat,
      age: 0,
      maxAge: 0.3 + Math.random() * 0.2
    });
  }

  // ========== Update ==========
  update(time, sp) {
    this.time = time;
    const dt = 0.016; // ~60fps

    // --- Core Star ---
    const pulse = 1.0 + Math.sin(time * 3) * 0.15;
    const coreScale = pulse * (0.8 + sp.coreGlow * 0.6);
    this.coreStar.scale.setScalar(coreScale);
    this.coreStar.material.opacity = 0.9 + sp.coreGlow * 0.1;

    // Sprite光晕脉动
    this.coreSprite.scale.setScalar(0.5 + sp.coreGlow * 0.4 + Math.sin(time * 2) * 0.05);
    this.coreSprite.material.opacity = 0.7 + sp.coreGlow * 0.3;

    this.coreGlowLayers.forEach((glow, i) => {
      const s = coreScale * (1.8 + i * 1.0);
      glow.scale.setScalar(s);
      glow.material.opacity = (0.4 - i * 0.06) * sp.coreGlow;
    });

    // --- Holo Wireframes ---
    this.holoWireframes.forEach(w => {
      w.rotation.y += w.userData.speed * sp.arcSpeed * 0.016 * w.userData.direction;
      w.rotation.z += w.userData.speed * sp.arcSpeed * 0.008;
      w.material.opacity = (0.08 + sp.coreGlow * 0.08);
    });

    // --- Broken Arcs ---
    this.brokenArcs.forEach(arc => {
      arc.rotation.y += arc.userData.speed * sp.arcSpeed * 0.016;
      arc.rotation.z += arc.userData.speed * sp.arcSpeed * 0.008;
      arc.material.opacity = 0.5 + sp.arcSpeed * 0.3;
      if (sp.flickering) {
        arc.rotation.y += Math.sin(time * 20) * 0.05;
        arc.rotation.z += Math.cos(time * 15) * 0.05;
      }
    });

    // --- Scan Rings ---
    this.scanRings.forEach(ring => {
      ring.rotation.y += ring.userData.speed * sp.scanSpeed * 0.016;
      ring.rotation.x = ring.userData.tilt;
      ring.material.opacity = 0.4 + sp.scanSpeed * 0.3;
    });

    // --- Circuit Lines ---
    this.circuitLines.forEach(line => {
      line.material.opacity = line.material.color.r > 0.5 ? 
        (0.3 + sp.circuitBright * 0.4) : (0.08 + sp.circuitBright * 0.1);
    });

    // --- Data Nodes ---
    this.dataNodes.forEach((node, i) => {
      const flicker = Math.sin(time * 5 + i * 2) * 0.3 + 0.7;
      node.material.opacity = flicker * sp.circuitBright;
      const s = 0.8 + Math.sin(time * 3 + i) * 0.2;
      node.scale.setScalar(s);
    });

    // --- Flow Particles ---
    if (this.flowParticles) {
      const pos = this.flowParticles.geometry.attributes.position.array;
      const bp = this.flowData.basePos;
      const spd = this.flowData.speeds;
      const speed = sp.particleSpeed * 0.003;

      for (let i = 0, len = pos.length / 3; i < len; i++) {
        const ix = i * 3;
        const x = pos[ix], y = pos[ix+1], z = pos[ix+2];
        const d = Math.sqrt(x*x + y*y + z*z) || 1;
        const tx = -y / d, ty = x / d;
        pos[ix]   += tx * speed * spd[i];
        pos[ix+1] += ty * speed * spd[i];

        if (sp.particleSpeed > 1.0) {
          const f = (sp.particleSpeed - 1.0) * 0.001;
          pos[ix]   -= x / d * f;
          pos[ix+1] -= y / d * f;
          pos[ix+2] -= z / d * f;
        }

        const nd = Math.sqrt(pos[ix]*pos[ix] + pos[ix+1]*pos[ix+1] + pos[ix+2]*pos[ix+2]);
        if (nd > 1.6 || nd < 0.3) {
          pos[ix] = bp[ix]; pos[ix+1] = bp[ix+1]; pos[ix+2] = bp[ix+2];
        }
      }
      this.flowParticles.geometry.attributes.position.needsUpdate = true;
      this.flowParticles.rotation.y += sp.particleSpeed * 0.001;
      this.flowParticles.material.opacity = 0.5 + sp.particleSpeed * 0.2;
    }

    // --- Bottom Light ---
    if (this.bottomLight) {
      this.bottomLight.material.opacity = 0.2 + sp.coreGlow * 0.15;
    }

    // --- Energy Pulses ---
    if (Math.random() < sp.pulseRate) {
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      this.spawnPulse(origin);
    }

    this.energyPulses = this.energyPulses.filter(pulse => {
      pulse.age += dt;
      if (pulse.age >= pulse.maxAge) {
        this.group.remove(pulse.points);
        pulse.points.geometry.dispose();
        pulse.mat.dispose();
        return false;
      }
      const progress = pulse.age / pulse.maxAge;
      const positions = pulse.points.geometry.attributes.position.array;
      for (let i = 0; i < pulse.vel.length; i++) {
        const v = pulse.vel[i];
        const decay = 1.0 - progress * 0.5;
        positions[i*3] += v.x * dt * decay;
        positions[i*3+1] += v.y * dt * decay;
        positions[i*3+2] += v.z * dt * decay;
      }
      pulse.points.geometry.attributes.position.needsUpdate = true;
      pulse.mat.opacity = Math.pow(1.0 - progress, 2.0);
      pulse.mat.size = 0.08 * (1.0 - progress * 0.5);
      return true;
    });

    // --- Energy Bursts ---
    if (Math.random() < sp.pulseRate * 0.5) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2
      );
      this.spawnBurst(pos);
    }

    this.energyBursts = this.energyBursts.filter(burst => {
      burst.age += dt;
      if (burst.age >= burst.maxAge) {
        this.group.remove(burst.sprite);
        burst.mat.dispose();
        return false;
      }
      const progress = burst.age / burst.maxAge;
      burst.sprite.scale.setScalar(0.3 + progress * 1.5);
      burst.mat.opacity = Math.pow(1.0 - progress, 1.5);
      return true;
    });

    // --- Error flickering ---
    if (sp.flickering) {
      this.coreStar.material.color.setHSL(
        0.08 + Math.sin(time * 20) * 0.05, 0.9, 0.9
      );
    } else {
      this.coreStar.material.color.setHSL(0.12, 0.5, 0.95);
    }
  }
}

// ==================== Scene Setup ====================
const container = document.createElement('div');
document.body.appendChild(container);

const W = 400, H = 400;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
camera.position.z = 3.2;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.domElement.style.filter = 'brightness(1.3) contrast(1.15)';
container.appendChild(renderer.domElement);

// Systems
const stateMgr = new StateManager();
const jarvis = new JarvisCore(scene);

// IPC
window.electronAPI.onUpdateState((data) => {
  stateMgr.setState(data.state, data.intensity, data.source || 'manual');
});

// Dev: keyboard
window.addEventListener('keydown', (e) => {
  const states = ['idle','waiting','thinking','responding','executing','error'];
  const n = parseInt(e.key);
  if (n >= 1 && n <= 6) stateMgr.setState(states[n-1], 0.8, 'manual');
});

// Right-click menu
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.electronAPI.showContextMenu();
});

// ==================== Animation Loop ====================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const time = clock.getElapsedTime();
  const sp = stateMgr.update(dt);

  jarvis.update(time, sp);
  renderer.render(scene, camera);
}

animate();
console.log('[JARVIS] Ready - Holographic Core v2');
