/**
 * MapScene — 地图场景
 *
 * 关卡地图：第一章 4 个节点，非对称布局。
 *
 * Init data contracts
 * ───────────────────
 *   FROM MenuScene  (new run):   { runSeed: string, startHp: number }
 *   FROM BattleScene (victory):  { nodeIndex: number, remainingHp: number }
 *   Fallback:                    resume from localStorage
 *
 * Emits to BattleScene:
 *   { nodeIndex, diseaseId, runSeed, currentHp, selectedSkills }
 *
 * localStorage key: medgod_run_state
 *   { runSeed, currentNodeIndex, currentHp }
 *
 * Layout (960 × 640)
 * ──────────────────
 *   ┌─────────┬──────────────────────────────────────────────┐
 *   │  108px  │  Asymmetric nodes                            │
 *   │  HP     │  Node 0  (left 120px, top 120px)             │
 *   │  bar    │       ╲                                      │
 *   │  (vert) │        Node 1 (right 140px, top 240px)       │
 *   │         │       ╱                                      │
 *   │  HP:X   │  Node 2  (left 80px,  top 360px)             │
 *   │  /200   │       ╲                                      │
 *   │         │        Node 3 (right 160px, top 480px)       │
 *   └─────────┴──────────────────────────────────────────────┘
 *   Connectors: 1px dashed #d4c9a8
 *   Bottom bar: "第一章 · 节点 X/4", #888, 14px
 */

import { SeededRandom, Storage } from '../utils/helpers.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SAVE_KEY = 'medgod_run_state';
const MAX_HP   = 200;
const MAX_SKILL_SLOTS = 2;

/** Pool for the seeded-random node (index 1). */
const NODE2_POOL = [
  'lung_0005',   // 咳嗽风寒袭肺证
  'spleen_0083', // 胃痛寒邪客胃证
  'spleen_0084', // 胃痛胃热炽盛证
  'heart_0040',  // 心悸心虚胆怯证
];

/**
 * Chapter 1 node templates.
 * diseaseId for index 1 is filled at init time from NODE2_POOL + runSeed.
 */
const NODE_TEMPLATES = [
  { type: 'normal', label: '风寒感冒', diseaseId: 'lung_0000'  },
  { type: 'normal', label: '随机病症', diseaseId: null          },  // resolved in init
  { type: 'elite',  label: '肝火上炎', diseaseId: 'heart_0054' },
  { type: 'boss',   label: '肺痈重症', diseaseId: 'lung_0028'  },
];

/** Asymmetric pixel positions — center of each node card. */
const NODE_POS = [
  { x: 228, y: 120 },   // node 0 — left 120px from sidebar edge
  { x: 820, y: 240 },   // node 1 — right 140px from canvas edge
  { x: 188, y: 360 },   // node 2 — left 80px  from sidebar edge
  { x: 800, y: 480 },   // node 3 — right 160px from canvas edge
];

/** Node card size per DESIGN.md. */
const CARD_W = 100;
const CARD_H = 60;

