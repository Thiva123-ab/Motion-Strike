// Gesture Recognition Engine & Baseline Calibration

export class GestureEngine {
  constructor(options = {}) {
    this.onMoveDetected = options.onMoveDetected || (() => {});
    this.onCalibrationUpdate = options.onCalibrationUpdate || (() => {});
    this.onCalibrationComplete = options.onCalibrationComplete || (() => {});

    // Calibration State
    this.isCalibrating = false;
    this.calibrationSamples = [];
    this.calibrationDuration = 3.0; // 3 seconds
    this.calibrationStartTime = 0;
    this.isCalibrated = true; // Sane baseline enabled by default so player can fight immediately!

    // Baseline Normalization Values
    this.baseline = {
      shoulderWidth: 0.28,
      torsoHeight: 0.45,
      noseY: 0.25,
      shoulderY: 0.35,
      hipY: 0.70,
      rightArmRestDist: 0.26,
      leftArmRestDist: 0.26
    };

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

    // History for velocity calculation
    this.prevLandmarks = null;
    this.prevTime = performance.now();
  }

  startCalibration() {
    this.isCalibrating = true;
    this.calibrationSamples = [];
    this.calibrationStartTime = performance.now();
    this.isCalibrated = false;
  }

  processLandmarks(landmarks, worldLandmarks) {
    const now = performance.now();

    // 1. Handle Calibration
    if (this.isCalibrating) {
      this.handleCalibrationStep(landmarks, now);
      return;
    }

    if (!this.isCalibrated) return;

    // 2. Cooldown check
    if (now - this.lastMoveTime < this.currentCooldown) {
      return;
    }

    // 3. Extract Keypoints
    const nose = landmarks[0];
    const lSh = landmarks[11];
    const rSh = landmarks[12];
    const lElb = landmarks[13];
    const rElb = landmarks[14];
    const lWr = landmarks[15];
    const rWr = landmarks[16];
    const lHip = landmarks[23];
    const rHip = landmarks[24];
    const lKnee = landmarks[25];
    const rKnee = landmarks[26];

    // Compute dynamic scale factor based on current shoulder width vs baseline
    const currentShoulderWidth = (rSh && lSh) ? Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y) : this.baseline.shoulderWidth;
    const scaleFactor = (currentShoulderWidth / this.baseline.shoulderWidth) || 1.0;

    // Distances
    const rArmExt = (rWr && rSh) ? Math.hypot(rWr.x - rSh.x, rWr.y - rSh.y) / scaleFactor : 0;
    const lArmExt = (lWr && lSh) ? Math.hypot(lWr.x - lSh.x, lWr.y - lSh.y) / scaleFactor : 0;

    // 3D Depth checks if world landmarks available
    let rDepthPunch = false;
    let lDepthPunch = false;
    let rDepthRetracted = true;
    let lDepthRetracted = true;

    if (worldLandmarks && worldLandmarks[12] && worldLandmarks[16]) {
      // In world landmarks, negative Z is toward camera
      const rDeltaZ = worldLandmarks[12].z - worldLandmarks[16].z;
      rDepthPunch = rDeltaZ > 0.22;
      rDepthRetracted = rDeltaZ < 0.12;
    }
    if (worldLandmarks && worldLandmarks[11] && worldLandmarks[15]) {
      const lDeltaZ = worldLandmarks[11].z - worldLandmarks[15].z;
      lDepthPunch = lDeltaZ > 0.22;
      lDepthRetracted = lDeltaZ < 0.12;
    }

    // --- CHECK RETRACTIONS FIRST (Baseline return guard) ---
    if (rArmExt < this.baseline.rightArmRestDist * 1.25 && rDepthRetracted) {
      this.rightArmRetracted = true;
    }
    if (lArmExt < this.baseline.leftArmRestDist * 1.25 && lDepthRetracted) {
      this.leftArmRetracted = true;
    }

    if (rHip && rKnee && lHip && lKnee) {
      const rKneeLift = (rHip.y - rKnee.y) / scaleFactor;
      const lKneeLift = (lHip.y - lKnee.y) / scaleFactor;
      if (rKneeLift > 0.25 && lKneeLift > 0.25) {
        this.kickRetracted = true;
      }
    }

