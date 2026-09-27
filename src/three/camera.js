import * as THREE from 'three';

export class CombatCamera {
  constructor(camera) {
    this.camera = camera;
    this.basePos = new THREE.Vector3(0, 1.55, 4.2);
    this.camera.position.copy(this.basePos);
    this.targetLookAt = new THREE.Vector3(0, 1.25, 0);
    this.currentLookAt = new THREE.Vector3(0, 1.25, 0);
    this.camera.lookAt(this.currentLookAt);
    
    this.shakeIntensity = 0;
    this.shakeDecay = 10;
  }

  triggerShake(intensity = 0.25) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 0.5);
  }

  update(delta, playerPos, cpuPos) {
    const midX = (playerPos.x + cpuPos.x) * 0.5;
    const distance = Math.abs(playerPos.x - cpuPos.x);
    
    // Maintain perfect side-view framing where both fighters are clearly visible
    const targetX = midX * 0.4;
    const targetY = 1.45 + distance * 0.05;
    const targetZ = Math.max(3.8, 2.8 + distance * 0.65);

    // Smooth camera lag
    const lerpSpeed = Math.min(1, delta * 6);
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

    this.targetLookAt.set(midX * 0.2, 1.2, 0);
    this.currentLookAt.lerp(this.targetLookAt, Math.min(1, delta * 8));
    this.camera.lookAt(this.currentLookAt);
  }
}
