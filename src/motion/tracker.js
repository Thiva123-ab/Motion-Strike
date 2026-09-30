// MediaPipe Pose Tracker & Skeleton Visualizer

export class MotionTracker {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.pipCanvas = options.pipCanvas;
    this.pipCtx = this.pipCanvas ? this.pipCanvas.getContext('2d') : null;
    
    this.onLandmarks = options.onLandmarks || (() => {});
    this.onFrameStatusChange = options.onFrameStatusChange || (() => {});

    this.isTracking = false;
    this.isOutOfFrame = false;
    this.pose = null;
    this.camera = null;

    // MediaPipe POSE CONNECTIONS for drawing skeleton
    this.CONNECTIONS = [
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // torso
      [23, 24], // hips
      [23, 25], [25, 27], // left leg
      [24, 26], [26, 28]  // right leg
    ];
  }

  async initialize() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!window.Pose) {
          // If not loaded globally yet, wait or load dynamically
          await this.loadMediaPipeScript();
        }

        this.pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        this.pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.pose.onResults((results) => this.handleResults(results));

        // Start Camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });

        this.videoElement.srcObject = stream;
        await this.videoElement.play();

        // Process frames using requestVideoFrameCallback or requestAnimationFrame
        this.isTracking = true;
        this.startProcessingLoop();
        resolve(true);
      } catch (err) {
        console.error('Error initializing MotionTracker:', err);
        reject(err);
      }
    });
  }

  async loadMediaPipeScript() {
    return new Promise((resolve, reject) => {
      if (window.Pose) return resolve();
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error('Failed to load MediaPipe Pose script'));
      document.head.appendChild(script);
    });
  }

  startProcessingLoop() {
    let isProcessingPose = false;

    // 1. Dedicated 60 FPS camera visual renderer so PiP is never black or lagging
    const renderLoop = () => {
      if (!this.isTracking) return;
      this.drawPiP(this.currentLandmarks);
      requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);

    // 2. Controlled MediaPipe Pose estimation loop with backpressure protection
    const poseLoop = async () => {
      if (!this.isTracking) return;

      if (!isProcessingPose && this.videoElement.readyState >= 2) {
        isProcessingPose = true;
        try {
          await this.pose.send({ image: this.videoElement });
        } catch (e) {
          // Ignore transient drops
        } finally {
          isProcessingPose = false;
        }
      }

      requestAnimationFrame(poseLoop);
    };
    requestAnimationFrame(poseLoop);
  }

  handleResults(results) {
    if (!results.poseLandmarks) {
      this.currentLandmarks = null;
      this.setOutOfFrame(true, "Please step in front of camera");
      return;
    }

    const lm = results.poseLandmarks;

    // Exponential Moving Average filter to smooth landmarks and remove camera jitter
    if (!this.smoothedLandmarks || this.smoothedLandmarks.length !== lm.length) {
      this.smoothedLandmarks = lm.map(p => ({ ...p }));
    } else {
      const alpha = 0.68;
      for (let i = 0; i < lm.length; i++) {
        const cur = lm[i];
        const prev = this.smoothedLandmarks[i];
        if (cur && prev) {
          prev.x += (cur.x - prev.x) * alpha;
          prev.y += (cur.y - prev.y) * alpha;
          if (cur.z !== undefined && prev.z !== undefined) {
            prev.z += (cur.z - prev.z) * alpha;
          }
          prev.visibility = cur.visibility;
        }
      }
    }

    this.currentLandmarks = this.smoothedLandmarks;

    // Check if player's upper body / head is detected in frame
    const hasNose = lm[0] && (lm[0].visibility === undefined || lm[0].visibility > 0.3);
    const hasShoulders = lm[11] && lm[12] && 
                         (lm[11].visibility === undefined || lm[11].visibility > 0.3) &&
                         (lm[12].visibility === undefined || lm[12].visibility > 0.3);

    const isPlayerPresent = hasNose || hasShoulders;

    if (!isPlayerPresent) {
      this.setOutOfFrame(true, "Please step in front of camera");
    } else {
      this.setOutOfFrame(false);
      this.onLandmarks(this.smoothedLandmarks, results.poseWorldLandmarks);
    }
  }

  setOutOfFrame(status, reason = "") {
    if (this.isOutOfFrame !== status) {
      this.isOutOfFrame = status;
      this.onFrameStatusChange(this.isOutOfFrame, reason);
    }
  }

  drawPiP(landmarks) {
    if (!this.pipCtx || !this.pipCanvas) return;
    const ctx = this.pipCtx;
    const w = this.pipCanvas.width;
    const h = this.pipCanvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Mirror video feed
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    if (this.videoElement.readyState >= 2) {
      ctx.drawImage(this.videoElement, 0, 0, w, h);
    }

    // Semi-transparent dark overlay for high contrast wireframe
    ctx.fillStyle = 'rgba(10, 15, 25, 0.45)';
    ctx.fillRect(0, 0, w, h);

    const m = this.getMetrics ? this.getMetrics() : null;
    const isStriking = m && (m.rExtRatio > 70 || m.lExtRatio > 70);
    const isGuarding = m && m.isGuarding;

    if (landmarks) {
      // Dynamic wireframe neon color based on active move
      let wireColor = '#00f3ff';
      if (isStriking) wireColor = '#ffe600';
      else if (isGuarding) wireColor = '#38bdf8';

      ctx.lineWidth = isStriking ? 3.5 : 2.5;
      ctx.strokeStyle = wireColor;
      ctx.shadowColor = wireColor;
      ctx.shadowBlur = isStriking ? 14 : 8;

      for (const [i, j] of this.CONNECTIONS) {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      }

      // Draw Keypoint nodes
      const nodeColor = isStriking ? '#ff0055' : (isGuarding ? '#00f3ff' : '#ff0055');
      ctx.fillStyle = nodeColor;
      ctx.shadowColor = nodeColor;
      ctx.shadowBlur = 6;
      for (let i = 0; i < landmarks.length; i++) {
        const p = landmarks[i];
        if (p && (p.visibility ?? 1) > 0.4) {
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();

    // Draw Un-mirrored HUD Info Overlay inside PiP
    if (landmarks) {
      const hasWrists = (landmarks[15] && (landmarks[15].visibility ?? 1) > 0.35) ||
                        (landmarks[16] && (landmarks[16].visibility ?? 1) > 0.35);
      const hasHips = landmarks[23] && (landmarks[23].visibility ?? 1) > 0.35;

      ctx.font = 'bold 11px Rajdhani, sans-serif';
      
      // Mode Tag
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(hasHips ? 'FULL BODY DETECTED' : 'UPPER BODY DETECTED', 10, 16);

      // Status Tag
      if (isGuarding) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('🛡️ GUARD ACTIVE', w - 105, 16);
      } else if (hasWrists) {
        ctx.fillStyle = '#00ff88';
        ctx.fillText('● READY TO STRIKE', w - 108, 16);
      } else {
        ctx.fillStyle = '#ffe600';
        ctx.fillText('▲ RAISE HANDS', w - 95, 16);
      }

      // Active Detected Strike Banner
      if (m && m.lastDetectedMove && m.lastDetectedMove !== 'NONE') {
        ctx.font = '900 13px Orbitron, sans-serif';
        ctx.fillStyle = isStriking ? '#ffe600' : (isGuarding ? '#38bdf8' : '#00f3ff');
        ctx.fillText(`⚡ ${m.lastDetectedMove}`, 10, 34);
      }

      // Live Punch Gauges (Visual progress bars for arm extension)
      if (m) {
        const barWidth = 90;
        const barHeight = 6;
        
        // Left Arm (Jab) Bar
        ctx.font = 'bold 10px Rajdhani, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('L-JAB', 10, h - 22);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(48, h - 28, barWidth, barHeight);
        ctx.fillStyle = m.lExtRatio > 70 ? '#ffe600' : '#00f3ff';
        ctx.fillRect(48, h - 28, (Math.min(100, m.lExtRatio) / 100) * barWidth, barHeight);

        // Right Arm (Cross) Bar
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('R-CROSS', 10, h - 8);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(48, h - 14, barWidth, barHeight);
        ctx.fillStyle = m.rExtRatio > 70 ? '#ffe600' : '#00f3ff';
        ctx.fillRect(48, h - 14, (Math.min(100, m.rExtRatio) / 100) * barWidth, barHeight);
      }
    }
  }

  stop() {
    this.isTracking = false;
    if (this.videoElement && this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(t => t.stop());
    }
  }
}