    // --- 1. BLOCK DETECTION (Both hands raised near face/head) ---
    if (rWr && lWr && rSh && lSh && nose) {
      const bothWristsHigh = (rWr.y < rSh.y + 0.1) && (lWr.y < lSh.y + 0.1);
      const wristsCloseToFace = Math.abs(rWr.x - nose.x) < 0.35 * scaleFactor &&
                                Math.abs(lWr.x - nose.x) < 0.35 * scaleFactor;
      const handsNearEachOther = Math.hypot(rWr.x - lWr.x, rWr.y - lWr.y) < 0.38 * scaleFactor;

      if (bothWristsHigh && wristsCloseToFace && handsNearEachOther) {
        this.triggerMove('block', 250);
        return;
      }

      // --- 2. SPECIAL ATTACK DETECTION (Both hands way above head -> rapid slam down) ---
      const bothHandsAboveHead = (rWr.y < nose.y - 0.05) && (lWr.y < nose.y - 0.05);
      if (bothHandsAboveHead) {
        this.specialPrimed = true;
        this.specialPrimedTime = now;
      } else if (this.specialPrimed) {
        if (now - this.specialPrimedTime < 900) {
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

    // --- 3. DODGE DETECTION (Torso / Head / Shoulder tilt) ---
    if (rSh && lSh) {
      const shoulderDeltaY = (rSh.y - lSh.y) / currentShoulderWidth;
      
      let lateralLean = 0;
      if (rHip && lHip) {
        const hipMidX = (rHip.x + lHip.x) / 2;
        const shMidX = (rSh.x + lSh.x) / 2;
        lateralLean = (shMidX - hipMidX) / currentShoulderWidth;
      }

      if (shoulderDeltaY > 0.28 || lateralLean > 0.24) {
        this.triggerMove('dodge_right', this.cooldowns.dodge, { side: 1 });
        return;
      } else if (shoulderDeltaY < -0.28 || lateralLean < -0.24) {
        this.triggerMove('dodge_left', this.cooldowns.dodge, { side: -1 });
        return;
      }
    }

    // --- 4. KICK DETECTION (Knee elevation) ---
    if (rHip && rKnee && lHip && lKnee) {
      const rKneeUp = (rHip.y - rKnee.y) < 0.18 * scaleFactor;
      const lKneeUp = (lHip.y - lKnee.y) < 0.18 * scaleFactor;

      if (this.kickRetracted && (rKneeUp || lKneeUp)) {
        this.kickRetracted = false;
        this.triggerMove('kick', this.cooldowns.kick);
        return;
      }
    }

    // --- 5. JAB (Right Hand punch) ---
    // Right hand extension past threshold OR forward depth punch
    const isRightPunched = (rWr && rSh && rArmExt > this.baseline.rightArmRestDist * 1.38) || rDepthPunch;
    if (this.rightArmRetracted && isRightPunched) {
      this.rightArmRetracted = false;
      this.triggerMove('jab', this.cooldowns.jab);
      return;
    }

    // --- 6. CROSS (Left Hand punch) ---
    const isLeftPunched = (lWr && lSh && lArmExt > this.baseline.leftArmRestDist * 1.38) || lDepthPunch;
    if (this.leftArmRetracted && isLeftPunched) {
      this.leftArmRetracted = false;
      this.triggerMove('cross', this.cooldowns.cross);
      return;
    }

    this.prevLandmarks = landmarks;
    this.prevTime = now;
  }

  triggerMove(moveName, cooldownMs, payload = {}) {
    this.lastMoveTime = performance.now();
    this.currentCooldown = cooldownMs;
    this.onMoveDetected(moveName, payload);
  }

  handleCalibrationStep(landmarks, now) {
    const elapsed = (now - this.calibrationStartTime) / 1000;
    const remaining = Math.max(0, this.calibrationDuration - elapsed);

    // Compute basic pose features
    const lSh = landmarks[11];
    const rSh = landmarks[12];
    const lWr = landmarks[15];
    const rWr = landmarks[16];
    const nose = landmarks[0];
    const lHip = landmarks[23];
    const rHip = landmarks[24];

    const shoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y);
    const rArmRest = Math.hypot(rWr.x - rSh.x, rWr.y - rSh.y);
    const lArmRest = Math.hypot(lWr.x - lSh.x, lWr.y - lSh.y);
    const torsoHeight = Math.abs(((lHip.y + rHip.y) / 2) - ((lSh.y + rSh.y) / 2));

    this.calibrationSamples.push({
      shoulderWidth,
      rArmRest,
      lArmRest,
      torsoHeight,
      noseY: nose.y,
      shoulderY: (lSh.y + rSh.y) / 2,
      hipY: (lHip.y + rHip.y) / 2
    });

    this.onCalibrationUpdate({
      elapsed,
      remaining,
      progress: Math.min(1, elapsed / this.calibrationDuration)
    });

    if (elapsed >= this.calibrationDuration) {
      // Calculate Average Baseline
      const count = this.calibrationSamples.length;
      if (count > 0) {
        let sumSW = 0, sumRA = 0, sumLA = 0, sumTH = 0, sumNY = 0, sumSY = 0, sumHY = 0;
        for (const s of this.calibrationSamples) {
          sumSW += s.shoulderWidth;
          sumRA += s.rArmRest;
          sumLA += s.lArmRest;
          sumTH += s.torsoHeight;
          sumNY += s.noseY;
          sumSY += s.shoulderY;
          sumHY += s.hipY;
        }

        this.baseline = {
          shoulderWidth: sumSW / count,
          rightArmRestDist: sumRA / count,
          leftArmRestDist: sumLA / count,
          torsoHeight: sumTH / count,
          noseY: sumNY / count,
          shoulderY: sumSY / count,
          hipY: sumHY / count
        };
      }

      this.isCalibrating = false;
      this.isCalibrated = true;
      this.onCalibrationComplete(this.baseline);
    }
  }
}
