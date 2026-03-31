/**
 * 卡牌对象
 * 支持品质系统：常用药(common)、较常用(uncommon)、名贵药(rare)、稀世珍品(legendary)
 */

// 卡牌类型颜色
const CARD_COLORS = {
  herb: 0x4888ff,   // 草药牌 - 蓝色
  drug: 0x4888ff,   // 药物牌 - 蓝色
  skill: 0xaa44ff,  // 技能牌 - 紫色
  magic: 0xff8844,  // 巫术牌 - 橙色
  secret: 0xc41e3a  // 秘方牌 - 红色
};

// 卡牌类型中文名
const CARD_TYPE_NAMES = {
  herb: '草药',
  drug: '药物',
  skill: '技能',
  magic: '巫术',
  secret: '秘方'
};

// 品质配置
const RARITY_CONFIG = {
  common: {
    name: '常用药',
    color: 0x888888,      // 灰色边框
    textColor: '#888888',
    bgColor: 0xffffff,
    effectBonus: 0        // 无加成
  },
  uncommon: {
    name: '较常用',
    color: 0x4888ff,      // 蓝色边框
    textColor: '#4888ff',
    bgColor: 0xf8faff,
    effectBonus: 0.1      // +10%效果
  },
  rare: {
    name: '名贵药',
    color: 0xc49a2a,      // 金色边框
    textColor: '#c49a2a',
    bgColor: 0xfffdf5,
    effectBonus: 0.2      // +20%效果
  },
  legendary: {
    name: '稀世珍品',
    color: 0xc41e3a,      // 红色边框
    textColor: '#c41e3a',
    bgColor: 0xfff5f5,
    effectBonus: 0.3      // +30%效果
  }
};

export class Card {
  constructor(scene, data, index = 0) {
    this.scene = scene;
    this.data = data;
    this.index = index;
    this.selected = false;
    this.playable = true;

    // 疾病相关属性
    this.isEffective = data.isEffective || false;  // 是否是有效药物
    this.role = data.role || null;                 // 角色（君/臣/佐/使）
    this.attack = data.attack || 0;                // 攻击力
    this.isSpecial = data.isSpecial || false;      // 是否是名贵草药
    this.specialEffect = data.specialEffect || null; // 特殊效果

    this.container = null;
    this.bg = null;
    this.nameText = null;
    this.typeText = null;
    this.costText = null;
    this.descText = null;
    this.rarityText = null;
    this.qualityBadge = null;
    this.attackText = null;    // 攻击力显示
    this.roleText = null;      // 角色标识

    this.create();
  }

  /**
   * 获取品质配置
   * @returns {object} 品质配置
   */
  getRarityConfig() {
    return RARITY_CONFIG[this.data.rarity] || RARITY_CONFIG.common;
  }

  /**
   * 计算最终治疗效果
   * 有效药物：基础治疗值 + 攻击力（治疗加成）
   * 非有效药物：只有攻击力（作为治疗值）
   * @returns {number} 最终治疗效果
   */
  getFinalHealValue() {
    // 如果不是有效药物，只有攻击力作为治疗值
    if (!this.isEffective) {
      return this.attack;
    }

    // 有效药物：基础治疗值 + 攻击力
    const baseValue = this.getHealValue();
    return baseValue + this.attack;
  }

  /**
   * 获取攻击力（治疗加成值）
   * @returns {number} 治疗加成值（如20表示+20点治疗）
   */
  getAttackBonus() {
    return this.attack;
  }

