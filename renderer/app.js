import * as THREE from 'three';

console.log('[JARVIS] Starting...');

// ==================== State Manager ====================
const STATE_PARAMS = {
  idle:       { coreIntensity: 0.3, arcSpeed: 0.0,  circuitBright: 0.2, scanSpeed: 0.0,  particleSpeed: 0.0,  pulseRate: 0.002, breathAmp: 0.05, breathFreq: 0.5, flickering: false, chaos: 0.0 },
  waiting:    { coreIntensity: 0.6, arcSpeed: 0.3,  circuitBright: 0.5, scanSpeed: 0.3,  particleSpeed: 0.3,  pulseRate: 0.008, breathAmp: 0.3,  breathFreq: 1.5, flickering: false, chaos: 0.0 },
  thinking:   { coreIntensity: 1.0, arcSpeed: 1.0,  circuitBright: 1.0, scanSpeed: 1.0,  particleSpeed: 1.0,  pulseRate: 0.02,  breathAmp: 0.0,  breathFreq: 0.0, flickering: false, chaos: 0.0 },
  responding: { coreIntensity: 0.8, arcSpeed: 0.6,  circuitBright: 0.8, scanSpeed: 0.6,  particleSpeed: 0.7,  pulseRate: 0.015, breathAmp: 0.1,  breathFreq: 1.0, flickering: false, chaos: 0.0, outward: 1.0 },
  executing:  { coreIntensity: 0.9, arcSpeed: 0.5,  circuitBright: 0.9, scanSpeed: 0.8,  particleSpeed: 0.6,  pulseRate: 0.04,  breathAmp: 0.0,  breathFreq: 0.0, flickering: false, chaos: 0.0, pulse: 1.0 },
  error:      { coreIntensity: 1.3, arcSpeed: 1.5,  circuitBright: 1.0, scanSpeed: 1.5,  particleSpeed: 1.2,  pulseRate: 0.05,  breathAmp: 0.0,  breathFreq: 0.0, flickering: true,  chaos: 1.0 }
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
    const shouldUpdate =
      source === 'manual' ||
      source === this.source ||
      newPriority > currentPriority ||
      newPriority === currentPriority;
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
  g.addColorStop(0.15, 'rgba(255,255,250,0.95)');
  g.addColorStop(0.4, 'rgba(255,220,150,0.55)');
  g.addColorStop(0.7, 'rgba(255,180,60,0.15)');
  g.addColorStop(1, 'rgba(255,140,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeOverexposedTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.08, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.25, 'rgba(255,240,210,0.6)');
  g.addColorStop(0.5, 'rgba(255,200,100,0.25)');
  g.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeDiskRingTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, half * 0.35, half, half, half);
  g.addColorStop(0, 'rgba(255,200,100,0)');
  g.addColorStop(0.4, 'rgba(255,200,100,0)');
  g.addColorStop(0.55, 'rgba(255,180,60,0.5)');
  g.addColorStop(0.7, 'rgba(255,160,40,0.25)');
  g.addColorStop(0.85, 'rgba(255,140,30,0.08)');
  g.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// ==================== Helper: partial ring geometry ====================
function createPartialRingPoints(radius, startAngle, endAngle, totalSegments, gapFn) {
  const points = [];
  const arcLen = endAngle - startAngle;
  for (let i = 0; i <= totalSegments; i++) {
    if (gapFn && gapFn(i / totalSegments)) continue;
    const a = startAngle + (i / totalSegments) * arcLen;
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return points;
}

class EllipseArcCurve3 extends THREE.Curve {
  constructor(def, startAngle, endAngle) {
    super();
    this.def = def;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }

  getPoint(t) {
    const a = this.startAngle + (this.endAngle - this.startAngle) * t;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return new THREE.Vector3(
      this.def.cx + cos * this.def.rx,
      this.def.cy + sin * this.def.ry,
      this.def.cz + cos * (this.def.depth || 0)
    );
  }
}

function createArcPoints3D(def, startAngle, endAngle, segments = 32) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segments);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    points.push(new THREE.Vector3(
      def.cx + cos * def.rx,
      def.cy + sin * def.ry,
      def.cz + cos * (def.depth || 0)
    ));
  }
  return points;
}

function pointOnArcDef(def, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new THREE.Vector3(
    def.cx + cos * def.rx,
    def.cy + sin * def.ry,
    def.cz + cos * (def.depth || 0)
  );
}

// ==================== Holographic AI Core ====================
class JarvisCore {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.glowTex = makeGlowTexture();
    this.overTex = makeOverexposedTexture();
    this.diskTex = makeDiskRingTexture();

    this.mechRings = [];
    this.irisBlades = [];
    this.corePoint = null;
    this.coreSprite = null;

    this.hudRings = [];
    this.hudDisks = [];
    this.crosshairLines = [];

    this.circuitNodes = [];
    this.circuitLines = [];

    this.scanRings = [];

    this.dataArcs = [];
    this.shellLayers = [];
    this.leftSemiRings = [];
    this.leftShellGroup = new THREE.Group();
    this.leftShellGroup.renderOrder = 8;
    this.group.add(this.leftShellGroup);

