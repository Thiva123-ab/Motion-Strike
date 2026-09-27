// Screen Transition Manager

export class ScreenManager {
  constructor() {
    this.screens = {
      title: document.getElementById('screen-title'),
      howToMove: document.getElementById('screen-how-to-move'),
      calibration: document.getElementById('screen-calibration'),
      fight: document.getElementById('hud-overlay'),
      roundEnd: document.getElementById('screen-round-end'),
      matchEnd: document.getElementById('screen-match-end')
    };
    this.currentScreen = 'title';
  }

  showScreen(name) {
    Object.entries(this.screens).forEach(([key, el]) => {
      if (!el) return;
      if (key === name) {
        el.classList.add('active');
        if (key === 'fight') el.style.display = 'flex';
      } else {
        el.classList.remove('active');
        if (key === 'fight' && name !== 'fight') el.style.display = 'none';
      }
    });
    this.currentScreen = name;
  }
}
