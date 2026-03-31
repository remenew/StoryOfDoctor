/**
 * 玩家属性系统
 * 管理四大核心属性：声望值、道德值、健康值、精力值
 * 
 * 属性范围：
 * - 声望值：0-2000
 * - 道德值：-100~+100
 * - 健康值：0-100
 * - 精力值：0-20
 */

export class PlayerAttributes {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - 场景对象
   * @param {object} initialData - 初始属性数据
   */
  constructor(scene, initialData = {}) {
    this.scene = scene;
    
    // 四大核心属性
    this.reputation = initialData.reputation ?? 25;      // 声望值：0-2000
    this.morality = initialData.morality ?? 75;          // 道德值：-100~+100
    this.health = initialData.health ?? 55;              // 健康值：0-100
    this.energy = initialData.energy ?? 10;              // 精力值：0-20
    
    // 属性上限
    this.maxReputation = 2000;
    this.maxMorality = 100;
    this.minMorality = -100;
    this.maxHealth = 100;
    this.maxEnergy = 20;
    
    // 每日基础消耗
    this.dailyHealthCost = {
      healthy: 10,    // 健康状态：10文/日
      tired: 5,       // 疲惫状态：5文/日
      sick: 0         // 重病状态：无法恢复
    };
    
    // 状态标记
    this.isDead = false;
    this.isSick = false;
    this.penalties = [];  // 当前生效的惩罚
    
    // 历史记录
    this.history = {
      reputation: [],
      morality: [],
      health: [],
      energy: []
    };
    
    // UI引用
    this.ui = null;
  }

  // ==================== 属性获取方法 ====================

  /**
   * 获取声望等级
   * @returns {object} 等级信息
   */
  getReputationLevel() {
    if (this.reputation >= 1001) return { level: 5, name: '医道宗师', title: '国医泰斗' };
    if (this.reputation >= 601) return { level: 4, name: '神医圣手', title: '再世华佗' };
    if (this.reputation >= 301) return { level: 3, name: '一方名医', title: '神医传人' };
    if (this.reputation >= 101) return { level: 2, name: '小有名气', title: '一方良医' };
    return { level: 1, name: '无名小卒', title: '游方郎中' };
  }

  /**
   * 获取健康状态
   * @returns {object} 状态信息
   */
  getHealthStatus() {
    if (this.health >= 70) return { status: 'healthy', name: '健康', color: '#2d5a27' };
    if (this.health >= 30) return { status: 'tired', name: '疲惫', color: '#c49a2a' };
    if (this.health > 0) return { status: 'sick', name: '重病', color: '#c41e3a' };
    return { status: 'dead', name: '濒死', color: '#000000' };
  }

  /**
   * 获取道德立场
   * @returns {object} 立场信息
   */
  getMoralityStance() {
    if (this.morality >= 80) return { stance: 'saint', name: '圣人', description: '德高望重' };
    if (this.morality >= 50) return { stance: 'righteous', name: '正义', description: '行侠仗义' };
    if (this.morality >= 30) return { stance: 'good', name: '善良', description: '心地善良' };
    if (this.morality >= -20) return { stance: 'neutral', name: '中立', description: '明哲保身' };
    if (this.morality >= -50) return { stance: 'shady', name: ' shady', description: '不择手段' };
    return { stance: 'evil', name: '邪恶', description: '丧尽天良' };
  }

  /**
   * 获取每日健康维持费用
   * @returns {number} 费用（文）
   */
  getDailyHealthCost() {
    const status = this.getHealthStatus().status;
    return this.dailyHealthCost[status] ?? 0;
  }

  // ==================== 属性修改方法 ====================

  /**
   * 修改声望值
   * @param {number} amount - 变化量
   * @param {string} reason - 变化原因
   * @returns {object} 变化结果
   */
  modifyReputation(amount, reason = '') {
    const oldValue = this.reputation;
    this.reputation = Math.max(0, Math.min(this.maxReputation, this.reputation + amount));
    
    this.history.reputation.push({
      change: amount,
      reason,
      value: this.reputation,
      timestamp: Date.now()
    });

    // 触发事件
    this.scene.events.emit('player:reputationChanged', {
      oldValue,
      newValue: this.reputation,
      change: this.reputation - oldValue,
      reason
    });

    // 检查声望等级变化
    const oldLevel = this.getReputationLevelByValue(oldValue);
    const newLevel = this.getReputationLevelByValue(this.reputation);
    if (oldLevel !== newLevel) {
      this.scene.events.emit('player:reputationLevelUp', {
        level: newLevel,
        name: this.getReputationLevel().name
      });
    }

    return {
      oldValue,
      newValue: this.reputation,
      change: this.reputation - oldValue
    };
  }

