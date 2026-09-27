// CPU Opponent AI (V1)

export class CpuOpponent {
  constructor(combatEngine) {
    this.combat = combatEngine;
    this.timer = 0;
    this.nextActionDelay = this.getRandomInterval();
    this.consecutiveKicks = 0;
  }

  getRandomInterval() {
    // Attack every 0.8 - 1.4 seconds
    return 0.8 + Math.random() * 0.6;
  }

  onPlayerAttack(moveName) {
    if (!this.combat.isRoundActive) return;

    const hpPercent = this.combat.cpu.health / this.combat.cpu.maxHealth;
    const isEnraged = hpPercent <= 0.3; // Low health < 30%

    // Block probability: standard 30%, low health 55%
    const blockChance = isEnraged ? 0.55 : 0.30;
    const dodgeChance = isEnraged ? 0.25 : 0.10;

    const roll = Math.random();
    if (roll < blockChance) {
      // Reactively block
      this.combat.executeCpuMove('block');
    } else if (roll < blockChance + dodgeChance) {
      // Reactively dodge
      const side = Math.random() > 0.5 ? 1 : -1;
      this.combat.executeCpuMove(side === 1 ? 'dodge_right' : 'dodge_left', { side });
    }
  }

  update(delta) {
    if (!this.combat.isRoundActive) return;

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

    // 2. Select between Jab, Cross, Kick
    const roll = Math.random();
    let move = 'jab';

    if (roll < 0.45) {
      move = 'jab';
    } else if (roll < 0.75) {
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
