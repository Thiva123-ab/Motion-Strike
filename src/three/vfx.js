import * as THREE from 'three';

export class CombatVFX {
  constructor(scene) {
    this.scene = scene;
    this.sparks = [];
    this.shockwaves = [];
    this.sweatParticles = [];
    this.flashes = [];
    this.shadowTrails = [];
    this.shadowBursts = [];
  }

  createImpactSparks(position, color = 0x00f3ff, count = 25) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.random() - 0.2) * speed * 1.5,
        Math.sin(angle) * speed * 0.5
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: color,
      size: 0.07,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.sparks.push({
      mesh: pSystem,
      velocities,
      life: 0.30,
      maxLife: 0.30
    });
  }

  // Realistic Boxing Sweat / Droplet Spray on Impact
  createSweatSpray(position, impactDirection = 1, count = 18) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.05;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.06;

      // Sprays in the direction of the punch with slight upward cone
      const speed = 1.8 + Math.random() * 2.8;
      const spreadY = 0.5 + Math.random() * 1.8;
      const spreadZ = (Math.random() - 0.5) * 2.2;
      velocities.push(new THREE.Vector3(
        impactDirection * speed,
        spreadY,
        spreadZ
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.045,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.sweatParticles.push({
      mesh: pSystem,
      velocities,
      life: 0.38,
      maxLife: 0.38
    });
  }

  // Crisp Contact Flash & Starburst Radial Flare
  createHitFlash(position, color = 0xffffff) {
    const geo = new THREE.SphereGeometry(0.20, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const flash = new THREE.Mesh(geo, mat);
    flash.position.copy(position);
    this.scene.add(flash);

    this.flashes.push({
      mesh: flash,
      life: 0.09,
      maxLife: 0.09
    });

    // Radiant Starburst Energy Streaks (Cyan & Gold Flare as shown in reference)
    const rayCount = 16;
    const rayGroup = new THREE.Group();
    rayGroup.position.copy(position);

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const length = 0.35 + Math.random() * 0.55;
      const rayColor = (i % 2 === 0) ? 0xfde047 : 0x00f3ff;

      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(angle) * length, Math.sin(angle) * length, (Math.random() - 0.5) * 0.1)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: rayColor,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
      });
      const line = new THREE.Line(geom, lineMat);
      rayGroup.add(line);
    }

    this.scene.add(rayGroup);
    this.flashes.push({
      mesh: rayGroup,
      life: 0.14,
      maxLife: 0.14
    });
  }

  createShockwave(position, color = 0x00f3ff, maxRadius = 1.4) {
    const geo = new THREE.RingGeometry(0.1, 0.22, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });

    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(position);
    ring.position.y = 0.04;
    this.scene.add(ring);

    this.shockwaves.push({
      mesh: ring,
      radius: 0.2,
      maxRadius,
      life: 0.35,
      maxLife: 0.35
    });
  }

  // Shadow Fight Signature Weapon / Fist Motion Arc Trail
  createShadowStrikeTrail(fistPos, prevFistPos, color = 0x00f3ff) {
    if (!prevFistPos) return;
    const dir = new THREE.Vector3().subVectors(fistPos, prevFistPos);
    const len = dir.length();
    if (len < 0.03 || len > 1.5) return;

    const mid = new THREE.Vector3().addVectors(fistPos, prevFistPos).multiplyScalar(0.5);
    const geom = new THREE.CylinderGeometry(0.045, 0.085, len, 8);
    geom.rotateX(Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(mid);
    mesh.lookAt(fistPos);
    this.scene.add(mesh);

    this.shadowTrails.push({
      mesh,
      life: 0.18,
      maxLife: 0.18
    });
  }

  // Shadow Fight Dark Energy Burst & Piercing Impact
  createShadowImpact(position, color = 0x00f3ff, isFinisher = false) {
    // 1. Dark Shadow Smoke Burst
    const count = isFinisher ? 36 : 20;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.08;

      const angle = Math.random() * Math.PI * 2;
      const speed = isFinisher ? (2.8 + Math.random() * 4.2) : (1.8 + Math.random() * 2.8);
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.random() - 0.15) * speed * 1.2,
        Math.sin(angle) * speed * 0.8
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x080c14,
      size: isFinisher ? 0.18 : 0.12,
      transparent: true,
      opacity: 0.92
    });

    const smoke = new THREE.Points(geo, mat);
    this.scene.add(smoke);
    this.shadowBursts.push({
      mesh: smoke,
      velocities,
      life: 0.42,
      maxLife: 0.42
    });

    // 2. Piercing energy needle sparks
    this.createImpactSparks(position, color, isFinisher ? 40 : 24);
    // 3. Shockwave & flash
    this.createHitFlash(position, color);
    this.createShockwave(position, color, isFinisher ? 2.0 : 1.25);
  }

  update(delta) {
    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= delta;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.sparks.splice(i, 1);
        continue;
      }

      const pArr = s.mesh.geometry.attributes.position.array;
      const factor = s.life / s.maxLife;
      s.mesh.material.opacity = factor;

      for (let j = 0; j < s.velocities.length; j++) {
        pArr[j * 3] += s.velocities[j].x * delta;
        pArr[j * 3 + 1] += s.velocities[j].y * delta;
        pArr[j * 3 + 2] += s.velocities[j].z * delta;
        s.velocities[j].y -= 9.8 * delta; // Gravity
      }
      s.mesh.geometry.attributes.position.needsUpdate = true;
    }

    // Update sweat particles
    for (let i = this.sweatParticles.length - 1; i >= 0; i--) {
      const sp = this.sweatParticles[i];
      sp.life -= delta;
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.sweatParticles.splice(i, 1);
        continue;
      }

      const pArr = sp.mesh.geometry.attributes.position.array;
      const factor = sp.life / sp.maxLife;
      sp.mesh.material.opacity = factor;

      for (let j = 0; j < sp.velocities.length; j++) {
        pArr[j * 3] += sp.velocities[j].x * delta;
        pArr[j * 3 + 1] += sp.velocities[j].y * delta;
        pArr[j * 3 + 2] += sp.velocities[j].z * delta;
        sp.velocities[j].y -= 8.5 * delta; // Gravity on sweat droplets
      }
      sp.mesh.geometry.attributes.position.needsUpdate = true;
    }

    // Update contact flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fl = this.flashes[i];
      fl.life -= delta;
      if (fl.life <= 0) {
        this.scene.remove(fl.mesh);
        fl.mesh.geometry.dispose();
        fl.mesh.material.dispose();
        this.flashes.splice(i, 1);
        continue;
      }
      const scale = 1 + (1 - (fl.life / fl.maxLife)) * 1.5;
      fl.mesh.scale.set(scale, scale, scale);
      fl.mesh.material.opacity = (fl.life / fl.maxLife);
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= delta;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const progress = 1 - (sw.life / sw.maxLife);
      const scale = 1 + progress * (sw.maxRadius * 4);
      sw.mesh.scale.set(scale, scale, scale);
      sw.mesh.material.opacity = (1 - progress) * 0.8;
    }

    // Update Shadow Strike Trails
    for (let i = this.shadowTrails.length - 1; i >= 0; i--) {
      const st = this.shadowTrails[i];
      st.life -= delta;
      if (st.life <= 0) {
        this.scene.remove(st.mesh);
        st.mesh.geometry.dispose();
        st.mesh.material.dispose();
        this.shadowTrails.splice(i, 1);
        continue;
      }
      const factor = st.life / st.maxLife;
      st.mesh.material.opacity = factor * 0.85;
      st.mesh.scale.x = factor;
      st.mesh.scale.z = factor;
    }

    // Update Shadow Smoke Bursts
    for (let i = this.shadowBursts.length - 1; i >= 0; i--) {
      const sb = this.shadowBursts[i];
      sb.life -= delta;
      if (sb.life <= 0) {
        this.scene.remove(sb.mesh);
        sb.mesh.geometry.dispose();
        sb.mesh.material.dispose();
        this.shadowBursts.splice(i, 1);
        continue;
      }

      const pArr = sb.mesh.geometry.attributes.position.array;
      const factor = sb.life / sb.maxLife;
      sb.mesh.material.opacity = factor * 0.92;

      for (let j = 0; j < sb.velocities.length; j++) {
        pArr[j * 3] += sb.velocities[j].x * delta;
        pArr[j * 3 + 1] += sb.velocities[j].y * delta;
        pArr[j * 3 + 2] += sb.velocities[j].z * delta;
        sb.velocities[j].y += 0.8 * delta; // Upward smoke drift
      }
      sb.mesh.geometry.attributes.position.needsUpdate = true;
    }
  }
}
