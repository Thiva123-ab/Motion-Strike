// CPU Opponent AI (Close-Range Tactical & Reactive)

export class CpuOpponent {
  constructor(combatEngine) {
    this.combat = combatEngine;
    this.timer = 0;
    this.nextActionDelay = this.getRandomInterval();
    this.consecutiveKicks = 0;
    this.queuedCounter = null;
    this.counterTimer = 0;
    this.bobWeaveTimer = 0;
  }

  getRandomInterval() {
    // Human-friendly combat cadence: 1.3 - 2.2s between CPU actions
    return 1.3 + Math.random() * 0.9;
  }

  onPlayerAttack(moveName) {
    if (!this.combat.isRoundActive) return;

    const hpPercent = this.combat.cpu.health / this.combat.cpu.maxHealth;
    const isEnraged = hpPercent <= 0.35;

    // Tactical defense chances (fair for webcam motion players)
    const blockChance = isEnraged ? 0.38 : (moveName === 'special' ? 0.45 : 0.20);
    const dodgeChance = isEnraged ? 0.20 : (moveName === 'kick' ? 0.20 : 0.12);

    const roll = Math.random();
    if (roll < blockChance) {
      // Reactively block
      this.combat.executeCpuMove('block');
      // Queue quick counter jab after blocking
      if (Math.random() < 0.4) {
        this.queuedCounter = 'jab';
        this.counterTimer = 0.32;
      }
    } else if (roll < blockChance + dodgeChance) {
      // Reactively slip / dodge
      const side = Math.random() > 0.5 ? 1 : -1;
      this.combat.executeCpuMove(side === 1 ? 'dodge_right' : 'dodge_left', { side });
      // Queue counter cross after successful slip
      if (Math.random() < 0.5) {
        this.queuedCounter = 'cross';
        this.counterTimer = 0.28;
      }
    }
  }

  update(delta) {
    if (!this.combat.isRoundActive) return;

    // Dynamic micro-head movements and weaving in close range
    this.bobWeaveTimer += delta;
    if (this.combat.cpuFighter) {
      const weaveLateral = Math.sin(this.bobWeaveTimer * 2.8) * 0.15;
      const weaveForward = Math.cos(this.bobWeaveTimer * 3.5) * 0.08;
      this.combat.cpuFighter.setLiveMotion(weaveLateral, weaveForward);
    }

    // Process queued counter-attacks
    if (this.queuedCounter) {
      this.counterTimer -= delta;
      if (this.counterTimer <= 0) {
        const counterMove = this.queuedCounter;
        this.queuedCounter = null;
        this.combat.executeCpuMove(counterMove);
        this.timer = 0;
        this.nextActionDelay = this.getRandomInterval();
        return;
      }
    }

    this.timer += delta;
    if (this.timer >= this.nextActionDelay) {
      this.timer = 0;
      this.nextActionDelay = this.getRandomInterval();
      this.decideMove();
    }
  }

  decideMove() {
    // 1. If special meter is full, unleash special!
    if (this.combat.cpu.specialMeter >= 100) {
      this.consecutiveKicks = 0;
      this.combat.executeCpuMove('special');
      return;
    }

    // 2. Select between Jab, Cross, Kick based on close-range flow
    const roll = Math.random();
    let move = 'jab';

    if (roll < 0.48) {
      move = 'jab';
      // 30% chance to follow jab with a fast 1-2 cross combo
      if (Math.random() < 0.3) {
        this.queuedCounter = 'cross';
        this.counterTimer = 0.30;
      }
    } else if (roll < 0.80) {
      move = 'cross';
    } else {
      // Kick: Ensure NO 3 consecutive kicks
      if (this.consecutiveKicks >= 2) {
        move = Math.random() > 0.5 ? 'jab' : 'cross';
      } else {
        move = 'kick';
      }
    }

    if (move === 'kick') {
      this.consecutiveKicks++;
    } else {
      this.consecutiveKicks = 0;
    }

    this.combat.executeCpuMove(move);
  }
}

