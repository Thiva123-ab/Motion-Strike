import * as THREE from 'three';
import { TextureGenerator } from './textures.js';

export class CombatArena {
  constructor(scene) {
    this.scene = scene;
    this.particles = null;
    this.lights = [];
    this.flashbulbs = [];
    this.buildStage();
    this.setupLighting();
    this.createAtmosphereParticles();
  }

  buildStage() {
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 1. Realistic Canvas Ring Platform (Square 6.5m x 6.5m)
    const ringSize = 6.4;
    const canvasTex = TextureGenerator.createRingCanvasTexture();
    const canvasMat = new THREE.MeshStandardMaterial({
      map: canvasTex,
      roughness: 0.85,
      metalness: 0.05
    });
    const platformGeo = new THREE.BoxGeometry(ringSize, 0.45, ringSize);
    const platform = new THREE.Mesh(platformGeo, canvasMat);
    platform.position.y = -0.225;
    platform.receiveShadow = true;
    this.group.add(platform);

    // Ring Apron Skirting (Dark navy canvas with championship trim)
    const skirtGeo = new THREE.BoxGeometry(ringSize + 0.1, 0.4, ringSize + 0.1);
    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x0a1122,
      roughness: 0.9,
      metalness: 0.1
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = -0.4;
    this.group.add(skirt);

    // 2. Realistic 4 Corner Posts & Turnbuckles
    const postRadius = 0.08;
    const postHeight = 2.6;
    const half = (ringSize / 2) - 0.25;

    // Corner definitions: Blue (Player), Red (CPU), White (Neutral)
    const corners = [
      { x: -half, z: -half, color: 0x1d4ed8, isPlayer: true },  // Blue
      { x: half, z: -half, color: 0xb91c1c, isCpu: true },     // Red
      { x: -half, z: half, color: 0xffffff },                    // Neutral White
      { x: half, z: half, color: 0xffffff }                      // Neutral White
    ];

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25
    });

    corners.forEach(c => {
      // Steel Corner Post
      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius * 1.2, postHeight, 16);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(c.x, postHeight / 2 - 0.2, c.z);
      post.castShadow = true;
      this.group.add(post);

      // Protective Corner Pad (Padded leather cushion)
      const padGeo = new THREE.BoxGeometry(0.24, 1.45, 0.24);
      const padMat = new THREE.MeshStandardMaterial({
        color: c.color,
        roughness: 0.4,
        metalness: 0.15
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(c.x, 1.05, c.z);
      this.group.add(pad);
    });

    // 3. Realistic 4 Ring Ropes (Wrapped with tension)
    const ropeHeights = [0.45, 0.85, 1.25, 1.65];
    const ropeColors = [0x1d4ed8, 0xffffff, 0xb91c1c, 0xffffff];

    ropeHeights.forEach((h, idx) => {
      const ropeMat = new THREE.MeshStandardMaterial({
        color: ropeColors[idx],
        roughness: 0.5,
        metalness: 0.2
      });

      // 4 sides of ropes
      const ropeThick = 0.024;
      const ropeLen = ringSize - 0.5;

      // Back rope
      const backRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeThick, ropeThick, ropeLen, 8), ropeMat);
      backRope.rotation.z = Math.PI / 2;
      backRope.position.set(0, h, -half);
      this.group.add(backRope);

      // Left rope (Behind player)
      const leftRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeThick, ropeThick, ropeLen, 8), ropeMat);
      leftRope.rotation.x = Math.PI / 2;
      leftRope.position.set(-half, h, 0);
      this.group.add(leftRope);

      // Right rope (Behind CPU)
      const rightRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeThick, ropeThick, ropeLen, 8), ropeMat);
      rightRope.rotation.x = Math.PI / 2;
      rightRope.position.set(half, h, 0);
      this.group.add(rightRope);

      // Front rope (Lowered slightly so it never blocks fighter camera view)
      if (h < 1.0) {
        const frontRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeThick, ropeThick, ropeLen, 8), ropeMat);
        frontRope.rotation.z = Math.PI / 2;
        frontRope.position.set(0, h * 0.75, half);
        this.group.add(frontRope);
      }
    });

    // 4. Realistic Overhead Stadium Truss Scaffolding
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.95,
      roughness: 0.3
    });
    const trussSize = 7.5;
    const trussH = 5.2;

    // Truss square frame
    const barGeoX = new THREE.BoxGeometry(trussSize, 0.15, 0.15);
    const barGeoZ = new THREE.BoxGeometry(0.15, 0.15, trussSize);

    const t1 = new THREE.Mesh(barGeoX, trussMat);
    t1.position.set(0, trussH, -trussSize / 2);
    const t2 = new THREE.Mesh(barGeoX, trussMat);
    t2.position.set(0, trussH, trussSize / 2);
    const t3 = new THREE.Mesh(barGeoZ, trussMat);
    t3.position.set(-trussSize / 2, trussH, 0);
    const t4 = new THREE.Mesh(barGeoZ, trussMat);
    t4.position.set(trussSize / 2, trussH, 0);
    this.group.add(t1, t2, t3, t4);

    // 4 Heavy Hanging Stadium Floodlights
    const floodlightPositions = [
      [-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]
    ];
    floodlightPositions.forEach(([x, z]) => {
      const lampGeo = new THREE.CylinderGeometry(0.28, 0.38, 0.45, 16);
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8 });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(x, trussH - 0.25, z);
      lamp.rotation.x = Math.PI;
      this.group.add(lamp);

      // Glowing lens bulb
      const bulbGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x, trussH - 0.45, z);
      this.group.add(bulb);
    });

    // 5. Realistic Stadium Crowd Curved Backdrop
    const stadiumTex = TextureGenerator.createStadiumBackdropTexture();
    const stadiumGeo = new THREE.CylinderGeometry(18, 18, 12, 32, 1, true, -Math.PI / 1.5, Math.PI * 1.33);
    const stadiumMat = new THREE.MeshBasicMaterial({
      map: stadiumTex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.85
    });
    const stadium = new THREE.Mesh(stadiumGeo, stadiumMat);
    stadium.position.set(0, 4.5, 0);
    this.group.add(stadium);
  }

  setupLighting() {
    // Realistic Warm & Cool Stadium Ambiance
    const ambientLight = new THREE.AmbientLight(0x2d3748, 1.8);
    this.scene.add(ambientLight);

    // Primary Overhead Stadium Key Light
    const mainSpot = new THREE.SpotLight(0xfffbf0, 4.2);
    mainSpot.position.set(0, 6.8, 0);
    mainSpot.angle = Math.PI / 2.8;
    mainSpot.penumbra = 0.4;
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 2048;
    mainSpot.shadow.mapSize.height = 2048;
    mainSpot.shadow.bias = -0.0001;
    this.scene.add(mainSpot);
    this.lights.push(mainSpot);

    // Blue Corner Rim Light (Player Side)
    const blueSpot = new THREE.SpotLight(0x38bdf8, 3.2);
    blueSpot.position.set(-3.8, 4.5, 2.2);
    blueSpot.target.position.set(-1.4, 1.0, 0);
    this.scene.add(blueSpot);
    this.scene.add(blueSpot.target);
    this.lights.push(blueSpot);

    // Red Corner Rim Light (CPU Side)
    const redSpot = new THREE.SpotLight(0xf43f5e, 3.2);
    redSpot.position.set(3.8, 4.5, 2.2);
    redSpot.target.position.set(1.4, 1.0, 0);
    this.scene.add(redSpot);
    this.scene.add(redSpot.target);
    this.lights.push(redSpot);

    // Front Camera Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.4);
    fillLight.position.set(0, 2.8, 5.5);
    this.scene.add(fillLight);

    // Arena Atmosphere Depth Fog
    this.scene.fog = new THREE.FogExp2(0x060913, 0.045);
  }

  createAtmosphereParticles() {
    // Realistic dust motes illuminated by stadium floodlights
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = 0.2 + Math.random() * 4.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      speeds[i] = 0.08 + Math.random() * 0.15;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleSpeeds = speeds;

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
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
        if (positions[i * 3 + 1] > 4.5) {
          positions[i * 3 + 1] = 0.2;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
}
