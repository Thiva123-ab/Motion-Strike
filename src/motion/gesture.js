// Gesture Recognition Engine with Scale-Invariant Arm Extension & Real-time Metrics

export class GestureEngine {
  constructor(options = {}) {
    this.onMoveDetected = options.onMoveDetected || (() => {});
    this.onBodyLean = options.onBodyLean || (() => {});
    this.onCalibrationUpdate = options.onCalibrationUpdate || (() => {});
    this.onCalibrationComplete = options.onCalibrationComplete || (() => {});

    // Calibration State
    this.isCalibrating = false;
    this.calibrationDuration = 3.0;
    this.calibrationStartTime = 0;
    this.isCalibrated = true;

    // Cooldown Timers (in ms) - fast & snappy for responsive physical striking
    this.cooldowns = {
      jab: 200,
      cross: 220,
      kick: 420,
      special: 1000,
      dodge: 280
    };
    this.lastMoveTime = 0;
    this.currentCooldown = 0;

    // Arm return-to-baseline guards with auto-recovery timeout
    this.rightArmRetracted = true;
    this.leftArmRetracted = true;
    this.kickRetracted = true;
    this.lastRPunchTime = 0;
    this.lastLPunchTime = 0;
    this.lastKickTime = 0;

    this.specialPrimed = false;
    this.specialPrimedTime = 0;

    // Previous frame tracking for velocity and outward thrust
    this.lastFrameTime = performance.now();
    this.prevRWrX = 0;
    this.prevRWrY = 0;
    this.prevLWrX = 0;
    this.prevLWrY = 0;
    this.prevRSpan = 0;
    this.prevLSpan = 0;
    this.prevRDepth = 0;
    this.prevLDepth = 0;

    // Real-time metrics for HUD & PiP display
    this.latestMetrics = {
      rExtRatio: 0,
      lExtRatio: 0,
      rSpeed: 0,
      lSpeed: 0,
      rDepth: 0,
      lDepth: 0,
      isGuarding: false,
      lastDetectedMove: 'NONE'
    };
  }

  startCalibration() {
    this.isCalibrating = true;
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
    const lWr = landmarks[15]; // Left Wrist (Lead hand in Orthodox)
    const rWr = landmarks[16]; // Right Wrist (Power hand in Orthodox)
    const lHip = landmarks[23];
    const rHip = landmarks[24];
    const lKnee = landmarks[25];
    const rKnee = landmarks[26];

    // Check shoulder visibility
    if (!rSh || !lSh || !nose) return;

    // 2. Continuous Real-time Player Body Lean & Motion Tracking
    const shoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y);
    if (shoulderWidth > 0.05) {
      // Lateral lean: mirrored camera, so head shifting tilts fighter naturally
      const lateralLean = (nose.x - 0.5) * -1.8;
      // Forward lean: as player steps in or leans towards camera, shoulder span expands
      const forwardLean = (shoulderWidth - 0.25) * 2.2;
      this.onBodyLean(lateralLean, forwardLean);
    }

    // 3. SCALE-INVARIANT ARM EXTENSION RATIOS
    // Ratio = dist(shoulder, wrist) / (dist(shoulder, elbow) + dist(elbow, wrist))
    let rExtRatio = 0;
    let lExtRatio = 0;
    let rSpan = 0;
    let lSpan = 0;

    if (rWr && rElb && rSh) {
      const rUpper = Math.hypot(rElb.x - rSh.x, rElb.y - rSh.y);
      const rFore = Math.hypot(rWr.x - rElb.x, rWr.y - rElb.y);
      const rTotal = rUpper + rFore;
      rSpan = Math.hypot(rWr.x - rSh.x, rWr.y - rSh.y);
      rExtRatio = rTotal > 0.01 ? (rSpan / rTotal) : 0;
    }

    if (lWr && lElb && lSh) {
      const lUpper = Math.hypot(lElb.x - lSh.x, lElb.y - lSh.y);
      const lFore = Math.hypot(lWr.x - lElb.x, lWr.y - lElb.y);
      const lTotal = lUpper + lFore;
      lSpan = Math.hypot(lWr.x - lSh.x, lWr.y - lSh.y);
      lExtRatio = lTotal > 0.01 ? (lSpan / lTotal) : 0;
    }

