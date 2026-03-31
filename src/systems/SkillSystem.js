/**
 * 技能系统
 * 管理技能槽的装备、使用和冷却
 * 新设计：按钮形式，点击展开选择技能
 */

import { SkillSlot } from '../objects/SkillSlot.js';

export class SkillSystem {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - 场景对象
   * @param {object} config - 配置对象
   */
  constructor(scene, config = {}) {
    this.scene = scene;
    this.skillSlots = [];        // 技能槽数组
    this.maxSlots = config.maxSlots || 2;  // 最大槽位数
    this.skillsData = null;      // 技能数据
    this.activeEffects = [];     // 当前激活的效果
    
    // UI元素
    this.toggleButton = null;    // 展开/收起按钮
    this.skillPanel = null;      // 技能面板
    this.isPanelOpen = false;    // 面板是否展开
    
    // 技能效果处理器
    this.effectHandlers = {
      'stamina_restore': this.handleStaminaRestore.bind(this),
      'debuff_clear': this.handleDebuffClear.bind(this),
      'draw': this.handleDraw.bind(this),
      'heal_boost': this.handleHealBoost.bind(this),
      'preview': this.handlePreview.bind(this),
      'shield': this.handleShield.bind(this),
      'revive': this.handleRevive.bind(this),
      'combo_boost': this.handleComboBoost.bind(this),
      'heal_over_time': this.handleHealOverTime.bind(this),
      'damage_reduction': this.handleDamageReduction.bind(this)
    };
  }

  /**
   * 初始化技能系统
   * @param {Array} equippedSkills - 已装备的技能ID数组
   * @param {object} skillsData - 技能配置数据
   */
  init(equippedSkills = [], skillsData) {
    this.skillsData = skillsData;
    console.log('[SkillSystem] Initializing with skills:', equippedSkills);
    
    // 创建展开/收起按钮（左下角）
    this.createToggleButton();
    
    // 创建技能面板（初始隐藏）
    this.createSkillPanel(equippedSkills);

    // 监听技能槽点击事件
    this.scene.events.on('skillSlot:clicked', (data) => {
      this.onSkillSlotClicked(data);
    });
  }

  /**
   * 创建展开/收起按钮
   */
  createToggleButton() {
    const x = 60;
    const y = 500;
    
    // 按钮背景
    this.toggleButton = this.scene.add.container(x, y);
    
    const bg = this.scene.add.rectangle(0, 0, 80, 36, 0x2d5a27);
    bg.setStrokeStyle(2, 0x1a1a1a);
    this.toggleButton.add(bg);
    
    // 按钮文字
    const label = this.scene.add.text(0, 0, '技能 ▲', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    label.setOrigin(0.5);
    this.toggleButton.add(label);
    this.toggleButtonLabel = label;
    
    // 快捷键提示
    const hint = this.scene.add.text(0, 22, '[S]', {
      fontSize: '10px',
      color: '#aaaaaa'
    });
    hint.setOrigin(0.5);
    this.toggleButton.add(hint);
    
    // 设置交互
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x3d6a37));
    bg.on('pointerout', () => bg.setFillStyle(0x2d5a27));
    bg.on('pointerdown', () => this.togglePanel());
    
