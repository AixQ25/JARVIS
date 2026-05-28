import * as THREE from 'three';

console.log('[JARVIS] Starting...');

// ==================== State Manager ====================
const STATE_PARAMS = {
  idle:       { particleSpeed: 0.3, colorShift: 0.0,  ringSpeed: 0.3, arcSpeed: 0.2, bloom: 0.5, flickering: false },
  waiting:    { particleSpeed: 0.5, colorShift: 0.1,  ringSpeed: 0.4, arcSpeed: 0.3, bloom: 0.7, flickering: false },
  thinking:   { particleSpeed: 1.2, colorShift: 0.3,  ringSpeed: 1.0, arcSpeed: 0.8, bloom: 1.0, flickering: false },
  responding: { particleSpeed: 0.8, colorShift: 0.2,  ringSpeed: 0.6, arcSpeed: 0.5, bloom: 0.9, flickering: false },
  executing:  { particleSpeed: 0.7, colorShift: 0.15, ringSpeed: 0.5, arcSpeed: 0.4, bloom: 0.7, flickering: false },
  error:      { particleSpeed: 1.5, colorShift: -0.5, ringSpeed: 1.2, arcSpeed: 1.0, bloom: 1.2, flickering: true  }
};

// 状态优先级：数值越高越优先
const STATE_PRIORITY = {
  idle: 1,
  waiting: 2,
  responding: 3,
  thinking: 4,
  executing: 5,
  error: 6
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
    this.source = 'manual'; // manual | claude | opencode
    this.sourceTimestamp = 0;
  }

  setState(state, intensity = 0.5, source = 'manual') {
    if (!STATE_PARAMS[state]) return;
    
    const newPriority = STATE_PRIORITY[state] || 0;
    const currentPriority = STATE_PRIORITY[this.currentStateName] || 0;
    const now = Date.now();
    
    // 优先级规则：
    // 1. 高优先级状态总是覆盖低优先级
    // 2. 同优先级时，最新来源覆盖旧来源
    // 3. 同来源时，总是更新
    const shouldUpdate = 
      newPriority > currentPriority || 
      (newPriority === currentPriority && source === this.source) ||
      source === 'manual'; // 手动总是覆盖
    
    if (!shouldUpdate) {
      console.log(`[State] Ignored ${state} from ${source} (current: ${this.currentStateName} from ${this.source})`);
      return;
    }
    
    this.from = { ...this.current };
    this.target = { ...STATE_PARAMS[state] };
    this.progress = 0.0;
    this.intensity = intensity;
    this.duration = state === 'error' ? 0.3 : 0.8;
    this.currentStateName = state;
    this.source = source;
    this.sourceTimestamp = now;
    
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
    const p = { ...this.current };
    p.particleSpeed *= this.intensity;
    p.bloom *= this.intensity;
    return p;
  }
}

