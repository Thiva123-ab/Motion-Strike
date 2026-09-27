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

    // Damage Table
    this.DAMAGE = {
      jab: 8,
      cross: 12,
      kick: 16,
      special: 28
    };

    // Combat State
    this.roundTime = 60;
    this.isRoundActive = false;
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

    if (this.playerFighter) this.playerFighter.triggerAction('idle');
    if (this.cpuFighter) this.cpuFighter.triggerAction('idle');
  }

  setOpponentAi(ai) {
    this.ai = ai;
  }

  startRound() {
    this.roundTime = 60;
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
      this.playerFighter.triggerAction('block', 0.25);
      return;
    }

    if (moveName === 'dodge_left' || moveName === 'dodge_right') {
      this.player.isDodging = true;
      this.player.dodgeTimer = 0.25; // 0.25s dodge window
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
      this.applyAttack(this.player, this.cpu, 'special', this.playerFighter, this.cpuFighter);
      this.notifyState();
      return;
    }

    // Standard attacks: jab, cross, kick
    if (this.ai) this.ai.onPlayerAttack(moveName);
    sound.playWhoosh(moveName === 'kick' ? 0.75 : 1.1);
    const duration = moveName === 'kick' ? 0.45 : 0.32;
    this.playerFighter.triggerAction(moveName, duration);
    this.applyAttack(this.player, this.cpu, moveName, this.playerFighter, this.cpuFighter);
    this.notifyState();
  }

  // CPU input handler
  executeCpuMove(moveName, payload = {}) {
    if (!this.isRoundActive || this.cpu.health <= 0) return;

    if (moveName === 'block') {
      this.cpu.isBlocking = true;
      this.cpuFighter.triggerAction('block', 0.3);
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
      this.applyAttack(this.cpu, this.player, 'special', this.cpuFighter, this.playerFighter);
      this.notifyState();
      return;
    }

    sound.playWhoosh(moveName === 'kick' ? 0.7 : 1.0);
    const duration = moveName === 'kick' ? 0.45 : 0.32;
    this.cpuFighter.triggerAction(moveName, duration);
    this.applyAttack(this.cpu, this.player, moveName, this.cpuFighter, this.playerFighter);
    this.notifyState();
  }

  applyAttack(attacker, defender, attackType, attackerFighter, defenderFighter) {
    const rawDamage = this.DAMAGE[attackType] || 10;
    const impactPos = defenderFighter.group.position.clone();
    impactPos.y = 1.4;

    // 1. Check Dodge (0 damage)
    if (defender.isDodging && defender.dodgeTimer > 0) {
      if (this.onAttackEvaded) this.onAttackEvaded(defenderFighter.isPlayer);
      return;
    }

    // 2. Check Block (70% damage reduction = 30% chip damage)
    let finalDamage = rawDamage;
    let wasBlocked = false;

    if (defender.isBlocking) {
      wasBlocked = true;
      finalDamage = Math.round(rawDamage * 0.3); // 70% absorbed
      sound.playBlock();
      if (this.vfx) {
        this.vfx.createShockwave(impactPos, defenderFighter.themeColor, 1.2);
      }
      // Defender gains special meter for blocking
      defender.specialMeter = Math.min(100, defender.specialMeter + 10);
    } else {
      // Direct hit
      sound.playHit(attackType === 'kick' || attackType === 'special');
      if (this.vfx) {
        this.vfx.createImpactSparks(
          impactPos,
          attackType === 'special' ? 0xffff00 : attackerFighter.themeColor,
          attackType === 'special' ? 45 : 22
        );
      }
      // Attacker gains special meter on hit
      attacker.specialMeter = Math.min(100, attacker.specialMeter + (attackType === 'special' ? 0 : 15));
    }

    // Apply Hit-Stop (brief freeze frame for impact feel)
    this.hitStopTimer = attackType === 'special' ? 0.12 : 0.06;

    // Apply Camera Shake
    if (this.camera) {
      this.camera.triggerShake(attackType === 'special' ? 0.4 : (wasBlocked ? 0.08 : 0.22));
    }

    // Pushback & Hit Animation on defender
    defender.health = Math.max(0, defender.health - finalDamage);
    defenderFighter.applyHitPushback(wasBlocked ? 0.15 : (attackType === 'special' ? 0.6 : 0.35));

    // Check KO
    if (defender.health <= 0) {
      defenderFighter.triggerAction('ko', 2.0);
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