  /**
   * 修改道德值
   * @param {number} amount - 变化量
   * @param {string} reason - 变化原因
   * @returns {object} 变化结果
   */
  modifyMorality(amount, reason = '') {
    const oldValue = this.morality;
    this.morality = Math.max(this.minMorality, Math.min(this.maxMorality, this.morality + amount));
    
    this.history.morality.push({
      change: amount,
      reason,
      value: this.morality,
      timestamp: Date.now()
    });

    // 触发事件
    this.scene.events.emit('player:moralityChanged', {
      oldValue,
      newValue: this.morality,
      change: this.morality - oldValue,
      reason
    });

    // 检查道德值过低惩罚
    this.checkMoralityPenalties();

    return {
      oldValue,
      newValue: this.morality,
      change: this.morality - oldValue
    };
  }

  /**
   * 修改健康值
   * @param {number} amount - 变化量
   * @param {string} reason - 变化原因
   * @returns {object} 变化结果
   */
  modifyHealth(amount, reason = '') {
    const oldValue = this.health;
    this.health = Math.max(0, Math.min(this.maxHealth, this.health + amount));
    
    this.history.health.push({
      change: amount,
      reason,
      value: this.health,
      timestamp: Date.now()
    });

    // 触发事件
    this.scene.events.emit('player:healthChanged', {
      oldValue,
      newValue: this.health,
      change: this.health - oldValue,
      reason
    });

    // 检查健康状态变化
    const oldStatus = this.getHealthStatusByValue(oldValue);
    const newStatus = this.getHealthStatusByValue(this.health);
    if (oldStatus !== newStatus) {
      this.scene.events.emit('player:healthStatusChanged', {
        oldStatus,
        newStatus,
        statusName: this.getHealthStatus().name
      });
    }

    // 检查健康值过低惩罚
    this.checkHealthPenalties();

    // 检查死亡
    if (this.health <= 0 && !this.isDead) {
      this.triggerDeath();
    }

    return {
      oldValue,
      newValue: this.health,
      change: this.health - oldValue
    };
  }

  /**
   * 修改精力值
   * @param {number} amount - 变化量
   * @param {string} reason - 变化原因
   * @returns {object} 变化结果
   */
  modifyEnergy(amount, reason = '') {
    const oldValue = this.energy;
    this.energy = Math.max(0, Math.min(this.maxEnergy, this.energy + amount));
    
    this.history.energy.push({
      change: amount,
      reason,
      value: this.energy,
      timestamp: Date.now()
    });

    // 触发事件
    this.scene.events.emit('player:energyChanged', {
      oldValue,
      newValue: this.energy,
      change: this.energy - oldValue,
      reason
    });

    return {
      oldValue,
      newValue: this.energy,
      change: this.energy - oldValue
    };
  }

  // ==================== 每日重置 ====================

  /**
   * 每日重置
   * 重置精力值，扣除健康维持费用
   * @param {number} money - 当前金钱
   * @returns {object} 重置结果
   */
  dailyReset(money) {
    const results = {
      energyRestored: false,
      healthCost: 0,
      healthCostPaid: false,
      healthDecline: 0
    };

    // 重置精力值
    const oldEnergy = this.energy;
    this.energy = this.maxEnergy;
    results.energyRestored = true;

    this.scene.events.emit('player:energyReset', {
      oldValue: oldEnergy,
      newValue: this.energy
    });

    // 计算健康维持费用
    const healthCost = this.getDailyHealthCost();
    results.healthCost = healthCost;

    if (healthCost > 0) {
      if (money >= healthCost) {
        // 支付费用，恢复健康
        results.healthCostPaid = true;
        if (this.health < this.maxHealth) {
          const healAmount = Math.min(10, this.maxHealth - this.health);
          this.modifyHealth(healAmount, '每日休息恢复');
        }
      } else {
        // 无法支付，健康下降
        results.healthCostPaid = false;
        const decline = 10;
        this.modifyHealth(-decline, '无法维持生活，健康恶化');
        results.healthDecline = decline;
      }
    }

    return results;
  }

