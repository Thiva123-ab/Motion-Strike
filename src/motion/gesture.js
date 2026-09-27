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
    this.isCalibrated = false;

    // Baseline Normalization Values
    this.baseline = {
      shoulderWidth: 0.25,
      torsoHeight: 0.45,
      noseY: 0.25,
      shoulderY: 0.35,
      hipY: 0.70,
      rightArmRestDist: 0.25,
      leftArmRestDist: 0.25
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
    // 0: Nose
    // 11: Left Shoulder, 12: Right Shoulder
    // 13: Left Elbow, 14: Right Elbow
    // 15: Left Wrist, 16: Right Wrist
    // 23: Left Hip, 24: Right Hip
    // 25: Left Knee, 26: Right Knee
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
    const currentShoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y);
    const scaleFactor = (currentShoulderWidth / this.baseline.shoulderWidth) || 1.0;

    // Distances
    const rArmExt = Math.hypot(rWr.x - rSh.x, rWr.y - rSh.y) / scaleFactor;
    const lArmExt = Math.hypot(lWr.x - lSh.x, lWr.y - lSh.y) / scaleFactor;

    // --- CHECK RETRACTIONS FIRST (Baseline return guard) ---
    if (rArmExt < this.baseline.rightArmRestDist * 1.25) {
      this.rightArmRetracted = true;
    }
    if (lArmExt < this.baseline.leftArmRestDist * 1.25) {
      this.leftArmRetracted = true;
    }
    const rKneeLift = (rHip.y - rKnee.y) / scaleFactor;
    const lKneeLift = (lHip.y - lKnee.y) / scaleFactor;
    if (rKneeLift > 0.25 && lKneeLift > 0.25) {
      this.kickRetracted = true;
    }

    // --- 1. BLOCK DETECTION (Both hands raised near face/head) ---
    const bothWristsHigh = (rWr.y < rSh.y + 0.05) && (lWr.y < lSh.y + 0.05);
    const wristsCloseToFace = Math.abs(rWr.x - nose.x) < 0.22 * scaleFactor &&
                              Math.abs(lWr.x - nose.x) < 0.22 * scaleFactor;
    const handsNearEachOther = Math.hypot(rWr.x - lWr.x, rWr.y - lWr.y) < 0.28 * scaleFactor;

    if (bothWristsHigh && wristsCloseToFace && handsNearEachOther) {
      this.triggerMove('block', 250);
      return;
    }

    // --- 2. SPECIAL ATTACK DETECTION (Both hands way above head -> rapid slam down) ---
    const bothHandsAboveHead = (rWr.y < nose.y - 0.08) && (lWr.y < nose.y - 0.08);
    if (bothHandsAboveHead) {
      this.specialPrimed = true;
      this.specialPrimedTime = now;
    } else if (this.specialPrimed) {
      // If primed within last 800ms and both hands rapidly thrust downward past chest
      if (now - this.specialPrimedTime < 800) {
        if (rWr.y > rSh.y && lWr.y > lSh.y) {
          this.specialPrimed = false;
          this.triggerMove('special', this.cooldowns.special);
          return;
        }
      } else {
        this.specialPrimed = false;
      }
    }

    // --- 3. DODGE DETECTION (Torso / Shoulder tilt) ---
    // User tilting left or right
    const shoulderDeltaY = (rSh.y - lSh.y) / currentShoulderWidth;
    const hipMidX = (rHip.x + lHip.x) / 2;
    const shMidX = (rSh.x + lSh.x) / 2;
    const lateralLean = (shMidX - hipMidX) / currentShoulderWidth;

    if (shoulderDeltaY > 0.32 || lateralLean > 0.28) {
      // Camera is mirrored, so lean right
      this.triggerMove('dodge_right', this.cooldowns.dodge, { side: 1 });
      return;
    } else if (shoulderDeltaY < -0.32 || lateralLean < -0.28) {
      // Lean left
      this.triggerMove('dodge_left', this.cooldowns.dodge, { side: -1 });
      return;
    }

    // --- 4. KICK DETECTION (Knee elevation) ---
    // Normalized y: smaller y means higher in frame
    const rKneeUp = (rHip.y - rKnee.y) < 0.18 * scaleFactor;
    const lKneeUp = (lHip.y - lKnee.y) < 0.18 * scaleFactor;

    if (this.kickRetracted && (rKneeUp || lKneeUp)) {
      this.kickRetracted = false;
      this.triggerMove('kick', this.cooldowns.kick);
      return;
    }

    // --- 5. JAB (Right Hand forward punch) ---
    // Right hand extension past threshold + baseline return guard
    const isRightPunched = rArmExt > this.baseline.rightArmRestDist * 1.55;
    if (this.rightArmRetracted && isRightPunched) {
      this.rightArmRetracted = false;
      this.triggerMove('jab', this.cooldowns.jab);
      return;
    }

    // --- 6. CROSS (Left Hand forward punch) ---
    const isLeftPunched = lArmExt > this.baseline.leftArmRestDist * 1.55;
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
