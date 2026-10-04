// Gesture Recognition Engine with Strict State Machine & Active Physical Motion Intent
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
      elbow: 260,
      uppercut: 280,
      kick: 500,
      sweep: 500,
      special: 1000,
      dodge: 350
    };
    this.lastMoveTime = 0;
    this.currentCooldown = 0;

    // Arm State Machine: 'RESTING' | 'GUARD' | 'EXTENDING' | 'EXTENDED'
    // To punch, arm MUST start in GUARD, transition to EXTENDING, then trigger and become EXTENDED.
    // An extended arm CANNOT punch again until physically pulled back into GUARD!
    this.rArmState = 'GUARD';
    this.lArmState = 'GUARD';
    this.kickState = 'READY';

    this.specialPrimed = false;
    this.specialPrimedTime = 0;

    // History tracking for velocities and frame deltas
    this.historyInitialized = false;
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
      stanceStatus: 'READY',
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

    // 1. Extract Key Anatomical Landmarks
    const nose = landmarks[0];
    const lSh = landmarks[11]; // Left Shoulder
    const rSh = landmarks[12]; // Right Shoulder
    const lElb = landmarks[13]; // Left Elbow
    const rElb = landmarks[14]; // Right Elbow
    const lWr = landmarks[15]; // Left Wrist (Orthodox Lead Jab hand)
    const rWr = landmarks[16]; // Right Wrist (Orthodox Rear Power Cross hand)
    const lHip = landmarks[23];
    const rHip = landmarks[24];
    const lKnee = landmarks[25];
    const rKnee = landmarks[26];

    // Visibility guard
    if (!rSh || !lSh || !nose) return;

    // 2. Real-time Player Body Lean (with deadzone so standing still causes ZERO drift)
    const shoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y);
    if (shoulderWidth > 0.05) {
      const centerDist = nose.x - 0.5;
      const deadzone = 0.08;
      let lateralLean = 0;
      if (Math.abs(centerDist) > deadzone) {
        lateralLean = (centerDist - Math.sign(centerDist) * deadzone) * -1.8;
      }

      const forwardDelta = shoulderWidth - 0.27;
      let forwardLean = 0;
      if (Math.abs(forwardDelta) > 0.04) {
        forwardLean = (forwardDelta - Math.sign(forwardDelta) * 0.04) * 2.0;
      }

      this.onBodyLean(lateralLean, forwardLean);
    }

    // 3. SCALE-INVARIANT ARM EXTENSION RATIOS
    // Ratio = distance(shoulder, wrist) / (upperArm + foreArm)
    // Bent in guard: ~0.35 - 0.62 | Fully extended punch: ~0.76 - 1.00
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

    // Handle history initialization on first frames to avoid infinite initial thrust
    if (!this.historyInitialized) {
      this.historyInitialized = true;
      this.lastFrameTime = now;
      if (rWr) { this.prevRWrX = rWr.x; this.prevRWrY = rWr.y; }
      if (lWr) { this.prevLWrX = lWr.x; this.prevLWrY = lWr.y; }
      this.prevRSpan = rSpan;
      this.prevLSpan = lSpan;
      this.prevNoseX = nose.x;
      if (rKnee) this.prevRKneeY = rKnee.y;
      if (lKnee) this.prevLKneeY = lKnee.y;
      return;
    }

    // 4. WRIST VELOCITIES & THRUST RATES
    const dt = Math.min(0.1, Math.max(0.016, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    // Outward expansion rate of arm (positive = thrusting forward into punch)
    const rThrust = (rSpan - this.prevRSpan) / dt;
    const lThrust = (lSpan - this.prevLSpan) / dt;

    // Spatial speed of fists and upward velocity
    const rSpeed = rWr ? Math.hypot(rWr.x - this.prevRWrX, rWr.y - this.prevRWrY) / dt : 0;
    const lSpeed = lWr ? Math.hypot(lWr.x - this.prevLWrX, lWr.y - this.prevLWrY) / dt : 0;
    const rWrVelY = rWr ? (this.prevRWrY - rWr.y) / dt : 0; // upward motion is positive

    // Update history for next frame
    if (rWr) { this.prevRWrX = rWr.x; this.prevRWrY = rWr.y; }
    if (lWr) { this.prevLWrX = lWr.x; this.prevLWrY = lWr.y; }
    this.prevRSpan = rSpan;
    this.prevLSpan = lSpan;

    // Head lateral velocity for intentional slips
    const noseVelX = (nose.x - this.prevNoseX) / dt;
    this.prevNoseX = nose.x;

    // Vertical knee velocity for kicks
    const rKneeVelY = rKnee ? (this.prevRKneeY - rKnee.y) / dt : 0;
    const lKneeVelY = lKnee ? (this.prevLKneeY - lKnee.y) / dt : 0;
    if (rKnee) this.prevRKneeY = rKnee.y;
    if (lKnee) this.prevLKneeY = lKnee.y;

    // 5. COMBAT ELEVATION CHECK
    // In boxing, hands MUST be raised at chest/chin/shoulder level (+Y is downward in webcam)
    // If wrists are far down (resting on desk, lap, or hanging), they are RESTING - NO PUNCHES ALLOWED!
    const rHandInCombatPos = rWr && (rWr.y < rSh.y + 0.22);
    const lHandInCombatPos = lWr && (lWr.y < lSh.y + 0.22);

    // 6. ARM STATE MACHINE (Strict Anti-Auto-Play System)
    // RIGHT ARM:
    if (!rHandInCombatPos) {
      this.rArmState = 'RESTING';
    } else if (this.rArmState === 'RESTING') {
      // Transition from resting into guard once hands are raised and bent
      if (rExtRatio < 0.65) this.rArmState = 'GUARD';
    } else if (this.rArmState === 'EXTENDED') {
      // Must physically retract hand back towards body/guard to reset!
      // NO auto-reset timers!
      if (rExtRatio < 0.65 || rThrust < -0.20) {
        this.rArmState = 'GUARD';
      }
    } else if (this.rArmState === 'GUARD') {
      // When in guard, starting an explosive outward thrust transitions to EXTENDING
      if (rThrust > 0.30 || (rSpeed > 0.55 && rThrust > 0.15)) {
        this.rArmState = 'EXTENDING';
      }
    }

    // LEFT ARM:
    if (!lHandInCombatPos) {
      this.lArmState = 'RESTING';
    } else if (this.lArmState === 'RESTING') {
      if (lExtRatio < 0.65) this.lArmState = 'GUARD';
    } else if (this.lArmState === 'EXTENDED') {
      // Must physically retract hand back to reset!
      if (lExtRatio < 0.65 || lThrust < -0.20) {
        this.lArmState = 'GUARD';
      }
    } else if (this.lArmState === 'GUARD') {
      if (lThrust > 0.30 || (lSpeed > 0.55 && lThrust > 0.15)) {
        this.lArmState = 'EXTENDING';
      }
    }

    // 7. BLOCK DETECTION (Both hands raised at face level in tight guard)
    let isGuarding = false;
    if (rWr && lWr && nose) {
      const bothWristsHigh = (rWr.y < rSh.y + 0.14) && (lWr.y < lSh.y + 0.14);
      const handsNearFace = Math.abs(rWr.x - nose.x) < 0.38 && Math.abs(lWr.x - nose.x) < 0.38;
      const handsClose = Math.hypot(rWr.x - lWr.x, rWr.y - lWr.y) < 0.38;

      if (bothWristsHigh && (handsNearFace || handsClose) && rExtRatio < 0.70 && lExtRatio < 0.70) {
        isGuarding = true;
        this.latestMetrics.isGuarding = true;
        this.latestMetrics.stanceStatus = 'SHIELD GUARD';
        this.triggerMove('block', 180);
        return;
      }
    }
    this.latestMetrics.isGuarding = isGuarding;

    // 8. Update real-time metrics for HUD/PiP display
    let stanceStatus = 'READY';
    if (!rHandInCombatPos && !lHandInCombatPos) stanceStatus = 'HANDS AT REST';
    else if (this.rArmState === 'GUARD' && this.lArmState === 'GUARD') stanceStatus = 'GUARD READY';
    else if (this.rArmState === 'EXTENDING' || this.lArmState === 'EXTENDING') stanceStatus = 'STRIKING!';
    else if (this.rArmState === 'EXTENDED' || this.lArmState === 'EXTENDED') stanceStatus = 'RETRACT HAND';

    this.latestMetrics = {
      rExtRatio: Math.round(rExtRatio * 100),
      lExtRatio: Math.round(lExtRatio * 100),
      rSpeed: Math.round(rSpeed * 10) / 10,
      lSpeed: Math.round(lSpeed * 10) / 10,
      isGuarding,
      stanceStatus,
      lastDetectedMove: this.latestMetrics.lastDetectedMove
    };

    // 9. Global Cooldown check
    if (now - this.lastMoveTime < this.currentCooldown) {
      return;
    }

    // 10. SPECIAL ATTACK DETECTION (Both hands high above head -> intentional power slam down)
    if (rWr && lWr && nose) {
      const bothHandsAboveHead = (rWr.y < nose.y - 0.08) && (lWr.y < nose.y - 0.08);
      if (bothHandsAboveHead) {
        this.specialPrimed = true;
        this.specialPrimedTime = now;
        this.latestMetrics.lastDetectedMove = 'SPECIAL PRIMED!';
      } else if (this.specialPrimed) {
        if (now - this.specialPrimedTime < 1100) {
          if (rWr.y > rSh.y && lWr.y > lSh.y && (rSpeed > 0.70 || lSpeed > 0.70)) {
            this.specialPrimed = false;
            this.triggerMove('special', this.cooldowns.special, { isPowerStrike: true });
            return;
          }
        } else {
          this.specialPrimed = false;
        }
      }
    }

    // 11. DODGE / SLIP DETECTION (Requires ACTIVE lateral head velocity)
    if (shoulderWidth > 0.05) {
      const noseOffset = (nose.x - (rSh.x + lSh.x) * 0.5) / shoulderWidth;
      if (noseOffset < -0.22 && noseVelX < -0.45) {
        this.triggerMove('dodge_right', this.cooldowns.dodge, { side: 1 });
        return;
      } else if (noseOffset > 0.22 && noseVelX > 0.45) {
        this.triggerMove('dodge_left', this.cooldowns.dodge, { side: -1 });
        return;
      }
    }

    // 12. KICK DETECTION (Requires LOWER BODY to be clearly visible + upward knee velocity)
    const hasLowerBody = rHip && rKnee && lHip && lKnee &&
      (rHip.visibility ?? 1) > 0.5 && (rKnee.visibility ?? 1) > 0.5;

    if (hasLowerBody) {
      if (this.kickState === 'READY') {
        const rKneeUp = (rHip.y - rKnee.y) < 0.15 && rKneeVelY > 0.45;
        const lKneeUp = (lHip.y - lKnee.y) < 0.15 && lKneeVelY > 0.45;

        if (rKneeUp || lKneeUp) {
          this.kickState = 'KICKED';
          this.triggerMove('kick', this.cooldowns.kick, { isPowerStrike: true });
          return;
        }
      } else {
        // Reset kick when knee drops back down
        const kneesDown = (rHip.y - rKnee.y) > 0.22 && (lHip.y - lKnee.y) > 0.22;
        if (kneesDown) this.kickState = 'READY';
      }
    }

    // 13. LEAD JAB (Left Hand) - Orthodox stance lead punch
    // Triggers ONLY if arm was in EXTENDING state and reaches solid extension!
    if (this.lArmState === 'EXTENDING' && lHandInCombatPos) {
      const reachedExtension = lExtRatio > 0.74;
      if (reachedExtension) {
        this.lArmState = 'EXTENDED';
        const isPowerStrike = (lSpeed > 0.95 || lExtRatio > 0.85);
        this.triggerMove('jab', this.cooldowns.jab, { isPowerStrike });
        return;
      }
    }

    // 14. POWER CROSS / UPPERCUT / ELBOW (Right Hand)
    if (this.rArmState === 'EXTENDING' && rHandInCombatPos) {
      // Uppercut: wrist driving sharply upward under chin with compact arm
      if (rWrVelY > 0.65 && rExtRatio > 0.40 && rExtRatio < 0.78) {
        this.rArmState = 'EXTENDED';
        const isPowerStrike = (rSpeed > 0.90 || rWrVelY > 0.95);
        this.triggerMove('uppercut', this.cooldowns.uppercut, { isPowerStrike });
        return;
      }

      // Dragon Elbow Smash: rapid horizontal forearm whip while arm stays tucked
      if (rSpeed > 0.85 && rExtRatio >= 0.35 && rExtRatio < 0.60) {
        this.rArmState = 'EXTENDED';
        const isPowerStrike = (rSpeed > 1.10);
        this.triggerMove('elbow', this.cooldowns.elbow, { isPowerStrike });
        return;
      }

      // Power Cross: full arm extension outward
      const reachedExtension = rExtRatio > 0.74;
      if (reachedExtension) {
        this.rArmState = 'EXTENDED';
        const isPowerStrike = (rSpeed > 0.95 || rExtRatio > 0.85);
        this.triggerMove('cross', this.cooldowns.cross, { isPowerStrike });
        return;
      }
    }
  }

  triggerMove(moveName, cooldownMs, payload = {}) {
    this.lastMoveTime = performance.now();
    this.currentCooldown = cooldownMs;

    let display = moveName.toUpperCase();
    if (moveName === 'jab') display = payload.isPowerStrike ? '🔥 SHADOW DRAGON JAB!' : '⚡ LEAD SHADOW JAB!';
    if (moveName === 'cross') display = payload.isPowerStrike ? '💥 SPINNING BACKFIST!' : '🔥 SHADOW HOOK!';
    if (moveName === 'elbow') display = payload.isPowerStrike ? '🔥 DRAGON ELBOW SMASH!' : '⚡ SHADOW ELBOW STRIKE!';
    if (moveName === 'uppercut') display = payload.isPowerStrike ? '🔥 RISING UPPERCUT!' : '💥 SHADOW UPPERCUT!';
    if (moveName === 'sweep') display = payload.isPowerStrike ? '🔥 LOW DRAGON SWEEP!' : '🌪️ SHADOW LEG SWEEP!';
    if (moveName === 'kick') display = '🦵 CRESCENT SHADOW KICK!';
    if (moveName === 'block') display = '🛡️ SHADOW BARRIER!';
    if (moveName === 'dodge_left') display = '🌀 SHADOW DASH LEFT!';
    if (moveName === 'dodge_right') display = '🌀 SHADOW DASH RIGHT!';
    if (moveName === 'special') display = '⭐ RISING DRAGON FLURRY!';

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
