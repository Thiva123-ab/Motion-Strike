import { sound } from '../audio.js';

export class CombatEngine {
  constructor(options = {}) {
    this.playerFighter = options.playerFighter;
    this.cpuFighter = options.cpuFighter;
    this.vfx = options.vfx;
    this.camera = options.camera;
    this.onStateChange = options.onStateChange || (() => {});
    this.onRoundEnd = options.onRoundEnd || (() => {});
    this.onMatchEnd = options.onMatchEnd || (() => {});

    // Player Damage Table (Buffed for powerful physical strikes)
    this.PLAYER_DAMAGE = {
      jab: 15,
      cross: 24,
      kick: 32,
      elbow: 22,
      uppercut: 26,
      sweep: 28,
      special: 55
    };

    // CPU Damage Table (Tuned fair so player does not take excessive damage)
    this.CPU_DAMAGE = {
      jab: 5,
      cross: 8,
      kick: 11,
      elbow: 7,
      uppercut: 8,
      sweep: 9,
      special: 18
    };

    // Combat State
    this.roundTime = 99;
    this.isRoundActive = false;
    this.isPracticeMode = false;
    this.hitStopTimer = 0;

    // Best of 3 Stats
    this.playerWins = 0;
    this.cpuWins = 0;
    this.currentRound = 1;
    this.maxRoundsToWin = 2;

    this.resetFighters();
  }

  resetFighters() {
    this.player = {
      health: 100,
      maxHealth: 100,
      specialMeter: 0,
      maxSpecialMeter: 100,
      isBlocking: false,
      isDodging: false,
      dodgeTimer: 0,
      lastAction: null
    };

    this.cpu = {
      health: 100,
      maxHealth: 100,
      specialMeter: 0,
      maxSpecialMeter: 100,
      isBlocking: false,
      isDodging: false,
      dodgeTimer: 0,
      lastAction: null
    };

    if (this.playerFighter) this.playerFighter.reset();
    if (this.cpuFighter) this.cpuFighter.reset();
  }

  setOpponentAi(ai) {
    this.ai = ai;
  }

  startRound() {
    this.roundTime = 99;
    this.resetFighters();
    this.isRoundActive = true;
    sound.playBell();
    this.notifyState();
  }

  // Player input handler
  executePlayerMove(moveName, payload = {}) {
    if (!this.isRoundActive || this.player.health <= 0) return;

    if (moveName === 'block') {
      this.player.isBlocking = true;
      this.player.blockTimer = 0.35; // Block lasts 0.35s unless refreshed
      this.playerFighter.triggerAction('block', 0.35);
      return;
    }

    if (moveName === 'dodge_left' || moveName === 'dodge_right') {
      this.player.isDodging = true;
      this.player.dodgeTimer = 0.28; // 0.28s dodge window
      sound.playDodge();
      this.playerFighter.triggerAction(moveName, 0.35, payload.side || 0);
      return;
    }

    if (moveName === 'special') {
      if (this.player.specialMeter < 100) {
        return; // Special meter not ready
      }
      this.player.specialMeter = 0;
      if (this.ai) this.ai.onPlayerAttack('special');
      sound.playSpecial();
      this.playerFighter.triggerAction('special', 0.85);
      this.applyAttack(this.player, this.cpu, 'special', this.playerFighter, this.cpuFighter, payload);
      this.notifyState();
      return;
    }

    // Standard & martial attacks: jab, cross, kick, elbow, uppercut, sweep
    if (this.ai) this.ai.onPlayerAttack(moveName);
    
    let whooshPitch = 1.1;
    let duration = 0.30;
    if (moveName === 'kick') { whooshPitch = 0.75; duration = 0.45; }
    else if (moveName === 'sweep') { whooshPitch = 0.65; duration = 0.44; }
    else if (moveName === 'uppercut') { whooshPitch = 1.25; duration = 0.36; }
    else if (moveName === 'elbow') { whooshPitch = 1.15; duration = 0.28; }
    else if (moveName === 'cross') { whooshPitch = 1.05; duration = 0.32; }

    sound.playWhoosh(whooshPitch);
    this.playerFighter.triggerAction(moveName, duration);
    this.applyAttack(this.player, this.cpu, moveName, this.playerFighter, this.cpuFighter, payload);
    this.notifyState();
  }