  // ==================== 惩罚机制 ====================

  /**
   * 检查道德值过低惩罚
   */
  checkMoralityPenalties() {
    // 道德值<-50：触发正道追杀
    if (this.morality <= -50 && !this.penalties.includes('righteous_hunt')) {
      this.penalties.push('righteous_hunt');
      this.scene.events.emit('player:penaltyTriggered', {
        type: 'righteous_hunt',
        description: '正道人士开始追杀你！'
      });
    }

    // 道德值<-30：邪派NPC接触
    if (this.morality <= -30 && !this.penalties.includes('evil_contact')) {
      this.penalties.push('evil_contact');
      this.scene.events.emit('player:penaltyTriggered', {
        type: 'evil_contact',
        description: '邪派人士开始接触你'
      });
    }
  }

  /**
   * 检查健康值过低惩罚
   */
  checkHealthPenalties() {
    const status = this.getHealthStatus().status;

    // 健康值<30：触发疾病debuff
    if (status === 'sick' && !this.isSick) {
      this.isSick = true;
      this.penalties.push('sick_debuff');
      this.scene.events.emit('player:penaltyTriggered', {
        type: 'sick_debuff',
        description: '你生病了，治疗效果下降20%'
      });
    }

    // 健康值恢复后移除debuff
    if (status !== 'sick' && this.isSick) {
      this.isSick = false;
      this.penalties = this.penalties.filter(p => p !== 'sick_debuff');
      this.scene.events.emit('player:penaltyRemoved', {
        type: 'sick_debuff'
      });
    }
  }

  /**
   * 触发死亡
   */
  triggerDeath() {
    this.isDead = true;
    this.scene.events.emit('player:death', {
      reputation: this.reputation,
      morality: this.morality,
      cause: '健康值归零'
    });
  }

  // ==================== 辅助方法 ====================

  /**
   * 根据声望值获取等级
   * @param {number} value - 声望值
   * @returns {number} 等级
   */
  getReputationLevelByValue(value) {
    if (value >= 1001) return 5;
    if (value >= 601) return 4;
    if (value >= 301) return 3;
    if (value >= 101) return 2;
    return 1;
  }

  /**
   * 根据健康值获取状态
   * @param {number} value - 健康值
   * @returns {string} 状态
   */
  getHealthStatusByValue(value) {
    if (value >= 70) return 'healthy';
    if (value >= 30) return 'tired';
    if (value > 0) return 'sick';
    return 'dead';
  }

  /**
   * 获取所有属性数据
   * @returns {object} 属性数据
   */
  getData() {
    return {
      reputation: this.reputation,
      morality: this.morality,
      health: this.health,
      energy: this.energy,
      isDead: this.isDead,
      isSick: this.isSick,
      penalties: [...this.penalties],
      reputationLevel: this.getReputationLevel(),
      healthStatus: this.getHealthStatus(),
      moralityStance: this.getMoralityStance()
    };
  }

  /**
   * 从数据恢复
   * @param {object} data - 属性数据
   */
  loadData(data) {
    if (data.reputation !== undefined) this.reputation = data.reputation;
    if (data.morality !== undefined) this.morality = data.morality;
    if (data.health !== undefined) this.health = data.health;
    if (data.energy !== undefined) this.energy = data.energy;
    if (data.isDead !== undefined) this.isDead = data.isDead;
    if (data.isSick !== undefined) this.isSick = data.isSick;
    if (data.penalties) this.penalties = [...data.penalties];
  }

  /**
   * 绑定UI
   * @param {PlayerAttributesUI} ui - UI对象
   */
  bindUI(ui) {
    this.ui = ui;
  }

  /**
   * 更新UI显示
   */
  updateUI() {
    if (this.ui) {
      this.ui.updateDisplay();
    }
  }
}
