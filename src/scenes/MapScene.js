/**
 * MapScene — 地图场景
 *
 * 地点地图：显示多个地点，每个地点包含多个病人
 *
 * Init data contracts
 * ───────────────────
 *   FROM MenuScene  (new run):   { runSeed: string, startHp: number, showIntro: boolean }
 *   FROM BattleScene (victory):  { locationId: string, patientId: string, remainingHp: number }
 *   Fallback:                    resume from localStorage
 *
 * Emits to BattleScene:
 *   { locationId, patientId, diseaseId, runSeed, currentHp }
 *
 * localStorage key: medgod_run_state
 *   { runSeed, currentLocationIdx, currentHp, healedPatients: [], introShown: boolean }
 *
 * Layout (960 × 640)
 * ──────────────────
 *   ┌─────────┬──────────────────────────────────────────────┐
 *   │  108px  │  Locations                                   │
 *   │  HP     │  Location cards with patient counts          │
 *   │  bar    │                                              │
 *   │         │  Click location → show patient list          │
 *   │  HP:X   │  Select patient → enter battle               │
 *   │  /200   │                                              │
 *   └─────────┴──────────────────────────────────────────────┘
 */

import { SeededRandom, Storage } from '../utils/helpers.js';
import patientsData from '../config/patients.json';

// ─── Constants ────────────────────────────────────────────────────────────────

const SAVE_KEY = 'medgod_run_state';
const MAX_HP   = 200;

/** Location card size. */
const CARD_W = 160;
const CARD_H = 100;

/** Patient list modal size. */
const MODAL_W = 500;
const MODAL_H = 400;

