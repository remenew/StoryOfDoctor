/**
 * 技能槽对象
 * 独立于草药牌组，使用回合冷却激活
 */

export class SkillSlot {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - 场景对象
   * @param {number} index - 技能槽索引（0或1）
   * @param {object} config - 配置对象
   */
  constructor(scene, index, config = {}) {
    this.scene = scene;
    this.index = index;
    this.skill = null;           // 当前装备的技能
    this.currentCooldown = 0;    // 当前冷却回合数
    this.isUsed = false;         // 是否已使用（用于legendary技能）
    
    // 位置配置
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.size = config.size || 64;
    
    // UI元素
    this.container = null;
    this.bg = null;
    this.icon = null;
    this.nameText = null;
    this.cooldownOverlay = null;
    this.cooldownText = null;
    this.readyIndicator = null;
    
    this.create();
  }

  /**
   * 创建技能槽UI
   */
  create() {
    const { scene } = this;
    console.log(`[SkillSlot ${this.index}] Creating at (${this.x}, ${this.y})`);
    
    // 创建容器
    this.container = scene.add.container(this.x, this.y);
    
    // 背景（空槽状态为灰色填充，有技能为实线）
    this.bg = scene.add.rectangle(0, 0, this.size, this.size, 0xe8e2d4);
    this.bg.setStrokeStyle(2, 0x888888); // 灰色边框
    this.container.add(this.bg);
    
    // 技能图标区域（初始为空）
    this.icon = scene.add.rectangle(0, 0, this.size - 8, this.size - 8, 0xe8e2d4);
    this.icon.setVisible(false);
    this.container.add(this.icon);
    
    // 技能名称
    this.nameText = scene.add.text(0, 0, '空槽', {
      fontSize: '10px',
      color: '#888888'
    });
    this.nameText.setOrigin(0.5);
    this.container.add(this.nameText);
    
    // 冷却遮罩
    this.cooldownOverlay = scene.add.rectangle(
      0, 0, this.size, this.size, 0x000000, 0.5
    );
    this.cooldownOverlay.setVisible(false);
    this.container.add(this.cooldownOverlay);
    
    // 冷却回合数文字
    this.cooldownText = scene.add.text(0, 0, '', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    this.cooldownText.setOrigin(0.5);
    this.cooldownText.setVisible(false);
    this.container.add(this.cooldownText);
    
    // 就绪指示器（绿色边框）
    this.readyIndicator = scene.add.rectangle(
      0, 0, this.size + 4, this.size + 4, 0x2d5a27, 0
    );
    this.readyIndicator.setStrokeStyle(3, 0x2d5a27);
    this.readyIndicator.setVisible(false);
    this.container.add(this.readyIndicator);
    
    // 设置交互
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => this.onHover());
    this.bg.on('pointerout', () => this.onHoverOut());
    this.bg.on('pointerdown', () => this.onClick());
  }

  /**
   * 装备技能
   * @param {object} skillData - 技能数据
   */
  equipSkill(skillData) {
    this.skill = skillData;
    this.currentCooldown = 0;
    this.isUsed = false;
    this.updateVisuals();
  }

  /**
   * 卸下技能
   */
  unequipSkill() {
    this.skill = null;
    this.currentCooldown = 0;
    this.isUsed = false;
    this.updateVisuals();
  }

  /**
   * 使用技能
   * @returns {object|null} 技能效果数据，如果无法使用返回null
   */
  useSkill() {
    if (!this.canUse()) {
      return null;
    }
    
    // 设置冷却
    this.currentCooldown = this.skill.cooldown;
    
    // Legendary技能标记为已使用
    if (this.skill.rarity === 'legendary') {
      this.isUsed = true;
    }
    
    this.updateVisuals();
    
    return {
      skill: this.skill,
      effectType: this.skill.effectType,
      effectValue: this.skill.effectValue,
      target: this.skill.target,
      duration: this.skill.duration
    };
  }

  /**
   * 检查技能是否可使用
   * @returns {boolean}
   */
  canUse() {
    if (!this.skill) return false;
    if (this.currentCooldown > 0) return false;
    if (this.isUsed) return false; // Legendary技能已使用
    return true;
  }

  /**
   * 回合结束处理（冷却-1）
   */
  onTurnEnd() {
    if (this.currentCooldown > 0) {
      this.currentCooldown--;
      this.updateVisuals();
    }
  }

  /**
   * 重置（战斗开始时调用）
   */
  reset() {
    this.currentCooldown = 0;
    this.isUsed = false;
    this.updateVisuals();
  }

