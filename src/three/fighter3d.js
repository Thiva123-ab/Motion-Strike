import * as THREE from 'three';
import { TextureGenerator } from './textures.js';

export class Fighter3D {
  constructor(scene, isPlayer = true) {
    this.scene = scene;
    this.isPlayer = isPlayer;

    // Fighter Colors & Identity
    this.skinColor = isPlayer ? 0xdcb898 : 0xbe8c63;
    this.trunksBase = isPlayer ? '#1d4ed8' : '#991b1b';
    this.trunksStripe = isPlayer ? '#ffffff' : '#0f172a';
    this.gloveColor = isPlayer ? '#1e40af' : '#b91c1c';
    this.hairColor = isPlayer ? 0x241c14 : 0x111111;

    this.baseX = isPlayer ? -1.45 : 1.45;
    this.facing = isPlayer ? 1 : -1;

    this.group = new THREE.Group();
    this.group.position.set(this.baseX, 0, 0);
    this.group.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    this.scene.add(this.group);

    // Animation state
    this.currentAction = 'idle'; // idle, jab, cross, kick, block, dodge_left, dodge_right, special, hit, ko
    this.actionTime = 0;
    this.actionDuration = 0.35;
    this.idleTime = Math.random() * 5;
    this.pushbackOffset = 0;
    this.isBlocking = false;
    this.isDodging = false;
    this.dodgeSide = 0;

    this.buildHumanMesh();
  }