    this.flowPoints = null;
    this.flowBase = null;
    this.flowSpeeds = null;

    this.flickerSprites = [];
    this.flickerPool = [];
    this.frameCount = 0;

    this.time = 0;
    this.init();
  }

  // 初始化闪烁对象池
  initFlickerPool() {
    const poolSize = 25;
    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.overTex,
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.flickerPool.push({ sprite, mat, active: false, age: 0, maxAge: 0 });
    }
  }

  init() {
    this.createMechanicalCore();
    this.createLayeredShells();
    this.createHUDStructure();
    this.createLeftEmbeddedSemiRings();
    this.createRadialCircuits();
    this.createScanStructures();
    this.createDataArcs();
    this.createFlowField();
    this.initFlickerPool();
  }

  // ========== 1. 机械瞳孔核心 ==========
  createMechanicalCore() {
    // 中心白热光点
    const coreGeo = new THREE.SphereGeometry(0.025, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 1.0 });
    this.corePoint = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.corePoint);

    // 过曝光晕
    const spriteMat = new THREE.SpriteMaterial({
      map: this.overTex,
      color: 0xFFFFFF,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.coreSprite = new THREE.Sprite(spriteMat);
    this.coreSprite.scale.setScalar(0.55);
    this.group.add(this.coreSprite);

    // 光圈孔径环 - 紧密排列的细环
    const ringRadii = [0.05, 0.07, 0.10, 0.14, 0.18];
    const ringTilts = [
      { x: 0, z: 0 },
      { x: 0.3, z: 0.5 },
      { x: -0.4, z: 0.2 },
      { x: 0.6, z: -0.3 },
      { x: -0.2, z: -0.5 }
    ];

    for (let i = 0; i < ringRadii.length; i++) {
      const torusGeo = new THREE.TorusGeometry(ringRadii[i], 0.005, 8, 80);
      const torusMat = new THREE.MeshBasicMaterial({
        color: i < 2 ? 0xFFF8E1 : 0xFFB300,
        transparent: true,
        opacity: 1.0 - i * 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.x = ringTilts[i].x;
      torus.rotation.z = ringTilts[i].z;
      this.mechRings.push({ mesh: torus, baseOpacity: 1.0 - i * 0.1, speed: 0.3 + i * 0.1, axis: ringTilts[i] });
      this.group.add(torus);
    }

    // 虹膜叶片 - 短弧段交错排列
    const bladeCount = 14;
    const bladeRadius = 0.09;
    const bladeArc = Math.PI / 4;
    for (let i = 0; i < bladeCount; i++) {
      const baseAngle = (i / bladeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const pts = createPartialRingPoints(bladeRadius, baseAngle, baseAngle + bladeArc, 18, null);
      if (pts.length < 2) continue;
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0xFFD54F,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.x = (Math.random() - 0.5) * 0.6;
      line.rotation.z = (Math.random() - 0.5) * 0.6;
      this.irisBlades.push({ line, speed: 0.2 + Math.random() * 0.3 });
      this.group.add(line);
    }

    // 径向连接线
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 0.06 + Math.random() * 0.12;
      const pts = [
        new THREE.Vector3(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03),
        new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 0.06, Math.sin(a) * r)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0xFFC107,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.group.add(new THREE.Line(geo, mat));
    }
  }

  // ========== 2. 三层球壳体积 ==========
  createLayeredShells() {
    const glows = [
      { scale: 2.35, color: 0xFF7A18, opacity: 0.090, speed: 0.006 },
      { scale: 1.45, color: 0xFFB62E, opacity: 0.120, speed: -0.010 }
    ];

    glows.forEach((cfg) => {
      const mat = new THREE.SpriteMaterial({
        map: this.glowTex,
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Sprite(mat);
      glow.scale.set(cfg.scale, cfg.scale, 1);
      glow.renderOrder = -1;
      this.shellLayers.push({ obj: glow, mat, baseOpacity: cfg.opacity, speed: cfg.speed, pulse: 0.12 });
      this.group.add(glow);
    });

    const shells = [
      { radius: 1.10, color: 0xFF7A18, opacity: 0.115, speed: 0.018 },
      { radius: 0.78, color: 0xFFB62E, opacity: 0.135, speed: -0.026 },
      { radius: 0.34, color: 0xFFE082, opacity: 0.165, speed: 0.040 }
    ];

    shells.forEach((cfg, index) => {
      const geo = new THREE.SphereGeometry(cfg.radius, 36, 18);
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
      });
      const shell = new THREE.Mesh(geo, mat);
      shell.scale.z = 0.82;
      shell.renderOrder = index;
      this.shellLayers.push({ obj: shell, mat, baseOpacity: cfg.opacity, speed: cfg.speed, pulse: 0.25 + index * 0.08 });
      this.group.add(shell);
    });

    const silhouettes = [
      { r: 1.13, y: 1.00, color: 0xFF8F00, opacity: 0.30, parts: 22, skip: 4 },
      { r: 0.80, y: 0.76, color: 0xFFC247, opacity: 0.34, parts: 18, skip: 5 },
      { r: 0.36, y: 0.34, color: 0xFFE8A0, opacity: 0.40, parts: 12, skip: 4 }
    ];

    silhouettes.forEach((cfg, ringIndex) => {
      const def = { cx: 0, cy: 0, cz: 0.02 * ringIndex, rx: cfg.r, ry: cfg.y, depth: 0.02 };
      for (let i = 0; i < cfg.parts; i++) {
        if ((i + ringIndex) % cfg.skip === 1) continue;
        const slot = Math.PI * 2 / cfg.parts;
        const start = i * slot + slot * 0.10;
        const end = start + slot * (0.48 + (i % 3) * 0.07);
        const geo = new THREE.BufferGeometry().setFromPoints(createArcPoints3D(def, start, end, 10));
        const mat = new THREE.LineBasicMaterial({
          color: cfg.color,
          transparent: true,
          opacity: cfg.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const line = new THREE.Line(geo, mat);
        line.renderOrder = 2 + ringIndex;
        this.shellLayers.push({ obj: line, mat, baseOpacity: cfg.opacity, speed: cfg.r > 1 ? 0.01 : -0.016, pulse: 0.18 });
        this.group.add(line);
      }
    });
  }

  addTubeArc(parent, def, startAngle, endAngle, tubeRadius, color, opacity, renderOrder = 10) {
    const curve = new EllipseArcCurve3(def, startAngle, endAngle);
    const geo = new THREE.TubeGeometry(curve, 28, tubeRadius, 12, false);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = renderOrder;
    parent.add(mesh);
    this.leftSemiRings.push({ obj: mesh, mat, baseOpacity: opacity, pulse: 0.24 + tubeRadius * 4 });
    return mesh;
  }

  // ========== 3. 左侧嵌入式半圆厚环 ==========
  createLeftEmbeddedSemiRings() {
    const rings = [
      {
        name: 'outward',
        cx: -0.62, cy: 0.01, cz: 0.02, rx: 0.31, ry: 1.18, depth: -0.36,
        start: 0.56, end: 1.44, color: 0xFF9F1F, edgeColor: 0xFFE29A,
        tube: 0.045, parts: 12, opacity: 0.78, order: 14
      },
      {
        name: 'middle',
        cx: -0.42, cy: 0.00, cz: 0.00, rx: 0.70, ry: 1.08, depth: -0.17,
        start: 0.54, end: 1.46, color: 0xFFC24A, edgeColor: 0xFFE9AD,
        tube: 0.026, parts: 14, opacity: 0.48, order: 12
      },
      {
        name: 'surface',
        cx: -0.08, cy: 0.00, cz: -0.03, rx: 1.05, ry: 1.02, depth: -0.04,
        start: 0.53, end: 1.47, color: 0xFF8618, edgeColor: 0xFFB13B,
        tube: 0.015, parts: 16, opacity: 0.30, order: 9
      }
    ];

    rings.forEach((ring, ringIndex) => {
      const start = ring.start * Math.PI;
      const end = ring.end * Math.PI;

      this.addTubeArc(this.leftShellGroup, ring, start, end, ring.tube * 2.15, ring.color, ring.opacity * 0.16, ring.order - 1);
      this.addTubeArc(this.leftShellGroup, ring, start, end, ring.tube * 1.10, ring.color, ring.opacity * 0.14, ring.order);

      const slot = (end - start) / ring.parts;
      for (let i = 0; i < ring.parts; i++) {
        if ((i + ringIndex) % 5 === 2) continue;
        const a0 = start + i * slot + slot * 0.08;
        const a1 = a0 + slot * (0.58 + (i % 3) * 0.08);
        this.addTubeArc(this.leftShellGroup, ring, a0, a1, ring.tube, ring.color, ring.opacity, ring.order + 1);

        if (i % 2 === 0) {
          const edgeDef = {
            ...ring,
            cx: ring.cx + (ring.name === 'outward' ? 0.055 : 0.018),
            rx: ring.rx * (ring.name === 'outward' ? 0.92 : 0.97),
            ry: ring.ry * 0.985,
            depth: ring.depth * 0.88
          };
          this.addTubeArc(this.leftShellGroup, edgeDef, a0 + slot * 0.08, a1 - slot * 0.06, ring.tube * 0.34, ring.edgeColor, ring.opacity * 0.62, ring.order + 2);
        }
      }
    });

    const bridgeAngles = [0.62, 0.74, 0.88, 1.02, 1.16, 1.30, 1.40].map(v => v * Math.PI);
    bridgeAngles.forEach((angle, index) => {
      const from = pointOnArcDef(rings[0], angle);
      const targetRing = index % 2 === 0 ? rings[1] : rings[2];
      const to = pointOnArcDef(targetRing, angle + (index % 2 === 0 ? 0.012 : -0.010));
      const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const mat = new THREE.LineBasicMaterial({
        color: index % 2 === 0 ? 0xFFC247 : 0xFF8A19,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 11;
      this.leftShellGroup.add(line);
      this.leftSemiRings.push({ obj: line, mat, baseOpacity: 0.24, pulse: 0.14 });
    });
  }

  // ========== 2. 内层HUD瞄准结构 ==========
  createHUDStructure() {
    // HUD瞄准环 - 带刻度的部分环
    const hudConfigs = [
      { r: 0.25, tilt: { x: 0.1, z: 0 }, gapCount: 4, tickCount: 12, color: 0xFFB300, opacity: 0.85 },
      { r: 0.32, tilt: { x: 0.8, z: 0.3 }, gapCount: 3, tickCount: 16, color: 0xFFC107, opacity: 0.75 },
      { r: 0.40, tilt: { x: -0.5, z: -0.4 }, gapCount: 5, tickCount: 20, color: 0xFF8F00, opacity: 0.7 },
      { r: 0.48, tilt: { x: 0.3, z: 0.7 }, gapCount: 6, tickCount: 24, color: 0xFFB300, opacity: 0.6 },
      { r: 0.55, tilt: { x: -0.7, z: 0.2 }, gapCount: 4, tickCount: 16, color: 0xFF8F00, opacity: 0.55 }
    ];

    for (const cfg of hudConfigs) {
      const n = 300;
      const pts = [];
      const gapSize = 0.06;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const inGap = cfg.gapCount > 0 && (Math.sin(t * Math.PI * cfg.gapCount * 2) > (1 - gapSize * cfg.gapCount));
        if (!inGap) {
          const a = t * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * cfg.r, 0, Math.sin(a) * cfg.r));
        }
      }
      if (pts.length < 2) continue;
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const hudRing = new THREE.Line(geo, mat);
      hudRing.rotation.x = cfg.tilt.x;
      hudRing.rotation.z = cfg.tilt.z;
      hudRing.userData = { speed: 0.1 + Math.random() * 0.2, tilt: cfg.tilt };
      this.hudRings.push(hudRing);
      this.group.add(hudRing);

      // 刻度标记
      if (cfg.tickCount > 0) {
        const tickGroup = new THREE.Group();
        const tickLen = 0.03;
        for (let i = 0; i < cfg.tickCount; i++) {
          const ta = (i / cfg.tickCount) * Math.PI * 2;
          const cx = Math.cos(ta) * cfg.r;
          const cz = Math.sin(ta) * cfg.r;
          const outX = Math.cos(ta) * (cfg.r + tickLen);
          const outZ = Math.sin(ta) * (cfg.r + tickLen);
          const tickGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(cx, 0, cz),
            new THREE.Vector3(outX, 0, outZ)
          ]);
          const tickMat = new THREE.LineBasicMaterial({
            color: cfg.color,
            transparent: true,
            opacity: cfg.opacity * 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          tickGroup.add(new THREE.Line(tickGeo, tickMat));
        }
        tickGroup.rotation.x = cfg.tilt.x;
        tickGroup.rotation.z = cfg.tilt.z;
        tickGroup.userData = { parentRing: hudRing };
        this.hudRings.push(tickGroup);
        this.group.add(tickGroup);
      }
    }

    // 十字准星
    const crossLen = 0.5;
    const crosshairPlanes = [
      { rotX: 0, rotZ: 0 },
      { rotX: Math.PI / 2, rotZ: 0.3 },
      { rotX: 0.4, rotZ: Math.PI / 2 }
    ];
    for (const plane of crosshairPlanes) {
      const crossGroup = new THREE.Group();
      for (const axis of [0, 1]) {
        const pts = axis === 0
          ? [new THREE.Vector3(-crossLen, 0, 0), new THREE.Vector3(crossLen, 0, 0)]
          : [new THREE.Vector3(0, 0, -crossLen), new THREE.Vector3(0, 0, crossLen)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: 0xFF8F00,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        crossGroup.add(new THREE.Line(geo, mat));
      }
      crossGroup.rotation.x = plane.rotX;
      crossGroup.rotation.z = plane.rotZ;
      this.crosshairLines.push(crossGroup);
      this.group.add(crossGroup);
    }

    // 半透明HUD圆盘
    const diskPlanes = [
      { size: 0.5, rotX: 0.5, rotZ: 0, opacity: 0.3 },
      { size: 0.4, rotX: -0.6, rotZ: 0.8, opacity: 0.25 },
      { size: 0.55, rotX: 1.0, rotZ: -0.4, opacity: 0.2 }
    ];
    for (const dp of diskPlanes) {
      const planeGeo = new THREE.PlaneGeometry(dp.size, dp.size);
      const planeMat = new THREE.MeshBasicMaterial({
        map: this.diskTex,
        color: 0xFFB300,
        transparent: true,
        opacity: dp.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const disk = new THREE.Mesh(planeGeo, planeMat);
      disk.rotation.x = dp.rotX;
      disk.rotation.z = dp.rotZ;
      this.hudDisks.push(disk);
      this.group.add(disk);

      // 圆盘边缘环
      const edgeR = dp.size / 2;
      const edgePts = [];
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        edgePts.push(new THREE.Vector3(Math.cos(a) * edgeR, Math.sin(a) * edgeR, 0));
      }
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePts);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xFF8F00,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const edgeLine = new THREE.Line(edgeGeo, edgeMat);
      edgeLine.rotation.copy(disk.rotation);
      this.hudDisks.push(edgeLine);
      this.group.add(edgeLine);
    }
  }

  // ========== 3. 放射状电路网络 ==========
  createRadialCircuits() {
    const nodeCount = 20; // 从40降到20
    const nodes = [];
    const shells = [0.2, 0.4, 0.65, 0.9];

    for (const shellR of shells) {
      const nPerShell = Math.floor(nodeCount / shells.length);
      for (let i = 0; i < nPerShell; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = shellR + (Math.random() - 0.5) * 0.12;
        nodes.push({
          pos: new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
          ),
          shell: shells.indexOf(shellR)
        });
      }
    }

    // 球心起始节点
    for (let i = 0; i < 6; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 0.05 + Math.random() * 0.1;
      nodes.push({
        pos: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ),
        shell: -1
      });
    }

    // 连接线 - 每层壳与内外层连
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const candidates = nodes.filter((b, j) => {
        if (j === i) return false;
        const shellDiff = Math.abs(a.shell - b.shell);
        if (shellDiff !== 1 && shellDiff !== 0) return false;
        const dist = a.pos.distanceTo(b.pos);
        return dist < 0.55;
      });

      // 取最近的2-3个邻居
      candidates.sort((x, y) => a.pos.distanceTo(x.pos) - a.pos.distanceTo(y.pos));
      const toConnect = candidates.slice(0, 2 + Math.floor(Math.random() * 2));

      for (const b of toConnect) {
        const mid = new THREE.Vector3().addVectors(a.pos, b.pos).multiplyScalar(0.5);
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * 0.12,
          (Math.random() - 0.5) * 0.12,
          (Math.random() - 0.5) * 0.12
        );
        mid.add(jitter);

        const curve = new THREE.QuadraticBezierCurve3(a.pos.clone(), mid, b.pos.clone());
        const pts = curve.getPoints(20);

        // 光晕线
        const glowGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const glowMat = new THREE.LineBasicMaterial({
          color: 0xFF8F00,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        this.circuitLines.push({ line: new THREE.Line(glowGeo, glowMat), baseOpacity: 0.2 });
        this.group.add(new THREE.Line(glowGeo, glowMat));

        // 核心线
        const coreGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const coreMat = new THREE.LineBasicMaterial({
          color: 0xFFC107,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        this.circuitLines.push({ line: new THREE.Line(coreGeo, coreMat), baseOpacity: 0.5 });
        this.group.add(new THREE.Line(coreGeo, coreMat));
      }
    }

    // 数据节点
    for (const node of nodes) {
      const geo = new THREE.SphereGeometry(0.018, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xFFD54F,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(node.pos);
      mesh.userData = { shell: node.shell, baseOpacity: 1.0 };
      this.circuitNodes.push(mesh);
      this.group.add(mesh);
    }
  }

  // ========== 4. 扫描结构 ==========
  createScanStructures() {
    const scanConfigs = [
      { r: 0.65, tiltX: 0.2, tiltZ: 0, color: 0xFFB300, baseOpacity: 0.7, speed: 1.2 },
      { r: 0.85, tiltX: 0.7, tiltZ: 0.4, color: 0xFF8F00, baseOpacity: 0.6, speed: 0.9 },
      { r: 1.05, tiltX: -0.5, tiltZ: -0.3, color: 0xFF6F00, baseOpacity: 0.5, speed: 0.7 }
    ];

    for (const cfg of scanConfigs) {
      const n = 250;
      const pts = [];
      const cols = [];
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const a = t * Math.PI * 2;
        const gap = Math.sin(t * 18) > 0.15 ? 1 : 0;
        if (gap) {
          pts.push(new THREE.Vector3(Math.cos(a) * cfg.r, 0, Math.sin(a) * cfg.r));
          const bright = Math.pow(Math.sin(t * Math.PI * 4), 2);
          cols.push(1.0, 0.75 + bright * 0.25, 0.2 + bright * 0.5);
        }
      }
      if (pts.length < 2) continue;
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.06,
        map: this.glowTex,
        transparent: true,
        opacity: cfg.baseOpacity,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Points(geo, mat);
      ring.rotation.x = cfg.tiltX;
      ring.rotation.z = cfg.tiltZ;
      ring.userData = { speed: cfg.speed, tiltX: cfg.tiltX, tiltZ: cfg.tiltZ };
      this.scanRings.push(ring);
      this.group.add(ring);
    }

    // 扫描亮斑 - 每个环上一个高亮光点
    for (let i = 0; i < scanConfigs.length; i++) {
      const cfg = scanConfigs[i];
      const sweepSpriteMat = new THREE.SpriteMaterial({
        map: this.overTex,
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sweep = new THREE.Sprite(sweepSpriteMat);
      sweep.scale.setScalar(0.15);
      sweep.position.set(cfg.r, 0, 0);
      const sweepGroup = new THREE.Group();
      sweepGroup.add(sweep);
      sweepGroup.rotation.x = cfg.tiltX;
      sweepGroup.rotation.z = cfg.tiltZ;
      sweepGroup.userData = { speed: cfg.speed * 2.5, baseR: cfg.r };
      this.scanRings.push(sweepGroup);
      this.group.add(sweepGroup);
    }
  }

  // ========== 5. 数据弧线（外围主要视觉） ==========
  createDataArcs() {
    const arcDefs = [
      { r: 0.72, tiltX: 0.3, tiltZ: 0, gapPattern: [0.0, 0.7, 0.85, 0.95] },
      { r: 0.84, tiltX: -0.6, tiltZ: -0.3, gapPattern: [0.1, 0.4, 0.7, 0.9] },
      { r: 0.96, tiltX: -0.8, tiltZ: 0.2, gapPattern: [0.15, 0.45, 0.65, 0.95] },
      { r: 1.10, tiltX: 0.7, tiltZ: -0.4, gapPattern: [0.08, 0.38, 0.6, 0.85] },
      { r: 0.78, tiltX: 0.9, tiltZ: 0.5, gapPattern: [0.05, 0.35, 0.55, 0.85] },
      { r: 0.90, tiltX: 0.5, tiltZ: 0.7, gapPattern: [0.0, 0.3, 0.55, 0.8] },
      { r: 1.06, tiltX: -0.7, tiltZ: -0.5, gapPattern: [0.0, 0.28, 0.55, 0.9] },
      { r: 1.18, tiltX: -0.4, tiltZ: 0.6, gapPattern: [0.0, 0.4, 0.7, 0.92] }
    ];

    for (const def of arcDefs) {
      const n = 280;
      const pts = [];
      const cols = [];
      const gp = def.gapPattern;

      for (let i = 0; i < n; i++) {
        const t = i / n;
        let inGap = false;
        for (let g = 0; g < gp.length; g += 2) {
          if (t >= gp[g] && t <= gp[g + 1]) { inGap = true; break; }
        }
        if (!inGap) {
          const a = t * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * def.r, 0, Math.sin(a) * def.r));
          const bright = 0.6 + Math.random() * 0.4;
          cols.push(1.0, 0.65 * bright, 0.15 * bright);
        }
      }
      if (pts.length < 2) continue;

      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.065,
        map: this.glowTex,
        transparent: true,
        opacity: 1.0,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const arc = new THREE.Points(geo, mat);
      arc.rotation.x = def.tiltX;
      arc.rotation.z = def.tiltZ;
      arc.userData = {
        speed: 0.15 + Math.random() * 0.5,
        tiltX: def.tiltX,
        tiltZ: def.tiltZ,
        baseOpacity: 1.0,
        direction: Math.random() > 0.5 ? 1 : -1
      };
      this.dataArcs.push(arc);
      this.group.add(arc);
    }
  }

  // ========== 6. 粒子流场 ==========
  createFlowField() {
    const n = 800; // 从2000降到800
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const base = new Float32Array(n * 3);
    const spd = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 1.3;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      base[i * 3] = pos[i * 3];
      base[i * 3 + 1] = pos[i * 3 + 1];
      base[i * 3 + 2] = pos[i * 3 + 2];

      const t = Math.random();
      col[i * 3] = 1.0;
      col[i * 3 + 1] = 0.55 + t * 0.35;
      col[i * 3 + 2] = 0.08 + t * 0.25;

      spd[i] = 0.4 + Math.random() * 1.6;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.07,
      map: this.glowTex,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flowPoints = new THREE.Points(geo, mat);
    this.flowBase = base;
    this.flowSpeeds = spd;
    this.group.add(this.flowPoints);
  }

  // ========== 能量闪烁（对象池化） ==========
  spawnFlicker() {
    // 从池中找一个空闲的
    let entry = this.flickerPool.find(e => !e.active);
    if (!entry) return; // 池满了，跳过

    entry.active = true;
    entry.age = 0;
    entry.maxAge = 0.15 + Math.random() * 0.35;
    entry.sprite.position.set(
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 1.6
    );
    entry.sprite.scale.setScalar(0.08 + Math.random() * 0.15);
    entry.sprite.visible = true;
    entry.mat.opacity = 1.0;
    this.flickerSprites.push(entry);
  }

  // ========== Update ==========
  update(dt, sp) {
    this.time += dt;
    this.frameCount++;
    const t = this.time;

    // 呼吸效果
    const breath = sp.breathAmp > 0 ? Math.sin(t * sp.breathFreq * Math.PI * 2) * sp.breathAmp : 0;
    const breathScale = 1.0 + breath;
    const breathOpacity = 1.0 + breath * 0.5;

    // 脉动效果（executing状态的"嗒-嗒-嗒"节奏）
    const pulse = sp.pulse > 0 ? Math.pow(Math.sin(t * 8) * 0.5 + 0.5, 3) * sp.pulse : 0;

    // --- 固定视角三层球壳与左侧嵌入半圆 ---
    for (const shell of this.shellLayers) {
      shell.obj.rotation.y += shell.speed * sp.arcSpeed * dt;
      shell.mat.opacity = shell.baseOpacity * (0.45 + sp.circuitBright * 0.80) * (0.92 + pulse * shell.pulse);
    }

    const shellBreathe = 1 + breath * 0.045 + pulse * 0.018;
    this.leftShellGroup.scale.set(shellBreathe, shellBreathe, shellBreathe);
    this.leftShellGroup.rotation.y = Math.sin(t * 0.42) * sp.arcSpeed * 0.018;
    this.leftShellGroup.rotation.x = Math.sin(t * 0.31) * sp.arcSpeed * 0.006;

    for (const ring of this.leftSemiRings) {
      ring.mat.opacity = ring.baseOpacity * (0.48 + sp.circuitBright * 0.86) * (0.90 + pulse * ring.pulse) * breathOpacity;
    }

    // --- 机械核心 ---
    const corePulse = 1.0 + Math.sin(t * 3.5) * 0.12;
    const coreScale = corePulse * (0.5 + sp.coreIntensity * 1.0) * breathScale;
    this.corePoint.scale.setScalar(coreScale);
    this.corePoint.material.opacity = (0.8 + sp.coreIntensity * 0.2) * breathOpacity;
    this.coreSprite.scale.setScalar(0.4 + sp.coreIntensity * 0.5 + Math.sin(t * 2.5) * 0.05 + pulse * 0.2);
    this.coreSprite.material.opacity = (0.7 + sp.coreIntensity * 0.3) * breathOpacity;

    for (const ring of this.mechRings) {
      ring.mesh.rotation.y += ring.speed * sp.arcSpeed * dt * 0.8;
      ring.mesh.rotation.x += ring.speed * sp.arcSpeed * dt * 0.3;
      ring.mesh.material.opacity = ring.baseOpacity * (0.5 + sp.coreIntensity * 0.7) * (0.8 + pulse * 0.4);
    }

    for (const blade of this.irisBlades) {
      blade.line.rotation.y += blade.speed * sp.arcSpeed * dt * 0.8;
      blade.line.material.opacity = (0.2 + sp.coreIntensity * 0.7) * (0.8 + pulse * 0.4);
    }

    // --- HUD结构 ---
    for (const hud of this.hudRings) {
      if (hud instanceof THREE.Line) {
        hud.rotation.y += hud.userData.speed * sp.arcSpeed * dt * 1.5;
        hud.material.opacity = hud.material.opacity * (0.6 + sp.arcSpeed * 0.6) * breathOpacity;
      } else if (hud instanceof THREE.Group && hud.userData && hud.userData.parentRing) {
        hud.rotation.y += hud.userData.parentRing.userData.speed * sp.arcSpeed * dt * 1.5;
        hud.rotation.x = hud.userData.parentRing.userData.tilt.x;
        hud.rotation.z = hud.userData.parentRing.userData.tilt.z;
      } else if (hud instanceof THREE.Group) {
        hud.rotation.y += 0.08 * sp.arcSpeed * dt;
        hud.rotation.x += 0.05 * sp.arcSpeed * dt;
      }
    }

    for (const disk of this.hudDisks) {
      disk.material.opacity = disk.material.opacity * (0.5 + sp.circuitBright * 0.5) * (0.8 + pulse * 0.4);
    }

    for (const cross of this.crosshairLines) {
      cross.rotation.z += 0.05 * sp.arcSpeed * dt;
    }

    // --- 电路网络 ---
    for (const entry of this.circuitLines) {
      entry.line.material.opacity = entry.baseOpacity * (0.4 + sp.circuitBright * 0.8) * (0.7 + pulse * 0.5);
    }
    for (const node of this.circuitNodes) {
      const flick = Math.sin(t * 6 + node.userData.shell * 3) * 0.3 + 0.7;
      node.material.opacity = flick * sp.circuitBright * (0.7 + pulse * 0.5);
      node.scale.setScalar(0.7 + Math.sin(t * 4 + node.position.x) * 0.3);
    }

    // --- 扫描结构 ---
    for (const item of this.scanRings) {
      if (item instanceof THREE.Points) {
        item.rotation.y += item.userData.speed * sp.scanSpeed * dt * 1.5;
        item.material.opacity = item.material.opacity * (0.4 + sp.scanSpeed * 0.8);
      } else if (item instanceof THREE.Group) {
        item.rotation.y += item.userData.speed * sp.scanSpeed * dt * 1.5;
      }
    }

    // --- 数据弧线 ---
    for (const arc of this.dataArcs) {
      arc.rotation.y += arc.userData.speed * arc.userData.direction * sp.arcSpeed * dt * 1.5;
      arc.material.opacity = arc.userData.baseOpacity * (0.5 + sp.arcSpeed * 0.7);
      if (sp.flickering) {
        arc.rotation.y += Math.sin(t * 25) * 0.08;
        arc.rotation.x += Math.cos(t * 20) * 0.06;
      }
    }

    // --- 粒子流 ---
    if (this.flowPoints) {
      const posArr = this.flowPoints.geometry.attributes.position.array;
      const baseArr = this.flowBase;
      const spdArr = this.flowSpeeds;
      const flowSpeed = sp.particleSpeed * 0.008;
      let moved = false;

      for (let i = 0, len = posArr.length / 3; i < len; i++) {
        const ix = i * 3;
        const x = posArr[ix], y = posArr[ix + 1], z = posArr[ix + 2];
        const d2 = x * x + y * y + z * z;
        const d = Math.sqrt(d2) || 1;

        // 绕Y轴切向运动
        const nx = -z / d, nz = x / d;
        posArr[ix] += nx * flowSpeed * spdArr[i];
        posArr[ix + 2] += nz * flowSpeed * spdArr[i];
        // 小幅上下浮动
        posArr[ix + 1] += Math.sin(t * 1.5 + i * 0.05) * flowSpeed * 0.3;

        // thinking状态：向内聚拢形成有序旋转
        if (sp.particleSpeed > 0.8) {
          const pull = (sp.particleSpeed - 0.8) * 0.003;
          posArr[ix] -= (x / d) * pull;
          posArr[ix + 1] -= (y / d) * pull;
          posArr[ix + 2] -= (z / d) * pull;
        }

        // responding状态：向外扩散
        if (sp.outward > 0) {
          const push = sp.outward * 0.002;
          posArr[ix] += (x / d) * push;
          posArr[ix + 1] += (y / d) * push;
          posArr[ix + 2] += (z / d) * push;
        }

        // error状态：混沌发散
        if (sp.chaos > 0) {
          posArr[ix] += (Math.random() - 0.5) * sp.chaos * 0.02;
          posArr[ix + 1] += (Math.random() - 0.5) * sp.chaos * 0.02;
          posArr[ix + 2] += (Math.random() - 0.5) * sp.chaos * 0.02;
          // 发散趋势
          posArr[ix] += (x / d) * sp.chaos * 0.005;
          posArr[ix + 1] += (y / d) * sp.chaos * 0.005;
          posArr[ix + 2] += (z / d) * sp.chaos * 0.005;
        }

        // 边界检查
        const nd2 = posArr[ix] ** 2 + posArr[ix + 1] ** 2 + posArr[ix + 2] ** 2;
        if (nd2 > 2.25 || nd2 < 0.0225) {
          posArr[ix] = baseArr[ix];
          posArr[ix + 1] = baseArr[ix + 1];
          posArr[ix + 2] = baseArr[ix + 2];
        }
        moved = true;
      }
      if (moved) {
        this.flowPoints.geometry.attributes.position.needsUpdate = true;
      }
      this.flowPoints.rotation.y += sp.particleSpeed * dt * 0.5;
      this.flowPoints.material.opacity = (0.4 + sp.particleSpeed * 0.5) * breathOpacity;
    }

    // --- 能量闪烁 ---
    if (Math.random() < sp.pulseRate * 2) {
      this.spawnFlicker();
    }
    this.flickerSprites = this.flickerSprites.filter(f => {
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        f.sprite.visible = false;
        f.mat.opacity = 0;
        return false;
      }
      const p = f.age / f.maxAge;
      f.sprite.scale.setScalar(f.sprite.scale.x + p * 0.006);
      f.mat.opacity = Math.pow(1 - p, 1.5);
      return true;
    });

    // --- 错误态闪烁 ---
    if (sp.flickering) {
      const hueShift = Math.sin(t * 25) * 0.08;
      this.corePoint.material.color.setHSL(0.05 + hueShift, 0.9, 0.85);
      this.coreSprite.material.color.setHSL(0.04 + hueShift, 0.85, 0.9);
    } else {
      this.corePoint.material.color.setHSL(0.12, 0.2, 0.97);
      this.coreSprite.material.color.setHSL(0.12, 0.3, 1.0);
    }
  }
}

// ==================== Scene Setup ====================
const container = document.createElement('div');
document.body.appendChild(container);

const W = 400, H = 400;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
camera.position.z = 3.8;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.domElement.style.filter = 'brightness(1.6) contrast(1.3)';
container.appendChild(renderer.domElement);

const stateMgr = new StateManager();
const jarvis = new JarvisCore(scene);
const electronAPI = window.electronAPI || {
  onUpdateState: () => {},
  showContextMenu: () => {}
};
const previewParams = new URLSearchParams(window.location.search);

if (previewParams.has('debugBg')) {
  document.body.style.background = '#030509';
}

const previewState = previewParams.get('state');
if (previewState && STATE_PARAMS[previewState]) {
  stateMgr.setState(previewState, 0.8, 'browser-preview');
}

electronAPI.onUpdateState((data) => {
  stateMgr.setState(data.state, data.intensity, data.source || 'manual');
});

window.addEventListener('keydown', (e) => {
  const states = ['idle', 'waiting', 'thinking', 'responding', 'executing', 'error'];
  const n = parseInt(e.key);
  if (n >= 1 && n <= 6) stateMgr.setState(states[n - 1], 0.8, 'manual');
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  electronAPI.showContextMenu();
});

// ==================== Animation Loop ====================
let prevTime = performance.now() / 1000;
let frameInterval = 1 / 30; // 限制30fps
let lastFrameTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now() / 1000;
  const dt = Math.min(now - prevTime, 0.1);
  prevTime = now;

  // 帧率限制
  if (now - lastFrameTime < frameInterval) return;
  lastFrameTime = now;

  const sp = stateMgr.update(dt);
  jarvis.update(dt, sp);
  renderer.render(scene, camera);
}

animate();
console.log('[JARVIS] Ready - Holographic Core v3');
