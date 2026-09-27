import * as THREE from 'three';

export class CombatVFX {
  constructor(scene) {
    this.scene = scene;
    this.sparks = [];
    this.shockwaves = [];
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
      size: 0.08,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);

    this.sparks.push({
      mesh: pSystem,
      velocities,
      life: 0.35,
      maxLife: 0.35
    });
  }

  createShockwave(position, color = 0x00f3ff, maxRadius = 1.8) {
    const geo = new THREE.RingGeometry(0.1, 0.25, 32);
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
      life: 0.45,
      maxLife: 0.45
    });
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
  }
}