  // CPU input handler
  executeCpuMove(moveName, payload = {}) {
    if (!this.isRoundActive || this.cpu.health <= 0) return;

    if (moveName === 'block') {
      this.cpu.isBlocking = true;
      this.cpu.blockTimer = 0.35;
      this.cpuFighter.triggerAction('block', 0.35);
      return;
    }

    if (moveName === 'dodge_left' || moveName === 'dodge_right') {
      this.cpu.isDodging = true;
      this.cpu.dodgeTimer = 0.25;
      sound.playDodge();
      this.cpuFighter.triggerAction(moveName, 0.35, payload.side || 0);
      return;
    }

    if (moveName === 'special') {
      if (this.cpu.specialMeter < 100) return;
      this.cpu.specialMeter = 0;
      sound.playSpecial();
      this.cpuFighter.triggerAction('special', 0.85);
      this.applyAttack(this.cpu, this.player, 'special', this.cpuFighter, this.playerFighter, payload);
      this.notifyState();
      return;
    }

    let whooshPitch = 1.0;
    let duration = 0.32;
    if (moveName === 'kick') { whooshPitch = 0.7; duration = 0.45; }
    else if (moveName === 'sweep') { whooshPitch = 0.65; duration = 0.44; }
    else if (moveName === 'uppercut') { whooshPitch = 1.2; duration = 0.36; }
    else if (moveName === 'elbow') { whooshPitch = 1.1; duration = 0.28; }
    else if (moveName === 'cross') { whooshPitch = 1.0; duration = 0.32; }

    sound.playWhoosh(whooshPitch);
    this.cpuFighter.triggerAction(moveName, duration);
    this.applyAttack(this.cpu, this.player, moveName, this.cpuFighter, this.playerFighter, payload);
    this.notifyState();
  }

  applyAttack(attacker, defender, attackType, attackerFighter, defenderFighter, payload = {}) {
    const isPlayer = (attacker === this.player);
    const damageTable = isPlayer ? this.PLAYER_DAMAGE : this.CPU_DAMAGE;
    let rawDamage = damageTable[attackType] || 10;

    // Power strike bonus for fast physical motion strikes (+25% bonus)
    if (isPlayer && payload.isPowerStrike) {
      rawDamage = Math.round(rawDamage * 1.25);
    }
    
    // Accurate close-range contact point right on the front surface of the defender
    const impactPos = defenderFighter.group.position.clone();
    impactPos.x = defenderFighter.group.position.x + defenderFighter.facing * 0.12;
    impactPos.z = (Math.random() - 0.5) * 0.05;
    
    if (attackType === 'kick') {
      impactPos.y = 1.18; // Ribs / liver area impact
    } else if (attackType === 'sweep') {
      impactPos.y = 0.35; // Shin / ankle level sweep
    } else if (attackType === 'uppercut') {
      impactPos.y = 1.70; // Rising chin impact
    } else if (attackType === 'elbow') {
      impactPos.y = 1.58; // Temple / skull smash
    } else if (attackType === 'jab') {
      impactPos.y = 1.64; // Chin / nose impact
    } else if (attackType === 'cross') {
      impactPos.y = 1.60; // Jaw / cheekbone impact
    } else if (attackType === 'special') {
      impactPos.y = 1.55; // Powerful rising uppercut contact
    } else {
      impactPos.y = 1.45;
    }

    // 1. Check Dodge (0 damage)
    if (defender.isDodging && defender.dodgeTimer > 0) {
      if (this.onAttackEvaded) this.onAttackEvaded(defenderFighter.isPlayer);
      return;
    }

    // 2. Check Block
    // If attack is sweep (low sweep), high shield block only partially absorbs it (low attack guard breaker)
    let finalDamage = rawDamage;
    let wasBlocked = false;

    if (defender.isBlocking) {
      wasBlocked = true;
      let absorbRate = (defender === this.player) ? 0.85 : 0.70;
      if (attackType === 'sweep') {
        // Low sweep bypasses standard high guard! Only absorbs 40%
        absorbRate = (defender === this.player) ? 0.45 : 0.35;
      }
      finalDamage = Math.max(1, Math.round(rawDamage * (1 - absorbRate)));
      sound.playBlock();
      if (this.vfx) {
        this.vfx.createShockwave(impactPos, defenderFighter.themeColor, 1.2);
        this.vfx.createImpactSparks(impactPos, 0x93c5fd, 14);
      }
      // Defender gains special meter for blocking
      defender.specialMeter = Math.min(100, defender.specialMeter + 10);
    } else {
      // Direct hit
      const isHeavyHit = (attackType === 'kick' || attackType === 'special' || attackType === 'sweep' || attackType === 'uppercut' || attackType === 'elbow');
      sound.playHit(isHeavyHit);
      if (this.vfx) {
        if (this.vfx.createShadowImpact) {
          this.vfx.createShadowImpact(
            impactPos,
            (payload.isPowerStrike || attackType === 'special') ? 0xffea00 : attackerFighter.themeColor,
            attackType === 'special'
          );
        } else {
          this.vfx.createImpactSparks(
            impactPos,
            (payload.isPowerStrike || attackType === 'special') ? 0xffea00 : attackerFighter.themeColor,
            attackType === 'special' ? 40 : 22
          );
        }
        this.vfx.createSweatSpray(
          impactPos,
          attackerFighter.facing,
          attackType === 'special' ? 28 : (attackType === 'kick' || attackType === 'sweep' ? 20 : 15)
        );
      }
      // Attacker gains special meter on hit
      attacker.specialMeter = Math.min(100, attacker.specialMeter + (attackType === 'special' ? 0 : (isPlayer ? 18 : 12)));
    }

    // Apply Hit-Stop (brief freeze frame for impact feel)
    this.hitStopTimer = attackType === 'special' ? 0.14 : (payload.isPowerStrike ? 0.10 : (attackType === 'kick' || attackType === 'sweep' ? 0.08 : 0.05));

    // Apply Camera Shake & Action Zoom
    if (this.camera) {
      const shakeBase = attackType === 'special' ? 0.42 : (wasBlocked ? 0.06 : 0.20);
      this.camera.triggerShake(payload.isPowerStrike ? shakeBase * 1.3 : shakeBase);
      
      const zoomAmounts = {
        jab: 0.16,
        cross: 0.26,
        elbow: 0.25,
        uppercut: 0.32,
        kick: 0.34,
        sweep: 0.28,
        special: 0.55
      };
      this.camera.triggerZoom(zoomAmounts[attackType] || 0.18);
    }

    // Pushback & Hit Animation on defender (tightened for close combat pocket fighting)
    defender.health = Math.max(0, defender.health - finalDamage);
    const pushbackDist = wasBlocked ? 0.03 : (attackType === 'special' ? 0.18 : (attackType === 'sweep' ? 0.14 : (attackType === 'kick' ? 0.10 : (attackType === 'uppercut' ? 0.12 : 0.06))));
    defenderFighter.applyHitPushback(pushbackDist, attackType);

    // Check KO
    if (defender.health <= 0) {
      defenderFighter.triggerAction('ko', 2.0);
      if (this.camera) this.camera.triggerZoom(0.65);
      this.endRound(attacker === this.player ? 'player' : 'cpu');
    }
  }

