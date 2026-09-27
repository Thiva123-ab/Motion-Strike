import * as THREE from 'three';

// Procedural high-resolution PBR texture generator for realistic materials
export class TextureGenerator {
  static createRingCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Off-white heavy canvas ring mat
    ctx.fillStyle = '#e5dec9';
    ctx.fillRect(0, 0, 1024, 1024);

    // Canvas fabric weave noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle foot scuffs and wear
    ctx.fillStyle = 'rgba(120, 105, 85, 0.05)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = 20 + Math.random() * 80;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Canvas seams (stitching)
    ctx.strokeStyle = '#c8beaa';
    ctx.lineWidth = 3;
    for (let x = 128; x < 1024; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }

    // Outer ring boundary lines (Professional boxing canvas)
    ctx.strokeStyle = '#1a2233';
    ctx.lineWidth = 14;
    ctx.strokeRect(60, 60, 904, 904);

    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 6;
    ctx.strokeRect(80, 80, 864, 864);

    // Center Championship Emblem
    ctx.save();
    ctx.translate(512, 512);

    // Outer emblem ring
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 220, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 195, 0, Math.PI * 2);
    ctx.stroke();

    // Emblem background
    ctx.fillStyle = 'rgba(240, 235, 220, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, 195, 0, Math.PI * 2);
    ctx.fill();

    // Championship Text
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 38px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOTION STRIKE', 0, -35);

    ctx.fillStyle = '#b91c1c';
    ctx.font = '700 22px Rajdhani, sans-serif';
    ctx.fillText('WORLD COMBAT CHAMPIONSHIP', 0, 10);

    // Center star
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('★ ★ ★', 0, 50);

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

    // Leather creases
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

    // Main fabric
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Elastic waistband (Top)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 70);

    // Waistband stitches
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (let y = 15; y < 70; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Side stripes
    ctx.fillStyle = stripeColor;
    ctx.fillRect(0, 70, 60, 442);
    ctx.fillRect(452, 70, 60, 442);

    // Gold trim line
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(60, 70, 8, 442);
    ctx.fillRect(444, 70, 8, 442);
    ctx.fillRect(0, 70, 512, 6);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  static createStadiumBackdropTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark stadium atmosphere gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#040711');
    grad.addColorStop(0.5, '#0b1326');
    grad.addColorStop(1, '#020408');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Arena Floodlights at the top
    const lightPositions = [120, 280, 512, 744, 904];
    lightPositions.forEach(x => {
      // Glow flare
      const flare = ctx.createRadialGradient(x, 60, 5, x, 60, 120);
      flare.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      flare.addColorStop(0.2, 'rgba(186, 230, 253, 0.6)');
      flare.addColorStop(0.6, 'rgba(56, 189, 248, 0.15)');
      flare.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(x, 60, 120, 0, Math.PI * 2);
      ctx.fill();

      // Light beam cone downward
      const cone = ctx.createLinearGradient(x, 60, x, 400);
      cone.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      cone.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
      cone.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(x - 15, 60);
      ctx.lineTo(x + 15, 60);
      ctx.lineTo(x + 90, 420);
      ctx.lineTo(x - 90, 420);
      ctx.closePath();
      ctx.fill();
    });

    // Tiered stadium seating & crowd silhouettes
    for (let tier = 0; tier < 8; tier++) {
      const y = 200 + tier * 35;
      const count = 120;
      for (let j = 0; j < count; j++) {
        const x = (j / count) * 1024 + (Math.random() - 0.5) * 8;
        // Random crowd head
        const brightness = 15 + Math.random() * 25 + (tier * 4);
        ctx.fillStyle = `rgb(${brightness}, ${brightness + 4}, ${brightness + 10})`;
        ctx.beginPath();
        ctx.arc(x, y + (Math.random() - 0.5) * 4, 3 + Math.random() * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Flashbulbs in crowd
        if (Math.random() < 0.03) {
          const flash = ctx.createRadialGradient(x, y, 1, x, y, 12);
          flash.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
          flash.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = flash;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
