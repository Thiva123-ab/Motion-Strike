import * as THREE from 'three';
import { TextureGenerator } from './textures.js';

export class Fighter3D {
  constructor(scene, isPlayer = true) {
    this.scene = scene;
    this.isPlayer = isPlayer;

    // Fighter Colors & Identity
    this.themeColor = isPlayer ? 0x00f3ff : 0xff0055;
    this.skinColor = isPlayer ? 0xdcb898 : 0xbe8c63;
    this.trunksBase = isPlayer ? '#1d4ed8' : '#991b1b';
    this.trunksStripe = isPlayer ? '#ffffff' : '#0f172a';
    this.gloveColor = isPlayer ? '#1e40af' : '#b91c1c';
    this.hairColor = isPlayer ? 0x241c14 : 0x111111;

    // Close-quarters in-fighting spacing (0.92m total separation for intense toe-to-toe combat)
    this.baseX = isPlayer ? -0.46 : 0.46;
    this.facing = isPlayer ? 1 : -1;

    this.group = new THREE.Group();
    this.group.position.set(this.baseX, 0, 0);
    this.group.rotation.y = this.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    this.scene.add(this.group);

    // Animation & Physics state
    this.currentAction = 'idle'; // idle, jab, cross, kick, block, dodge_left, dodge_right, special, hit, ko
    this.actionTime = 0;
    this.actionDuration = 0.35;
    this.idleTime = Math.random() * 5;
    this.pushbackOffset = 0;
    this.lungeOffset = 0;
    this.hitType = 'jab';
    this.isBlocking = false;
    this.isDodging = false;
    this.dodgeSide = 0;

    // Real-time body tracking lean offsets
    this.liveLateralLean = 0;
    this.liveForwardLean = 0;

    // Shadow Fight VFX & fist trail vectors
    this.vfx = null;
    this.prevRFistPos = new THREE.Vector3();
    this.prevLFistPos = new THREE.Vector3();
    this.currentRFistPos = new THREE.Vector3();
    this.currentLFistPos = new THREE.Vector3();

    this.buildHumanMesh();
  }

  setVFX(vfx) {
    this.vfx = vfx;
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
      const tagGeo = new THREE.PlaneGeometry(0.55, 0.15);
      const tagMat = new THREE.MeshBasicMaterial({ map: tagTex, transparent: true });
      this.nameTag = new THREE.Mesh(tagGeo, tagMat);
      this.nameTag.position.set(0, 1.95, 0);
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
    // In local space:
    // Left arm (offsetX = -0.24) is downstage (closer to camera) -> Lead Hand in Orthodox Stance
    // Right arm (offsetX = 0.24) is upstage (away from camera) -> Rear Power Hand in Orthodox Stance
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
    this.lungeOffset = 0;
    this.isBlocking = false;
    this.isDodging = false;
    this.liveLateralLean = 0;
    this.liveForwardLean = 0;
    this.group.position.set(this.baseX, 0, 0);
    this.group.rotation.set(0, this.facing === 1 ? Math.PI / 2 : -Math.PI / 2, 0);
  }