  update(delta) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= delta;
      return true; // Is currently in hit-stop
    }

    if (!this.isRoundActive) return false;

    // Round countdown
    this.roundTime = Math.max(0, this.roundTime - delta);

    // Update dodge active windows
    if (this.player.isDodging) {
      this.player.dodgeTimer -= delta;
      if (this.player.dodgeTimer <= 0) {
        this.player.isDodging = false;
      }
    }
    if (this.cpu.isDodging) {
      this.cpu.dodgeTimer -= delta;
      if (this.cpu.dodgeTimer <= 0) {
        this.cpu.isDodging = false;
      }
    }

    // Update block active windows
    if (this.player.isBlocking) {
      this.player.blockTimer -= delta;
      if (this.player.blockTimer <= 0) {
        this.player.isBlocking = false;
      }
    }
    if (this.cpu.isBlocking) {
      this.cpu.blockTimer -= delta;
      if (this.cpu.blockTimer <= 0) {
        this.cpu.isBlocking = false;
      }
    }

    // Timeout check
    if (this.roundTime <= 0) {
      if (this.player.health > this.cpu.health) {
        this.endRound('player');
      } else if (this.cpu.health > this.player.health) {
        this.endRound('cpu');
      } else {
        this.endRound('draw');
      }
    }

    this.notifyState();
    return false;
  }

  endRound(winner) {
    this.isRoundActive = false;
    sound.playBell();

    if (winner === 'player') {
      this.playerWins++;
    } else if (winner === 'cpu') {
      this.cpuWins++;
    }

    // Check Match victory (Best of 3 -> First to 2)
    const isMatchOver = this.playerWins >= this.maxRoundsToWin || this.cpuWins >= this.maxRoundsToWin;
    const matchWinner = this.playerWins >= this.maxRoundsToWin ? 'player' : (this.cpuWins >= this.maxRoundsToWin ? 'cpu' : null);

    if (isMatchOver) {
      if (matchWinner === 'player') sound.playVictory();
      this.onMatchEnd({
        winner: matchWinner,
        playerWins: this.playerWins,
        cpuWins: this.cpuWins
      });
    } else {
      this.onRoundEnd({
        roundWinner: winner,
        roundNumber: this.currentRound,
        playerWins: this.playerWins,
        cpuWins: this.cpuWins
      });
      this.currentRound++;
    }
  }

  notifyState() {
    this.onStateChange({
      playerHealth: this.player.health,
      cpuHealth: this.cpu.health,
      playerSpecial: this.player.specialMeter,
      cpuSpecial: this.cpu.specialMeter,
      roundTime: Math.ceil(this.roundTime),
      playerWins: this.playerWins,
      cpuWins: this.cpuWins,
      currentRound: this.currentRound
    });
  }
}
