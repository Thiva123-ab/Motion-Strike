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
    const processFrame = async () => {
      if (!this.isTracking) return;

      if (this.videoElement.readyState >= 2) {
        try {
          await this.pose.send({ image: this.videoElement });
        } catch (e) {
          // Ignore transient send errors during frame drops
        }
      }

      if ('requestVideoFrameCallback' in this.videoElement) {
        this.videoElement.requestVideoFrameCallback(processFrame);
      } else {
        requestAnimationFrame(processFrame);
      }
    };

    if ('requestVideoFrameCallback' in this.videoElement) {
      this.videoElement.requestVideoFrameCallback(processFrame);
    } else {
      requestAnimationFrame(processFrame);
    }
  }

  handleResults(results) {
    if (!results.poseLandmarks) {
      this.setOutOfFrame(true, "No player detected");
      this.drawPiP(null);
      return;
    }

    const lm = results.poseLandmarks;

    // Check critical landmarks visibility:
    // 11, 12 = Shoulders; 15, 16 = Wrists; 23, 24 = Hips; 0 = Nose
    const criticalPoints = [11, 12, 15, 16, 23, 24];
    let visibleCount = 0;
    for (const idx of criticalPoints) {
      if (lm[idx] && (lm[idx].visibility === undefined || lm[idx].visibility > 0.45)) {
        visibleCount++;
      }
    }

    const isWellFramed = visibleCount >= 5;

    if (!isWellFramed) {
      this.setOutOfFrame(true, "Step back into frame");
    } else {
      this.setOutOfFrame(false);
      this.onLandmarks(lm, results.poseWorldLandmarks);
    }

    this.drawPiP(lm);
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

    if (landmarks) {
      // Draw Connections (Neon lines)
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 8;

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
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
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
  }

  stop() {
    this.isTracking = false;
    if (this.videoElement && this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(t => t.stop());
    }
  }
}