  buildHumanMesh() {
    // 1. Realistic PBR Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: this.skinColor,
      roughness: 0.62,
      metalness: 0.05
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: this.hairColor,
      roughness: 0.9,
      metalness: 0.0
    });

    const trunksTex = TextureGenerator.createTrunksTexture(this.trunksBase, this.trunksStripe);
    const trunksMat = new THREE.MeshStandardMaterial({
      map: trunksTex,
      roughness: 0.45,
      metalness: 0.1
    });

    const gloveTex = TextureGenerator.createLeatherTexture(this.gloveColor);
    const gloveMat = new THREE.MeshStandardMaterial({
      map: gloveTex,
      roughness: 0.35,
      metalness: 0.15
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.4,
      metalness: 0.1
    });

    const wrapMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.8
    });

    // Root
    this.root = new THREE.Group();
    this.group.add(this.root);

    // 2. Realistic Floating Name Tag for Player
    if (this.isPlayer) {
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 256;
      tagCanvas.height = 64;
      const tagCtx = tagCanvas.getContext('2d');
      tagCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      tagCtx.roundRect(10, 10, 236, 44, 8);
      tagCtx.fill();
      tagCtx.strokeStyle = '#38bdf8';
      tagCtx.lineWidth = 3;
      tagCtx.stroke();
      tagCtx.fillStyle = '#38bdf8';
      tagCtx.font = 'bold 24px Rajdhani, sans-serif';
      tagCtx.textAlign = 'center';
      tagCtx.textBaseline = 'middle';
      tagCtx.fillText('YOU (P1)', 128, 32);

      const tagTex = new THREE.CanvasTexture(tagCanvas);
      const tagGeo = new THREE.PlaneGeometry(0.65, 0.18);
      const tagMat = new THREE.MeshBasicMaterial({ map: tagTex, transparent: true });
      this.nameTag = new THREE.Mesh(tagGeo, tagMat);
      this.nameTag.position.set(0, 2.05, 0);
      this.group.add(this.nameTag);
    }

    // 3. Pelvis & Boxing Trunks
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.94;
    this.root.add(this.pelvis);

    // Anatomical Hips
    const hipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.22, 16), trunksMat);
    hipMesh.castShadow = true;
    this.pelvis.add(hipMesh);

    // 4. Muscular Torso & Abdominals
    this.torso = new THREE.Group();
    this.torso.position.y = 0.12;
    this.pelvis.add(this.torso);

    // Midsection / Abs
    const absMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.24, 16), skinMat);
    absMesh.position.y = 0.12;
    absMesh.castShadow = true;
    this.torso.add(absMesh);

    // Defined Muscular Chest & Pectorals
    const chestGroup = new THREE.Group();
    chestGroup.position.y = 0.28;
    this.torso.add(chestGroup);

    const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.28, 16), skinMat);
    chestMesh.castShadow = true;
    chestGroup.add(chestMesh);

    // Left & Right Pec Bulges
    const pecGeo = new THREE.SphereGeometry(0.09, 12, 12);
    pecGeo.scale(1.2, 0.7, 0.6);
    const leftPec = new THREE.Mesh(pecGeo, skinMat);
    leftPec.position.set(-0.09, 0.05, 0.15);
    chestGroup.add(leftPec);

    const rightPec = new THREE.Mesh(pecGeo, skinMat);
    rightPec.position.set(0.09, 0.05, 0.15);
    chestGroup.add(rightPec);

    // 5. Neck & Realistic Head
    this.neck = new THREE.Group();
    this.neck.position.y = 0.18;
    chestGroup.add(this.neck);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 12), skinMat);
    neckMesh.position.y = 0.06;
    neckMesh.castShadow = true;
    this.neck.add(neckMesh);

    this.head = new THREE.Group();
    this.head.position.y = 0.12;
    this.neck.add(this.head);

    // Cranium / Face
    const headGeo = new THREE.SphereGeometry(0.125, 16, 16);
    headGeo.scale(0.95, 1.15, 1.05);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 0.08;
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Jaw / Chin
    const chinGeo = new THREE.BoxGeometry(0.09, 0.07, 0.09);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, 0.01, 0.07);
    this.head.add(chin);

    // Athletic Hair (Tapered fade)
    const hairGeo = new THREE.SphereGeometry(0.13, 16, 16);
    hairGeo.scale(0.96, 1.12, 1.02);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.11, -0.02);
    this.head.add(hairMesh);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.025, 0.06, 6);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.08, 0.14);
    this.head.add(nose);

    // Brow ridge
    const browGeo = new THREE.BoxGeometry(0.14, 0.025, 0.04);
    const brow = new THREE.Mesh(browGeo, skinMat);
    brow.position.set(0, 0.12, 0.12);
    this.head.add(brow);

    // 6. Muscular Arms & Boxing Gloves
    this.rightArm = this.createRealisticArm(0.24, skinMat, gloveMat, wrapMat, true);
    chestGroup.add(this.rightArm.shoulderGroup);

    this.leftArm = this.createRealisticArm(-0.24, skinMat, gloveMat, wrapMat, false);
    chestGroup.add(this.leftArm.shoulderGroup);

    // 7. Defined Muscular Legs & Boxing Boots
    this.rightLeg = this.createRealisticLeg(0.12, skinMat, trunksMat, bootMat);
    this.pelvis.add(this.rightLeg.hipGroup);

    this.leftLeg = this.createRealisticLeg(-0.12, skinMat, trunksMat, bootMat);
    this.pelvis.add(this.leftLeg.hipGroup);

    // 8. Contact Floor Shadow
    const shadowGeo = new THREE.CircleGeometry(0.48, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.position.y = 0.01;
    this.group.add(this.shadow);
  }

  createRealisticArm(offsetX, skinMat, gloveMat, wrapMat, isRight) {
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(offsetX, 0.10, 0);

    // Deltoid Muscle
    const deltGeo = new THREE.SphereGeometry(0.085, 12, 12);
    const delt = new THREE.Mesh(deltGeo, skinMat);
    delt.castShadow = true;
    shoulderGroup.add(delt);

    // Muscular Bicep / Tricep
    const bicepGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.26, 12);
    const bicep = new THREE.Mesh(bicepGeo, skinMat);
    bicep.position.y = -0.14;
    bicep.castShadow = true;
    shoulderGroup.add(bicep);

    // Elbow & Forearm
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(0, -0.26, 0);
    shoulderGroup.add(elbowGroup);

    const forearmGeo = new THREE.CylinderGeometry(0.058, 0.048, 0.24, 12);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.y = -0.11;
    forearm.castShadow = true;
    elbowGroup.add(forearm);

    // Laced Wrist Wrap
    const wrapGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.08, 12);
    const wrap = new THREE.Mesh(wrapGeo, wrapMat);
    wrap.position.y = -0.21;
    elbowGroup.add(wrap);

    // Professional Heavyweight Boxing Glove
    const gloveGroup = new THREE.Group();
    gloveGroup.position.set(0, -0.28, 0);
    elbowGroup.add(gloveGroup);

    // Main padded fist
    const gloveGeo = new THREE.SphereGeometry(0.095, 16, 16);
    gloveGeo.scale(1.0, 1.25, 0.9);
    const glove = new THREE.Mesh(gloveGeo, gloveMat);
    glove.castShadow = true;
    gloveGroup.add(glove);

    // Glove Thumb Curve
    const thumbGeo = new THREE.SphereGeometry(0.045, 10, 10);
    thumbGeo.scale(0.8, 1.2, 0.7);
    const thumb = new THREE.Mesh(thumbGeo, gloveMat);
    thumb.position.set(isRight ? -0.065 : 0.065, 0.02, 0.04);
    gloveGroup.add(thumb);

    return { shoulderGroup, elbowGroup, gloveGroup, isRight };
  }

  createRealisticLeg(offsetX, skinMat, trunksMat, bootMat) {
    const hipGroup = new THREE.Group();
    hipGroup.position.set(offsetX, -0.06, 0);

    // Trunks Leg Cuff
    const cuffGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.18, 16);
    const cuff = new THREE.Mesh(cuffGeo, trunksMat);
    cuff.position.y = -0.08;
    cuff.castShadow = true;
    hipGroup.add(cuff);

    // Muscular Thigh
    const thighGeo = new THREE.CylinderGeometry(0.085, 0.065, 0.32, 12);
    const thigh = new THREE.Mesh(thighGeo, skinMat);
    thigh.position.y = -0.20;
    thigh.castShadow = true;
    hipGroup.add(thigh);

    // Knee & Shin
    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -0.36, 0);
    hipGroup.add(kneeGroup);

    const calfGeo = new THREE.CylinderGeometry(0.065, 0.052, 0.32, 12);
    const calf = new THREE.Mesh(calfGeo, skinMat);
    calf.position.y = -0.15;
    calf.castShadow = true;
    kneeGroup.add(calf);

    // High-top Boxing Boot
    const bootLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 12), bootMat);
    bootLeg.position.y = -0.26;
    kneeGroup.add(bootLeg);

    const bootFoot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.10, 0.22), bootMat);
    bootFoot.position.set(0, -0.36, 0.05);
    bootFoot.castShadow = true;
    kneeGroup.add(bootFoot);

    return { hipGroup, kneeGroup };
  }

  reset() {
    this.currentAction = 'idle';
    this.actionTime = 0;
    this.actionDuration = 0.35;
    this.pushbackOffset = 0;
    this.isBlocking = false;
    this.isDodging = false;
    this.group.position.set(this.baseX, 0, 0);
    this.group.rotation.set(0, this.facing === 1 ? Math.PI / 2 : -Math.PI / 2, 0);
  }

  triggerAction(actionName, duration = 0.35, side = 0) {
    if (this.currentAction === 'ko' && actionName !== 'idle') return;
    this.currentAction = actionName;
    this.actionTime = 0;
    this.actionDuration = duration;
    this.dodgeSide = side;

    if (actionName === 'block') {
      this.isBlocking = true;
    } else {
      this.isBlocking = false;
    }

    if (actionName === 'dodge_left' || actionName === 'dodge_right') {
      this.isDodging = true;
    } else {
      this.isDodging = false;
    }
  }

  applyHitPushback(amount = 0.35) {
    this.pushbackOffset = amount;
    this.triggerAction('hit', 0.25);
  }

  update(delta) {
    this.idleTime += delta;

    if (this.currentAction !== 'idle') {
      this.actionTime += delta;
      if (this.actionTime >= this.actionDuration) {
        if (this.currentAction !== 'ko') {
          this.currentAction = 'idle';
          this.isBlocking = false;
          this.isDodging = false;
        }
      }
    }

    // Pushback decay
    if (this.pushbackOffset > 0) {
      this.pushbackOffset = Math.max(0, this.pushbackOffset - delta * 2.2);
    }
    const targetX = this.baseX - this.facing * this.pushbackOffset;
    this.group.position.x += (targetX - this.group.position.x) * Math.min(1, delta * 12);

    // Animate Player name tag
    if (this.nameTag) {
      this.nameTag.position.y = 2.05 + Math.sin(this.idleTime * 3) * 0.02;
    }

    const p = Math.min(1, this.actionTime / this.actionDuration);
    this.animateHuman(delta, p);
  }

  animateHuman(delta, p) {
    const idleT = this.idleTime * 4.8;
    const bounce = Math.sin(idleT) * 0.025;

    // Authentic Boxing Guard Neutral Baseline
    this.pelvis.position.y = 0.94 + bounce;
    this.torso.rotation.set(0, 0, 0);
    this.torso.position.set(0, 0.12, 0);
    this.head.rotation.set(0.08, 0, 0); // Chin tucked

    // Authentic boxing guard arm angles
    let rShX = -0.85 + Math.sin(idleT) * 0.04;
    let rElbX = -1.45;
    let lShX = -0.95 - Math.cos(idleT) * 0.04;
    let lElbX = -1.55;

    let rHipX = 0.12;
    let rKneeX = -0.16;
    let lHipX = -0.14;
    let lKneeX = 0.16;

    if (this.currentAction === 'idle') {
      // Natural boxing weight transfer & breathing
      this.torso.rotation.y = Math.sin(idleT * 0.6) * 0.06;
      this.head.rotation.y = -Math.sin(idleT * 0.6) * 0.06;
    } else if (this.currentAction === 'jab') {
      // Fast Right Hand Lead Jab
      const punchPhase = Math.sin(p * Math.PI);
      rShX = THREE.MathUtils.lerp(-0.85, -1.62, punchPhase);
      rElbX = THREE.MathUtils.lerp(-1.45, -0.08, punchPhase);
      this.torso.rotation.y = THREE.MathUtils.lerp(0, 0.38, punchPhase);
      this.torso.position.z = punchPhase * 0.16;
    } else if (this.currentAction === 'cross') {
      // Powerful Left Cross with hip rotation
      const punchPhase = Math.sin(p * Math.PI);
      lShX = THREE.MathUtils.lerp(-0.95, -1.68, punchPhase);
      lElbX = THREE.MathUtils.lerp(-1.55, -0.06, punchPhase);
      this.torso.rotation.y = THREE.MathUtils.lerp(0, -0.48, punchPhase);
      this.torso.position.z = punchPhase * 0.24;
    } else if (this.currentAction === 'kick') {
      // Powerful Muay Thai Kick
      const kickPhase = Math.sin(p * Math.PI);
      rHipX = THREE.MathUtils.lerp(0.12, -1.55, kickPhase);
      rKneeX = THREE.MathUtils.lerp(-0.16, 0.85, kickPhase);
      this.torso.rotation.x = THREE.MathUtils.lerp(0, 0.28, kickPhase);
      this.pelvis.position.y = 0.94 + kickPhase * 0.16;
    } else if (this.currentAction === 'block') {
      // Tight Peek-a-boo Guard (both gloves covering face)
      rShX = -1.45;
      rElbX = -1.85;
      lShX = -1.45;
      lElbX = -1.85;
      this.torso.rotation.x = -0.12;
      this.head.rotation.x = 0.2;
    } else if (this.currentAction === 'dodge_left' || this.currentAction === 'dodge_right') {
      // Slip & Bob-and-weave
      const dir = this.dodgeSide !== 0 ? this.dodgeSide : (this.currentAction === 'dodge_left' ? -1 : 1);
      const dodgePhase = Math.sin(p * Math.PI);
      this.torso.rotation.z = dir * dodgePhase * 0.45;
      this.pelvis.position.x = dir * dodgePhase * 0.28;
      this.pelvis.position.y = 0.94 - dodgePhase * 0.08; // dipping under
    } else if (this.currentAction === 'special') {
      // Heavy 2-hand slam finisher
      if (p < 0.45) {
        const raisePhase = p / 0.45;
        rShX = THREE.MathUtils.lerp(-0.85, -2.85, raisePhase);
        lShX = THREE.MathUtils.lerp(-0.95, -2.85, raisePhase);
        rElbX = -0.15;
        lElbX = -0.15;
      } else {
        const slamPhase = Math.min(1, (p - 0.45) / 0.35);
        rShX = THREE.MathUtils.lerp(-2.85, -0.75, slamPhase);
        lShX = THREE.MathUtils.lerp(-2.85, -0.75, slamPhase);
        rElbX = -0.1;
        lElbX = -0.1;
        this.torso.position.z = THREE.MathUtils.lerp(0, 0.42, slamPhase);
        this.torso.rotation.x = THREE.MathUtils.lerp(0.2, -0.42, slamPhase);
      }
    } else if (this.currentAction === 'hit') {
      // Real impact flinch
      const hitPhase = Math.sin(p * Math.PI);
      this.torso.rotation.x = 0.32 * hitPhase;
      this.head.rotation.x = 0.42 * hitPhase;
      this.pelvis.position.y = 0.94 - 0.07 * hitPhase;
    } else if (this.currentAction === 'ko') {
      // Real knockout fall onto canvas
      const koPhase = Math.min(1, this.actionTime / 1.4);
      this.group.rotation.x = koPhase * (Math.PI / 2);
      this.group.position.y = -koPhase * 0.55;
    }

    // Apply joint rotations
    this.rightArm.shoulderGroup.rotation.x = rShX;
    this.rightArm.elbowGroup.rotation.x = rElbX;
    this.leftArm.shoulderGroup.rotation.x = lShX;
    this.leftArm.elbowGroup.rotation.x = lElbX;

    this.rightLeg.hipGroup.rotation.x = rHipX;
    this.rightLeg.kneeGroup.rotation.x = rKneeX;
    this.leftLeg.hipGroup.rotation.x = lHipX;
    this.leftLeg.kneeGroup.rotation.x = lKneeX;
  }
}