// ==================== Particle Texture ====================
function makeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ==================== Particle System ====================
class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.tex = makeTexture();
    this.core = null;
    this.coreGlow = null;
    this.rings = [];
    this.flow = null;
    this.arcs = [];
    this.bottom = null;
    this.time = 0;
    this.flowData = null;
    this.init();
  }

  init() {
    this.createCore();
    this.createRings();
    this.createFlow();
    this.createArcs();
    this.createBottom();
  }

  createCore() {
    const geo = new THREE.SphereGeometry(0.15, 32, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xFFF8E1, transparent: true, opacity: 0.9 });
    this.core = new THREE.Mesh(geo, mat);
    this.scene.add(this.core);

    const gGeo = new THREE.SphereGeometry(0.25, 32, 32);
    const gMat = new THREE.MeshBasicMaterial({ color: 0xFFD54F, transparent: true, opacity: 0.3, side: THREE.BackSide });
    this.coreGlow = new THREE.Mesh(gGeo, gMat);
    this.scene.add(this.coreGlow);
  }

  createRings() {
    const tilts = [15, 45, -30, 70];
    for (let i = 0; i < 4; i++) {
      const n = 300;
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const r = 0.6 + i * 0.15;
      const tilt = tilts[i] * Math.PI / 180;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r * Math.cos(tilt);
        const z = Math.sin(a) * r * Math.sin(tilt);
        pos[j*3] = x; pos[j*3+1] = y; pos[j*3+2] = z;
        const t = j / n;
        col[j*3]   = 1.0;
        col[j*3+1] = 0.7 - t * 0.14;
        col[j*3+2] = t * 0.0;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 0.1, map: this.tex, transparent: true, opacity: 1.0, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.Points(geo, mat);
      ring.userData = { speed: 0.3 + i * 0.1 };
      this.rings.push(ring);
      this.scene.add(ring);
    }
  }

  createFlow() {
    const n = 2000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const basePos = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 0.8 + Math.random() * 0.6;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      basePos[i*3] = pos[i*3];
      basePos[i*3+1] = pos[i*3+1];
      basePos[i*3+2] = pos[i*3+2];

      const t = Math.random();
      col[i*3]   = 1.0;
      col[i*3+1] = 0.76 - t * 0.32;
      col[i*3+2] = 0.03 + t * 0.0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.08, map: this.tex, transparent: true, opacity: 0.9, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.flow = new THREE.Points(geo, mat);
    this.flowData = { basePos };
    this.scene.add(this.flow);
  }

  createArcs() {
    for (let i = 0; i < 5; i++) {
      const n = 100;
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const orbitR = 1.0 + i * 0.2;
      const tilt = (i * 72) * Math.PI / 180;
      const arcLen = Math.PI * (0.3 + Math.random() * 0.4);
      const arcStart = Math.random() * Math.PI * 2;

      for (let j = 0; j < n; j++) {
        const t = j / n;
        const a = arcStart + t * arcLen;
        const x = Math.cos(a) * orbitR;
        const y = Math.sin(a) * orbitR * Math.cos(tilt);
        const z = Math.sin(a) * orbitR * Math.sin(tilt);
        pos[j*3] = x; pos[j*3+1] = y; pos[j*3+2] = z;
        const brightness = Math.sin(t * Math.PI);
        col[j*3]   = 1.0;
        col[j*3+1] = 0.84 + brightness * 0.16;
        col[j*3+2] = 0.31 + brightness * 0.69;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 0.08, map: this.tex, transparent: true, opacity: 0.9, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const arc = new THREE.Points(geo, mat);
      arc.userData = { tilt, speed: 0.1 + i * 0.05 };
      this.arcs.push(arc);
      this.scene.add(arc);
    }
  }

  createBottom() {
    const n = 200;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.5;
      pos[i*3]   = Math.cos(a) * r;
      pos[i*3+1] = -1.2 - Math.random() * 0.8;
      pos[i*3+2] = Math.sin(a) * r;
      const t = Math.random();
      col[i*3]   = 0.31 - t * 0.23;
      col[i*3+1] = 0.76 - t * 0.36;
      col[i*3+2] = 0.97 - t * 0.22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.06, map: this.tex, transparent: true, opacity: 0.7, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.bottom = new THREE.Points(geo, mat);
    this.scene.add(this.bottom);
  }

  update(time, sp) {
    this.time = time;

    // Core
    const pulse = Math.sin(time * 2) * 0.05 + 1.0;
    const sc = pulse * (0.8 + sp.bloom * 0.4);
    this.core.scale.setScalar(sc);
    this.coreGlow.scale.setScalar(sc * 1.5);
    this.core.material.color.setHSL(0.12 + sp.colorShift * 0.1, 0.8, 0.9);
    this.coreGlow.material.color.setHSL(0.12 + sp.colorShift * 0.1, 0.8, 0.7);

    // Rings
    this.rings.forEach((r, i) => {
      r.rotation.z += r.userData.speed * sp.ringSpeed * 0.016;
      r.material.opacity = 0.6 + sp.ringSpeed * 0.2;
    });

    // Flow
    const pos = this.flow.geometry.attributes.position.array;
    const bp = this.flowData.basePos;
    const speed = sp.particleSpeed * 0.003;
    for (let i = 0, len = pos.length / 3; i < len; i++) {
      const ix = i * 3;
      const x = pos[ix], y = pos[ix+1], z = pos[ix+2];
      const d = Math.sqrt(x*x + y*y + z*z) || 1;
      const tx = -y / d, ty = x / d;
      pos[ix]   += tx * speed;
      pos[ix+1] += ty * speed;
      if (sp.particleSpeed > 1.0) {
        const f = (sp.particleSpeed - 1.0) * 0.001;
        pos[ix]   -= x / d * f;
        pos[ix+1] -= y / d * f;
        pos[ix+2] -= z / d * f;
      }
      const nd = Math.sqrt(pos[ix]*pos[ix] + pos[ix+1]*pos[ix+1] + pos[ix+2]*pos[ix+2]);
      if (nd > 1.8 || nd < 0.5) {
        pos[ix] = bp[ix]; pos[ix+1] = bp[ix+1]; pos[ix+2] = bp[ix+2];
      }
    }
    this.flow.geometry.attributes.position.needsUpdate = true;
    this.flow.rotation.y += sp.particleSpeed * 0.002;

    // Arcs
    this.arcs.forEach((a, i) => {
      a.rotation.x += a.userData.speed * sp.arcSpeed * 0.016;
      a.rotation.y += a.userData.speed * sp.arcSpeed * 0.011;
      a.rotation.z = a.userData.tilt;
      if (sp.flickering) {
        a.rotation.x += Math.sin(time * 20) * 0.1;
        a.rotation.y += Math.cos(time * 15) * 0.1;
      }
    });

    // Bottom
    const bpos = this.bottom.geometry.attributes.position.array;
    for (let i = 0, len = bpos.length / 3; i < len; i++) {
      bpos[i*3+1] += Math.sin(time + i) * 0.0002;
    }
    this.bottom.geometry.attributes.position.needsUpdate = true;
    this.bottom.material.opacity = 0.3 + sp.bloom * 0.2;
  }
}

// ==================== Scene Setup ====================
const container = document.createElement('div');
document.body.appendChild(container);

const W = 400, H = 400;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.domElement.style.filter = 'brightness(1.2) contrast(1.1)';
container.appendChild(renderer.domElement);

// Systems
const stateMgr = new StateManager();
const particles = new ParticleSystem(scene);

// IPC: receive state from main process
window.electronAPI.onUpdateState((data) => {
  stateMgr.setState(data.state, data.intensity, data.source || 'manual');
});

// Dev: keyboard state switch (always manual)
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

  particles.update(time, sp);
  renderer.render(scene, camera);
}

animate();
console.log('[JARVIS] Ready');