    // 4. WRIST 2D VELOCITY & DEPTH CALCULATION
    const dt = Math.max(0.016, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    const rSpeed = rWr ? Math.hypot(rWr.x - this.prevRWrX, rWr.y - this.prevRWrY) / dt : 0;
    const lSpeed = lWr ? Math.hypot(lWr.x - this.prevLWrX, lWr.y - this.prevLWrY) / dt : 0;
    const rThrust = (rSpan - this.prevRSpan) / dt;
    const lThrust = (lSpan - this.prevLSpan) / dt;

    if (rWr) { this.prevRWrX = rWr.x; this.prevRWrY = rWr.y; }
    if (lWr) { this.prevLWrX = lWr.x; this.prevLWrY = lWr.y; }
    this.prevRSpan = rSpan;
    this.prevLSpan = lSpan;

    // 3D forward depth
    let rDepth = (rSh.z !== undefined && rWr && rWr.z !== undefined) ? (rSh.z - rWr.z) : 0;
    let lDepth = (lSh.z !== undefined && lWr && lWr.z !== undefined) ? (lSh.z - lWr.z) : 0;
    if (worldLandmarks && worldLandmarks[12] && worldLandmarks[16]) {
      rDepth = Math.max(rDepth, worldLandmarks[12].z - worldLandmarks[16].z);
    }
    if (worldLandmarks && worldLandmarks[11] && worldLandmarks[15]) {
      lDepth = Math.max(lDepth, worldLandmarks[11].z - worldLandmarks[15].z);
    }

    const rVelZ = (rDepth - this.prevRDepth) / dt;
    const lVelZ = (lDepth - this.prevLDepth) / dt;
    this.prevRDepth = rDepth;
    this.prevLDepth = lDepth;

    // 5. AUTO-RETRACT SYSTEM (Prevents lockout traps!)
    // Arm re-primes if extension drops below 0.74 OR pulling back OR 250ms have passed!
    if (!this.rightArmRetracted) {
      if (rExtRatio < 0.74 || rThrust < -0.15 || (now - this.lastRPunchTime > 250)) {
        this.rightArmRetracted = true;
      }
    }
    if (!this.leftArmRetracted) {
      if (lExtRatio < 0.74 || lThrust < -0.15 || (now - this.lastLPunchTime > 250)) {
        this.leftArmRetracted = true;
      }
    }
    if (!this.kickRetracted) {
      if (now - this.lastKickTime > 450) {
        this.kickRetracted = true;
      }
    }

    // 6. BLOCK DETECTION (Both hands raised guarding chin/face)
    let isGuarding = false;
    if (rWr && lWr && nose) {
      const bothWristsHigh = (rWr.y < rSh.y + 0.18) && (lWr.y < lSh.y + 0.18);
      const wristsNearFace = Math.abs(rWr.x - nose.x) < 0.42 && Math.abs(lWr.x - nose.x) < 0.42;
      const handsCloseTogether = Math.hypot(rWr.x - lWr.x, rWr.y - lWr.y) < 0.42;

      if (bothWristsHigh && (wristsNearFace || handsCloseTogether) && rExtRatio < 0.75 && lExtRatio < 0.75) {
        isGuarding = true;
        this.latestMetrics.isGuarding = true;
        this.triggerMove('block', 180);
        return;
      }
    }
    this.latestMetrics.isGuarding = isGuarding;

    // 7. Update real-time metrics for HUD/PiP display
    this.latestMetrics = {
      rExtRatio: Math.round(rExtRatio * 100),
      lExtRatio: Math.round(lExtRatio * 100),
      rSpeed: Math.round(rSpeed * 10) / 10,
      lSpeed: Math.round(lSpeed * 10) / 10,
      rDepth: Math.round(rDepth * 100),
      lDepth: Math.round(lDepth * 100),
      isGuarding,
      lastDetectedMove: this.latestMetrics.lastDetectedMove
    };

    // 8. Global Cooldown check
    if (now - this.lastMoveTime < this.currentCooldown) {
      return;
    }

    // 9. SPECIAL ATTACK DETECTION (Both hands high above head -> slam down)
    if (rWr && lWr && nose) {
      const bothHandsAboveHead = (rWr.y < nose.y - 0.05) && (lWr.y < nose.y - 0.05);
      if (bothHandsAboveHead) {
        this.specialPrimed = true;
        this.specialPrimedTime = now;
        this.latestMetrics.lastDetectedMove = 'SPECIAL PRIMED!';
      } else if (this.specialPrimed) {
        if (now - this.specialPrimedTime < 1200) {
          if (rWr.y > rSh.y && lWr.y > lSh.y) {
            this.specialPrimed = false;
            this.triggerMove('special', this.cooldowns.special, { isPowerStrike: true });
            return;
          }
        } else {
          this.specialPrimed = false;
        }
      }
    }

    // 10. DODGE / SLIP DETECTION (Head & Shoulder lateral tilt)
    if (shoulderWidth > 0.05) {
      const shoulderDeltaY = (rSh.y - lSh.y) / shoulderWidth;
      const noseOffset = (nose.x - (rSh.x + lSh.x) * 0.5) / shoulderWidth;

      if (shoulderDeltaY > 0.14 || noseOffset < -0.16) {
        this.triggerMove('dodge_right', this.cooldowns.dodge, { side: 1 });
        return;
      } else if (shoulderDeltaY < -0.14 || noseOffset > 0.16) {
        this.triggerMove('dodge_left', this.cooldowns.dodge, { side: -1 });
        return;
      }
    }

    // 11. KICK DETECTION (Knee elevation or Upper-body Desk Mode alternative)
    const hasLowerBody = rHip && rKnee && lHip && lKnee &&
      (rHip.visibility ?? 1) > 0.35 && (rKnee.visibility ?? 1) > 0.35;

    let isKicked = false;
    if (hasLowerBody) {
      const rKneeUp = (rHip.y - rKnee.y) < 0.22;
      const lKneeUp = (lHip.y - lKnee.y) < 0.22;
      if (rKneeUp || lKneeUp) isKicked = true;
    } else {
      // Desk / Upper-body mode: Rapid downward body strike with wrist below chest
      if (rWr && lWr && rHip) {
        const bodyPunchDown = (rWr.y > rHip.y - 0.05 || lWr.y > lHip.y - 0.05) && (rSpeed > 0.75 || lSpeed > 0.75);
        if (bodyPunchDown) isKicked = true;
      }
    }

    if (this.kickRetracted && isKicked) {
      this.kickRetracted = false;
      this.lastKickTime = now;
      this.triggerMove('kick', this.cooldowns.kick, { isPowerStrike: true });
      return;
    }

    // 12. PUNCH IDENTIFICATION & POWER CALCULATION
    // In boxing orthodox stance:
    // User's Left Arm (Landmark 15) is Lead Hand -> JAB!
    // User's Right Arm (Landmark 16) is Rear Power Hand -> CROSS!
    const isLeftPunched = (lExtRatio > 0.71) ||
                          (lExtRatio > 0.64 && lSpeed > 0.65) ||
                          (lExtRatio > 0.63 && lThrust > 0.40) ||
                          (lDepth > 0.10) ||
                          (lExtRatio > 0.60 && lVelZ > 0.35);

    if (this.leftArmRetracted && isLeftPunched) {
      this.leftArmRetracted = false;
      this.lastLPunchTime = now;
      const isPowerStrike = (lSpeed > 1.05 || lExtRatio > 0.85);
      this.triggerMove('jab', this.cooldowns.jab, { isPowerStrike });
      return;
    }

    const isRightPunched = (rExtRatio > 0.71) ||
                           (rExtRatio > 0.64 && rSpeed > 0.65) ||
                           (rExtRatio > 0.63 && rThrust > 0.40) ||
                           (rDepth > 0.10) ||
                           (rExtRatio > 0.60 && rVelZ > 0.35);

    if (this.rightArmRetracted && isRightPunched) {
      this.rightArmRetracted = false;
      this.lastRPunchTime = now;
      const isPowerStrike = (rSpeed > 1.05 || rExtRatio > 0.85);
      this.triggerMove('cross', this.cooldowns.cross, { isPowerStrike });
      return;
    }
  }

  triggerMove(moveName, cooldownMs, payload = {}) {
    this.lastMoveTime = performance.now();
    this.currentCooldown = cooldownMs;

    let display = moveName.toUpperCase();
    if (moveName === 'jab') display = payload.isPowerStrike ? '🔥 POWER JAB!' : '⚡ LEAD JAB!';
    if (moveName === 'cross') display = payload.isPowerStrike ? '🔥 CRITICAL CROSS!' : '💥 POWER CROSS!';
    if (moveName === 'kick') display = '🦵 MUAY THAI KICK!';
    if (moveName === 'block') display = '🛡️ GUARD ACTIVE!';
    if (moveName === 'dodge_left') display = '🌀 SLIP LEFT!';
    if (moveName === 'dodge_right') display = '🌀 SLIP RIGHT!';
    if (moveName === 'special') display = '⭐ SUPER UPPERCUT!';

    this.latestMetrics.lastDetectedMove = display;
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
