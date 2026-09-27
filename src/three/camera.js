import * as THREE from 'three';

export class CombatCamera {
  constructor(camera) {
    this.camera = camera;
    this.basePos = new THREE.Vector3(0, 2.2, 5.5);
    this.targetLookAt = new THREE.Vector3(0, 1.6, 0);
    this.currentLookAt = new THREE.Vector3(0, 1.6, 0);
    
    this.shakeIntensity = 0;
    this.shakeDecay = 10; // per second
    this.slowMoFactor = 1.0;
  }

  triggerShake(intensity = 0.25) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 0.6);
  }

  update(delta, playerPos, cpuPos) {
    // Dynamic tracking of fight midpoint
    const midX = (playerPos.x + cpuPos.x) * 0.45;
    const distance = Math.abs(playerPos.x - cpuPos.x);
    const targetZ = Math.max(4.8, 3.8 + distance * 0.6);

    const targetX = midX;
    const targetY = 2.1 + (distance * 0.08);

    // Smooth camera lag
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, delta * 4);
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, delta * 4);
    this.camera.position.z += (targetZ - this.camera.position.z) * Math.min(1, delta * 4);

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

    this.targetLookAt.set(midX, 1.5, 0);
    this.currentLookAt.lerp(this.targetLookAt, Math.min(1, delta * 5));
    this.camera.lookAt(this.currentLookAt);
  }
}
