import * as THREE from 'three';
import { CombatArena } from './three/arena.js';
import { Fighter3D } from './three/fighter3d.js';
import { CombatCamera } from './three/camera.js';
import { CombatVFX } from './three/vfx.js';
import { MotionTracker } from './motion/tracker.js';
import { GestureEngine } from './motion/gesture.js';
import { CombatEngine } from './combat/combatEngine.js';
import { CpuOpponent } from './combat/ai.js';
import { HUD } from './ui/hud.js';
import { ScreenManager } from './ui/screens.js';
import { sound } from './audio.js';

class MotionStrikeGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.videoEl = document.getElementById('webcam-video');
    this.pipCanvas = document.getElementById('pip-canvas');

    this.screens = new ScreenManager();
    this.hud = new HUD();

    this.initThree();
    this.initCombat();
    this.initMotion();
    this.setupUIEvents();
    this.setupKeyboardTesting();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.combatCamera = new CombatCamera(this.camera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // Arena Stage & Atmosphere
    this.arena = new CombatArena(this.scene);
    this.vfx = new CombatVFX(this.scene);

    // 3D Fighters
    this.playerFighter = new Fighter3D(this.scene, true); // Player (Cyan)
    this.cpuFighter = new Fighter3D(this.scene, false);   // CPU (Magenta)
    this.playerFighter.setVFX(this.vfx);
    this.cpuFighter.setVFX(this.vfx);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initCombat() {
    this.combat = new CombatEngine({
      playerFighter: this.playerFighter,
      cpuFighter: this.cpuFighter,
      vfx: this.vfx,
      camera: this.combatCamera,
      onStateChange: (state) => this.hud.updateState(state),
      onRoundEnd: (data) => this.handleRoundEnd(data),
      onMatchEnd: (data) => this.handleMatchEnd(data)
    });

    this.ai = new CpuOpponent(this.combat);
    this.combat.setOpponentAi(this.ai);
  }

  initMotion() {
    this.gesture = new GestureEngine({
      onMoveDetected: (move, payload) => this.onPlayerMove(move, payload),
      onBodyLean: (lateral, forward) => {
        if (this.playerFighter) {
          this.playerFighter.setLiveMotion(lateral, forward);
        }
      },
      onCalibrationUpdate: (info) => this.onCalibrationProgress(info),
      onCalibrationComplete: (baseline) => this.onCalibrationDone(baseline)
    });

    this.tracker = new MotionTracker({
      videoElement: this.videoEl,
      pipCanvas: this.pipCanvas,
      onLandmarks: (lm, wlm) => {
        this.gesture.processLandmarks(lm, wlm);
      },
      onFrameStatusChange: (isOut, reason) => {
        this.hud.setOutOfFrame(isOut, isOut ? `⚠️ ${reason.toUpperCase()}` : '');
      },
      getMetrics: () => this.gesture.latestMetrics
    });
  }

  async startCameraIfAvailable() {
    try {
      await this.tracker.initialize();
    } catch (e) {
      console.warn('Webcam initialization deferred or unavailable:', e);
    }
  }

  onPlayerMove(moveName, payload = {}) {
    if (!this.combat.isRoundActive) return;

    let text = moveName.toUpperCase();
    let color = '#00f3ff';

    if (moveName === 'jab') {
      text = payload.isPowerStrike ? '🔥 SHADOW DRAGON JAB! 19 DMG' : '⚡ LEAD SHADOW JAB! 15 DMG';
      color = payload.isPowerStrike ? '#ffe600' : '#00f3ff';
    } else if (moveName === 'cross') {
      text = payload.isPowerStrike ? '💥 SPINNING SHADOW BACKFIST! 30 DMG' : '🔥 SHADOW HOOK! 24 DMG';
      color = payload.isPowerStrike ? '#ffe600' : '#38bdf8';
    } else if (moveName === 'kick') {
      text = payload.isPowerStrike ? '🔥 CRESCENT DRAGON KICK! 40 DMG' : '🦵 SHADOW ROUNDHOUSE! 32 DMG';
      color = '#ff9900';
    } else if (moveName === 'block') {
      text = '🛡️ SHADOW BARRIER! (85% BLOCKED)';
      color = '#38bdf8';
    } else if (moveName === 'dodge_left' || moveName === 'dodge_right') {
      text = moveName === 'dodge_left' ? '🌀 SHADOW DASH LEFT!' : '🌀 SHADOW DASH RIGHT!';
      color = '#55ffff';
    } else if (moveName === 'special') {
      text = '⭐ RISING DRAGON FLURRY! 55 DMG';
      color = '#ffe600';
    }

    this.hud.showMoveAnnouncement(text, color);
    this.combat.executePlayerMove(moveName, payload);
  }

  onCalibrationProgress(info) {
    const el = document.getElementById('calib-countdown');
    const status = document.getElementById('calib-status-text');
    const count = Math.ceil(info.remaining);

    if (el) el.textContent = count > 0 ? count : 'READY!';
    if (status) {
      status.textContent = count > 0 ? 'HOLD NEUTRAL STANCE...' : 'CALIBRATION LOCKED!';
      status.style.color = count > 0 ? '#00f3ff' : '#00ff88';
    }
  }

  onCalibrationDone(baseline) {
    sound.playBell();
    const el = document.getElementById('calib-countdown');
    if (el) el.textContent = 'READY!';

    setTimeout(() => {
      this.screens.showScreen('title');
    }, 1000);
  }

  setupUIEvents() {
    // Title buttons
    document.getElementById('btn-start-fight').addEventListener('click', async () => {
      sound.init();
      await this.startCameraIfAvailable();
      this.screens.showScreen('fight');
      this.combat.startRound();
    });

    document.getElementById('btn-how-to-move').addEventListener('click', () => {
      sound.init();
      this.screens.showScreen('howToMove');
    });

    document.getElementById('btn-back-from-moves').addEventListener('click', () => {
      this.screens.showScreen('title');
    });

    document.getElementById('btn-calibration').addEventListener('click', async () => {
      sound.init();
      await this.startCameraIfAvailable();
      this.screens.showScreen('calibration');
      this.gesture.startCalibration();
    });

    document.getElementById('btn-cancel-calibration').addEventListener('click', () => {
      this.gesture.isCalibrating = false;
      this.screens.showScreen('title');
    });

    // Round End button
    document.getElementById('btn-next-round').addEventListener('click', () => {
      this.screens.showScreen('fight');
      this.combat.startRound();
    });

    // Match End buttons
    document.getElementById('btn-rematch').addEventListener('click', () => {
      this.combat.playerWins = 0;
      this.combat.cpuWins = 0;
      this.combat.currentRound = 1;
      this.screens.showScreen('fight');
      this.combat.startRound();
    });

    document.getElementById('btn-match-title').addEventListener('click', () => {
      this.screens.showScreen('title');
    });

    const togglePipBtn = document.getElementById('btn-toggle-pip');
    const pipContainer = document.getElementById('pip-container');
    if (togglePipBtn && pipContainer) {
      togglePipBtn.addEventListener('click', () => {
        pipContainer.classList.toggle('large');
      });
    }

    const toggleCpuBtn = document.getElementById('btn-toggle-cpu-mode');
    if (toggleCpuBtn) {
      toggleCpuBtn.addEventListener('click', () => {
        this.combat.isPracticeMode = !this.combat.isPracticeMode;
        if (this.combat.isPracticeMode) {
          toggleCpuBtn.textContent = '🎯 CPU: PRACTICE (PASSIVE)';
          toggleCpuBtn.style.borderColor = '#00ff88';
          toggleCpuBtn.style.color = '#00ff88';
          toggleCpuBtn.style.background = 'rgba(0, 255, 136, 0.15)';
          this.hud.showMoveAnnouncement('🎯 PRACTICE MODE (CPU FROZEN)', '#00ff88');
        } else {
          toggleCpuBtn.textContent = '⚔️ CPU: ACTIVE';
          toggleCpuBtn.style.borderColor = 'var(--neon-cyan)';
          toggleCpuBtn.style.color = 'var(--neon-cyan)';
          toggleCpuBtn.style.background = 'transparent';
          this.hud.showMoveAnnouncement('⚔️ FIGHT MODE (CPU ACTIVE)', 'var(--neon-cyan)');
        }
      });
    }
  }

  setupKeyboardTesting() {
    window.addEventListener('keydown', (e) => {
      sound.init();
      if (!this.combat.isRoundActive) return;

      const key = e.key.toLowerCase();
      if (key === 'j') {
        this.onPlayerMove('jab');
      } else if (key === 'k') {
        this.onPlayerMove('cross');
      } else if (key === 'l') {
        this.onPlayerMove('kick');
      } else if (key === 'b') {
        this.onPlayerMove('block');
      } else if (key === 'd') {
        this.onPlayerMove('dodge_right', { side: 1 });
      } else if (key === 's') {
        this.onPlayerMove('special');
      }
    });
  }

  handleRoundEnd(data) {
    const title = document.getElementById('round-winner-title');
    const subtitle = document.getElementById('round-result-subtitle');

    if (data.roundWinner === 'player') {
      title.textContent = `ROUND ${data.roundNumber} WON!`;
      subtitle.textContent = `YOU WON THIS ROUND! (${data.playerWins} - ${data.cpuWins})`;
      subtitle.style.color = '#00f3ff';
    } else if (data.roundWinner === 'cpu') {
      title.textContent = `ROUND ${data.roundNumber} LOST`;
      subtitle.textContent = `CPU WON THIS ROUND! (${data.playerWins} - ${data.cpuWins})`;
      subtitle.style.color = '#ff0055';
    } else {
      title.textContent = `ROUND ${data.roundNumber} DRAW`;
      subtitle.textContent = `TIME OUT! EQUAL HEALTH (${data.playerWins} - ${data.cpuWins})`;
      subtitle.style.color = '#ffe600';
    }

    setTimeout(() => {
      this.screens.showScreen('roundEnd');
    }, 1500);
  }

  handleMatchEnd(data) {
    const title = document.getElementById('match-winner-title');
    const score = document.getElementById('match-score-text');

    if (data.winner === 'player') {
      title.textContent = 'VICTORY!';
      title.style.color = '#00f3ff';
      score.textContent = `CHAMPION! FINAL SCORE: YOU ${data.playerWins} - ${data.cpuWins} CPU`;
    } else {
      title.textContent = 'DEFEAT!';
      title.style.color = '#ff0055';
      score.textContent = `DEFEATED! FINAL SCORE: YOU ${data.playerWins} - ${data.cpuWins} CPU`;
    }

    setTimeout(() => {
      this.screens.showScreen('matchEnd');
    }, 1800);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Combat logic & hit-stop
    const inHitStop = this.combat.update(delta);

    if (!inHitStop) {
      // Update Fighters
      this.playerFighter.update(delta);
      this.cpuFighter.update(delta);

      // Update AI
      this.ai.update(delta);

      // Arena & VFX
      this.arena.update(delta);
      this.vfx.update(delta);
    }

    // Dynamic Camera
    this.combatCamera.update(
      delta,
      this.playerFighter.group.position,
      this.cpuFighter.group.position
    );

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Boot game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new MotionStrikeGame();
});