  setLiveMotion(lateral = 0, forward = 0) {
    this.liveLateralLean = THREE.MathUtils.clamp(lateral, -0.4, 0.4);
    this.liveForwardLean = THREE.MathUtils.clamp(forward, -0.3, 0.4);
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

  applyHitPushback(amount = 0.08, hitType = 'jab') {
    this.pushbackOffset = amount;
    this.hitType = hitType;
    this.lungeOffset = 0; // Cancel forward momentum on getting hit
    this.triggerAction('hit', hitType === 'special' ? 0.32 : 0.22);
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

    // Fast elastic pushback decay so fighters stay locked in close quarters
    if (this.pushbackOffset > 0) {
      this.pushbackOffset = Math.max(0, this.pushbackOffset - delta * 4.5);
    }

    // Lunge recovery back to pocket spacing when not striking
    if (this.currentAction === 'idle' || this.currentAction === 'block' || this.currentAction === 'hit') {
      this.lungeOffset = Math.max(0, this.lungeOffset - delta * 5.0);
    }

    // Dynamic forward step & displacement into close combat
    const targetX = this.baseX + this.facing * (this.lungeOffset - this.pushbackOffset);
    this.group.position.x += (targetX - this.group.position.x) * Math.min(1, delta * 16);

    // Animate Player name tag
    if (this.nameTag) {
      this.nameTag.position.y = 1.95 + Math.sin(this.idleTime * 3) * 0.02;
    }

    // Real-time Shadow Strike Trails on punches & kicks & martial arts strikes
    if (this.vfx && (this.currentAction === 'jab' || this.currentAction === 'cross' || this.currentAction === 'special' || this.currentAction === 'kick' || this.currentAction === 'elbow' || this.currentAction === 'uppercut' || this.currentAction === 'sweep')) {
      if (this.currentAction === 'jab' && this.leftArm && this.leftArm.gloveGroup) {
        this.leftArm.gloveGroup.getWorldPosition(this.currentLFistPos);
        if (this.prevLFistPos.lengthSq() > 0.01) {
          this.vfx.createShadowStrikeTrail(this.currentLFistPos, this.prevLFistPos, this.themeColor);
        }
        this.prevLFistPos.copy(this.currentLFistPos);
      } else if ((this.currentAction === 'cross' || this.currentAction === 'special' || this.currentAction === 'elbow' || this.currentAction === 'uppercut') && this.rightArm && this.rightArm.gloveGroup) {
        this.rightArm.gloveGroup.getWorldPosition(this.currentRFistPos);
        if (this.prevRFistPos.lengthSq() > 0.01) {
          this.vfx.createShadowStrikeTrail(this.currentRFistPos, this.prevRFistPos, this.themeColor);
        }
        this.prevRFistPos.copy(this.currentRFistPos);
      }
    } else {
      this.prevRFistPos.set(0, 0, 0);
      this.prevLFistPos.set(0, 0, 0);
    }

    const p = Math.min(1, this.actionTime / this.actionDuration);
    this.animateHuman(delta, p);
  }

  animateHuman(delta, p) {
    const idleT = this.idleTime * 5.0;
    const bounce = Math.sin(idleT) * 0.018;
    const swayZ = Math.cos(idleT * 0.5) * 0.025;

    // Authentic Boxing Guard Neutral Baseline
    this.pelvis.position.y = 0.94 + bounce;
    this.pelvis.position.x = 0;
    this.pelvis.position.z = swayZ;
    this.pelvis.rotation.set(0, 0, 0);

    // Bladed orthodox stance: Lead shoulder and hip angled forward
    const stanceAngle = -0.22;
    this.torso.position.set(0, 0.12, 0);
    this.torso.rotation.set(0, stanceAngle, 0);
    this.neck.rotation.set(0, 0, 0);

    // Chin tucked down behind lead shoulder, eyes locked on opponent
    this.head.rotation.set(0.12, -stanceAngle, 0);

    // Authentic boxing guard arm baseline angles:
    // Lead arm (Left arm) held at chin level, ready to flick jab
    let lShX = -1.25 + Math.sin(idleT) * 0.03;
    let lElbX = -1.65;
    let lShY = 0.08;
    let lShZ = 0.14;

    // Rear power hand (Right arm) tucked tightly against right jawline
    let rShX = -1.35 - Math.cos(idleT) * 0.03;
    let rElbX = -2.15;
    let rShY = -0.06;
    let rShZ = -0.10;

    // Orthodox leg stance: knees softly flexed, agile bounce
    let rHipX = 0.14;
    let rHipZ = 0;
    let rKneeX = -0.20;
    let lHipX = -0.16;
    let lHipZ = 0;
    let lKneeX = 0.22;

    if (this.currentAction === 'idle') {
      // Natural boxing weight transfer & rhythmic breathing
      this.torso.rotation.y = stanceAngle + Math.sin(idleT * 0.6) * 0.05;
      this.head.rotation.y = -stanceAngle - Math.sin(idleT * 0.6) * 0.05;
    } else if (this.currentAction === 'jab') {
      // Shadow Fight: Lead Dragon Palm / Snap Jab - sharp spear-like thrust
      const punchPhase = Math.sin(p * Math.PI);
      this.lungeOffset = punchPhase * 0.16;
      this.torso.position.z = punchPhase * 0.26;
      this.torso.rotation.y = THREE.MathUtils.lerp(stanceAngle, 0.08, punchPhase);

      // Lead arm fires like a spear with shoulder roll & pronation
      lShX = THREE.MathUtils.lerp(-1.25, -1.72, punchPhase);
      lElbX = THREE.MathUtils.lerp(-1.65, -0.02, punchPhase);
      lShZ = THREE.MathUtils.lerp(0.14, -0.16, punchPhase);
      lShY = THREE.MathUtils.lerp(0.08, 0.22, punchPhase);

      // Rear right hand stays glued to jaw in ninja chambered guard
      rShX = -1.45;
      rElbX = -2.25;
      rShZ = -0.12;
    } else if (this.currentAction === 'cross') {
      // Shadow Fight: Spinning Shadow Backfist - lethal 180-degree spinning martial strike
      if (p < 0.35) {
        // Phase 1: Rapid rotational windup / coil
        const coil = p / 0.35;
        this.torso.rotation.y = THREE.MathUtils.lerp(stanceAngle, -0.65, coil);
        this.pelvis.rotation.y = THREE.MathUtils.lerp(0, -0.35, coil);
        this.torso.position.z = coil * 0.08;
        rShX = THREE.MathUtils.lerp(-1.35, -1.10, coil);
        rElbX = -2.30;
        rShY = -0.25;
        lShX = -1.55;
        lElbX = -1.90;
      } else if (p < 0.75) {
        // Phase 2: Explosive spinning backfist sweep through opponent's guard!
        const strikePhase = (p - 0.35) / 0.40;
        const whipPhase = Math.sin(strikePhase * Math.PI);
        this.lungeOffset = strikePhase * 0.22;
        this.torso.position.z = 0.08 + whipPhase * 0.26;

        // Torso spins across 180 degrees
        this.torso.rotation.y = THREE.MathUtils.lerp(-0.65, 0.88, strikePhase);
        this.pelvis.rotation.y = THREE.MathUtils.lerp(-0.35, 0.65, strikePhase);

        // Rear arm whips horizontally like a curved scythe
        rShX = THREE.MathUtils.lerp(-1.10, -1.62, strikePhase);
        rElbX = THREE.MathUtils.lerp(-2.30, -0.12, Math.sin(strikePhase * Math.PI * 0.5));
        rShY = THREE.MathUtils.lerp(-0.25, 0.45, strikePhase);
        rShZ = THREE.MathUtils.lerp(-0.10, 0.38, whipPhase);

        // Head turns sharply to track target through spin
        this.head.rotation.y = THREE.MathUtils.lerp(0.35, -0.55, strikePhase);
      } else {
        // Phase 3: Martial arts recovery back into stance
        const rec = (p - 0.75) / 0.25;
        this.torso.rotation.y = THREE.MathUtils.lerp(0.88, stanceAngle, rec);
        this.pelvis.rotation.y = THREE.MathUtils.lerp(0.65, 0, rec);
        rShX = THREE.MathUtils.lerp(-1.62, -1.35, rec);
        rElbX = THREE.MathUtils.lerp(-0.12, -2.15, rec);
        rShY = THREE.MathUtils.lerp(0.45, -0.06, rec);
        rShZ = THREE.MathUtils.lerp(0.15, -0.10, rec);
        this.head.rotation.y = THREE.MathUtils.lerp(-0.55, -stanceAngle, rec);
      }
    } else if (this.currentAction === 'kick') {
      // Devastating Muay Thai Roundhouse Kick - pivoting support foot & turning hips over
      const kickPhase = Math.sin(p * Math.PI);
      this.lungeOffset = kickPhase * 0.18;

      // Hips turn over completely
      this.pelvis.rotation.y = -kickPhase * 0.52;
      this.pelvis.position.y = 0.94 + kickPhase * 0.12;

      // Kicking leg whips across with hip abduction
      rHipX = THREE.MathUtils.lerp(0.14, -1.65, kickPhase);
      rKneeX = THREE.MathUtils.lerp(-0.20, 0.46, kickPhase);
      rHipZ = -kickPhase * 0.42;

      // Torso leans back slightly as counter-balance
      this.torso.rotation.x = -kickPhase * 0.20;
      this.torso.rotation.z = kickPhase * 0.24;

      // Right arm swings down for torque, left arm shields face
      rShX = THREE.MathUtils.lerp(-1.35, 0.15, kickPhase);
      lShX = -1.50;
      lElbX = -1.95;
    } else if (this.currentAction === 'elbow') {
      // Shadow Fight: Dragon Elbow Smash - tight, vicious close-range horizontal forearm blade
      const strikePhase = Math.sin(p * Math.PI);
      this.lungeOffset = strikePhase * 0.22;
      this.torso.position.z = strikePhase * 0.20;
      this.torso.rotation.y = THREE.MathUtils.lerp(stanceAngle, 0.52, strikePhase);

      // Rear arm tightly locked at elbow, driving shoulder and elbow blade directly forward
      rShX = THREE.MathUtils.lerp(-1.35, -1.60, strikePhase);
      rElbX = -2.85; // extreme tight fold
      rShY = THREE.MathUtils.lerp(-0.06, 0.48, strikePhase);
      rShZ = THREE.MathUtils.lerp(-0.10, 0.42, strikePhase);

      // Lead arm shields ribs & temple
      lShX = -1.65;
      lElbX = -2.15;
      lShZ = 0.20;
    } else if (this.currentAction === 'uppercut') {
      // Shadow Fight: Rising Shadow Uppercut - deep scoop punch lifting up beneath opponent's chin
      const uppercutPhase = Math.sin(p * Math.PI);
      this.lungeOffset = uppercutPhase * 0.18;
      this.pelvis.position.y = 0.94 + uppercutPhase * 0.08;
      this.torso.rotation.x = -uppercutPhase * 0.24;
      this.torso.rotation.y = THREE.MathUtils.lerp(stanceAngle, 0.42, uppercutPhase);
      this.torso.position.z = uppercutPhase * 0.22;

      // Rear fist drops low, then drives straight UP
      rShX = THREE.MathUtils.lerp(-1.35, -2.10, uppercutPhase);
      rElbX = THREE.MathUtils.lerp(-2.15, -1.10, uppercutPhase);
      rShZ = THREE.MathUtils.lerp(-0.10, 0.38, uppercutPhase);

      // Lead arm guards chin
      lShX = -1.55;
      lElbX = -2.10;
    } else if (this.currentAction === 'sweep') {
      // Shadow Fight: Low Dragon Sweep - low ninja crouching 360 sweeping leg kick
      const sweepPhase = Math.sin(p * Math.PI);
      this.lungeOffset = sweepPhase * 0.25;
      this.pelvis.position.y = 0.94 - sweepPhase * 0.38; // deep drop to ground
      this.torso.rotation.x = sweepPhase * 0.45;
      this.torso.rotation.y = THREE.MathUtils.lerp(stanceAngle, 1.25, sweepPhase);

      // Kicking leg sweeps flat along the floor
      rHipX = THREE.MathUtils.lerp(0.14, -1.35, sweepPhase);
      rHipZ = -sweepPhase * 0.65;
      rKneeX = 0; // straight leg sweep

      // Arms balance near canvas
      rShX = THREE.MathUtils.lerp(-1.35, -0.45, sweepPhase);
      lShX = THREE.MathUtils.lerp(-1.25, -0.55, sweepPhase);
    } else if (this.currentAction === 'block') {
      // Tight Peek-a-boo Guard - both gloves covering temple, chin, and ribs
      lShX = -1.55;
      lElbX = -2.10;
      lShZ = -0.22;
      rShX = -1.55;
      rElbX = -2.10;
      rShZ = 0.22;

      this.torso.rotation.x = -0.14;
      this.head.rotation.x = 0.22;
      this.pelvis.position.y = 0.90;
    } else if (this.currentAction === 'dodge_left' || this.currentAction === 'dodge_right') {
      // Slipping and dipping under incoming punches
      const dir = this.dodgeSide !== 0 ? this.dodgeSide : (this.currentAction === 'dodge_left' ? -1 : 1);
      const dodgePhase = Math.sin(p * Math.PI);

      this.torso.rotation.z = dir * dodgePhase * 0.40;
      this.torso.rotation.y = stanceAngle + dir * dodgePhase * 0.28;
      this.pelvis.position.x = dir * dodgePhase * 0.22;
      this.pelvis.position.y = 0.94 - dodgePhase * 0.10; // crouching under punch
      this.head.rotation.z = -dir * dodgePhase * 0.22;
    } else if (this.currentAction === 'special') {
      // Shadow Fight: Rising Dragon Uppercut / Shadow Surge Flurry
      if (p < 0.35) {
        // Deep ninja crouch gathering shadow energy
        const dip = p / 0.35;
        this.pelvis.position.y = 0.94 - Math.sin(dip * Math.PI * 0.5) * 0.22;
        this.torso.rotation.x = dip * 0.35;
        this.torso.rotation.y = THREE.MathUtils.lerp(stanceAngle, -0.52, dip);
        rShX = THREE.MathUtils.lerp(-1.35, -0.45, dip);
        rElbX = -2.35;
        lShX = -1.65;
        lElbX = -2.10;
      } else if (p < 0.75) {
        // Soaring leap: Launches skyward exploding under opponent's jaw!
        const soarPhase = (p - 0.35) / 0.40;
        const blast = Math.sin(soarPhase * Math.PI);
        this.lungeOffset = THREE.MathUtils.lerp(0.10, 0.28, soarPhase);
        this.pelvis.position.y = 0.94 + blast * 0.34; // Leaps high off the canvas!
        this.torso.rotation.x = -blast * 0.40;
        this.torso.rotation.y = THREE.MathUtils.lerp(-0.52, 0.65, soarPhase);
        this.torso.position.z = blast * 0.32;

        rShX = THREE.MathUtils.lerp(-0.45, -2.35, Math.sin(soarPhase * Math.PI * 0.5));
        rElbX = THREE.MathUtils.lerp(-2.35, -0.85, soarPhase);
        rShZ = blast * 0.42;

        // Left arm trails behind for aerodynamic balance
        lShX = THREE.MathUtils.lerp(-1.65, 0.25, soarPhase);
        lElbX = -0.45;
      } else {
        // Graceful ninja landing
        const land = (p - 0.75) / 0.25;
        this.pelvis.position.y = THREE.MathUtils.lerp(0.94, 0.94, land);
        this.torso.rotation.x = THREE.MathUtils.lerp(-0.15, 0, land);
        this.torso.rotation.y = THREE.MathUtils.lerp(0.65, stanceAngle, land);
        rShX = THREE.MathUtils.lerp(-2.35, -1.35, land);
        rElbX = THREE.MathUtils.lerp(-0.85, -2.15, land);
        rShZ = THREE.MathUtils.lerp(0.15, -0.10, land);
        lShX = THREE.MathUtils.lerp(0.25, -1.25, land);
        lElbX = THREE.MathUtils.lerp(-0.45, -1.65, land);
      }
    } else if (this.currentAction === 'hit') {
      // Dynamic realistic impact flinch based on strike type
      const hitPhase = Math.sin(p * Math.PI);
      if (this.hitType === 'cross') {
        // Severe head snap & jaw twist from power cross
        this.head.rotation.x = -0.42 * hitPhase;
        this.head.rotation.y = -0.38 * hitPhase;
        this.torso.rotation.x = -0.20 * hitPhase;
        this.torso.rotation.y = -0.28 * hitPhase;
        this.pelvis.position.y = 0.94 - 0.06 * hitPhase;
      } else if (this.hitType === 'elbow') {
        // Devastating sharp skull jar & cranial snap from elbow
        this.head.rotation.y = -0.52 * hitPhase;
        this.head.rotation.z = -0.32 * hitPhase;
        this.torso.rotation.y = -0.36 * hitPhase;
        this.pelvis.position.y = 0.94 - 0.06 * hitPhase;
      } else if (this.hitType === 'uppercut') {
        // Explosive vertical head snap lifting chin to ceiling
        this.head.rotation.x = -0.62 * hitPhase;
        this.torso.rotation.x = -0.38 * hitPhase;
        this.pelvis.position.y = 0.94 + 0.08 * hitPhase;
      } else if (this.hitType === 'sweep') {
        // Low leg swept from underneath - severe stumble crouch
        this.pelvis.position.y = 0.94 - 0.30 * hitPhase;
        this.torso.rotation.x = 0.38 * hitPhase;
        this.torso.rotation.z = 0.28 * hitPhase;
        this.leftLeg.kneeGroup.rotation.x = 0.65 * hitPhase;
      } else if (this.hitType === 'kick') {
        // Midsection crunch from rib kick
        this.torso.rotation.x = 0.32 * hitPhase;
        this.torso.rotation.z = -0.24 * hitPhase;
        this.pelvis.position.y = 0.94 - 0.08 * hitPhase;
      } else if (this.hitType === 'special') {
        // Violent uppercut lift & recoil
        this.head.rotation.x = -0.56 * hitPhase;
        this.torso.rotation.x = -0.34 * hitPhase;
        this.pelvis.position.y = 0.94 - 0.12 * hitPhase;
      } else {
        // Fast snap back from lead jab
        this.head.rotation.x = -0.32 * hitPhase;
        this.head.rotation.y = 0.16 * hitPhase;
        this.torso.rotation.x = -0.14 * hitPhase;
        this.pelvis.position.y = 0.94 - 0.04 * hitPhase;
      }
    } else if (this.currentAction === 'ko') {
      // Authentic knockout fall onto the canvas
      const koPhase = Math.min(1, this.actionTime / 1.3);
      this.group.rotation.x = koPhase * (Math.PI / 2);
      this.group.position.y = -koPhase * 0.65;
    }

    // Apply real-time body tracking lean offsets
    this.torso.rotation.z += this.liveLateralLean * 0.45;
    this.torso.rotation.x += this.liveForwardLean * 0.35;

    // Apply joint rotations
    this.rightArm.shoulderGroup.rotation.x = rShX;
    this.rightArm.shoulderGroup.rotation.y = rShY;
    this.rightArm.shoulderGroup.rotation.z = rShZ;
    this.rightArm.elbowGroup.rotation.x = rElbX;

    this.leftArm.shoulderGroup.rotation.x = lShX;
    this.leftArm.shoulderGroup.rotation.y = lShY;
    this.leftArm.shoulderGroup.rotation.z = lShZ;
    this.leftArm.elbowGroup.rotation.x = lElbX;

    this.rightLeg.hipGroup.rotation.x = rHipX;
    this.rightLeg.hipGroup.rotation.z = rHipZ;
    this.rightLeg.kneeGroup.rotation.x = rKneeX;

    this.leftLeg.hipGroup.rotation.x = lHipX;
    this.leftLeg.hipGroup.rotation.z = lHipZ;
    this.leftLeg.kneeGroup.rotation.x = lKneeX;
  }
}
