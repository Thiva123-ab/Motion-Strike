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
    // Stage Group
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 1. Octagonal Main Platform
    const platformGeo = new THREE.CylinderGeometry(5.2, 5.8, 0.6, 8);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c14,
      roughness: 0.25,
      metalness: 0.85
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.3;
    platform.receiveShadow = true;
    this.group.add(platform);

    // 2. Glowing Neon Border Rings
    const borderGeo = new THREE.TorusGeometry(5.22, 0.06, 16, 8);
    borderGeo.rotateX(Math.PI / 2);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: false
    });
    const borderRing = new THREE.Mesh(borderGeo, borderMat);
    borderRing.position.y = 0.01;
    this.group.add(borderRing);

    // Inner ring
    const innerBorderGeo = new THREE.TorusGeometry(3.6, 0.04, 16, 8);
    innerBorderGeo.rotateX(Math.PI / 2);
    const innerBorderMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.6
    });
    const innerRing = new THREE.Mesh(innerBorderGeo, innerBorderMat);
    innerRing.position.y = 0.01;
    this.group.add(innerRing);

    // 3. Grid Floor Pattern on Platform
    const grid = new THREE.GridHelper(9, 18, 0x00ffff, 0x1f293d);
    grid.position.y = 0.015;
    this.group.add(grid);

    // 4. Corner Pillars with Neon Emissive Strips
    const pillarPositions = [
      [-4.0, -2.5], [4.0, -2.5],
      [-4.0, 2.5], [4.0, 2.5],
      [-4.8, 0], [4.8, 0]
    ];

    pillarPositions.forEach(([x, z], idx) => {
      const pillarGeo = new THREE.CylinderGeometry(0.12, 0.16, 3.2, 12);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x151822,
        metalness: 0.9,
        roughness: 0.2
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 1.3, z);
      this.group.add(pillar);

      // Neon Top Cap
      const capColor = idx % 2 === 0 ? 0x00f3ff : 0xff0055;
      const capGeo = new THREE.SphereGeometry(0.16, 16, 16);
      const capMat = new THREE.MeshBasicMaterial({ color: capColor });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(x, 2.9, z);
      this.group.add(cap);
    });

    // 5. Energy Ropes / Barrier Beams
    const ropeHeights = [0.8, 1.5, 2.2];
    ropeHeights.forEach((h, rIdx) => {
      const ropeGeo = new THREE.TorusGeometry(4.7, 0.025, 8, 8);
      ropeGeo.rotateX(Math.PI / 2);
      const ropeMat = new THREE.MeshBasicMaterial({
        color: rIdx === 1 ? 0x00f3ff : 0xaa00ff,
        transparent: true,
        opacity: 0.45
      });
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.position.y = h;
      this.group.add(rope);
    });

    // 6. Cyberpunk Backdrop Wall / Horizon
    const bgPlaneGeo = new THREE.PlaneGeometry(35, 18);
    const bgPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x04060b,
      side: THREE.DoubleSide
    });
    const bgPlane = new THREE.Mesh(bgPlaneGeo, bgPlaneMat);
    bgPlane.position.set(0, 7, -9);
    this.group.add(bgPlane);

    // Backdrop neon horizon line
    const horizonGeo = new THREE.BoxGeometry(32, 0.06, 0.06);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    horizon.position.set(0, 1.8, -8.9);
    this.group.add(horizon);
  }

  setupLighting() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x0e1322, 1.2);
    this.scene.add(ambientLight);

    // Overhead Main Arena Spotlight
    const mainSpot = new THREE.SpotLight(0xffffff, 4.5);
    mainSpot.position.set(0, 8.5, 2);
    mainSpot.angle = Math.PI / 3.8;
    mainSpot.penumbra = 0.6;
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 1024;
    mainSpot.shadow.mapSize.height = 1024;
    this.scene.add(mainSpot);
    this.lights.push(mainSpot);

    // Player Neon Rim Light (Cyan)
    const playerLight = new THREE.PointLight(0x00f3ff, 4.0, 10);
    playerLight.position.set(-3.5, 2.5, 1.5);
    this.scene.add(playerLight);
    this.lights.push(playerLight);

    // CPU Neon Rim Light (Magenta / Crimson)
    const cpuLight = new THREE.PointLight(0xff0055, 4.0, 10);
    cpuLight.position.set(3.5, 2.5, 1.5);
    this.scene.add(cpuLight);
    this.lights.push(cpuLight);

    // Fog for depth
    this.scene.fog = new THREE.FogExp2(0x040711, 0.05);
  }

  createAtmosphereParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      speeds[i] = 0.2 + Math.random() * 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleSpeeds = speeds;

    const material = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.04,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  update(delta) {
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleSpeeds.length; i++) {
        positions[i * 3 + 1] += this.particleSpeeds[i] * delta * 0.5;
        if (positions[i * 3 + 1] > 5) {
          positions[i * 3 + 1] = 0.1;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
}