    this.toggleButton.setDepth(100);
  }

  /**
   * 创建技能面板
   * @param {Array} equippedSkills - 已装备的技能ID数组
   */
  createSkillPanel(equippedSkills) {
    const panelX = 60;
    const panelY = 420;
    
    // 面板容器（初始隐藏）
    this.skillPanel = this.scene.add.container(panelX, panelY);
    this.skillPanel.setVisible(false);
    
    // 面板背景
    const panelBg = this.scene.add.rectangle(0, -40, 160, 120, 0xf5f1e8);
    panelBg.setStrokeStyle(2, 0x2d5a27);
    this.skillPanel.add(panelBg);
    
    // 面板标题
    const title = this.scene.add.text(0, -90, '选择技能', {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#2d5a27'
    });
    title.setOrigin(0.5);
    this.skillPanel.add(title);
    
    // 快捷键提示
    const hint = this.scene.add.text(0, -75, '[Q] [W]', {
      fontSize: '10px',
      color: '#666666'
    });
    hint.setOrigin(0.5);
    this.skillPanel.add(hint);
    
    // 创建技能槽（在面板内垂直排列）
    for (let i = 0; i < this.maxSlots; i++) {
      const slot = new SkillSlot(this.scene, i, {
        x: 0,
        y: -50 + i * 50,  // 面板内垂直排列
        size: 40
      });
      
      // 装备技能
      if (equippedSkills[i]) {
        const skill = this.findSkillById(equippedSkills[i]);
        if (skill) {
          slot.equipSkill(skill);
        }
      }
      
      // 将技能槽的容器添加到面板
      if (slot.container) {
        this.skillPanel.add(slot.container);
      }
      
      this.skillSlots.push(slot);
    }
    
    this.skillPanel.setDepth(99);
  }

  /**
   * 展开/收起面板
   */
  togglePanel() {
    this.isPanelOpen = !this.isPanelOpen;
    this.skillPanel.setVisible(this.isPanelOpen);
    
    // 更新按钮文字
    if (this.toggleButtonLabel) {
      this.toggleButtonLabel.setText(this.isPanelOpen ? '技能 ▼' : '技能 ▲');
    }
    
    console.log('[SkillSystem] Panel toggled:', this.isPanelOpen);
  }

  /**
   * 关闭面板
   */
  closePanel() {
    this.isPanelOpen = false;
    this.skillPanel.setVisible(false);
    if (this.toggleButtonLabel) {
      this.toggleButtonLabel.setText('技能 ▲');
    }
  }

  /**
   * 根据ID查找技能
   * @param {string} skillId - 技能ID
   * @returns {object|null}
   */
  findSkillById(skillId) {
    if (!this.skillsData || !this.skillsData.skills) return null;
    return this.skillsData.skills.find(s => s.id === skillId) || null;
  }

  /**
   * 技能槽点击处理
   * @param {object} data - 点击事件数据
   */
  onSkillSlotClicked(data) {
    const { slotIndex, skill } = data;
    const slot = this.skillSlots[slotIndex];
    
    if (!slot || !slot.canUse()) {
      return;
    }
    
    // 使用技能
    const result = slot.useSkill();
    if (result) {
      // 应用技能效果
      this.applySkillEffect(result);
      
      // 发射技能使用事件
      this.scene.events.emit('skill:used', {
        slotIndex,
        skill: result.skill,
        effect: result
      });
      
      // 显示使用反馈
      this.showSkillUsedFeedback(result.skill);
      
      // 使用技能后关闭面板
      this.closePanel();
    }
  }

  /**
   * 使用指定技能槽（快捷键）
   * @param {number} slotIndex - 技能槽索引
   */
  useSkillSlot(slotIndex) {
    if (!this.skillSlots[slotIndex]) return;
    
    const slot = this.skillSlots[slotIndex];
    if (slot.canUse()) {
      // 展开面板显示技能
      if (!this.isPanelOpen) {
        this.togglePanel();
      }
      
      // 高亮对应的技能槽
      this.highlightSlot(slotIndex);
    }
  }

  /**
   * 高亮技能槽
   * @param {number} slotIndex - 技能槽索引
   */
  highlightSlot(slotIndex) {
    // 可以添加高亮效果
    console.log(`[SkillSystem] Highlighting slot ${slotIndex}`);
  }

  /**
   * 应用技能效果
   * @param {object} skillEffect - 技能效果数据
   */
  applySkillEffect(skillEffect) {
    const handler = this.effectHandlers[skillEffect.effectType];
    if (handler) {
      handler(skillEffect);
    }
  }

  /**
   * 处理精气恢复效果
   * @param {object} effect
   */
  handleStaminaRestore(effect) {
    this.scene.events.emit('skill:staminaBoost', {
      value: effect.effectValue,
      duration: effect.duration
    });
  }

  /**
   * 处理清除异常效果
   * @param {object} effect
   */
  handleDebuffClear(effect) {
    this.scene.events.emit('skill:clearDebuff', {
      value: effect.effectValue
    });
  }

  /**
   * 处理抽牌效果
   * @param {object} effect
   */
  handleDraw(effect) {
    this.scene.events.emit('skill:draw', {
      count: effect.effectValue
    });
  }

  /**
   * 处理治疗加成效果
   * @param {object} effect
   */
  handleHealBoost(effect) {
    this.activeEffects.push({
      type: 'heal_boost',
      multiplier: effect.effectValue,
      duration: effect.duration,
      remaining: 1
    });
    
    this.scene.events.emit('skill:healBoost', {
      multiplier: effect.effectValue
    });
  }

  /**
   * 处理预览牌堆效果
   * @param {object} effect
   */
  handlePreview(effect) {
    this.scene.events.emit('skill:preview', {
      count: effect.effectValue
    });
  }

  /**
   * 处理护盾效果（免疫攻击）
   * @param {object} effect
   */
  handleShield(effect) {
    this.activeEffects.push({
      type: 'shield',
      value: effect.effectValue,
      duration: effect.duration,
      remaining: 1
    });
    
    this.scene.events.emit('skill:shield', {
      active: true
    });
  }

  /**
   * 处理复活效果
   * @param {object} effect
   */
  handleRevive(effect) {
    this.activeEffects.push({
      type: 'revive',
      value: effect.effectValue,
      duration: 'once_per_battle',
      remaining: 1
    });
    
    this.scene.events.emit('skill:reviveReady', {
      active: true
    });
  }

  /**
   * 处理组合技加成效果
   * @param {object} effect
   */
  handleComboBoost(effect) {
    this.activeEffects.push({
      type: 'combo_boost',
      multiplier: effect.effectValue,
      duration: effect.duration,
      remaining: 1
    });
    
    this.scene.events.emit('skill:comboBoost', {
      multiplier: effect.effectValue
    });
  }

  /**
   * 处理持续治疗效果
   * @param {object} effect
   */
  handleHealOverTime(effect) {
    this.activeEffects.push({
      type: 'heal_over_time',
      value: effect.effectValue,
      duration: effect.duration,
      remaining: 3
    });
    
    this.scene.events.emit('skill:healOverTime', {
      value: effect.effectValue,
      turns: 3
    });
  }

  /**
   * 处理伤害减免效果
   * @param {object} effect
   */
  handleDamageReduction(effect) {
    this.activeEffects.push({
      type: 'damage_reduction',
      multiplier: effect.effectValue,
      duration: effect.duration,
      remaining: 1
    });
    
    this.scene.events.emit('skill:damageReduction', {
      multiplier: effect.effectValue
    });
  }

  /**
   * 回合结束处理
   */
  onTurnEnd() {
    // 更新技能槽冷却
    for (const slot of this.skillSlots) {
      slot.onTurnEnd();
    }
    
    // 更新激活效果的剩余回合
    for (const effect of this.activeEffects) {
      if (effect.remaining > 0) {
        effect.remaining--;
      }
      
      if (effect.type === 'heal_over_time' && effect.remaining > 0) {
        this.scene.events.emit('skill:healOverTimeTick', {
          value: effect.value
        });
      }
    }
    
    // 清理过期效果
    this.activeEffects = this.activeEffects.filter(e => {
      if (e.duration === 'once_per_battle') return true;
      if (e.duration === 'next_card' && e.remaining <= 0) return false;
      if (e.duration === 'turn' && e.remaining <= 0) return false;
      if (e.duration === 'next_attack' && e.remaining <= 0) return false;
      return true;
    });
    
    // 清理护盾效果
    const shieldEffect = this.activeEffects.find(e => e.type === 'shield');
    if (shieldEffect && shieldEffect.remaining <= 0) {
      this.scene.events.emit('skill:shield', { active: false });
    }
  }

  /**
   * 检查是否有指定类型的激活效果
   * @param {string} effectType - 效果类型
   * @returns {object|null}
   */
  getActiveEffect(effectType) {
    return this.activeEffects.find(e => e.type === effectType && e.remaining > 0) || null;
  }

  /**
   * 检查是否有护盾效果
   * @returns {boolean}
   */
  hasShield() {
    const shield = this.getActiveEffect('shield');
    return shield !== null && shield.remaining > 0;
  }

  /**
   * 检查是否有复活效果
   * @returns {boolean}
   */
  hasRevive() {
    const revive = this.getActiveEffect('revive');
    return revive !== null && revive.remaining > 0;
  }

  /**
   * 触发复活
   * @returns {boolean} 是否成功触发
   */
  triggerRevive() {
    const reviveIndex = this.activeEffects.findIndex(
      e => e.type === 'revive' && e.remaining > 0
    );
    
    if (reviveIndex >= 0) {
      this.activeEffects[reviveIndex].remaining = 0;
      this.scene.events.emit('skill:reviveTriggered');
      return true;
    }
    return false;
  }

  /**
   * 获取治疗加成倍数
   * @returns {number}
   */
  getHealMultiplier() {
    const boost = this.getActiveEffect('heal_boost');
    return boost ? boost.multiplier : 1;
  }

  /**
   * 获取组合技加成倍数
   * @returns {number}
   */
  getComboMultiplier() {
    const boost = this.getActiveEffect('combo_boost');
    return boost ? boost.multiplier : 1;
  }

  /**
   * 获取伤害减免倍数
   * @returns {number}
   */
  getDamageReduction() {
    const reduction = this.getActiveEffect('damage_reduction');
    if (reduction && reduction.remaining > 0) {
      reduction.remaining = 0;
      return reduction.multiplier;
    }
    return 1;
  }

  /**
   * 消耗治疗加成（用于下一张牌）
   */
  consumeHealBoost() {
    const index = this.activeEffects.findIndex(
      e => e.type === 'heal_boost' && e.remaining > 0
    );
    if (index >= 0) {
      this.activeEffects[index].remaining = 0;
    }
  }

  /**
   * 显示技能使用反馈
   * @param {object} skill
   */
  showSkillUsedFeedback(skill) {
    const text = this.scene.add.text(60, 450, `${skill.name}！`, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#2d5a27'
    });
    text.setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: 400,
      alpha: 0,
      duration: 1000,
      ease: 'easeOut',
      onComplete: () => text.destroy()
    });
  }

  /**
   * 获取技能槽数据（用于保存）
   * @returns {Array}
   */
  getData() {
    return this.skillSlots.map(slot => slot.getData());
  }

  /**
   * 从数据恢复
   * @param {Array} data
   */
  loadData(data) {
    if (!data || !Array.isArray(data)) return;
    
    for (let i = 0; i < data.length && i < this.skillSlots.length; i++) {
      const skill = this.findSkillById(data[i].skillId);
      this.skillSlots[i].loadData(data[i], skill);
    }
  }

  /**
   * 重置所有技能槽
   */
  reset() {
    for (const slot of this.skillSlots) {
      slot.reset();
    }
    this.activeEffects = [];
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.toggleButton) {
      this.toggleButton.destroy();
    }
    if (this.skillPanel) {
      this.skillPanel.destroy();
    }
    for (const slot of this.skillSlots) {
      slot.destroy();
    }
    this.skillSlots = [];
    this.activeEffects = [];
  }
}