// ─── Scene ────────────────────────────────────────────────────────────────────

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  init(data) {
    if (data.runSeed !== undefined && data.startHp !== undefined) {
      // Fresh run from MenuScene
      this.runSeed        = data.runSeed;
      this.currentHp      = data.startHp;
      this.currentNodeIdx = 0;

    } else if (data.nodeIndex !== undefined && data.remainingHp !== undefined) {
      // Returning from BattleScene after victory
      this.currentNodeIdx = data.nodeIndex + 1;
      this.currentHp      = data.remainingHp;
      const saved = Storage.get(SAVE_KEY);
      this.runSeed = saved ? saved.runSeed : String(Date.now());

    } else {
      // Fallback — resume from localStorage
      const saved = Storage.get(SAVE_KEY);
      if (saved) {
        this.runSeed        = saved.runSeed;
        this.currentNodeIdx = saved.currentNodeIndex;
        this.currentHp      = saved.currentHp;
      } else {
        this.scene.start('MenuScene');
        return;
      }
    }

    this._persistState();

    // Resolve the seeded-random node disease
    const rng = new SeededRandom(this._hashSeed(this.runSeed));
    const diseaseId = NODE2_POOL[rng.nextInt(0, NODE2_POOL.length - 1)];
    this.nodes = NODE_TEMPLATES.map((t, i) => ({
      ...t,
      diseaseId: i === 1 ? diseaseId : t.diseaseId,
    }));
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background — unified #f5f1e8
    this.add.rectangle(width / 2, height / 2, width, height, 0xf5f1e8);

    this._drawSidebar(height);
    this._drawConnectors();
    this._drawNodes();
    this._drawChapterBar(width, height);

    // ESC returns to menu (pause, not abandon)
    this.input.keyboard.once('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  // ─── Sidebar ────────────────────────────────────────────────────────────────

  _drawSidebar(height) {
    // Red sidebar background
    this.add.rectangle(54, height / 2, 108, height, 0xc41e3a);

    // Vertical HP bar
    const BAR_H   = 280;
    const BAR_X   = 54;
    const BAR_Y   = height / 2 - 20;
    const BAR_W   = 12;

    // Track
    this.add.rectangle(BAR_X, BAR_Y, BAR_W, BAR_H, 0x8b0000)
      .setStrokeStyle(1, 0x6b0000);

    // Fill — grows upward from bar bottom
    const ratio     = Math.max(0, Math.min(1, this.currentHp / MAX_HP));
    const fillH     = Math.round(BAR_H * ratio);
    const fillColor = ratio < 0.4 ? 0xe07020 : 0x2d5a27;
    const fillY     = BAR_Y + BAR_H / 2 - fillH / 2;  // bottom-anchored

    if (fillH > 0) {
      this.add.rectangle(BAR_X, fillY, BAR_W, fillH, fillColor);
    }

    // "体力" label above bar
    this.add.text(BAR_X, BAR_Y - BAR_H / 2 - 16, '体力', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'Noto Sans SC, sans-serif',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // HP numbers — bottom of sidebar
    this.add.text(BAR_X, height - 52, `${this.currentHp}`, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'Noto Serif SC, serif',
    }).setOrigin(0.5);

    this.add.text(BAR_X, height - 32, `/ ${MAX_HP}`, {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.65)',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);
  }

  // ─── Connectors (dashed lines between nodes) ─────────────────────────────────

  _drawConnectors() {
    const g = this.add.graphics();
    g.lineStyle(1, 0xd4c9a8, 1.0);

    for (let i = 0; i < NODE_POS.length - 1; i++) {
      this._dashedLine(g, NODE_POS[i].x, NODE_POS[i].y, NODE_POS[i + 1].x, NODE_POS[i + 1].y, 7, 5);
    }
  }

  /** Draw a dashed line from (x1,y1) to (x2,y2). */
  _dashedLine(g, x1, y1, x2, y2, dashLen, gapLen) {
    const dx   = x2 - x1;
    const dy   = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx   = dx / dist;
    const ny   = dy / dist;

    let traveled = 0;
    let drawing  = true;

    while (traveled < dist) {
      const step = drawing
        ? Math.min(dashLen, dist - traveled)
        : Math.min(gapLen,  dist - traveled);

      if (drawing) {
        g.beginPath();
        g.moveTo(x1 + nx * traveled,          y1 + ny * traveled);
        g.lineTo(x1 + nx * (traveled + step), y1 + ny * (traveled + step));
        g.strokePath();
      }

      traveled += step;
      drawing   = !drawing;
    }
  }

  // ─── Node cards ─────────────────────────────────────────────────────────────

  _drawNodes() {
    this.nodes.forEach((node, i) => {
      const state = this._nodeState(i);
      this._drawNodeCard(NODE_POS[i].x, NODE_POS[i].y, node, state, i);
    });
  }

  _nodeState(index) {
    if (index < this.currentNodeIdx)  return 'completed';
    if (index === this.currentNodeIdx) return 'current';
    return 'locked';
  }

  _drawNodeCard(cx, cy, node, state, index) {
    const container = this.add.container(cx, cy);

    // ── Background rect ────────────────────────────────────────────
    const fillColor   = state === 'completed' ? 0xf0eeea : 0xffffff;
    const borderColor = state === 'current'   ? 0xc41e3a
                      : state === 'completed' ? 0x888888
                      : 0xd4c9a8;
    const borderWidth = state === 'current' ? 2 : 1.5;

    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, fillColor);
    bg.setStrokeStyle(borderWidth, borderColor);
    container.add(bg);

    // ── Node index badge (top-left) ────────────────────────────────
    container.add(
      this.add.text(-CARD_W / 2 + 5, -CARD_H / 2 + 4, `${index + 1}`, {
        fontSize: '9px', color: '#aaaaaa',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0, 0)
    );

    // ── Type badge (top-right) ─────────────────────────────────────
    const badgeLabel = node.type === 'boss'  ? '★BOSS'
                     : node.type === 'elite' ? '精英'
                     : '普通';
    const badgeColor = node.type === 'boss'  ? '#c41e3a'
                     : node.type === 'elite' ? '#c49a2a'
                     : '#888888';

    container.add(
      this.add.text(CARD_W / 2 - 4, -CARD_H / 2 + 4, badgeLabel, {
        fontSize: '9px', color: badgeColor,
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(1, 0)
    );

    // ── Disease name ───────────────────────────────────────────────
    const nameColor = state === 'completed' ? '#888888' : '#1a1a1a';
    container.add(
      this.add.text(0, -6, node.label, {
        fontSize: '13px', fontStyle: 'bold', color: nameColor,
        fontFamily: 'Noto Serif SC, serif',
      }).setOrigin(0.5)
    );

    // ── State-specific embellishments ─────────────────────────────
    if (state === 'completed') {
      container.add(
        this.add.text(0, 12, '✓ 已治愈', {
          fontSize: '10px', color: '#2d5a27',
          fontFamily: 'Noto Sans SC, sans-serif',
        }).setOrigin(0.5)
      );
    }

    if (state === 'current') {
      // "进入 →" button sits below the card
      const btn = this._smallButton(0, CARD_H / 2 + 18, '进入 →', () => {
        this._showSkillModal(index, node);
      });
      container.add(btn);
    }

    if (state === 'locked') {
      container.setAlpha(0.4);
    }
  }

  // ─── Chapter progress bar ────────────────────────────────────────────────────

  _drawChapterBar(width, height) {
    const done  = Math.min(this.currentNodeIdx, this.nodes.length);
    const total = this.nodes.length;

    this.add.text((width + 108) / 2, height - 18,
      `第一章 · 节点 ${done} / ${total}`, {
      fontSize: '14px', color: '#888888',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);
  }

  // ─── Skill-selection modal ────────────────────────────────────────────────────

  _showSkillModal(nodeIndex, node) {
    const { width, height } = this.cameras.main;
    const skills = this.registry.get('skills') || [];
    const selected = [];  // selected skill IDs
    const all = [];       // all Phaser objects to destroy on close

    const destroy = () => all.forEach(o => o.destroy && o.destroy());

    // Dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
    overlay.setInteractive();
    all.push(overlay);

    // Modal card
    const modalH = skills.length > 0 ? 320 : 220;
    all.push(this.add.rectangle(width / 2, height / 2, 380, modalH, 0xfdfaf4)
      .setStrokeStyle(1, 0xd4c9a8));

    // Title
    all.push(this.add.text(width / 2, height / 2 - modalH / 2 + 24, '选择出发技能', {
      fontSize: '16px', fontStyle: 'bold', color: '#1a1a1a',
      fontFamily: 'Noto Serif SC, serif',
    }).setOrigin(0.5));

    // Subtitle
    all.push(this.add.text(width / 2, height / 2 - modalH / 2 + 46, `最多携带 ${MAX_SKILL_SLOTS} 个技能`, {
      fontSize: '11px', color: '#888888',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5));

    // Divider
    all.push(this.add.rectangle(width / 2, height / 2 - modalH / 2 + 62, 320, 1, 0xd4c9a8));

    if (skills.length === 0) {
      // No skills available yet
      all.push(this.add.text(width / 2, height / 2 - 20, '（尚无技能可选）', {
        fontSize: '13px', color: '#888888',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5));

      all.push(this.add.text(width / 2, height / 2 + 10, '技能将在后续章节解锁', {
        fontSize: '11px', color: '#aaaaaa',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5));
    } else {
      // Render up to 4 skill slots in a 2-column grid
      const displaySkills = skills.slice(0, 4);
      const gridY0 = height / 2 - modalH / 2 + 90;

      displaySkills.forEach((skill, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const sx  = width / 2 + (col === 0 ? -95 : 95);
        const sy  = gridY0 + row * 64;

        const slotBg = this.add.rectangle(sx, sy, 168, 54, 0xffffff);
        slotBg.setStrokeStyle(1.5, 0xd4c9a8);
        slotBg.setInteractive({ useHandCursor: true });
        all.push(slotBg);

        all.push(this.add.text(sx, sy - 10, skill.name || '未知技能', {
          fontSize: '13px', fontStyle: 'bold', color: '#1a1a1a',
          fontFamily: 'Noto Serif SC, serif',
        }).setOrigin(0.5));

        all.push(this.add.text(sx, sy + 10, skill.description || '', {
          fontSize: '10px', color: '#888888',
          fontFamily: 'Noto Sans SC, sans-serif',
          wordWrap: { width: 150 },
        }).setOrigin(0.5));

        slotBg.on('pointerdown', () => {
          const idx = selected.indexOf(skill.id);
          if (idx >= 0) {
            selected.splice(idx, 1);
            slotBg.setFillStyle(0xffffff);
            slotBg.setStrokeStyle(1.5, 0xd4c9a8);
          } else if (selected.length < MAX_SKILL_SLOTS) {
            selected.push(skill.id);
            slotBg.setFillStyle(0xf6fff8);
            slotBg.setStrokeStyle(2, 0x2d5a27);
          }
        });

        slotBg.on('pointerover', () => {
          if (!selected.includes(skill.id)) slotBg.setFillStyle(0xf8f8f8);
        });
        slotBg.on('pointerout', () => {
          if (!selected.includes(skill.id)) slotBg.setFillStyle(0xffffff);
        });
      });
    }

    // Bottom divider
    all.push(this.add.rectangle(width / 2, height / 2 + modalH / 2 - 50, 320, 1, 0xd4c9a8));

    // Cancel button
    all.push(this._modalButton(width / 2 - 72, height / 2 + modalH / 2 - 26, '取消', false, () => {
      destroy();
    }));

    // Confirm / 出发 button
    all.push(this._modalButton(width / 2 + 72, height / 2 + modalH / 2 - 26, '出发', true, () => {
      destroy();
      this.scene.start('BattleScene', {
        nodeIndex:      nodeIndex,
        diseaseId:      node.diseaseId,
        runSeed:        this.runSeed,
        currentHp:      this.currentHp,
        selectedSkills: [...selected],
      });
    }));
  }

  // ─── Button helpers ──────────────────────────────────────────────────────────

  /** Small inline button (used for "进入 →" under the current node card). */
  _smallButton(x, y, label, callback) {
    const btn = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 80, 24, 0x1a1a1a);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x333333));
    bg.on('pointerout',  () => bg.setFillStyle(0x1a1a1a));
    bg.on('pointerdown', callback);
    btn.add(bg);

    btn.add(this.add.text(0, 0, label, {
      fontSize: '12px', color: '#ffffff',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5));

    return btn;
  }

  /** Modal-size button (cancel / confirm). */
  _modalButton(x, y, label, primary, callback) {
    const btn = this.add.container(x, y);

    const fillNormal = primary ? 0x1a1a1a : 0xffffff;
    const fillHover  = primary ? 0x333333 : 0xf0f0f0;
    const textColor  = primary ? '#ffffff' : '#1a1a1a';

    const bg = this.add.rectangle(0, 0, 120, 36, fillNormal);
    bg.setStrokeStyle(1.5, 0x1a1a1a);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(fillHover));
    bg.on('pointerout',  () => bg.setFillStyle(fillNormal));
    bg.on('pointerdown', callback);
    btn.add(bg);

    btn.add(this.add.text(0, 0, label, {
      fontSize: '14px', color: textColor,
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5));

    return btn;
  }

  // ─── Persistence ─────────────────────────────────────────────────────────────

  _persistState() {
    Storage.set(SAVE_KEY, {
      runSeed:          this.runSeed,
      currentNodeIndex: this.currentNodeIdx,
      currentHp:        this.currentHp,
    });
  }

  /** Convert a string to a stable integer seed. */
  _hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h);
  }
}
