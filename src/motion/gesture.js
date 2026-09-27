// Gesture Recognition Engine with Scale-Invariant Arm Extension & Real-time Metrics

export class GestureEngine {
  constructor(options = {}) {
    this.onMoveDetected = options.onMoveDetected || (() => {});
    this.onCalibrationUpdate = options.onCalibrationUpdate || (() => {});
    this.onCalibrationComplete = options.onCalibrationComplete || (() => {});

    // Calibration State
    this.isCalibrating = false;
    this.calibrationSamples = [];
    this.calibrationDuration = 3.0;
    this.calibrationStartTime = 0;
    this.isCalibrated = true;

    // Cooldown Timers (in ms)
    this.cooldowns = {
      jab: 350,
      cross: 350,
      kick: 550,
      special: 1200,
      dodge: 400
    };
    this.lastMoveTime = 0;
    this.currentCooldown = 0;

    // Arm return-to-baseline guards
    this.rightArmRetracted = true;
    this.leftArmRetracted = true;
    this.kickRetracted = true;
    this.specialPrimed = false;
    this.specialPrimedTime = 0;

    // Real-time metrics for HUD display
    this.latestMetrics = {
      rExtRatio: 0,
      lExtRatio: 0,
      rDepth: 0,
      lDepth: 0,
      lastDetectedMove: 'NONE'
    };
  }

  startCalibration() {
    this.isCalibrating = true;
    this.calibrationSamples = [];
    this.calibrationStartTime = performance.now();
    this.isCalibrated = false;
  }

  processLandmarks(landmarks, worldLandmarks) {
    const now = performance.now();

    if (this.isCalibrating) {
      this.handleCalibrationStep(landmarks, now);
      return;
    }

    if (!landmarks || landmarks.length < 17) return;

    // 1. Extract Anatomical Keypoints
    const nose = landmarks[0];
    const lSh = landmarks[11]; // Left Shoulder
    const rSh = landmarks[12]; // Right Shoulder
    const lElb = landmarks[13]; // Left Elbow
    const rElb = landmarks[14]; // Right Elbow
    const lWr = landmarks[15]; // Left Wrist
    const rWr = landmarks[16]; // Right Wrist
    const lHip = landmarks[23];
    const rHip = landmarks[24];
    const lKnee = landmarks[25];
    const rKnee = landmarks[26];

    // Check shoulder visibility
    if (!rSh || !lSh) return;

    // 2. SCALE-INVARIANT ARM EXTENSION RATIOS
    // Ratio = dist(shoulder, wrist) / (dist(shoulder, elbow) + dist(elbow, wrist))
    // Bent in guard: ~0.40 - 0.65 | Extended punch: ~0.76 - 1.00
    let rExtRatio = 0;
    let lExtRatio = 0;

    if (rWr && rElb && rSh) {
      const rUpper = Math.hypot(rElb.x - rSh.x, rElb.y - rSh.y);
      const rFore = Math.hypot(rWr.x - rElb.x, rWr.y - rElb.y);
      const rTotal = rUpper + rFore;
      const rSpan = Math.hypot(rWr.x - rSh.x, rWr.y - rSh.y);
      rExtRatio = rTotal > 0.01 ? (rSpan / rTotal) : 0;
    }

    if (lWr && lElb && lSh) {
      const lUpper = Math.hypot(lElb.x - lSh.x, lElb.y - lSh.y);
      const lFore = Math.hypot(lWr.x - lElb.x, lWr.y - lElb.y);
      const lTotal = lUpper + lFore;
      const lSpan = Math.hypot(lWr.x - lSh.x, lWr.y - lSh.y);
      lExtRatio = lTotal > 0.01 ? (lSpan / lTotal) : 0;
    }

    // 3. 3D FORWARD DEPTH (Toward Camera)
    let rDepth = (rSh.z !== undefined && rWr && rWr.z !== undefined) ? (rSh.z - rWr.z) : 0;
    let lDepth = (lSh.z !== undefined && lWr && lWr.z !== undefined) ? (lSh.z - lWr.z) : 0;

    if (worldLandmarks && worldLandmarks[12] && worldLandmarks[16]) {
      rDepth = Math.max(rDepth, worldLandmarks[12].z - worldLandmarks[16].z);
    }
    if (worldLandmarks && worldLandmarks[11] && worldLandmarks[15]) {
      lDepth = Math.max(lDepth, worldLandmarks[11].z - worldLandmarks[15].z);
    }

    this.latestMetrics = {
      rExtRatio: Math.round(rExtRatio * 100),
      lExtRatio: Math.round(lExtRatio * 100),
      rDepth: Math.round(rDepth * 100),
      lDepth: Math.round(lDepth * 100),
      lastDetectedMove: this.latestMetrics.lastDetectedMove
    };

    // 4. RETRACTION GUARDS (Arm must come back to guard before next punch)
    if (rExtRatio < 0.68 && rDepth < 0.10) {
      this.rightArmRetracted = true;
    }
    if (lExtRatio < 0.68 && lDepth < 0.10) {
      this.leftArmRetracted = true;
    }

    if (rHip && rKnee && lHip && lKnee) {
      if (rHip.y - rKnee.y > 0.20 && lHip.y - lKnee.y > 0.20) {
        this.kickRetracted = true;
      }
    }

    // 5. Cooldown check
    if (now - this.lastMoveTime < this.currentCooldown) {
      return;
    }

    // 6. BLOCK DETECTION (Both hands raised guarding face)
    if (rWr && lWr && nose) {
      const bothWristsHigh = (rWr.y < rSh.y + 0.15) && (lWr.y < lSh.y + 0.15);
      const wristsNearFace = Math.abs(rWr.x - nose.x) < 0.35 && Math.abs(lWr.x - nose.x) < 0.35;
      const handsCloseTogether = Math.hypot(rWr.x - lWr.x, rWr.y - lWr.y) < 0.35;

      if (bothWristsHigh && (wristsNearFace || handsCloseTogether) && rExtRatio < 0.72 && lExtRatio < 0.72) {
        this.triggerMove('block', 250);
        return;
      }

      // 7. SPECIAL ATTACK DETECTION (Both hands high above head -> slam down)
      const bothHandsAboveHead = (rWr.y < nose.y - 0.05) && (lWr.y < nose.y - 0.05);
      if (bothHandsAboveHead) {
        this.specialPrimed = true;
        this.specialPrimedTime = now;
      } else if (this.specialPrimed) {
        if (now - this.specialPrimedTime < 950) {
          if (rWr.y > rSh.y && lWr.y > lSh.y) {
            this.specialPrimed = false;
            this.triggerMove('special', this.cooldowns.special);
            return;
          }
        } else {
          this.specialPrimed = false;
        }
      }
    }

    // 8. DODGE DETECTION (Head / Shoulder lateral tilt)
    const shoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y);
    if (shoulderWidth > 0.05) {
      const shoulderDeltaY = (rSh.y - lSh.y) / shoulderWidth;
      if (shoulderDeltaY > 0.25) {
        this.triggerMove('dodge_right', this.cooldowns.dodge, { side: 1 });
        return;
      } else if (shoulderDeltaY < -0.25) {
        this.triggerMove('dodge_left', this.cooldowns.dodge, { side: -1 });
        return;
      }
    }

