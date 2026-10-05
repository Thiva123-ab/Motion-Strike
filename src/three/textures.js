import * as THREE from 'three';

// Procedural high-resolution PBR texture generator for realistic materials
export class TextureGenerator {
  static createRingCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Sleek dark midnight carbon-canvas mat
    const bgGrad = ctx.createRadialGradient(512, 512, 80, 512, 512, 600);
    bgGrad.addColorStop(0, '#101726');
    bgGrad.addColorStop(0.7, '#0b0f19');
    bgGrad.addColorStop(1, '#060911');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Carbon-composite micro-weave pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y < 1024; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Outer ring boundary lines (Neon Cyan & Gold Trim)
    // Outer cyan perimeter glow
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 12;
    ctx.strokeRect(64, 64, 896, 896);

    // Inner gold boundary line
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.strokeRect(88, 88, 848, 848);
    ctx.shadowBlur = 0;

    // Corner decorative martial brackets
    const cornerOffsets = [
      [88, 88, 1, 1],
      [936, 88, -1, 1],
      [88, 936, 1, -1],
      [936, 936, -1, -1]
    ];
    cornerOffsets.forEach(([cx, cy, dx, dy]) => {
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dx * 60, cy);
      ctx.lineTo(cx, cy + dy * 60);
      ctx.closePath();
      ctx.fill();
    });

    // Center Grand Martial Arts Championship Emblem
    ctx.save();
    ctx.translate(512, 512);

    // Outer energy glow ring
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 240, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary runic ring
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 215, 0, Math.PI * 2);
    ctx.stroke();

    // Emblem Dark Base
    ctx.fillStyle = 'rgba(11, 16, 30, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 215, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Japanese Shadow Kanji Backdrop: 「影」 (Shadow) and 「龍」 (Dragon)
    ctx.fillStyle = 'rgba(0, 243, 255, 0.12)';
    ctx.font = '900 130px "Yu Mincho", "Noto Serif JP", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('影', -60, 5);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.fillText('龍', 60, 5);

    // Inner concentric star ring
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 160, 0, Math.PI * 2);
    ctx.stroke();

    // Championship Center Branding
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px Orbitron, Rajdhani, sans-serif';
    ctx.fillText('MOTION STRIKE', 0, -45);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 22px Rajdhani, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('SHADOW COMBAT CHAMPIONSHIP', 0, 15);

    // Martial Dragon Emblem Stars
    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('★  ★  ★  ★  ★', 0, 62);

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  static createLeatherTexture(colorHex = '#1e3a8a') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.bezierCurveTo(
        Math.random() * 256, Math.random() * 256,
        Math.random() * 256, Math.random() * 256,
        Math.random() * 256, Math.random() * 256
      );
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static createTrunksTexture(baseColor = '#1d4ed8', stripeColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 70);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (let y = 15; y < 70; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    ctx.fillStyle = stripeColor;
    ctx.fillRect(0, 70, 60, 442);
    ctx.fillRect(452, 70, 60, 442);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(60, 70, 8, 442);
    ctx.fillRect(444, 70, 8, 442);
    ctx.fillRect(0, 70, 512, 6);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createStadiumBackdropTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Midnight Cyber-Shadow Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    skyGrad.addColorStop(0, '#020409');
    skyGrad.addColorStop(0.35, '#070f22');
    skyGrad.addColorStop(0.65, '#0f1730');
    skyGrad.addColorStop(1, '#040711');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // 2. Distant Starfield & Cyber Nebula
    for (let i = 0; i < 240; i++) {
      const sx = Math.random() * 2048;
      const sy = Math.random() * 450;
      const sr = 0.5 + Math.random() * 1.5;
      const alpha = 0.2 + Math.random() * 0.7;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cyan / Magenta Atmospheric Nebula Streaks
    const nebulaGrad = ctx.createRadialGradient(1024, 280, 50, 1024, 280, 650);
    nebulaGrad.addColorStop(0, 'rgba(0, 243, 255, 0.12)');
    nebulaGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.08)');
    nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, 2048, 600);

    // 3. Cyberpunk Distant Skyline Silhouettes (Neo-Tokyo / Cyber Dojo Towers)
    const towers = [
      { x: 80, w: 90, h: 420 },
      { x: 190, w: 75, h: 360 },
      { x: 300, w: 120, h: 480, hasPagoda: true },
      { x: 440, w: 85, h: 390 },
      { x: 550, w: 110, h: 510 },
      { x: 700, w: 130, h: 460, hasPagoda: true },
      { x: 860, w: 95, h: 380 },
      { x: 1000, w: 140, h: 540 },
      { x: 1180, w: 105, h: 430 },
      { x: 1320, w: 120, h: 500, hasPagoda: true },
      { x: 1470, w: 80, h: 370 },
      { x: 1580, w: 110, h: 490 },
      { x: 1720, w: 90, h: 410, hasPagoda: true },
      { x: 1840, w: 100, h: 450 }
    ];

    towers.forEach(t => {
      const topY = 600 - t.h;
      // Building base
      ctx.fillStyle = '#060a17';
      ctx.fillRect(t.x, topY, t.w, t.h);

      // Neon roof outline / antenna
      ctx.strokeStyle = (t.x % 2 === 0) ? '#00f3ff' : '#ff0055';
      ctx.lineWidth = 2;
      ctx.strokeRect(t.x, topY, t.w, 4);

      // Antenna beacon
      ctx.beginPath();
      ctx.moveTo(t.x + t.w / 2, topY);
      ctx.lineTo(t.x + t.w / 2, topY - 35);
      ctx.stroke();

      ctx.fillStyle = (t.x % 2 === 0) ? '#00f3ff' : '#ffe600';
      ctx.beginPath();
      ctx.arc(t.x + t.w / 2, topY - 35, 3, 0, Math.PI * 2);
      ctx.fill();

      // Pagoda roof eave flourishes
      if (t.hasPagoda) {
        ctx.fillStyle = '#0a1024';
        ctx.beginPath();
        ctx.moveTo(t.x - 20, topY + 40);
        ctx.lineTo(t.x + t.w + 20, topY + 40);
        ctx.lineTo(t.x + t.w / 2, topY + 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();
      }

      // Lit office windows
      ctx.fillStyle = (t.x % 3 === 0) ? 'rgba(0, 243, 255, 0.45)' : 'rgba(255, 230, 0, 0.35)';
      for (let wy = topY + 30; wy < 580; wy += 22) {
        for (let wx = t.x + 12; wx < t.x + t.w - 12; wx += 16) {
          if (Math.random() > 0.4) {
            ctx.fillRect(wx, wy, 8, 12);
          }
        }
      }
    });

    // 4. Large Glowing Japanese Neon Signs (Cyberpunk Martial Arts Kanji)
    const neonSigns = [
      { text: '影', x: 240, y: 320, color: '#00f3ff' },
      { text: '武', x: 240, y: 380, color: '#00f3ff' },
      { text: '者', x: 240, y: 440, color: '#00f3ff' },
      { text: '龍', x: 610, y: 280, color: '#f59e0b' },
      { text: '神', x: 610, y: 340, color: '#f59e0b' },
      { text: '格', x: 1240, y: 300, color: '#ff0055' },
      { text: '闘', x: 1240, y: 360, color: '#ff0055' },
      { text: '極', x: 1640, y: 310, color: '#00f3ff' },
      { text: '道', x: 1640, y: 370, color: '#00f3ff' }
    ];

    neonSigns.forEach(s => {
      ctx.save();
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = s.color;
      ctx.font = '900 48px "Yu Mincho", "Noto Serif JP", serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.text, s.x, s.y);
      ctx.restore();
    });

    // 5. Giant Holographic Stadium Banner
    ctx.save();
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = 'rgba(10, 18, 36, 0.85)';
    ctx.fillRect(660, 480, 728, 85);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(660, 480, 728, 85);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px Orbitron, Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOTION STRIKE DOJO ARENA', 1024, 532);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 16px Rajdhani, sans-serif';
    ctx.fillText('WORLD CHAMPIONSHIP TOURNAMENT', 1024, 555);
    ctx.restore();

    // 6. Tiered Stadium Grandstands with Crowd Silhouettes & Glow Sticks
    for (let tier = 0; tier < 9; tier++) {
      const y = 600 + tier * 46;
      // Grandstand floor ledge
      ctx.fillStyle = '#060b18';
      ctx.fillRect(0, y, 2048, 8);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y, 2048, 1);

      // Packed audience members
      const count = 220;
      for (let j = 0; j < count; j++) {
        const x = (j / count) * 2048 + (Math.random() - 0.5) * 10;
        const cy = y - 4 + (Math.random() - 0.5) * 4;
        
        // Head & shoulders
        const brightness = 10 + tier * 3 + Math.random() * 15;
        ctx.fillStyle = `rgb(${brightness}, ${brightness + 4}, ${brightness + 12})`;
        ctx.beginPath();
        ctx.arc(x, cy - 8, 4 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 6, cy - 4, 12, 10);

        // Cheering audience neon glow sticks (Cyan, Magenta, Gold)
        if (Math.random() < 0.22) {
          const stickColors = ['#00f3ff', '#ff0055', '#ffe600', '#a855f7'];
          const color = stickColors[Math.floor(Math.random() * stickColors.length)];
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 4, cy - 6);
          ctx.lineTo(x + 8 + (Math.random() - 0.5) * 6, cy - 22);
          ctx.stroke();
        }
      }
    }

    // 7. Powerful Arena Floodlights & Sky Laser Beams
    const floodlightXs = [240, 560, 1024, 1480, 1800];
    floodlightXs.forEach((fx, idx) => {
      // Glow flare
      const flare = ctx.createRadialGradient(fx, 480, 8, fx, 480, 200);
      flare.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      flare.addColorStop(0.25, 'rgba(186, 230, 253, 0.65)');
      flare.addColorStop(0.6, 'rgba(0, 243, 255, 0.18)');
      flare.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(fx, 480, 200, 0, Math.PI * 2);
      ctx.fill();

      // Sweeping Sky Laser beam shooting upwards
      const laserAngle = (idx - 2) * 0.18;
      ctx.save();
      ctx.translate(fx, 480);
      ctx.rotate(laserAngle);
      const laserGrad = ctx.createLinearGradient(0, 0, 0, -500);
      laserGrad.addColorStop(0, 'rgba(0, 243, 255, 0.6)');
      laserGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
      laserGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = laserGrad;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.lineTo(25, -500);
      ctx.lineTo(-25, -500);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Luminous Lunar Disk
    const moonGrad = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
    moonGrad.addColorStop(0, '#ffffff');
    moonGrad.addColorStop(0.5, '#f3f4f6');
    moonGrad.addColorStop(0.85, '#d1d5db');
    moonGrad.addColorStop(0.96, '#9ca3af');
    moonGrad.addColorStop(1, 'rgba(156, 163, 175, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();

    // Lunar Maria / Craters
    ctx.fillStyle = 'rgba(75, 85, 99, 0.18)';
    const craters = [
      [200, 220, 70], [310, 200, 85], [260, 320, 60],
      [170, 340, 45], [350, 310, 50], [240, 160, 40]
    ];
    craters.forEach(([cx, cy, cr]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    });

    // Soft Cyan Ethereal Outer Halo
    const haloGrad = ctx.createRadialGradient(256, 256, 220, 256, 256, 256);
    haloGrad.addColorStop(0, 'rgba(0, 243, 255, 0.35)');
    haloGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createLanternTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Rich Crimson Lantern Silk
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#7f1d1d');
    grad.addColorStop(0.5, '#ef4444');
    grad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Black bamboo ribs
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.lineWidth = 4;
    for (let y = 20; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    // Gold Kanji in center 「勝」 (Victory)
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffe600';
    ctx.font = '900 110px "Yu Mincho", "Noto Serif JP", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('勝', 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createMistTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0, 243, 255, 0.45)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.18)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