  create() {
    const { scene, data } = this;
    const width = 120;
    const height = 160;

    // 获取品质配置
    const rarityConfig = this.getRarityConfig();

    // 创建容器
    this.container = scene.add.container(0, 0);
    this.container.setSize(width, height);

    // 卡牌背景（根据品质设置背景色）
    this.bg = scene.add.rectangle(0, 0, width, height, rarityConfig.bgColor);
    this.bg.setStrokeStyle(2, rarityConfig.color);
    this.container.add(this.bg);

    // 品质标签（左上角，覆盖类型标签）
    this.rarityText = scene.add.text(-width/2 + 6, -height/2 + 6,
      rarityConfig.name, {
      fontSize: '9px',
      color: rarityConfig.textColor,
      fontStyle: 'bold'
    });
    this.container.add(this.rarityText);

    // 类型标签（品质标签下方）
    this.typeText = scene.add.text(-width/2 + 6, -height/2 + 20,
      CARD_TYPE_NAMES[data.type] || '未知', {
      fontSize: '9px',
      color: '#666666'
    });
    this.container.add(this.typeText);

    // 真气消耗（右上角）
    this.costText = scene.add.text(width/2 - 6, -height/2 + 12,
      `${data.qiCost}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#c41e3a'
    });
    this.costText.setOrigin(1, 0);
    this.container.add(this.costText);

    // 卡牌名称
    this.nameText = scene.add.text(0, -15, data.name, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.container.add(this.nameText);

    // 效果值显示（最终治疗值）
    const finalValue = this.getFinalHealValue();
    const baseValue = this.getHealValue();
    let valueText;
    let valueColor;
    
    if (!this.isEffective) {
      // 非有效药物：只显示攻击力（作为治疗值）
      valueText = `${finalValue}`;
      valueColor = finalValue >= 0 ? '#2d5a27' : '#c41e3a';
    } else if (this.attack !== 0) {
      // 有效药物且有攻击力加成：显示基础值+加成
      const sign = this.attack > 0 ? '+' : '';
      valueText = `${baseValue}${sign}${this.attack}`;
      valueColor = rarityConfig.textColor;
    } else {
      // 有效药物无加成
      valueText = `${finalValue}`;
      valueColor = '#2d5a27';
    }
    
    this.valueText = scene.add.text(0, 10, `治疗 ${valueText}`, {
      fontSize: '12px',
      fontStyle: 'bold',
      color: valueColor
    });
    this.valueText.setOrigin(0.5, 0.5);
    this.container.add(this.valueText);

    // 效果描述
    this.descText = scene.add.text(0, 45, data.description, {
      fontSize: '10px',
      color: '#4a4a4a',
      wordWrap: { width: width - 12 },
      align: 'center'
    });
    this.descText.setOrigin(0.5, 0);
    this.container.add(this.descText);

    // 角色标识（如果是有效药物）
    if (this.isEffective && this.role) {
      const roleColors = {
        '君': 0xc41e3a,  // 红色
        '臣': 0xff8800,  // 橙色
        '佐': 0x4888ff,  // 蓝色
        '使': 0x888888   // 灰色
      };
      const roleColor = roleColors[this.role] || 0x888888;
      
      this.roleText = scene.add.text(-width/2 + 6, height/2 - 20, this.role, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#' + roleColor.toString(16).padStart(6, '0')
      });
      this.container.add(this.roleText);
    }

    // 治疗加成显示（攻击力表示治疗加成值）
    if (this.isEffective && this.attack !== 0) {
      const attackColor = this.attack > 0 ? '#2d5a27' : '#c41e3a';
      const attackSign = this.attack > 0 ? '+' : '';
      this.attackText = scene.add.text(width/2 - 6, height/2 - 20, `${attackSign}${this.attack}`, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: attackColor
      });
      this.attackText.setOrigin(1, 0);
      this.container.add(this.attackText);
    }

    // 特殊草药标识（如人参）
    if (this.isSpecial && this.specialEffect) {
      const specialText = scene.add.text(0, height/2 - 6, '★名贵', {
        fontSize: '9px',
        color: '#c49a2a',
        fontStyle: 'bold'
      });
      specialText.setOrigin(0.5, 0.5);
      this.container.add(specialText);
    }

    // 交互
    this.bg.setInteractive({ useHandCursor: true });

    this.bg.on('pointerover', () => this.onHover());
    this.bg.on('pointerout', () => this.onOut());
    this.bg.on('pointerdown', () => this.onClick());
  }

  onHover() {
    if (!this.playable) return;
    if (this.selected) return;
    const rarityConfig = this.getRarityConfig();
    this.bg.setStrokeStyle(3, rarityConfig.color);
  }

  onOut() {
    if (this.selected) return;
    const rarityConfig = this.getRarityConfig();
    this.bg.setStrokeStyle(2, rarityConfig.color);
  }

  onClick() {
    if (!this.playable) return;
    if (this.scene.onCardClick) {
      this.scene.onCardClick(this);
    }
  }

  select() {
    this.selected = true;
    this.bg.setStrokeStyle(3, 0xc41e3a);
    // 记住原始Y位置，然后上移
    if (this.originalY === undefined) {
      this.originalY = this.container.y;
    }
    this.scene.tweens.add({
      targets: this.container,
      y: this.originalY - 20,
      duration: 150,
      ease: 'easeOut'
    });
  }

  deselect() {
    this.selected = false;
    const rarityConfig = this.getRarityConfig();
    this.bg.setStrokeStyle(2, rarityConfig.color);
    // 恢复原始位置
    if (this.originalY !== undefined) {
      this.scene.tweens.add({
        targets: this.container,
        y: this.originalY,
        duration: 150,
        ease: 'easeOut'
      });
    }
  }

  setPlayable(playable) {
    this.playable = playable;
    if (playable) {
      this.container.setAlpha(1);
    } else {
      this.container.setAlpha(0.5);
    }
  }

  setPosition(x, y) {
    this.container.setPosition(x, y);
  }

  destroy() {
    this.container.destroy();
  }

  /**
   * 获取治疗效果值
   */
  getHealValue() {
    let heal = 0;
    for (const effect of this.data.effects) {
      if (effect.type === 'heal') {
        heal += effect.value;
      }
    }
    return heal;
  }

  /**
   * 获取治疗能力加成（攻击力）
   * @returns {number} 治疗加成百分比（如20表示+20%治疗量）
   */
  getAttack() {
    return this.attack;
  }

  /**
   * 获取角色
   * @returns {string|null} 角色（君/臣/佐/使）
   */
  getRole() {
    return this.role;
  }

  /**
   * 检查是否是有效药物
   * @returns {boolean} 是否是有效药物
   */
  isEffectiveHerb() {
    return this.isEffective;
  }

  /**
   * 检查是否是名贵草药（如人参）
   * @returns {boolean} 是否是名贵草药
   */
  isSpecialHerb() {
    return this.isSpecial;
  }

  /**
   * 获取精气增加值（人参等特殊草药）
   * @returns {number} 精气增加值
   */
  getStaminaBoost() {
    if (this.isSpecial && this.specialEffect) {
      return this.specialEffect.staminaBoost || 0;
    }
    return 0;
  }

  /**
   * 获取特殊效果描述
   * @returns {string|null} 特殊效果描述
   */
  getSpecialEffectDescription() {
    if (this.isSpecial && this.specialEffect) {
      return this.specialEffect.description;
    }
    return null;
  }
}