import * as THREE from 'three';

export class CombatArena {
  constructor(scene) {
    this.scene = scene;
    this.particles = null;
    this.lights = [];
    this.buildStage();
    this.setupLighting();
    this.createAtmosphereParticles();
  }

  buildStage() {
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 1. Octagonal Main Platform
    const platformGeo = new THREE.CylinderGeometry(5.2, 5.6, 0.5, 8);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.35,
      metalness: 0.7
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.25;
    platform.receiveShadow = true;
    this.group.add(platform);

    // 2. Glowing Neon Border Rings on Stage Floor
    const borderGeo = new THREE.TorusGeometry(4.8, 0.04, 16, 32);
    borderGeo.rotateX(Math.PI / 2);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const borderRing = new THREE.Mesh(borderGeo, borderMat);
    borderRing.position.y = 0.01;
    this.group.add(borderRing);

    // Center divider neon line
    const dividerGeo = new THREE.PlaneGeometry(0.04, 5.0);
    dividerGeo.rotateX(-Math.PI / 2);
    const dividerMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.5
    });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.set(0, 0.015, 0);
    this.group.add(divider);

    // 3. Fighter Pedestal Rings (Clear visual indicator of Player vs CPU)
    // Player Ring (Left - Cyan)
    const pRingGeo = new THREE.RingGeometry(0.55, 0.65, 32);
    pRingGeo.rotateX(-Math.PI / 2);
    const pRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide
    });
    this.playerPedestal = new THREE.Mesh(pRingGeo, pRingMat);
    this.playerPedestal.position.set(-1.5, 0.02, 0);
    this.group.add(this.playerPedestal);

    // CPU Ring (Right - Magenta)
    const cRingGeo = new THREE.RingGeometry(0.55, 0.65, 32);
    cRingGeo.rotateX(-Math.PI / 2);
    const cRingMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      side: THREE.DoubleSide
    });
    this.cpuPedestal = new THREE.Mesh(cRingGeo, cRingMat);
    this.cpuPedestal.position.set(1.5, 0.02, 0);
    this.group.add(this.cpuPedestal);

    // 4. Subtle Floor Grid
    const grid = new THREE.GridHelper(8, 16, 0x00f3ff, 0x1e293b);
    grid.position.y = 0.01;
    this.group.add(grid);

    // 5. Backstage Cyber-Pillars (ONLY at the back so they NEVER block camera!)
    const backPillars = [
      [-3.5, -2.5], [-1.2, -3.2], [1.2, -3.2], [3.5, -2.5]
    ];
    backPillars.forEach(([x, z], idx) => {
      const pillarGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.5, 12);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.3
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 1.5, z);
      this.group.add(pillar);

      // Light beam cap
      const capMat = new THREE.MeshBasicMaterial({
        color: idx < 2 ? 0x00f3ff : 0xff0055
      });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), capMat);
      cap.position.set(x, 3.2, z);
      this.group.add(cap);
    });

    // 6. Horizon Neon Grid in the Background
    const horizonGeo = new THREE.PlaneGeometry(28, 10);
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0x050814,
      side: THREE.DoubleSide
    });
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    horizon.position.set(0, 4.5, -7.5);
    this.group.add(horizon);
  }

  setupLighting() {
    // Generous ambient light so nothing is pitch black
    const ambientLight = new THREE.AmbientLight(0x24324f, 2.5);
    this.scene.add(ambientLight);

    // Overhead Main Key Light
    const mainLight = new THREE.DirectionalLight(0xffffff, 3.0);
    mainLight.position.set(0, 6, 4);
    mainLight.castShadow = true;
    this.scene.add(mainLight);

    // Player Light (Bright Cyan)
    const playerLight = new THREE.PointLight(0x00f3ff, 5.0, 8);
    playerLight.position.set(-2.5, 2.2, 2.0);
    this.scene.add(playerLight);

    // CPU Light (Bright Magenta)
    const cpuLight = new THREE.PointLight(0xff0055, 5.0, 8);
    cpuLight.position.set(2.5, 2.2, 2.0);
    this.scene.add(cpuLight);

    // Front Fill Light
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.5);
    fillLight.position.set(0, 1.5, 5);
    this.scene.add(fillLight);
  }

  createAtmosphereParticles() {
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      speeds[i] = 0.15 + Math.random() * 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleSpeeds = speeds;

    const material = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.035,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  update(delta) {
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleSpeeds.length; i++) {
        positions[i * 3 + 1] += this.particleSpeeds[i] * delta * 0.4;
        if (positions[i * 3 + 1] > 4) {
          positions[i * 3 + 1] = 0.1;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.playerPedestal) this.playerPedestal.rotation.z += delta * 0.8;
    if (this.cpuPedestal) this.cpuPedestal.rotation.z -= delta * 0.8;
  }
}