// ─── Scene ────────────────────────────────────────────────────────────────────

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  init(data) {
    // Load locations data
    this.locationsData = this.registry.get('locationsData');
    this.chapter1Locations = this.locationsData?.locations?.filter(l => l.chapter === 'chapter_1') || [];

    if (data.runSeed !== undefined && data.startHp !== undefined) {
      // Fresh run from MenuScene
      this.runSeed        = data.runSeed;
      this.currentHp      = data.startHp;
      this.currentLocationIdx = 0;
      this.healedPatients = [];
      this.introShown     = !data.showIntro; // 如果需要显示intro，则标记为未显示

    } else if (data.locationId && data.patientId && data.remainingHp !== undefined) {
      // Returning from BattleScene after victory
      this.currentHp      = data.remainingHp;

      const saved = Storage.get(SAVE_KEY);
      this.runSeed = saved ? saved.runSeed : String(Date.now());
      this.currentLocationIdx = saved ? saved.currentLocationIdx : 0;
      this.healedPatients = saved ? saved.healedPatients || [] : [];
      this.introShown = saved ? saved.introShown : true;
      
      // 记录治愈的病人
      if (!this.healedPatients.includes(data.patientId)) {
        this.healedPatients.push(data.patientId);
      }

    } else {
      // Fallback — resume from localStorage
      const saved = Storage.get(SAVE_KEY);
      if (saved) {
        this.runSeed        = saved.runSeed;
        this.currentLocationIdx = saved.currentLocationIdx || 0;
        this.currentHp      = saved.currentHp;
        this.healedPatients = saved.healedPatients || [];
        this.introShown     = saved.introShown ?? true;
      } else {
        this.scene.start('MenuScene');
        return;
      }
    }

    this._persistState();
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background — unified #f5f1e8
    this.add.rectangle(width / 2, height / 2, width, height, 0xf5f1e8);

    this._drawSidebar(height);
    this._drawLocations();
    this._drawChapterBar(width, height);

    // 检查是否需要显示开场白
    if (!this.introShown) {
      this._showIntro();
    }

    // ESC returns to menu
    this.input.keyboard.once('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  // ─── Intro ───────────────────────────────────────────────────────────────────

  /**
   * 显示开场白
   * @private
   */
  _showIntro() {
    const { width, height } = this.cameras.main;

    // 创建遮罩层
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setDepth(200);

    // 开场白文本
    const introText = 
      '第一章 · 初入江湖\n\n' +
      '你是一位刚入行的游方郎中，背着药箱行走在乡间小路上。\n\n' +
      '今日来到一个村庄，听说这里有病人需要救治。';

    const textObj = this.add.text(width / 2, height / 2, introText, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Noto Serif SC, serif',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(201);

    // 点击继续提示
    const hintText = this.add.text(width / 2, height - 100, '点击任意处继续', {
      fontSize: '14px',
      color: '#cccccc',
      fontFamily: 'Noto Sans SC, sans-serif'
    }).setOrigin(0.5).setDepth(201);

    // 闪烁动画
    this.tweens.add({
      targets: hintText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // 点击关闭
    const closeIntro = () => {
      this.introShown = true;
      this._persistState();
      overlay.destroy();
      textObj.destroy();
      hintText.destroy();
    };

    this.input.once('pointerdown', closeIntro);
    this.input.keyboard.once('keydown-SPACE', closeIntro);
    this.input.keyboard.once('keydown-ENTER', closeIntro);
  }

  // ─── Drawing helpers ─────────────────────────────────────────────────────────

  _drawSidebar(height) {
    // Red sidebar background
    this.add.rectangle(54, height / 2, 108, height, 0xc41e3a);

    // HP label
    this.add.text(54, 40, 'HP', {
      fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);

    // HP value
    this.hpText = this.add.text(54, 70, `${this.currentHp}`, {
      fontSize: '32px', fontStyle: 'bold', color: '#ffffff',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);

    // Max HP
    this.add.text(54, 100, `/ ${MAX_HP}`, {
      fontSize: '14px', color: '#ffffff',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);

    // Chapter indicator
    this.add.text(54, height - 60, '第一章', {
      fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
      fontFamily: 'Noto Serif SC, serif',
    }).setOrigin(0.5);

    this.add.text(54, height - 40, '初入江湖', {
      fontSize: '12px', color: '#ffffff',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);
  }

  _drawLocations() {
    const startX = 200;
    const startY = 200;
    const gapX   = 200;
    const gapY   = 140;

    this.chapter1Locations.forEach((location, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      this._drawLocationCard(location, index, x, y);
    });
  }

  /**
   * 获取地点的病人数据（合并locations和patients数据）
   * @param {Object} location - 地点数据
   * @returns {Array} 病人数据数组
   */
  _getLocationPatients(location) {
    if (!location.patientRefs || !Array.isArray(location.patientRefs)) {
      return [];
    }

    return location.patientRefs.map((ref, index) => {
      const patientTemplate = patientsData.patients.find(p => p.id === ref);
      if (!patientTemplate) {
        console.warn(`[MapScene] 未找到病人模板: ${ref}`);
        return null;
      }

      // 合并病人模板和地点特定的疾病数据
      return {
        ...patientTemplate,
        id: `${ref}_${location.id}`, // 生成唯一ID
        disease: location.diseaseIds?.[index] || patientTemplate.disease || 'unknown',
        health: location.patientHealth || patientTemplate.health || 50,
        targetHealth: location.targetHealth || patientTemplate.targetHealth || 80
      };
    }).filter(p => p !== null);
  }

  _drawLocationCard(location, index, x, y) {
    const patients = this._getLocationPatients(location);
    const isLocked = index > this.currentLocationIdx;
    const isCurrent = index === this.currentLocationIdx;
    const isCompleted = index < this.currentLocationIdx || 
                        patients.every(p => this.healedPatients.includes(p.id));

    const fillColor = isCompleted ? 0xe8e8e8 : (isCurrent ? 0xffffff : 0xf5f5f5);

    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, fillColor);
    bg.setStrokeStyle(2, isCurrent ? 0xc41e3a : 0xdddddd);
    container.add(bg);

    // Location name
    container.add(
      this.add.text(0, -25, location.name, {
        fontSize: '16px', fontStyle: 'bold', color: '#1a1a1a',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5)
    );

    // Patient count
    const healedCount = patients.filter(p => this.healedPatients.includes(p.id)).length;
    const totalPatients = patients.length;
    const patientText = isLocked ? '???' : `${healedCount}/${totalPatients}`;
    
    container.add(
      this.add.text(0, 0, `病人: ${patientText}`, {
        fontSize: '12px', color: '#666666',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5)
    );

    // Click handler
    if (!isLocked) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0xf8f8f8));
      bg.on('pointerout', () => bg.setFillStyle(fillColor));
      bg.on('pointerdown', () => {
        this._showPatientList(location, patients);
      });
    }

    if (isLocked) {
      container.setAlpha(0.4);
      container.add(
        this.add.text(0, 35, '🔒', { fontSize: '12px' }).setOrigin(0.5)
      );
    } else if (isCurrent && !isCompleted) {
      container.add(
        this.add.text(0, 35, '点击进入 →', {
          fontSize: '10px', color: '#c41e3a',
          fontFamily: 'Noto Sans SC, sans-serif',
        }).setOrigin(0.5)
      );
    }
  }

  _drawChapterBar(width, height) {
    this.add.rectangle(width / 2, 20, width, 40, 0xc41e3a);
    
    this.add.text(width / 2, 20, '第一章 · 初入江湖', {
      fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
      fontFamily: 'Noto Serif SC, serif',
    }).setOrigin(0.5);
  }

  // ─── Patient List Modal ──────────────────────────────────────────────────────

  _showPatientList(location, patients) {
    const { width, height } = this.cameras.main;
    const modalX = width / 2;
    const modalY = height / 2;

    // Modal background
    const modalBg = this.add.rectangle(modalX, modalY, MODAL_W, MODAL_H, 0xffffff);
    modalBg.setStrokeStyle(2, 0xc41e3a);
    modalBg.setDepth(100);

    // Title
    const title = this.add.text(modalX, modalY - MODAL_H / 2 + 30, 
      `${location.name} - 选择病人`, {
      fontSize: '18px', fontStyle: 'bold', color: '#1a1a1a',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5).setDepth(101);

    // Close button
    const closeBtn = this.add.text(modalX + MODAL_W / 2 - 30, modalY - MODAL_H / 2 + 20, '✕', {
      fontSize: '20px', color: '#666666',
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    // Patient list
    const patientListY = modalY - MODAL_H / 2 + 80;
    const patientItems = [];

    patients.forEach((patient, index) => {
      const isHealed = this.healedPatients.includes(patient.id);
      const y = patientListY + index * 50;

      const itemBg = this.add.rectangle(modalX, y, MODAL_W - 40, 40, 
        isHealed ? 0xe8e8e8 : 0xf5f5f5).setDepth(100);
      
      if (!isHealed) {
        itemBg.setInteractive({ useHandCursor: true });
        itemBg.on('pointerover', () => itemBg.setFillStyle(0xffffff));
        itemBg.on('pointerout', () => itemBg.setFillStyle(0xf5f5f5));
        itemBg.on('pointerdown', () => {
          this._enterBattle(location, patient);
        });
      }

      const nameText = this.add.text(modalX - MODAL_W / 2 + 40, y, 
        isHealed ? `✓ ${patient.name}` : patient.name, {
        fontSize: '14px', color: isHealed ? '#999999' : '#1a1a1a',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0, 0.5).setDepth(101);

      const diseaseText = this.add.text(modalX + MODAL_W / 2 - 40, y, 
        isHealed ? '已治愈' : (patient.identity || '平民'), {
        fontSize: '12px', color: isHealed ? '#66aa66' : '#c41e3a',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(1, 0.5).setDepth(101);

      patientItems.push(itemBg, nameText, diseaseText);
    });

    // Close handler
    const closeModal = () => {
      modalBg.destroy();
      title.destroy();
      closeBtn.destroy();
      patientItems.forEach(item => item.destroy());
    };

    closeBtn.on('pointerdown', closeModal);
    
    this.time.delayedCall(100, () => {
      this.input.once('pointerdown', (pointer) => {
        const bounds = modalBg.getBounds();
        if (!bounds.contains(pointer.x, pointer.y)) {
          closeModal();
        }
      });
    });
  }

  // ─── Battle ───────────────────────────────────────────────────────────────────

  _enterBattle(location, patient) {
    this._persistState();

    this.scene.start('BattleScene', {
      locationId: location.id,
      patientId: patient.id,
      diseaseId: patient.disease,
      runSeed: this.runSeed,
      currentHp: this.currentHp,
    });
  }

  // ─── Persistence ─────────────────────────────────────────────────────────────

  _persistState() {
    Storage.set(SAVE_KEY, {
      runSeed:          this.runSeed,
      currentLocationIdx: this.currentLocationIdx,
      currentHp:        this.currentHp,
      healedPatients:   this.healedPatients,
      introShown:       this.introShown,
    });
  }
}
