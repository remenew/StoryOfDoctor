/**
 * 病人对象
 * 包含完整的病人属性系统：基础身份、精气系统、好感度、立场动机、功能关联、状态、隐藏属性
 */

export class Patient {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - 场景对象
   * @param {object} config - 病人配置
   */
  constructor(scene, config) {
    this.scene = scene;
    
    // 基础身份属性
    this.id = config.id || 'patient_unknown';
    this.name = config.name || '病人';
    this.identity = config.identity || '平民';
    this.faction = config.faction || '平民';
    this.factionDetail = config.factionDetail || '';
    this.description = config.description || '';
    
    // 健康值系统
    this.health = config.health || 100;
    this.targetHealth = config.targetHealth || 200;
    this.maxHealth = this.targetHealth;
    
    // 精气系统（原真气系统，现为病人属性）
    this.staminaConfig = config.stamina || { initial: 3, max: 3, regenPerTurn: 'full' };
    this.stamina = this.staminaConfig.initial;
    this.maxStamina = this.staminaConfig.max;
    
    // 好感度属性
    this.affinityConfig = config.affinity || { initial: 0, min: -100, max: 100 };
    this.affinity = this.affinityConfig.initial;
    this.affinityMin = this.affinityConfig.min;
    this.affinityMax = this.affinityConfig.max;
    this.affinityHistory = [];
    
    // 立场与动机属性
    this.stance = config.stance || { core: '中立', hiddenMotivation: '', flexibility: 0.5 };
    this.stanceRevealed = false;
    
    // 功能关联属性
    this.gameplay = config.gameplay || {
      relatedCards: [],
      relatedQuests: [],
      specialMechanics: [],
      value: 'none'
    };
    
    // 疾病属性
    this.disease = config.disease || null;  // 疾病ID，治疗成功后置空
    
    // 状态属性
    this.status = config.status || {
      healthState: this.disease ? 'diseased' : 'healthy',
      diseaseType: this.disease || '',
      diseaseSeverity: config.diseaseSeverity || 'moderate',
      treatmentHistory: [],
      dynamicEffects: []
    };
    
    // 隐藏属性
    this.secrets = config.secrets || null;
    this.secretsRevealed = false;
    
    // UI元素
    this.container = null;
    this.nameText = null;
    this.identityText = null;
    this.healthBar = null;
    this.healthText = null;
    this.staminaText = null;
    this.affinityText = null;
    this.statusText = null;
    
    this.create();
  }

