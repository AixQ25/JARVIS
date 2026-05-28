import * as THREE from 'three';

console.log('[JARVIS] Starting...');

// ==================== State Manager ====================
const STATE_PARAMS = {
  idle:       { coreGlow: 0.3, arcSpeed: 0.2, circuitBright: 0.3, pulseRate: 0.003, scanSpeed: 0.3, particleSpeed: 0.3, flickering: false },
  waiting:    { coreGlow: 0.5, arcSpeed: 0.4, circuitBright: 0.5, pulseRate: 0.008, scanSpeed: 0.5, particleSpeed: 0.5, flickering: false },
  thinking:   { coreGlow: 1.0, arcSpeed: 1.0, circuitBright: 1.0, pulseRate: 0.025, scanSpeed: 1.2, particleSpeed: 1.2, flickering: false },
  responding: { coreGlow: 0.7, arcSpeed: 0.6, circuitBright: 0.7, pulseRate: 0.015, scanSpeed: 0.7, particleSpeed: 0.8, flickering: false },
  executing:  { coreGlow: 0.6, arcSpeed: 0.5, circuitBright: 0.8, pulseRate: 0.01,  scanSpeed: 0.6, particleSpeed: 0.7, flickering: false },
  error:      { coreGlow: 1.3, arcSpeed: 1.5, circuitBright: 1.2, pulseRate: 0.04,  scanSpeed: 1.5, particleSpeed: 1.5, flickering: true  }
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
function makeGlowTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.1, 'rgba(255,240,200,0.9)');
  g.addColorStop(0.3, 'rgba(255,200,100,0.5)');
  g.addColorStop(0.6, 'rgba(255,160,50,0.2)');
  g.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeCoreTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  // 中心白热
  const g1 = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g1.addColorStop(0, 'rgba(255,255,255,1)');
  g1.addColorStop(0.05, 'rgba(255,250,230,0.95)');
  g1.addColorStop(0.15, 'rgba(255,220,150,0.7)');
  g1.addColorStop(0.3, 'rgba(255,180,80,0.4)');
  g1.addColorStop(0.5, 'rgba(255,140,40,0.15)');
  g1.addColorStop(1, 'rgba(255,100,20,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// ==================== Jarvis Holographic Core ====================
class JarvisCore {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    
    this.glowTex = makeGlowTexture();
    this.coreTex = makeCoreTexture();
    
    this.mechanicalCore = null;
    this.concentricRings = [];
    this.hudLines = [];
    this.circuitNetwork = [];
    this.dataNodes = [];
    this.brokenArcs = [];
    this.flowParticles = null;
    this.flowData = null;
    this.scanDiscs = [];
    this.energyPulses = [];
    this.bottomLight = null;
    
    this.time = 0;
    this.init();
  }

  init() {
    this.createMechanicalCore();
    this.createConcentricRings();
    this.createHUDLines();
    this.createCircuitNetwork();
    this.createBrokenArcs();
    this.createFlowParticles();
    this.createScanDiscs();
    this.createBottomLight();
  }

  // ========== 1. Mechanical Pupil Core (机械瞳孔式核心) ==========
  createMechanicalCore() {
    // 最中心：极亮白热小球
    const innerGeo = new THREE.SphereGeometry(0.05, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 1.0
    });
    this.mechanicalCore = new THREE.Mesh(innerGeo, innerMat);
    this.group.add(this.mechanicalCore);

    // 核心光晕Sprite
    const spriteMat = new THREE.SpriteMaterial({
      map: this.coreTex,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.coreSprite = new THREE.Sprite(spriteMat);
    this.coreSprite.scale.setScalar(0.6);
    this.group.add(this.coreSprite);

    // 多层球形光晕（从白金→橙金→深橙）
    const layers = [
      { size: 0.08, color: 0xFFFDE7, opacity: 0.9 },
      { size: 0.12, color: 0xFFF8E1, opacity: 0.7 },
      { size: 0.18, color: 0xFFE082, opacity: 0.5 },
      { size: 0.25, color: 0xFFD54F, opacity: 0.35 },
      { size: 0.35, color: 0xFFB300, opacity: 0.2 },
      { size: 0.5,  color: 0xFF8F00, opacity: 0.1 },
      { size: 0.7,  color: 0xFF6F00, opacity: 0.05 }
    ];

    this.coreGlowLayers = [];
    for (const l of layers) {
      const geo = new THREE.SphereGeometry(l.size, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: l.color,
        transparent: true,
        opacity: l.opacity,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      this.coreGlowLayers.push(mesh);
      this.group.add(mesh);
    }
  }

  // ========== 2. Concentric Rings (机械瞄准器同心圆) ==========
  createConcentricRings() {
    const ringCount = 5;
    for (let i = 0; i < ringCount; i++) {
      const r = 0.15 + i * 0.1;
      const n = 100 + i * 20;
      const points = [];

      for (let j = 0; j < n; j++) {
        const t = j / n;
        const a = t * Math.PI * 2;
        // 微小的不规则
        const wobble = Math.sin(a * (3 + i)) * 0.005;
        points.push(new THREE.Vector3(
          Math.cos(a) * (r + wobble),
          Math.sin(a) * (r + wobble) * 0.15, // 压扁成椭圆
          Math.sin(a) * (r + wobble)
        ));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.08, 0.9, 0.6),
        transparent: true,
        opacity: 0.25 + i * 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Line(geo, mat);
      ring.userData = { speed: 0.3 + i * 0.15, tilt: (i * 35) * Math.PI / 180 };
      this.concentricRings.push(ring);
      this.group.add(ring);
    }
  }

  // ========== 3. HUD Lines (HUD界面线框) ==========
  createHUDLines() {
    // 十字准线
    const crossLen = 1.5;
    const crossPoints = [
      [-crossLen, 0, 0], [crossLen, 0, 0],
      [0, -crossLen, 0], [0, crossLen, 0],
      [0, 0, -crossLen], [0, 0, crossLen]
    ];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...crossPoints[i*2]),
        new THREE.Vector3(...crossPoints[i*2+1])
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: 0xFF8F00,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.Line(geo, mat);
      this.hudLines.push(line);
      this.group.add(line);
    }

    // 角标记（四个角的L形标记）
    const cornerSize = 0.3;
    const cornerDist = 0.8;
    const corners = [
      { x: cornerDist, y: cornerDist },
      { x: -cornerDist, y: cornerDist },
      { x: cornerDist, y: -cornerDist },
      { x: -cornerDist, y: -cornerDist }
    ];
    for (const c of corners) {
      const points = [
        new THREE.Vector3(c.x - Math.sign(c.x) * cornerSize, c.y, 0),
        new THREE.Vector3(c.x, c.y, 0),
        new THREE.Vector3(c.x, c.y - Math.sign(c.y) * cornerSize, 0)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0xFFB300,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.Line(geo, mat);
      this.hudLines.push(line);
      this.group.add(line);
    }
  }

  // ========== 4. Circuit Network (全息电路线) ==========
  createCircuitNetwork() {
    const nodeCount = 16;
    const nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.6;
      nodes.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ));
    }

    // 每个节点连接2-3个最近的节点
    for (let i = 0; i < nodeCount; i++) {
      const distances = nodes.map((n, j) => ({
        dist: nodes[i].distanceTo(n),
        idx: j
      })).filter(d => d.idx !== i).sort((a, b) => a.dist - b.dist);

      const connectCount = 2 + Math.floor(Math.random() * 2);
      for (let c = 0; c < connectCount && c < distances.length; c++) {
        const target = distances[c].idx;
        const start = nodes[i];
        const end = nodes[target];

        // 折线路径（带拐角，像电路板走线）
        const mid = new THREE.Vector3(
          (start.x + end.x) / 2 + (Math.random() - 0.5) * 0.15,
          (start.y + end.y) / 2 + (Math.random() - 0.5) * 0.15,
          (start.z + end.z) / 2 + (Math.random() - 0.5) * 0.15
        );

        const linePoints = [];
        const segments = 20;
        for (let s = 0; s <= segments; s++) {
          const t = s / segments;
          const p = new THREE.Vector3();
          if (t < 0.5) {
            p.lerpVectors(start, mid, t * 2);
          } else {
            p.lerpVectors(mid, end, (t - 0.5) * 2);
          }
          linePoints.push(p);
        }

        // 外层光晕
        const glowGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const glowMat = new THREE.LineBasicMaterial({
          color: 0xFF6F00,
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const glowLine = new THREE.Line(glowGeo, glowMat);
        this.circuitNetwork.push(glowLine);
        this.group.add(glowLine);

        // 内层亮线
        const coreGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const coreMat = new THREE.LineBasicMaterial({
          color: 0xFFB300,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const coreLine = new THREE.Line(coreGeo, coreMat);
        this.circuitNetwork.push(coreLine);
        this.group.add(coreLine);
      }
    }

    // 数据节点
    for (const node of nodes) {
      const nodeGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: 0xFFD54F,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(node);
      this.dataNodes.push(nodeMesh);
      this.group.add(nodeMesh);
    }
  }

  // ========== 5. Broken Arcs (粒子化数据轨道) ==========
  createBrokenArcs() {
    const arcConfigs = [
      { r: 0.65, tilt: 20, gapEvery: 3 },
      { r: 0.75, tilt: 55, gapEvery: 4 },
      { r: 0.85, tilt: -25, gapEvery: 3 },
      { r: 0.95, tilt: 70, gapEvery: 4 },
      { r: 1.05, tilt: 40, gapEvery: 3 },
      { r: 1.15, tilt: -50, gapEvery: 4 },
      { r: 1.25, tilt: 15, gapEvery: 3 },
      { r: 1.35, tilt: 80, gapEvery: 4 },
    ];

    for (const cfg of arcConfigs) {
      const orbitR = cfg.r;
      const tilt = cfg.tilt * Math.PI / 180;
      const totalSegs = 12;
      const points = [];
      const colors = [];

      const startAngle = Math.random() * Math.PI * 2;
      const segArc = (Math.PI * 2) / totalSegs;

      for (let s = 0; s < totalSegs; s++) {
        if (s % cfg.gapEvery === 0) continue; // 规律性断裂

        const segStart = startAngle + s * segArc;
        const ptsInSeg = 30;

        for (let j = 0; j < ptsInSeg; j++) {
          const t = j / ptsInSeg;
          const a = segStart + t * segArc;
          const x = Math.cos(a) * orbitR;
          const y = Math.sin(a) * orbitR * Math.cos(tilt);
          const z = Math.sin(a) * orbitR * Math.sin(tilt);
          points.push(new THREE.Vector3(x, y, z));

          // 颜色：段中间更亮
          const brightness = Math.sin(t * Math.PI);
          colors.push(1.0, 0.7 + brightness * 0.2, 0.1 + brightness * 0.15);
        }
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.05,
        map: this.glowTex,
        transparent: true,
        opacity: 0.85,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const arc = new THREE.Points(geo, mat);
      arc.userData = { tilt, speed: 0.15 + Math.random() * 0.25 };
      this.brokenArcs.push(arc);
      this.group.add(arc);
    }
  }

  // ========== 6. Flow Particles (粒子流残影) ==========
  createFlowParticles() {
    const n = 2500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const basePos = new Float32Array(n * 3);
    const speeds = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const dense = Math.random() < 0.35;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = dense ? (0.4 + Math.random() * 0.4) : (0.6 + Math.random() * 0.9);

      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      basePos[i*3] = pos[i*3];
      basePos[i*3+1] = pos[i*3+1];
      basePos[i*3+2] = pos[i*3+2];

      // 金橙色，高亮
      const t = Math.random();
      col[i*3]   = 1.0;
      col[i*3+1] = 0.65 + t * 0.3;
      col[i*3+2] = 0.08 + t * 0.18;

      speeds[i] = 0.4 + Math.random() * 1.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.06,
      map: this.glowTex,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flowParticles = new THREE.Points(geo, mat);
    this.flowData = { basePos, speeds };
    this.group.add(this.flowParticles);
  }

  // ========== 7. Scan Discs (半透明机械圆盘) ==========
  createScanDiscs() {
    for (let i = 0; i < 2; i++) {
      const r = 0.7 + i * 0.35;
      const n = 80;
      const points = [];
      const colors = [];

      for (let j = 0; j < n; j++) {
        const t = j / n;
        const a = t * Math.PI * 2;
        // 断续效果
        const visible = Math.sin(a * 8 + i * 2) > -0.3;
        if (visible) {
          points.push(new THREE.Vector3(
            Math.cos(a) * r,
            0,
            Math.sin(a) * r
          ));
          const bright = 0.5 + Math.sin(a * 3) * 0.3;
          colors.push(1.0, bright + 0.3, 0.1 + bright * 0.2);
        }
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.04,
        map: this.glowTex,
        transparent: true,
        opacity: 0.6,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const disc = new THREE.Points(geo, mat);
      disc.userData = { speed: 0.8 + i * 0.4, tilt: (i * 50) * Math.PI / 180 };
      this.scanDiscs.push(disc);
      this.group.add(disc);
    }
  }

  // ========== 8. Bottom Light ==========
  createBottomLight() {
    const n = 120;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 0.4;
      pos[i*3]   = Math.cos(a) * r;
      pos[i*3+1] = -1.0 - Math.random() * 0.5;
      pos[i*3+2] = Math.sin(a) * r;
      col[i*3]   = 0.3;
      col[i*3+1] = 0.5;
      col[i*3+2] = 0.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.035,
      map: this.glowTex,
      transparent: true,
      opacity: 0.25,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.bottomLight = new THREE.Points(geo, mat);
    this.group.add(this.bottomLight);
  }

  // ========== Energy Pulse ==========
  spawnPulse(origin) {
    const n = 35 + Math.floor(Math.random() * 25);
    const pos = new Float32Array(n * 3);
    const vel = [];
    const col = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.4 + Math.random() * 1.2;
      vel.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
      pos[i*3] = origin.x;
      pos[i*3+1] = origin.y;
      pos[i*3+2] = origin.z;
      col[i*3] = 1.0;
      col[i*3+1] = 0.75 + Math.random() * 0.2;
      col[i*3+2] = 0.2 + Math.random() * 0.15;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.07,
      map: this.glowTex,
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
      maxAge: 0.8 + Math.random() * 0.4
    });
  }

  // ========== Update ==========
  update(time, sp) {
    this.time = time;
    const dt = 0.016;

    // --- Mechanical Core ---
    const pulse = 1.0 + Math.sin(time * 3) * 0.2;
    const coreScale = pulse * (0.7 + sp.coreGlow * 0.6);
    this.mechanicalCore.scale.setScalar(coreScale);
    this.mechanicalCore.material.opacity = 0.9 + sp.coreGlow * 0.1;

    this.coreSprite.scale.setScalar(0.6 + sp.coreGlow * 0.4 + Math.sin(time * 2) * 0.05);
    this.coreSprite.material.opacity = 0.8 + sp.coreGlow * 0.2;

    this.coreGlowLayers.forEach((glow, i) => {
      const s = coreScale * (1.6 + i * 1.0);
      glow.scale.setScalar(s);
      glow.material.opacity = (0.5 - i * 0.06) * sp.coreGlow;
    });

    // --- Concentric Rings ---
    this.concentricRings.forEach(ring => {
      ring.rotation.y += ring.userData.speed * sp.scanSpeed * 0.016;
      ring.rotation.x = ring.userData.tilt;
      ring.material.opacity = 0.2 + sp.circuitBright * 0.3;
    });

    // --- HUD Lines ---
    this.hudLines.forEach(line => {
      line.rotation.y += 0.002;
      line.material.opacity = 0.06 + sp.circuitBright * 0.08;
    });

    // --- Circuit Network ---
    this.circuitNetwork.forEach(line => {
      const isGlow = line.material.color.r < 0.5;
      line.material.opacity = isGlow ? 
        (0.08 + sp.circuitBright * 0.1) : 
        (0.3 + sp.circuitBright * 0.4);
    });

    // --- Data Nodes ---
    this.dataNodes.forEach((node, i) => {
      const flicker = Math.sin(time * 5 + i * 2) * 0.3 + 0.7;
      node.material.opacity = flicker * (0.5 + sp.circuitBright * 0.5);
      node.scale.setScalar(0.8 + Math.sin(time * 3 + i) * 0.2);
    });

    // --- Broken Arcs ---
    this.brokenArcs.forEach(arc => {
      arc.rotation.y += arc.userData.speed * sp.arcSpeed * 0.016;
      arc.rotation.z += arc.userData.speed * sp.arcSpeed * 0.005;
      arc.material.opacity = 0.6 + sp.arcSpeed * 0.3;
      if (sp.flickering) {
        arc.rotation.y += Math.sin(time * 20) * 0.05;
        arc.rotation.z += Math.cos(time * 15) * 0.05;
      }
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
        pos[ix]   += (-y / d) * speed * spd[i];
        pos[ix+1] += (x / d) * speed * spd[i];

        if (sp.particleSpeed > 1.0) {
          const f = (sp.particleSpeed - 1.0) * 0.001;
          pos[ix]   -= x / d * f;
          pos[ix+1] -= y / d * f;
          pos[ix+2] -= z / d * f;
        }

        const nd = Math.sqrt(pos[ix]*pos[ix] + pos[ix+1]*pos[ix+1] + pos[ix+2]*pos[ix+2]);
        if (nd > 1.6 || nd < 0.25) {
          pos[ix] = bp[ix]; pos[ix+1] = bp[ix+1]; pos[ix+2] = bp[ix+2];
        }
      }
      this.flowParticles.geometry.attributes.position.needsUpdate = true;
      this.flowParticles.rotation.y += sp.particleSpeed * 0.001;
      this.flowParticles.material.opacity = 0.6 + sp.particleSpeed * 0.2;
    }

    // --- Scan Discs ---
    this.scanDiscs.forEach(disc => {
      disc.rotation.y += disc.userData.speed * sp.scanSpeed * 0.016;
      disc.rotation.x = disc.userData.tilt;
      disc.material.opacity = 0.4 + sp.scanSpeed * 0.3;
    });

    // --- Bottom Light ---
    if (this.bottomLight) {
      this.bottomLight.material.opacity = 0.15 + sp.coreGlow * 0.1;
    }

    // --- Energy Pulses ---
    if (Math.random() < sp.pulseRate) {
      const origin = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
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
      pulse.mat.size = 0.07 * (1.0 - progress * 0.5);
      return true;
    });

    // --- Error flickering ---
    if (sp.flickering) {
      this.mechanicalCore.material.color.setHSL(
        0.08 + Math.sin(time * 20) * 0.05, 0.9, 0.9
      );
    } else {
      this.mechanicalCore.material.color.setHSL(0.12, 0.5, 0.95);
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

const stateMgr = new StateManager();
const jarvis = new JarvisCore(scene);

window.electronAPI.onUpdateState((data) => {
  stateMgr.setState(data.state, data.intensity, data.source || 'manual');
});

window.addEventListener('keydown', (e) => {
  const states = ['idle','waiting','thinking','responding','executing','error'];
  const n = parseInt(e.key);
  if (n >= 1 && n <= 6) stateMgr.setState(states[n-1], 0.8, 'manual');
});

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
console.log('[JARVIS] Ready - Holographic Core v3');
