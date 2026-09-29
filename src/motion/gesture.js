// Gesture Recognition Engine with Scale-Invariant Arm Extension & Real-time Metrics

export class GestureEngine {
  constructor(options = {}) {
    this.onMoveDetected = options.onMoveDetected || (() => {});
    this.onBodyLean = options.onBodyLean || (() => {});
    this.onCalibrationUpdate = options.onCalibrationUpdate || (() => {});
    this.onCalibrationComplete = options.onCalibrationComplete || (() => {});

    // Calibration State
    this.isCalibrating = false;
    this.calibrationSamples = [];
    this.calibrationDuration = 3.0;
    this.calibrationStartTime = 0;
    this.isCalibrated = true;

    // Cooldown Timers (in ms) - tuned for snappy close-combat combos
    this.cooldowns = {
      jab: 280,
      cross: 300,
      kick: 500,
      special: 1100,
      dodge: 350
    };
    this.lastMoveTime = 0;
    this.currentCooldown = 0;

    // Arm return-to-baseline guards
    this.rightArmRetracted = true;
    this.leftArmRetracted = true;
    this.kickRetracted = true;
    this.specialPrimed = false;
    this.specialPrimedTime = 0;

    // Punch velocity & depth history for punch snap detection
    this.lastFrameTime = performance.now();
    this.prevRDepth = 0;
    this.prevLDepth = 0;

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
    if (!rSh || !lSh || !nose) return;

    // 2. Continuous Real-time Player Body Lean & Motion Tracking
    const shoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y);
    if (shoulderWidth > 0.05) {
      // Lateral lean: mirrored camera, so head shifting left tilts fighter left
      const lateralLean = (nose.x - 0.5) * -1.6;
      // Forward lean: as player steps in or leans towards camera, shoulder span widens
      const forwardLean = (shoulderWidth - 0.26) * 2.0;
      this.onBodyLean(lateralLean, forwardLean);
    }

    // 3. SCALE-INVARIANT ARM EXTENSION RATIOS
    // Ratio = dist(shoulder, wrist) / (dist(shoulder, elbow) + dist(elbow, wrist))
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

    // 4. 3D FORWARD DEPTH & VELOCITY
    let rDepth = (rSh.z !== undefined && rWr && rWr.z !== undefined) ? (rSh.z - rWr.z) : 0;
    let lDepth = (lSh.z !== undefined && lWr && lWr.z !== undefined) ? (lSh.z - lWr.z) : 0;

    if (worldLandmarks && worldLandmarks[12] && worldLandmarks[16]) {
      rDepth = Math.max(rDepth, worldLandmarks[12].z - worldLandmarks[16].z);
    }
    if (worldLandmarks && worldLandmarks[11] && worldLandmarks[15]) {
      lDepth = Math.max(lDepth, worldLandmarks[11].z - worldLandmarks[15].z);
    }

    const dt = Math.max(0.016, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    const rVelZ = (rDepth - this.prevRDepth) / dt;
    const lVelZ = (lDepth - this.prevLDepth) / dt;
    this.prevRDepth = rDepth;
    this.prevLDepth = lDepth;

    this.latestMetrics = {
      rExtRatio: Math.round(rExtRatio * 100),
      lExtRatio: Math.round(lExtRatio * 100),
      rDepth: Math.round(rDepth * 100),
      lDepth: Math.round(lDepth * 100),
      lastDetectedMove: this.latestMetrics.lastDetectedMove
    };

    // 5. RETRACTION GUARDS (Arm reset to guard for combo readiness)
    if (rExtRatio < 0.65 && rDepth < 0.09) {
      this.rightArmRetracted = true;
    }
    if (lExtRatio < 0.65 && lDepth < 0.09) {
      this.leftArmRetracted = true;
    }

    if (rHip && rKnee && lHip && lKnee) {
      if (rHip.y - rKnee.y > 0.18 && lHip.y - lKnee.y > 0.18) {
        this.kickRetracted = true;
      }
    }

    // 6. Cooldown check
    if (now - this.lastMoveTime < this.currentCooldown) {
      return;
    }

    // 7. BLOCK DETECTION (Both hands raised guarding face)
    if (rWr && lWr && nose) {
      const bothWristsHigh = (rWr.y < rSh.y + 0.16) && (lWr.y < lSh.y + 0.16);
      const wristsNearFace = Math.abs(rWr.x - nose.x) < 0.38 && Math.abs(lWr.x - nose.x) < 0.38;
      const handsCloseTogether = Math.hypot(rWr.x - lWr.x, rWr.y - lWr.y) < 0.38;

      if (bothWristsHigh && (wristsNearFace || handsCloseTogether) && rExtRatio < 0.72 && lExtRatio < 0.72) {
        this.triggerMove('block', 240);
        return;
      }

      // 8. SPECIAL ATTACK DETECTION (Both hands high above head -> slam down)
      const bothHandsAboveHead = (rWr.y < nose.y - 0.04) && (lWr.y < nose.y - 0.04);
      if (bothHandsAboveHead) {
        this.specialPrimed = true;
        this.specialPrimedTime = now;
      } else if (this.specialPrimed) {
        if (now - this.specialPrimedTime < 1000) {
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

    // 9. DODGE DETECTION (Head / Shoulder lateral tilt)
    if (shoulderWidth > 0.05) {
      const shoulderDeltaY = (rSh.y - lSh.y) / shoulderWidth;
      if (shoulderDeltaY > 0.22) {
        this.triggerMove('dodge_right', this.cooldowns.dodge, { side: 1 });
        return;
      } else if (shoulderDeltaY < -0.22) {
        this.triggerMove('dodge_left', this.cooldowns.dodge, { side: -1 });
        return;
      }
    }

    // 10. KICK DETECTION (Knee elevation)
    if (rHip && rKnee && lHip && lKnee) {
      const rKneeUp = (rHip.y - rKnee.y) < 0.19;
      const lKneeUp = (lHip.y - lKnee.y) < 0.19;
      if (this.kickRetracted && (rKneeUp || lKneeUp)) {
        this.kickRetracted = false;
        this.triggerMove('kick', this.cooldowns.kick);
        return;
      }
    }

    // 11. JAB (Right hand punch extension, forward depth, or velocity snap)
    const isRightPunched = (rExtRatio > 0.69) || (rDepth > 0.11) || (rExtRatio > 0.62 && rVelZ > 0.40);
    if (this.rightArmRetracted && isRightPunched) {
      this.rightArmRetracted = false;
      this.triggerMove('jab', this.cooldowns.jab);
      return;
    }

    // 12. CROSS (Left hand punch extension, forward depth, or velocity snap)
    const isLeftPunched = (lExtRatio > 0.69) || (lDepth > 0.11) || (lExtRatio > 0.62 && lVelZ > 0.40);
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
