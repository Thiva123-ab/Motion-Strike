// Gesture Recognition Engine with Strict Velocity & Active Intent Verification
// Eliminates all phantom / auto-triggering moves when standing still or resting

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

    // Cooldown Timers (in ms)
    this.cooldowns = {
      jab: 220,
      cross: 240,
      kick: 450,
      special: 1000,
      dodge: 350
    };
    this.lastMoveTime = 0;
    this.currentCooldown = 0;

    // Physical Retraction State (Player must physically pull back before punching again)
    this.rightArmRetracted = true;
    this.leftArmRetracted = true;
    this.kickRetracted = true;
    this.lastRPunchTime = 0;
    this.lastLPunchTime = 0;
    this.lastKickTime = 0;

    this.specialPrimed = false;
    this.specialPrimedTime = 0;

    // Previous frame tracking for VELOCITY calculation (Strict Intent Verification)
    this.lastFrameTime = performance.now();
    this.prevRWrX = 0;
    this.prevRWrY = 0;
    this.prevLWrX = 0;
    this.prevLWrY = 0;
    this.prevRSpan = 0;
    this.prevLSpan = 0;
    this.prevNoseX = 0.5;
    this.prevRKneeY = 1.0;
    this.prevLKneeY = 1.0;

    // Real-time metrics for HUD & PiP display
    this.latestMetrics = {
      rExtRatio: 0,
      lExtRatio: 0,
      rSpeed: 0,
      lSpeed: 0,
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

    // Check essential visibility
    if (!rSh || !lSh || !nose) return;

    // 2. Real-time Player Body Lean with DEADZONE to eliminate accidental drifting
    const shoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y);
    if (shoulderWidth > 0.05) {
      const centerDist = nose.x - 0.5;
      // 8% deadzone in center so neutral standing causes ZERO unwanted leaning
      const deadzone = 0.08;
      let lateralLean = 0;
      if (Math.abs(centerDist) > deadzone) {
        lateralLean = (centerDist - Math.sign(centerDist) * deadzone) * -1.8;
      }

      // Forward lean with deadzone
      const forwardDelta = shoulderWidth - 0.27;
      let forwardLean = 0;
      if (Math.abs(forwardDelta) > 0.04) {
        forwardLean = (forwardDelta - Math.sign(forwardDelta) * 0.04) * 2.0;
      }

      this.onBodyLean(lateralLean, forwardLean);
    }

    // 3. SCALE-INVARIANT ARM EXTENSION RATIOS
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

    // 4. WRIST & JOINT VELOCITIES (Crucial for eliminating static false triggers)
    const dt = Math.max(0.016, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // Outward thrust speed (rate of arm extension)
    const rThrust = (rSpan - this.prevRSpan) / dt;
    const lThrust = (lSpan - this.prevLSpan) / dt;

    // Spatial 2D speed of wrists
    const rSpeed = rWr ? Math.hypot(rWr.x - this.prevRWrX, rWr.y - this.prevRWrY) / dt : 0;
    const lSpeed = lWr ? Math.hypot(lWr.x - this.prevLWrX, lWr.y - this.prevLWrY) / dt : 0;

    // Lateral velocity of head for intentional slip dodges
    const noseVelX = (nose.x - this.prevNoseX) / dt;

    // Vertical velocity of knees for intentional kicks
    const rKneeVelY = rKnee ? (this.prevRKneeY - rKnee.y) / dt : 0; // Positive when moving upward
    const lKneeVelY = lKnee ? (this.prevLKneeY - lKnee.y) / dt : 0;

    // Update history for next frame
    if (rWr) { this.prevRWrX = rWr.x; this.prevRWrY = rWr.y; }
    if (lWr) { this.prevLWrX = lWr.x; this.prevLWrY = lWr.y; }
    this.prevRSpan = rSpan;
    this.prevLSpan = lSpan;
    this.prevNoseX = nose.x;
    if (rKnee) this.prevRKneeY = rKnee.y;
    if (lKnee) this.prevLKneeY = lKnee.y;

    // 5. PHYSICAL RETRACTION SYSTEM
    // Arm re-primes immediately when pulling back OR after 280ms for rapid-fire combos
    if (!this.rightArmRetracted) {
      if (rExtRatio < 0.74 || rThrust < -0.15 || (now - this.lastRPunchTime > 280)) {
        this.rightArmRetracted = true;
      }
    }
    if (!this.leftArmRetracted) {
      if (lExtRatio < 0.74 || lThrust < -0.15 || (now - this.lastLPunchTime > 280)) {
        this.leftArmRetracted = true;
      }
    }
    if (!this.kickRetracted) {
      if (now - this.lastKickTime > 450) {
        this.kickRetracted = true;
      }
    }

    // 6. BLOCK DETECTION (Both hands actively held at face level)
    let isGuarding = false;
    if (rWr && lWr && nose) {
      const bothWristsHigh = (rWr.y < rSh.y + 0.14) && (lWr.y < lSh.y + 0.14);
      const handsNearFace = Math.abs(rWr.x - nose.x) < 0.40 && Math.abs(lWr.x - nose.x) < 0.40;
      const handsClose = Math.hypot(rWr.x - lWr.x, rWr.y - lWr.y) < 0.40;

      if (bothWristsHigh && (handsNearFace || handsClose) && rExtRatio < 0.74 && lExtRatio < 0.74) {
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
      isGuarding,
      lastDetectedMove: this.latestMetrics.lastDetectedMove
    };

    // 8. Global Cooldown check
    if (now - this.lastMoveTime < this.currentCooldown) {
      return;
    }

    // 9. SPECIAL ATTACK DETECTION (Both hands held above head -> deliberate power slam down)
    if (rWr && lWr && nose) {
      const bothHandsAboveHead = (rWr.y < nose.y - 0.08) && (lWr.y < nose.y - 0.08);
      if (bothHandsAboveHead) {
        this.specialPrimed = true;
        this.specialPrimedTime = now;
        this.latestMetrics.lastDetectedMove = 'SPECIAL PRIMED!';
      } else if (this.specialPrimed) {
        if (now - this.specialPrimedTime < 1200) {
          // Slamming hands down with downward speed
          if (rWr.y > rSh.y && lWr.y > lSh.y && (rSpeed > 0.75 || lSpeed > 0.75)) {
            this.specialPrimed = false;
            this.triggerMove('special', this.cooldowns.special, { isPowerStrike: true });
            return;
          }
        } else {
          this.specialPrimed = false;
        }
      }
    }

    // 10. DODGE / SLIP DETECTION (Requires ACTIVE lateral head velocity)
    // A tilted camera or static head tilt will NEVER trigger a dodge!
    if (shoulderWidth > 0.05) {
      const noseOffset = (nose.x - (rSh.x + lSh.x) * 0.5) / shoulderWidth;

      // Active rapid slip to right (mirrored: head moves right with velocity)
      if (noseOffset < -0.20 && noseVelX < -0.40) {
        this.triggerMove('dodge_right', this.cooldowns.dodge, { side: 1 });
        return;
      } else if (noseOffset > 0.20 && noseVelX > 0.40) {
        this.triggerMove('dodge_left', this.cooldowns.dodge, { side: -1 });
        return;
      }
    }

    // 11. KICK DETECTION (Requires ACTIVE upward knee velocity)
    const hasLowerBody = rHip && rKnee && lHip && lKnee &&
      (rHip.visibility ?? 1) > 0.4 && (rKnee.visibility ?? 1) > 0.4;

    if (hasLowerBody && this.kickRetracted) {
      const rKneeUp = (rHip.y - rKnee.y) < 0.22 && rKneeVelY > 0.35;
      const lKneeUp = (lHip.y - lKnee.y) < 0.22 && lKneeVelY > 0.35;

      if (rKneeUp || lKneeUp) {
        this.kickRetracted = false;
        this.lastKickTime = now;
        this.triggerMove('kick', this.cooldowns.kick, { isPowerStrike: true });
        return;
      }
    }

    // 12. PUNCH DETECTION (INSTANTANEOUS EXECUTION)
    // Hands must be in combat elevation
    const hipY = (rHip && lHip) ? Math.min(rHip.y, lHip.y) : 0.85;
    const rHandInCombatPos = rWr && (rWr.y < hipY - 0.04);
    const lHandInCombatPos = lWr && (lWr.y < hipY - 0.04);

    // LEAD JAB (Left Hand) - Fires the instant forward thrust begins!
    if (this.leftArmRetracted && lHandInCombatPos) {
      const isThrustingOut = (lThrust > 0.22) || (lSpeed > 0.45 && lThrust > 0.08);
      const isExtending = lExtRatio > 0.68;

      if (isThrustingOut && isExtending) {
        this.leftArmRetracted = false;
        this.lastLPunchTime = now;
        const isPowerStrike = (lSpeed > 0.90 || lExtRatio > 0.84);
        this.triggerMove('jab', this.cooldowns.jab, { isPowerStrike });
        return;
      }
    }

    // POWER CROSS (Right Hand) - Fires the instant forward thrust begins!
    if (this.rightArmRetracted && rHandInCombatPos) {
      const isThrustingOut = (rThrust > 0.22) || (rSpeed > 0.45 && rThrust > 0.08);
      const isExtended = rExtRatio > 0.68;

      if (isThrustingOut && isExtended) {
        this.rightArmRetracted = false;
        this.lastRPunchTime = now;
        const isPowerStrike = (rSpeed > 0.90 || rExtRatio > 0.84);
        this.triggerMove('cross', this.cooldowns.cross, { isPowerStrike });
        return;
      }
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
