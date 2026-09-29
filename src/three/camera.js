import * as THREE from 'three';

export class CombatCamera {
  constructor(camera) {
    this.camera = camera;
    this.basePos = new THREE.Vector3(0, 1.35, 3.2);
    this.camera.position.copy(this.basePos);
    this.targetLookAt = new THREE.Vector3(0, 1.18, 0);
    this.currentLookAt = new THREE.Vector3(0, 1.18, 0);
    this.camera.lookAt(this.currentLookAt);
    
    this.shakeIntensity = 0;
    this.shakeDecay = 10;

    // Action zoom-in on impacts and heavy strikes
    this.zoomOffset = 0;
  }

  triggerShake(intensity = 0.25) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 0.55);
  }

  triggerZoom(amount = 0.45) {
    this.zoomOffset = Math.min(this.zoomOffset + amount, 0.75);
  }

  update(delta, playerPos, cpuPos) {
    const midX = (playerPos.x + cpuPos.x) * 0.5;
    const distance = Math.abs(playerPos.x - cpuPos.x);
    
    // Decay dynamic action zoom smoothly
    if (this.zoomOffset > 0) {
      this.zoomOffset = Math.max(0, this.zoomOffset - delta * 2.2);
    }

    // Dynamic close-range framing: closer perspective for intense up-close combat
    const targetX = midX * 0.55;
    const targetY = 1.30 + distance * 0.06;
    const targetZ = Math.max(2.2, 2.35 + distance * 0.55 - this.zoomOffset);

    // Smooth camera interpolation
    const lerpSpeed = Math.min(1, delta * 7);
    this.camera.position.x += (targetX - this.camera.position.x) * lerpSpeed;
    this.camera.position.y += (targetY - this.camera.position.y) * lerpSpeed;
    this.camera.position.z += (targetZ - this.camera.position.z) * lerpSpeed;

    // Apply trauma screen shake
    if (this.shakeIntensity > 0.001) {
      const offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const offsetZ = (Math.random() - 0.5) * this.shakeIntensity * 0.5;

      this.camera.position.x += offsetX;
      this.camera.position.y += offsetY;
      this.camera.position.z += offsetZ;

      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * delta);
    }

    // Dynamic look-at focused between fighters' upper torso / heads
    this.targetLookAt.set(midX * 0.4, 1.20, 0);
    this.currentLookAt.lerp(this.targetLookAt, Math.min(1, delta * 9));
    this.camera.lookAt(this.currentLookAt);
  }
}