  /**
   * 创建病人UI
   */
  create() {
    const { scene } = this;
    const centerX = 480;
    const centerY = 280;

    // 创建容器
    this.container = scene.add.container(centerX, centerY);

    // 病人背景
    const bgWidth = 240;
    const bgHeight = 200;
    const bg = scene.add.rectangle(0, 0, bgWidth, bgHeight, 0xf9fff9);
    bg.setStrokeStyle(2, 0x2d5a27);
    this.container.add(bg);

    // 病人名称
    this.nameText = scene.add.text(0, -80, this.name, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    this.nameText.setOrigin(0.5);
    this.container.add(this.nameText);

    // 身份标识
    this.identityText = scene.add.text(0, -55, `${this.identity} · ${this.faction}`, {
      fontSize: '12px',
      color: '#4a4a4a'
    });
    this.identityText.setOrigin(0.5);
    this.container.add(this.identityText);

    // 健康条背景
    const barWidth = 200;
    const barHeight = 20;
    const barX = -barWidth / 2;
    const barY = -30;

    const healthBarBg = scene.add.rectangle(barX, barY, barWidth, barHeight, 0xeeeeee);
    healthBarBg.setOrigin(0);
    healthBarBg.setStrokeStyle(1, 0x333333);
    this.container.add(healthBarBg);

    // 健康条填充
    this.healthBar = scene.add.rectangle(barX + 2, barY + 2, 0, barHeight - 4, 0x2d5a27);
    this.healthBar.setOrigin(0);
    this.container.add(this.healthBar);

    // 健康值文字
    this.healthText = scene.add.text(barX + barWidth / 2, barY + barHeight / 2,
      `${this.health}/${this.targetHealth}`, {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    this.healthText.setOrigin(0.5);
    this.container.add(this.healthText);

    // 精气显示
    this.staminaText = scene.add.text(0, 0, `精气: ${this.stamina}/${this.maxStamina}`, {
      fontSize: '14px',
      color: '#1a1a1a'
    });
    this.staminaText.setOrigin(0.5);
    this.container.add(this.staminaText);

    // 好感度显示
    const affinityLabel = this.getAffinityLabel();
    this.affinityText = scene.add.text(0, 25, `好感度: ${affinityLabel} (${this.affinity})`, {
      fontSize: '12px',
      color: this.getAffinityColor()
    });
    this.affinityText.setOrigin(0.5);
    this.container.add(this.affinityText);

    // 状态文字
    this.statusText = scene.add.text(0, 50, `状态: ${this.getStatusLabel()}`, {
      fontSize: '12px',
      color: '#4a4a4a'
    });
    this.statusText.setOrigin(0.5);
    this.container.add(this.statusText);

    // 描述文字（可选）
    if (this.description) {
      const descText = scene.add.text(0, 75, this.description, {
        fontSize: '10px',
        color: '#888888',
        wordWrap: { width: 220 }
      });
      descText.setOrigin(0.5);
      this.container.add(descText);
    }

    this.updateHealthBar();
  }

  /**
   * 获取好感度等级标签
   * @returns {string} 好感度等级
   */
  getAffinityLabel() {
    if (this.affinity >= 60) return '崇敬';
    if (this.affinity >= 20) return '友好';
    if (this.affinity >= -20) return '中立';
    if (this.affinity >= -60) return '不友好';
    return '敌视';
  }

  /**
   * 获取好感度颜色
   * @returns {string} 颜色代码
   */
  getAffinityColor() {
    if (this.affinity >= 60) return '#2d5a27';
    if (this.affinity >= 20) return '#4a9a4a';
    if (this.affinity >= -20) return '#4a4a4a';
    if (this.affinity >= -60) return '#c49a2a';
    return '#c41e3a';
  }

  /**
   * 获取状态标签
   * @returns {string} 状态描述
   */
  getStatusLabel() {
    const stateMap = {
      'healthy': '健康',
      'diseased': '患病',
      'critical': '重病'
    };
    return stateMap[this.status.healthState] || '未知';
  }

  /**
   * 更新健康值
   * @param {number} amount - 变化量（正数为治疗，负数为伤害）
   * @returns {object} 包含健康值变化信息和胜负状态
   */
  modifyHealth(amount) {
    const oldHealth = this.health;
    this.health = Math.max(0, Math.min(this.maxHealth, this.health + amount));

    this.updateHealthBar();

    // 判断胜负
    const isVictory = this.health >= this.targetHealth;
    const isDefeat = this.health <= 0;

    return {
      health: this.health,
      delta: this.health - oldHealth,
      isVictory,
      isDefeat
    };
  }

  /**
   * 更新健康条UI
   */
  updateHealthBar() {
    const barWidth = 200;
    const healthPercent = this.health / this.maxHealth;
    const fillWidth = Math.max(0, (barWidth - 4) * healthPercent);

    // 动画更新健康条
    this.scene.tweens.add({
      targets: this.healthBar,
      width: fillWidth,
      duration: 300,
      ease: 'easeOut'
    });

    // 更新文字
    this.healthText.setText(`${this.health}/${this.targetHealth}`);

    // 根据健康值改变颜色
    const ratio = this.health / this.maxHealth;
    let color = 0x2d5a27;
    if (ratio < 0.25) {
      color = 0xc41e3a;
    } else if (ratio < 0.50) {
      color = 0xff8844;
    }
    this.healthBar.setFillStyle(color);
  }

  /**
   * 消耗精气
   * @param {number} amount - 消耗量
   * @returns {boolean} 是否成功消耗
   */
  consumeStamina(amount) {
    if (this.stamina < amount) {
      return false;
    }
    this.stamina -= amount;
    this.updateStaminaDisplay();
    return true;
  }

  /**
   * 恢复精气
   * @param {number} amount - 恢复量，如果为'full'则恢复至最大值
   */
  restoreStamina(amount = 'full') {
    if (amount === 'full') {
      this.stamina = this.maxStamina;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    }
    this.updateStaminaDisplay();
  }

  /**
   * 更新精气显示
   */
  updateStaminaDisplay() {
    if (this.staminaText) {
      this.staminaText.setText(`精气: ${this.stamina}/${this.maxStamina}`);
    }
  }

  /**
   * 回合开始恢复精气
   */
  onTurnStart() {
    this.restoreStamina('full');
  }

  /**
   * 修改好感度
   * @param {number} amount - 变化量
   * @param {string} reason - 变化原因
   */
  modifyAffinity(amount, reason = '') {
    const oldAffinity = this.affinity;
    this.affinity = Math.max(this.affinityMin, 
      Math.min(this.affinityMax, this.affinity + amount));
    
    // 记录历史
    this.affinityHistory.push({
      change: amount,
      reason: reason,
      turn: this.scene.turnCount || 0
    });

    // 更新显示
    if (this.affinityText) {
      this.affinityText.setText(`好感度: ${this.getAffinityLabel()} (${this.affinity})`);
      this.affinityText.setColor(this.getAffinityColor());
    }

    return {
      old: oldAffinity,
      new: this.affinity,
      delta: this.affinity - oldAffinity
    };
  }

  /**
   * 揭示隐藏动机
   * @returns {boolean} 是否成功揭示
   */
  revealHiddenMotivation() {
    if (this.stanceRevealed) return false;
    
    // 检查揭示条件
    if (this.secrets && this.affinity >= this.getAffinityThreshold()) {
      this.stanceRevealed = true;
      this.secretsRevealed = true;
      return true;
    }
    return false;
  }

  /**
   * 获取好感度阈值（用于解锁隐藏内容）
   * @returns {number} 阈值
   */
  getAffinityThreshold() {
    if (!this.secrets) return 100;
    // 解析解锁条件中的好感度要求
    const condition = this.secrets.unlockCondition || '';
    const match = condition.match(/affinity\s*>=?\s*(\d+)/);
    return match ? parseInt(match[1]) : 40;
  }

  /**
   * 获取治疗效果加成（基于好感度）
   * @returns {number} 加成比例
   */
  getHealingBonus() {
    if (this.affinity >= 60) return 1.2;
    if (this.affinity >= 20) return 1.1;
    if (this.affinity >= -20) return 1.0;
    if (this.affinity >= -60) return 0.9;
    return 0.8;
  }

  /**
   * 获取精气上限（基于健康状态）
   * @returns {number} 实际精气上限
   */
  getEffectiveMaxStamina() {
    let penalty = 0;
    if (this.status.healthState === 'diseased') penalty = 1;
    if (this.status.healthState === 'critical') penalty = 2;
    return Math.max(1, this.maxStamina - penalty);
  }

  /**
   * 显示健康变化动画
   * @param {number} delta - 变化量
   */
  showHealthChange(delta) {
    const text = this.scene.add.text(0, 0,
      delta > 0 ? `+${delta}` : `${delta}`, {
      fontSize: '24px',
      fontStyle: 'bold',
      color: delta > 0 ? '#2d5a27' : '#c41e3a'
    });
    text.setOrigin(0.5);

    this.container.add(text);

    this.scene.tweens.add({
      targets: text,
      y: -50,
      alpha: 0,
      duration: 800,
      ease: 'easeOut',
      onComplete: () => text.destroy()
    });
  }

  /**
   * 显示精气变化动画
   * @param {number} delta - 变化量
   */
  showStaminaChange(delta) {
    const text = this.scene.add.text(30, 0,
      delta > 0 ? `+${delta}精气` : `${delta}精气`, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: delta > 0 ? '#4a6a8a' : '#c41e3a'
    });
    text.setOrigin(0.5);

    this.container.add(text);

    this.scene.tweens.add({
      targets: text,
      y: -30,
      alpha: 0,
      duration: 600,
      ease: 'easeOut',
      onComplete: () => text.destroy()
    });
  }

  /**
   * 获取病人数据（用于保存）
   * @returns {object} 病人数据
   */
  getData() {
    return {
      id: this.id,
      name: this.name,
      health: this.health,
      stamina: this.stamina,
      affinity: this.affinity,
      affinityHistory: this.affinityHistory,
      stanceRevealed: this.stanceRevealed,
      secretsRevealed: this.secretsRevealed,
      status: this.status
    };
  }

  /**
   * 从数据恢复病人状态
   * @param {object} data - 病人数据
   */
  loadData(data) {
    this.health = data.health || this.health;
    this.stamina = data.stamina || this.stamina;
    this.affinity = data.affinity || this.affinity;
    this.affinityHistory = data.affinityHistory || [];
    this.stanceRevealed = data.stanceRevealed || false;
    this.secretsRevealed = data.secretsRevealed || false;
    if (data.status) {
      this.status = { ...this.status, ...data.status };
    }
    
    this.updateHealthBar();
    this.updateStaminaDisplay();
    if (this.affinityText) {
      this.affinityText.setText(`好感度: ${this.getAffinityLabel()} (${this.affinity})`);
      this.affinityText.setColor(this.getAffinityColor());
    }
  }

  /**
   * 检查病人是否已治愈
   * @returns {boolean} 是否已治愈
   */
  isHealed() {
    return this.disease === null;
  }

  /**
   * 治疗病人（治疗成功后调用）
   * 将 disease 置空，更新状态为健康
   * @returns {boolean} 是否成功治疗
   */
  heal() {
    if (this.disease === null) {
      return false; // 已经治愈
    }
    
    // 记录治疗历史
    this.status.treatmentHistory.push({
      disease: this.disease,
      result: 'healed',
      timestamp: Date.now()
    });
    
    // 清空疾病
    this.disease = null;
    this.status.healthState = 'healthy';
    this.status.diseaseType = '';
    
    // 增加好感度
    this.modifyAffinity(10, '成功治愈疾病');
    
    return true;
  }

  /**
   * 设置病人疾病
   * @param {string} diseaseId - 疾病ID
   * @param {string} severity - 严重程度（mild/moderate/severe/critical）
   */
  setDisease(diseaseId, severity = 'moderate') {
    this.disease = diseaseId;
    this.status.healthState = 'diseased';
    this.status.diseaseType = diseaseId;
    this.status.diseaseSeverity = severity;
  }

  /**
   * 获取病人当前疾病ID
   * @returns {string|null} 疾病ID或null
   */
  getDisease() {
    return this.disease;
  }

  /**
   * 获取病人数据（用于保存）- 更新版本
   * @returns {object} 病人数据
   */
  getData() {
    return {
      id: this.id,
      name: this.name,
      health: this.health,
      stamina: this.stamina,
      affinity: this.affinity,
      affinityHistory: this.affinityHistory,
      stanceRevealed: this.stanceRevealed,
      secretsRevealed: this.secretsRevealed,
      status: this.status,
      disease: this.disease  // 新增：保存疾病信息
    };
  }

  /**
   * 从数据恢复病人状态 - 更新版本
   * @param {object} data - 病人数据
   */
  loadData(data) {
    this.health = data.health || this.health;
    this.stamina = data.stamina || this.stamina;
    this.affinity = data.affinity || this.affinity;
    this.affinityHistory = data.affinityHistory || [];
    this.stanceRevealed = data.stanceRevealed || false;
    this.secretsRevealed = data.secretsRevealed || false;
    this.disease = data.disease || null;  // 新增：恢复疾病信息
    if (data.status) {
      this.status = { ...this.status, ...data.status };
    }
    
    this.updateHealthBar();
    this.updateStaminaDisplay();
    if (this.affinityText) {
      this.affinityText.setText(`好感度: ${this.getAffinityLabel()} (${this.affinity})`);
      this.affinityText.setColor(this.getAffinityColor());
    }
  }

  /**
   * 销毁病人对象
   */
  destroy() {
    if (this.container) {
      this.container.destroy();
    }
  }
}
