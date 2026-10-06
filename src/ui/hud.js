// HUD Controller for In-Game Health Bars, Timer, Special Gauge & Alerts

export class HUD {
  constructor() {
    this.playerFill = document.getElementById('player-hp-fill');
    this.playerLag = document.getElementById('player-hp-lag');
    this.cpuFill = document.getElementById('cpu-hp-fill');
    this.cpuLag = document.getElementById('cpu-hp-lag');

    this.playerPercent = document.getElementById('player-hp-percent');
    this.cpuPercent = document.getElementById('cpu-hp-percent');

    this.playerStamina = document.getElementById('player-stamina-fill');
    this.cpuStamina = document.getElementById('cpu-stamina-fill');

    this.comboNumber = document.getElementById('combo-number');
    this.comboBadge = document.getElementById('combo-badge');
    this.gameLiveClock = document.getElementById('game-live-clock');

    this.timerEl = document.getElementById('round-timer');
    this.roundTitleEl = document.getElementById('current-round-text');

    this.movePopup = document.getElementById('move-announcement');
    this.outOfFrameBanner = document.getElementById('out-of-frame-banner');

    this.popupTimeout = null;
    this.lastCombo = 0;

    this.startLiveClock();
  }

  startLiveClock() {
    const updateTime = () => {
      if (this.gameLiveClock) {
        const now = new Date();
        const hrs = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        this.gameLiveClock.textContent = `${hrs}h${mins}`;
      }
    };
    updateTime();
    setInterval(updateTime, 10000);
  }

  updateState(state) {
    // Health Bars (0 - 100%)
    const pHealth = Math.max(0, state.playerHealth);
    const cHealth = Math.max(0, state.cpuHealth);

    if (this.playerFill) this.playerFill.style.width = `${pHealth}%`;
    if (this.cpuFill) this.cpuFill.style.width = `${cHealth}%`;

    // Percentage numbers
    if (this.playerPercent) this.playerPercent.textContent = `${pHealth}%`;
    if (this.cpuPercent) this.cpuPercent.textContent = `${cHealth}%`;

    // Delayed health lag reduction for arcade juice
    setTimeout(() => {
      if (this.playerLag) this.playerLag.style.width = `${pHealth}%`;
      if (this.cpuLag) this.cpuLag.style.width = `${cHealth}%`;
    }, 280);

    // Stamina Bars (0 - 100%)
    const pStamina = Math.min(100, Math.max(0, state.playerStamina !== undefined ? state.playerStamina : 85));
    const cStamina = Math.min(100, Math.max(0, state.cpuStamina !== undefined ? state.cpuStamina : 75));
    if (this.playerStamina) this.playerStamina.style.width = `${pStamina}%`;
    if (this.cpuStamina) this.cpuStamina.style.width = `${cStamina}%`;

    // Combo Counter
    const combo = state.comboCount !== undefined && state.comboCount > 0 ? state.comboCount : (this.lastCombo || 21);
    if (this.comboNumber) {
      this.comboNumber.textContent = `x${combo}`;
      if (state.comboCount > this.lastCombo && this.comboBadge) {
        this.comboBadge.classList.add('pop');
        setTimeout(() => this.comboBadge.classList.remove('pop'), 200);
      }
    }
    this.lastCombo = state.comboCount || this.lastCombo;

    // Timer formatted as M:SS or seconds
    if (this.timerEl) {
      this.timerEl.textContent = state.formattedTime || state.roundTime;
      if (state.roundTime <= 10) {
        this.timerEl.classList.add('urgent');
      } else {
        this.timerEl.classList.remove('urgent');
      }
    }

    // Current Round
    if (this.roundTitleEl) {
      this.roundTitleEl.textContent = `ROUND ${state.currentRound || 2}`;
    }
  }

  showMoveAnnouncement(text, color = '#00f3ff') {
    if (!this.movePopup) return;
    this.movePopup.textContent = text;
    this.movePopup.style.color = color;
    this.movePopup.classList.add('show');

    clearTimeout(this.popupTimeout);
    this.popupTimeout = setTimeout(() => {
      this.movePopup.classList.remove('show');
    }, 450);
  }

  setOutOfFrame(isOutOfFrame, text = "STEP BACK INTO FRAME") {
    if (!this.outOfFrameBanner) return;
    if (isOutOfFrame) {
      this.outOfFrameBanner.textContent = text;
      this.outOfFrameBanner.style.display = 'block';
    } else {
      this.outOfFrameBanner.style.display = 'none';
    }
  }
}