  /**
   * 更新视觉表现
   */
  updateVisuals() {
    if (!this.skill) {
      // 空槽状态
      this.bg.setStrokeStyle(2, 0xd4c9a8, 1);
      this.icon.setVisible(false);
      this.nameText.setText('空槽');
      this.nameText.setStyle({ color: '#888888', fontSize: '10px' });
      this.cooldownOverlay.setVisible(false);
      this.cooldownText.setVisible(false);
      this.readyIndicator.setVisible(false);
      return;
    }
    
    // 有技能状态
    const categoryColors = {
      'regulation': 0x4a6a8a,
      'resolution': 0x6a8a4a,
      'spirit': 0x8a4a6a,
      'taoism': 0x6a4a8a
    };
    
    const color = categoryColors[this.skill.category] || 0x4a4a4a;
    
    this.bg.setStrokeStyle(2, color);
    this.icon.setFillStyle(color, 0.3);
    this.icon.setVisible(true);
    this.nameText.setText(this.skill.name);
    this.nameText.setStyle({ color: '#1a1a1a', fontSize: '11px' });
    
    // 冷却状态
    if (this.currentCooldown > 0) {
      this.cooldownOverlay.setVisible(true);
      this.cooldownText.setText(String(this.currentCooldown));
      this.cooldownText.setVisible(true);
      this.readyIndicator.setVisible(false);
      this.bg.setInteractive(false);
    } else if (this.isUsed) {
      // Legendary技能已使用
      this.cooldownOverlay.setVisible(true);
      this.cooldownText.setText('✓');
      this.cooldownText.setVisible(true);
      this.readyIndicator.setVisible(false);
      this.bg.setInteractive(false);
    } else {
      // 就绪状态
      this.cooldownOverlay.setVisible(false);
      this.cooldownText.setVisible(false);
      this.readyIndicator.setVisible(true);
      this.bg.setInteractive(true);
    }
  }

  /**
   * 鼠标悬停
   */
  onHover() {
    if (!this.skill) return;
    
    // 显示技能详情提示
    this.showTooltip();
    
    // 视觉反馈
    if (this.canUse()) {
      this.bg.setFillStyle(0xf0f0f0);
    }
  }

  /**
   * 鼠标离开
   */
  onHoverOut() {
    this.hideTooltip();
    this.bg.setFillStyle(0xf5f1e8);
  }

  /**
   * 点击事件
   */
  onClick() {
    if (this.canUse()) {
      this.scene.events.emit('skillSlot:clicked', {
        slotIndex: this.index,
        skill: this.skill
      });
    }
  }

  /**
   * 显示技能提示
   */
  showTooltip() {
    if (!this.skill) return;
    
    const tooltipX = this.x;
    const tooltipY = this.y - 100;
    
    // 创建提示容器
    this.tooltipContainer = this.scene.add.container(tooltipX, tooltipY);
    
    // 背景
    const bg = this.scene.add.rectangle(0, 0, 180, 90, 0xffffff);
    bg.setStrokeStyle(1, 0xd4c9a8);
    this.tooltipContainer.add(bg);
    
    // 技能名称
    const nameText = this.scene.add.text(0, -30, this.skill.name, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    nameText.setOrigin(0.5);
    this.tooltipContainer.add(nameText);
    
    // 冷却信息
    const cooldownText = this.scene.add.text(0, -12, `冷却: ${this.skill.cooldown}回合`, {
      fontSize: '10px',
      color: '#666666'
    });
    cooldownText.setOrigin(0.5);
    this.tooltipContainer.add(cooldownText);
    
    // 描述
    const descText = this.scene.add.text(0, 10, this.skill.description, {
      fontSize: '10px',
      color: '#4a4a4a',
      wordWrap: { width: 160 }
    });
    descText.setOrigin(0.5);
    this.tooltipContainer.add(descText);
    
    //  flavor text
    const flavorText = this.scene.add.text(0, 32, this.skill.flavorText, {
      fontSize: '9px',
      color: '#888888',
      fontStyle: 'italic'
    });
    flavorText.setOrigin(0.5);
    this.tooltipContainer.add(flavorText);
    
    this.tooltipContainer.setDepth(100);
  }

  /**
   * 隐藏技能提示
   */
  hideTooltip() {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
  }

  /**
   * 获取技能槽数据（用于保存）
   * @returns {object}
   */
  getData() {
    return {
      index: this.index,
      skillId: this.skill ? this.skill.id : null,
      currentCooldown: this.currentCooldown,
      isUsed: this.isUsed
    };
  }

  /**
   * 从数据恢复
   * @param {object} data
   * @param {object} skillData
   */
  loadData(data, skillData) {
    if (data.skillId && skillData) {
      this.equipSkill(skillData);
      this.currentCooldown = data.currentCooldown || 0;
      this.isUsed = data.isUsed || false;
      this.updateVisuals();
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this.hideTooltip();
    if (this.container) {
      this.container.destroy();
    }
  }
}