    // 9. KICK DETECTION (Knee elevation)
    if (rHip && rKnee && lHip && lKnee) {
      const rKneeUp = (rHip.y - rKnee.y) < 0.18;
      const lKneeUp = (lHip.y - lKnee.y) < 0.18;
      if (this.kickRetracted && (rKneeUp || lKneeUp)) {
        this.kickRetracted = false;
        this.triggerMove('kick', this.cooldowns.kick);
        return;
      }
    }

    // 10. JAB (Right hand punch extension or forward depth)
    const isRightPunched = rExtRatio > 0.74 || rDepth > 0.14;
    if (this.rightArmRetracted && isRightPunched) {
      this.rightArmRetracted = false;
      this.triggerMove('jab', this.cooldowns.jab);
      return;
    }

    // 11. CROSS (Left hand punch extension or forward depth)
    const isLeftPunched = lExtRatio > 0.74 || lDepth > 0.14;
    if (this.leftArmRetracted && isLeftPunched) {
      this.leftArmRetracted = false;
      this.triggerMove('cross', this.cooldowns.cross);
      return;
    }
  }

  triggerMove(moveName, cooldownMs, payload = {}) {
    this.lastMoveTime = performance.now();
    this.currentCooldown = cooldownMs;
    this.latestMetrics.lastDetectedMove = moveName.toUpperCase();
    this.onMoveDetected(moveName, payload);
  }

  handleCalibrationStep(landmarks, now) {
    const elapsed = (now - this.calibrationStartTime) / 1000;
    const remaining = Math.max(0, this.calibrationDuration - elapsed);

    this.onCalibrationUpdate({
      elapsed,
      remaining,
      progress: Math.min(1, elapsed / this.calibrationDuration)
    });

    if (elapsed >= this.calibrationDuration) {
      this.isCalibrating = false;
      this.isCalibrated = true;
      this.onCalibrationComplete({});
    }
  }
}
