// HUD Controller for In-Game Health Bars, Timer, Special Gauge & Alerts

export class HUD {
  constructor() {
    this.playerFill = document.getElementById('player-hp-fill');
    this.playerLag = document.getElementById('player-hp-lag');
    this.cpuFill = document.getElementById('cpu-hp-fill');
    this.cpuLag = document.getElementById('cpu-hp-lag');

    this.playerSpecial = document.getElementById('player-special-fill');
    this.cpuSpecial = document.getElementById('cpu-special-fill');

    this.timerEl = document.getElementById('round-timer');
    this.roundTitleEl = document.getElementById('current-round-text');

    this.playerDots = [
      document.getElementById('player-win-1'),
      document.getElementById('player-win-2')
    ];
    this.cpuDots = [
      document.getElementById('cpu-win-1'),
      document.getElementById('cpu-win-2')
    ];

    this.movePopup = document.getElementById('move-announcement');
    this.outOfFrameBanner = document.getElementById('out-of-frame-banner');

    this.popupTimeout = null;
  }

  updateState(state) {
    // Health Bars (0 - 100%)
    const pHealth = Math.max(0, state.playerHealth);
    const cHealth = Math.max(0, state.cpuHealth);

    if (this.playerFill) this.playerFill.style.width = `${pHealth}%`;
    if (this.cpuFill) this.cpuFill.style.width = `${cHealth}%`;

    // Delayed health lag reduction for arcade juice
    setTimeout(() => {
      if (this.playerLag) this.playerLag.style.width = `${pHealth}%`;
      if (this.cpuLag) this.cpuLag.style.width = `${cHealth}%`;
    }, 280);

    // Special Meters (0 - 100%)
    if (this.playerSpecial) {
      this.playerSpecial.style.width = `${state.playerSpecial}%`;
      if (state.playerSpecial >= 100) {
        this.playerSpecial.classList.add('ready');
      } else {
        this.playerSpecial.classList.remove('ready');
      }
    }

    if (this.cpuSpecial) {
      this.cpuSpecial.style.width = `${state.cpuSpecial}%`;
      if (state.cpuSpecial >= 100) {
        this.cpuSpecial.classList.add('ready');
      } else {
        this.cpuSpecial.classList.remove('ready');
      }
    }

    // Timer
    if (this.timerEl) {
      this.timerEl.textContent = state.roundTime;
      if (state.roundTime <= 10) {
        this.timerEl.classList.add('urgent');
      } else {
        this.timerEl.classList.remove('urgent');
      }
    }

    // Current Round
    if (this.roundTitleEl) {
      this.roundTitleEl.textContent = `ROUND ${state.currentRound}`;
    }

    // Round Win Dots
    if (this.playerDots[0]) this.playerDots[0].classList.toggle('active', state.playerWins >= 1);
    if (this.playerDots[1]) this.playerDots[1].classList.toggle('active', state.playerWins >= 2);
    if (this.cpuDots[0]) this.cpuDots[0].classList.toggle('active', state.cpuWins >= 1);
    if (this.cpuDots[1]) this.cpuDots[1].classList.toggle('active', state.cpuWins >= 2);
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
