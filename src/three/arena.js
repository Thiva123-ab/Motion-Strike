import * as THREE from 'three';
import { TextureGenerator } from './textures.js';

export class CombatArena {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.flashbulbs = [];
    this.lanterns = [];
    this.spotlightBeams = [];
    this.arenaTime = 0;

    this.buildStage();
    this.setupLighting();
    this.createAtmosphereParticles();
    this.createGroundMist();
  }

  buildStage() {
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 1. Sleek Dark Martial Arts Ring Platform (6.4m x 6.4m)
    const ringSize = 6.4;
    const canvasTex = TextureGenerator.createRingCanvasTexture();
    const canvasMat = new THREE.MeshStandardMaterial({
      map: canvasTex,
      roughness: 0.65,
      metalness: 0.15
    });
    const platformGeo = new THREE.BoxGeometry(ringSize, 0.45, ringSize);
    const platform = new THREE.Mesh(platformGeo, canvasMat);
    platform.position.y = -0.225;
    platform.receiveShadow = true;
    this.group.add(platform);

    // Ring Apron Skirting (Obsidian carbon composite with neon edge bevel)
    const skirtGeo = new THREE.BoxGeometry(ringSize + 0.12, 0.40, ringSize + 0.12);
    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x070c17,
      roughness: 0.7,
      metalness: 0.3
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = -0.40;
    this.group.add(skirt);

    // Neon Perimeter LED Underglow Strip around ring base
    const underglowGeo = new THREE.BoxGeometry(ringSize + 0.16, 0.04, ringSize + 0.16);
    const underglowMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.85
    });
    this.underglowMesh = new THREE.Mesh(underglowGeo, underglowMat);
    this.underglowMesh.position.y = -0.04;
    this.group.add(this.underglowMesh);

    // Secondary Gold Underglow Base Trim
    const baseGlowGeo = new THREE.BoxGeometry(ringSize + 0.22, 0.03, ringSize + 0.22);
    const baseGlowMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.6
    });
    const baseGlow = new THREE.Mesh(baseGlowGeo, baseGlowMat);
    baseGlow.position.y = -0.58;
    this.group.add(baseGlow);

    // 2. Heavy Titanium Corner Posts & Turnbuckles
    const postRadius = 0.085;
    const postHeight = 2.6;
    const half = (ringSize / 2) - 0.25;

    // Corner definitions: Blue/Cyan (Player), Crimson (CPU), Gold (Neutral)
    const corners = [
      { x: -half, z: -half, color: 0x00f3ff, glow: 0x00f3ff, isPlayer: true },
      { x: half, z: -half, color: 0xff0055, glow: 0xff0055, isCpu: true },
      { x: -half, z: half, color: 0xf59e0b, glow: 0xf59e0b },
      { x: half, z: half, color: 0xf59e0b, glow: 0xf59e0b }
    ];

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.95,
      roughness: 0.2
    });

    corners.forEach(c => {
      // Steel Corner Post
      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius * 1.25, postHeight, 16);
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(c.x, postHeight / 2 - 0.2, c.z);
      post.castShadow = true;
      this.group.add(post);

      // Vertical Glowing Neon Light-Bar embedded in each post
      const barGeo = new THREE.BoxGeometry(0.03, postHeight * 0.75, 0.03);
      const barMat = new THREE.MeshBasicMaterial({ color: c.glow });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(c.x + (c.x > 0 ? -0.07 : 0.07), postHeight / 2 - 0.1, c.z + (c.z > 0 ? -0.07 : 0.07));
      this.group.add(bar);

      // Protective Corner Pad (Leather cushion)
      const padGeo = new THREE.BoxGeometry(0.24, 1.45, 0.24);
      const padMat = new THREE.MeshStandardMaterial({
        color: c.color,
        roughness: 0.35,
        metalness: 0.25
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(c.x, 1.05, c.z);
      this.group.add(pad);
    });

    // 3. High-Tension Ring Ropes with Glowing Neon Sleeves
    const ropeHeights = [0.55, 0.95, 1.35, 1.75];
    const ropeColors = [0x00f3ff, 0xfde047, 0xe879f9, 0x00f3ff];

    ropeHeights.forEach((h, idx) => {
      const ropeMat = new THREE.MeshStandardMaterial({
        color: ropeColors[idx],
        roughness: 0.3,
        metalness: 0.2,
        emissive: ropeColors[idx],
        emissiveIntensity: 0.65
      });

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

      // Front rope (Lowered slightly so it never obstructs combat camera view)
      if (h < 1.0) {
        const frontRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeThick, ropeThick, ropeLen, 8), ropeMat);
        frontRope.rotation.z = Math.PI / 2;
        frontRope.position.set(0, h * 0.75, half);
        this.group.add(frontRope);
      }
    });

    // 4. Grand Cyber-Torii Gateway (Framing the Arena Background)
    this.buildCyberTorii();

    // 5. Giant Glowing Lunar Moon in the Night Sky
    this.buildLuminousMoon();

    // 6. Overhead Stadium Truss & Floodlights
    this.buildOverheadTruss();

    // 7. Panoramic Cyberpunk Dojo Grandstand Backdrop
    this.buildStadiumBackdrop();

    // 8. Audience Flashbulb Sprites
    this.setupFlashbulbs();

    // 9. Volumetric Sweeping Spotlights
    this.setupVolumetricSpotlights();
  }

  buildCyberTorii() {
    const toriiGroup = new THREE.Group();
    toriiGroup.position.set(0, 0, -6.0);

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x090e1c,
      metalness: 0.9,
      roughness: 0.25
    });

    const neonStripCyan = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const neonStripRed = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });

    // Left and Right Torii Columns
    const colHeight = 6.4;
    const colRadius = 0.22;
    const colSpan = 4.8;

    [-colSpan, colSpan].forEach((colX, idx) => {
      // Main Pillar
      const colGeo = new THREE.CylinderGeometry(colRadius * 0.88, colRadius, colHeight, 16);
      const colMesh = new THREE.Mesh(colGeo, columnMat);
      colMesh.position.set(colX, colHeight / 2, 0);
      toriiGroup.add(colMesh);

      // Vertical Inlaid Neon Strip
      const stripGeo = new THREE.BoxGeometry(0.04, colHeight * 0.9, 0.04);
      const stripMesh = new THREE.Mesh(stripGeo, idx === 0 ? neonStripCyan : neonStripRed);
      stripMesh.position.set(colX + (idx === 0 ? 0.20 : -0.20), colHeight / 2, 0.05);
      toriiGroup.add(stripMesh);

      // Column Base Stone
      const baseGeo = new THREE.BoxGeometry(0.65, 0.35, 0.65);
      const baseMesh = new THREE.Mesh(baseGeo, goldTrimMat);
      baseMesh.position.set(colX, 0.175, 0);
      toriiGroup.add(baseMesh);
    });

    // Upper Curved Kasagi Crossbeam
    const beamGeo = new THREE.BoxGeometry(colSpan * 2 + 2.2, 0.32, 0.45);
    const kasagi = new THREE.Mesh(beamGeo, columnMat);
    kasagi.position.set(0, colHeight - 0.2, 0);
    toriiGroup.add(kasagi);

    // Glowing Neon Edge along Kasagi
    const kasagiGlowGeo = new THREE.BoxGeometry(colSpan * 2 + 2.3, 0.04, 0.48);
    const kasagiGlow = new THREE.Mesh(kasagiGlowGeo, new THREE.MeshBasicMaterial({ color: 0x00f3ff }));
    kasagiGlow.position.set(0, colHeight - 0.04, 0);
    toriiGroup.add(kasagiGlow);

    // Lower Shimaki Crossbeam
    const shimakiGeo = new THREE.BoxGeometry(colSpan * 2 + 0.6, 0.24, 0.35);
    const shimaki = new THREE.Mesh(shimakiGeo, columnMat);
    shimaki.position.set(0, colHeight - 1.1, 0);
    toriiGroup.add(shimaki);

    // Center Gold Martial Tablet: 「格闘道場」
    const tabletGeo = new THREE.BoxGeometry(0.85, 0.95, 0.12);
    const tablet = new THREE.Mesh(tabletGeo, goldTrimMat);
    tablet.position.set(0, colHeight - 0.65, 0);
    toriiGroup.add(tablet);

    // Hanging Japanese Dojo Lanterns
    const lanternTex = TextureGenerator.createLanternTexture();
    const lanternMat = new THREE.MeshStandardMaterial({
      map: lanternTex,
      emissive: 0xef4444,
      emissiveIntensity: 0.65,
      roughness: 0.5
    });

    [-3.2, 3.2].forEach(lx => {
      const lanternMeshGroup = new THREE.Group();
      lanternMeshGroup.position.set(lx, colHeight - 1.25, 0);

      // Chain
      const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6);
      const chain = new THREE.Mesh(chainGeo, columnMat);
      chain.position.y = 0.22;
      lanternMeshGroup.add(chain);

      // Lantern body
      const lGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.65, 16);
      const lMesh = new THREE.Mesh(lGeo, lanternMat);
      lanternMeshGroup.add(lMesh);

      // Warm amber lantern light source
      const lanternLight = new THREE.PointLight(0xff6600, 1.2, 4.5);
      lanternLight.position.set(0, 0, 0.1);
      lanternMeshGroup.add(lanternLight);

      toriiGroup.add(lanternMeshGroup);
      this.lanterns.push(lanternMeshGroup);
    });

    this.group.add(toriiGroup);
  }

  buildLuminousMoon() {
    const moonGroup = new THREE.Group();
    moonGroup.position.set(0, 9.2, -16.5);

    // High-res textured Moon Disk
    const moonTex = TextureGenerator.createMoonTexture();
    const moonGeo = new THREE.CircleGeometry(4.6, 40);
    const moonMat = new THREE.MeshBasicMaterial({
      map: moonTex,
      transparent: true,
      depthWrite: false
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Soft Ethereal Atmospheric Corona Ring
    const coronaGeo = new THREE.CircleGeometry(6.8, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    coronaMesh.position.z = -0.05;
    moonGroup.add(coronaMesh);

    this.group.add(moonGroup);
    this.moonGroup = moonGroup;
  }

  buildOverheadTruss() {
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.95,
      roughness: 0.25
    });
    const trussSize = 7.6;
    const trussH = 5.2;

    const barGeoX = new THREE.BoxGeometry(trussSize, 0.16, 0.16);
    const barGeoZ = new THREE.BoxGeometry(0.16, 0.16, trussSize);

    const t1 = new THREE.Mesh(barGeoX, trussMat);
    t1.position.set(0, trussH, -trussSize / 2);
    const t2 = new THREE.Mesh(barGeoX, trussMat);
    t2.position.set(0, trussH, trussSize / 2);
    const t3 = new THREE.Mesh(barGeoZ, trussMat);
    t3.position.set(-trussSize / 2, trussH, 0);
    const t4 = new THREE.Mesh(barGeoZ, trussMat);
    t4.position.set(trussSize / 2, trussH, 0);
    this.group.add(t1, t2, t3, t4);

    // 4 Heavy Hanging Stadium Floodlight Housings
    const floodlightPositions = [
      [-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]
    ];
    floodlightPositions.forEach(([x, z]) => {
      const lampGeo = new THREE.CylinderGeometry(0.28, 0.40, 0.45, 16);
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x0a101d, metalness: 0.85 });
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
  }

  buildStadiumBackdrop() {
    const stadiumTex = TextureGenerator.createStadiumBackdropTexture();
    const stadiumGeo = new THREE.CylinderGeometry(20, 20, 16, 40, 1, true, -Math.PI / 1.5, Math.PI * 1.33);
    const stadiumMat = new THREE.MeshBasicMaterial({
      map: stadiumTex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.96
    });
    const stadium = new THREE.Mesh(stadiumGeo, stadiumMat);
    stadium.position.set(0, 6.5, 0);
    this.group.add(stadium);
  }

  setupFlashbulbs() {
    // 24 Audience Flash Points
    const flashCount = 24;
    const bulbGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const bulbMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    for (let i = 0; i < flashCount; i++) {
      const mesh = new THREE.Mesh(bulbGeo, bulbMat.clone());
      const angle = (Math.random() - 0.5) * Math.PI * 0.9;
      const dist = 14 + Math.random() * 5;
      mesh.position.set(
        Math.sin(angle) * dist,
        2.5 + Math.random() * 5.5,
        -Math.cos(angle) * dist
      );
      mesh.lookAt(0, 1.2, 0);
      this.group.add(mesh);

      this.flashbulbs.push({
        mesh,
        intensity: 0,
        nextTrigger: 0.3 + Math.random() * 2.0
      });
    }
  }

  setupVolumetricSpotlights() {
    // 2 Sweeping Volumetric God-Ray Light Cones
    const beamGeo = new THREE.ConeGeometry(1.6, 11, 24, 1, true);
    beamGeo.translate(0, -5.5, 0);
    beamGeo.rotateX(Math.PI / 2);

    const beamColors = [0x00f3ff, 0xff0055];

    [-3.2, 3.2].forEach((x, idx) => {
      const beamMat = new THREE.MeshBasicMaterial({
        color: beamColors[idx],
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.set(x, 5.2, 0);
      this.group.add(beamMesh);

      this.spotlightBeams.push({
        mesh: beamMesh,
        baseX: x,
        speed: 0.75 + idx * 0.25,
        phase: idx * Math.PI
      });
    });
  }

  setupLighting() {
    // High-Contrast Cinematic Arena Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2638, 1.9);
    this.scene.add(ambientLight);

    // Primary Overhead Stadium Key Light
    const mainSpot = new THREE.SpotLight(0xfff8e7, 4.4);
    mainSpot.position.set(0, 6.8, 0);
    mainSpot.angle = Math.PI / 2.7;
    mainSpot.penumbra = 0.45;
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 2048;
    mainSpot.shadow.mapSize.height = 2048;
    mainSpot.shadow.bias = -0.0001;
    this.scene.add(mainSpot);
    this.lights.push(mainSpot);

    // Blue/Cyan Rim Light (Player Side Silhouette)
    const blueSpot = new THREE.SpotLight(0x00f3ff, 3.6);
    blueSpot.position.set(-4.2, 4.5, 2.0);
    blueSpot.target.position.set(-1.2, 1.1, 0);
    this.scene.add(blueSpot);
    this.scene.add(blueSpot.target);
    this.lights.push(blueSpot);

    // Crimson/Amber Rim Light (CPU Side Silhouette)
    const redSpot = new THREE.SpotLight(0xff0055, 3.6);
    redSpot.position.set(4.2, 4.5, 2.0);
    redSpot.target.position.set(1.2, 1.1, 0);
    this.scene.add(redSpot);
    this.scene.add(redSpot.target);
    this.lights.push(redSpot);

    // Front Camera Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.5);
    fillLight.position.set(0, 2.8, 5.5);
    this.scene.add(fillLight);

    // Rich Dark Cinematic Arena Fog
    this.scene.fog = new THREE.FogExp2(0x030712, 0.038);
  }

  createAtmosphereParticles() {
    // Floating Golden Embers & Cyan Fireflies drifting through arena
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    const wobbles = new Float32Array(particleCount);

    const cGold = new THREE.Color(0xf59e0b);
    const cCyan = new THREE.Color(0x00f3ff);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8.5;
      positions[i * 3 + 1] = 0.1 + Math.random() * 4.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 7.5;
      speeds[i] = 0.08 + Math.random() * 0.16;
      wobbles[i] = Math.random() * Math.PI * 2;

      const c = Math.random() > 0.4 ? cGold : cCyan;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleSpeeds = speeds;
    this.particleWobbles = wobbles;

    const material = new THREE.PointsMaterial({
      size: 0.042,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  createGroundMist() {
    // Low Floor Mist Cloud Layer
    const mistGeo = new THREE.PlaneGeometry(8.5, 8.5);
    mistGeo.rotateX(-Math.PI / 2);
    const mistTex = TextureGenerator.createMistTexture();
    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.groundMist = new THREE.Mesh(mistGeo, mistMat);
    this.groundMist.position.y = 0.02;
    this.group.add(this.groundMist);
  }

  update(delta) {
    this.arenaTime += delta;

    // 1. Gently pulse Ring Underglow LED
    if (this.underglowMesh) {
      this.underglowMesh.material.opacity = 0.7 + Math.sin(this.arenaTime * 2.8) * 0.25;
    }

    // 2. Animate Torii Hanging Lanterns swaying in the night breeze
    if (this.lanterns.length > 0) {
      this.lanterns.forEach((l, idx) => {
        l.rotation.z = Math.sin(this.arenaTime * 1.5 + idx * 1.8) * 0.07;
        l.rotation.x = Math.cos(this.arenaTime * 1.2 + idx * 1.4) * 0.05;
      });
    }

    // 3. Animate Sweeping Volumetric Spotlights
    if (this.spotlightBeams.length > 0) {
      this.spotlightBeams.forEach(b => {
        const sweepX = Math.sin(this.arenaTime * b.speed + b.phase) * 2.8;
        const sweepZ = Math.cos(this.arenaTime * (b.speed * 0.8) + b.phase) * 1.8;
        b.mesh.lookAt(sweepX, 0.8, sweepZ);
      });
    }

    // 4. Trigger Audience Camera Flashbulbs
    if (this.flashbulbs.length > 0) {
      this.flashbulbs.forEach(fb => {
        fb.nextTrigger -= delta;
        if (fb.nextTrigger <= 0) {
          fb.intensity = 1.0;
          fb.nextTrigger = 1.2 + Math.random() * 3.5;
        }

        if (fb.intensity > 0) {
          fb.intensity = Math.max(0, fb.intensity - delta * 9.0);
          fb.mesh.material.opacity = fb.intensity * 0.95;
        }
      });
    }

    // 5. Update Floating Golden & Cyan Embers
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleSpeeds.length; i++) {
        pos[i * 3 + 1] += this.particleSpeeds[i] * delta * 0.55;
        pos[i * 3] += Math.sin(this.arenaTime * 1.2 + this.particleWobbles[i]) * 0.003;
        
        if (pos[i * 3 + 1] > 4.8) {
          pos[i * 3 + 1] = 0.15;
          pos[i * 3] = (Math.random() - 0.5) * 8.5;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    // 6. Slowly rotate Ground Mist
    if (this.groundMist) {
      this.groundMist.rotation.y = this.arenaTime * 0.02;
    }
  }
}
