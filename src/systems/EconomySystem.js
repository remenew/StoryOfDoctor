/**
 * 经济系统
 * 管理玩家金钱、收入、支出、价格计算
 * 
 * 核心机制：
 * - 每日生存成本：健康维持费用
 * - 收入来源：治疗收费(60%)、草药出售(20%)、任务奖励(15%)、其他(5%)
 * - 支出项目：健康维持(30%)、草药采购(40%)、装备购买(15%)、其他(15%)
 */

export class EconomySystem {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - 场景对象
   * @param {object} initialData - 初始经济数据
   */
  constructor(scene, initialData = {}) {
    this.scene = scene;
    
    // 金钱（单位：文）
    this.money = initialData.money ?? 100;
    
    // 每日健康维持费用（根据健康状态）
    this.dailyHealthCost = {
      healthy: 10,    // 健康状态：10文/日
      tired: 5,       // 疲惫状态：5文/日
      sick: 0         // 重病状态：无法通过金钱恢复
    };
    
    // 价格倍率（品质）
    this.qualityMultipliers = {
      low: 0.5,       // 下品
      middle: 1.0,    // 中品
      high: 1.2       // 上品
    };
    
    // 难度系数（治疗收费）
    this.difficultyMultipliers = {
      easy: 1.0,      // 简单
      normal: 1.2,    // 一般
      hard: 1.5,      // 困难
      elite: 2.0,     // 精英
      boss: 3.0       // Boss
    };
    
    // 治疗结果收益倍率
    this.resultMultipliers = {
      perfect: 1.2,   // 完美治愈
      complete: 1.0,  // 完全治愈
      basic: 0.8,     // 基本治愈
      partial: 0.5,   // 部分治愈
      failed: 0       // 治疗失败
    };
    
    // 历史记录
    this.history = {
      income: [],     // 收入记录
      expense: [],    // 支出记录
      daily: []       // 每日结算记录
    };
    
    // 统计
    this.stats = {
      totalIncome: 0,
      totalExpense: 0,
      maxMoney: this.money,
      treatmentsCompleted: 0,
      treatmentsFailed: 0
    };
  }

  // ==================== 金钱管理 ====================

  /**
   * 增加金钱
   * @param {number} amount - 金额（文）
   * @param {string} source - 收入来源
   * @param {string} description - 描述
   * @returns {object} 操作结果
   */
  addMoney(amount, source = '', description = '') {
    const oldMoney = this.money;
    this.money += amount;
    
    // 更新统计
    this.stats.totalIncome += amount;
    if (this.money > this.stats.maxMoney) {
      this.stats.maxMoney = this.money;
    }
    
    // 记录历史
    this.history.income.push({
      amount,
      source,
      description,
      balance: this.money,
      timestamp: Date.now()
    });

    // 触发事件
    this.scene.events.emit('economy:moneyAdded', {
      oldMoney,
      newMoney: this.money,
      change: amount,
      source,
      description
    });

    return {
      oldMoney,
      newMoney: this.money,
      change: amount
    };
  }

  /**
   * 扣除金钱
   * @param {number} amount - 金额（文）
   * @param {string} category - 支出类别
   * @param {string} description - 描述
   * @returns {object} 操作结果
   */
  spendMoney(amount, category = '', description = '') {
    const oldMoney = this.money;
    
    // 检查余额
    if (this.money < amount) {
      this.scene.events.emit('economy:insufficientFunds', {
        required: amount,
        available: this.money,
        category,
        description
      });
      return {
        success: false,
        oldMoney,
        newMoney: this.money,
        required: amount,
        shortfall: amount - this.money
      };
    }
    
    this.money -= amount;
    
    // 更新统计
    this.stats.totalExpense += amount;
    
    // 记录历史
    this.history.expense.push({
      amount,
      category,
      description,
      balance: this.money,
      timestamp: Date.now()
    });

    // 触发事件
    this.scene.events.emit('economy:moneySpent', {
      oldMoney,
      newMoney: this.money,
      change: -amount,
      category,
      description
    });

    return {
      success: true,
      oldMoney,
      newMoney: this.money,
      change: -amount
    };
  }

  /**
   * 检查是否有足够金钱
   * @param {number} amount - 需要金额
   * @returns {boolean} 是否足够
   */
  canAfford(amount) {
    return this.money >= amount;
  }

  // ==================== 价格计算 ====================

  /**
   * 计算草药价格
   * @param {number} basePrice - 基础价格
   * @param {string} quality - 品质（low/middle/high）
   * @param {number} marketFluctuation - 市场波动系数（0.8-1.2）
   * @returns {number} 最终价格
   */
  calculateHerbPrice(basePrice, quality = 'middle', marketFluctuation = 1.0) {
    const qualityMultiplier = this.qualityMultipliers[quality] ?? 1.0;
    return Math.floor(basePrice * qualityMultiplier * marketFluctuation);
  }

  /**
   * 计算成药价格
   * @param {Array} herbPrices - 组成草药价格数组
   * @returns {number} 成药价格
   */
  calculateMedicinePrice(herbPrices) {
    const totalHerbCost = herbPrices.reduce((sum, price) => sum + price, 0);
    return Math.floor(totalHerbCost * 2);
  }

  /**
   * 计算治疗收费
   * @param {number} mainDrugCost - 主要药物成本
   * @param {string} difficulty - 难度（easy/normal/hard/elite/boss）
   * @param {number} negotiationModifier - 议价调整（-0.2 ~ +0.2）
   * @returns {number} 治疗收费
   */
  calculateTreatmentFee(mainDrugCost, difficulty = 'normal', negotiationModifier = 0) {
    const difficultyMultiplier = this.difficultyMultipliers[difficulty] ?? 1.0;
    const negotiationMultiplier = 1 + negotiationModifier;
    return Math.floor(mainDrugCost * 3 * difficultyMultiplier * negotiationMultiplier);
  }

  /**
   * 计算实际治疗收益
   * @param {number} baseFee - 基础治疗费
   * @param {string} result - 治疗结果（perfect/complete/basic/partial/failed）
   * @param {object} options - 选项（是否救助贫民、是否医治黑道等）
   * @returns {object} 收益详情
   */
  calculateTreatmentIncome(baseFee, result = 'complete', options = {}) {
    const resultMultiplier = this.resultMultipliers[result] ?? 1.0;
    let finalFee = Math.floor(baseFee * resultMultiplier);
    
    const details = {
      baseFee,
      resultMultiplier,
      modifiers: [],
      finalFee
    };

    // 救助贫民（不收费）
    if (options.freeForPoor) {
      finalFee = 0;
      details.modifiers.push({ type: 'free_for_poor', value: -baseFee });
    }

    // 医治黑道（+50%收费）
    if (options.blackMarket) {
      const bonus = Math.floor(finalFee * 0.5);
      finalFee += bonus;
      details.modifiers.push({ type: 'black_market', value: bonus });
    }

    // 使用黑暗技能（+30%效果，但不影响收费）
    if (options.darkSkill) {
      details.modifiers.push({ type: 'dark_skill', value: 0, note: '治疗效果+30%' });
    }

    details.finalFee = finalFee;
    return details;
  }

  // ==================== 每日结算 ====================

  /**
   * 每日结算
   * @param {string} healthStatus - 健康状态（healthy/tired/sick）
   * @returns {object} 结算结果
   */
  dailySettlement(healthStatus = 'healthy') {
    const healthCost = this.dailyHealthCost[healthStatus] ?? 0;
    const result = {
      healthStatus,
      healthCost,
      paid: false,
      healthDecline: 0
    };

    if (healthCost > 0) {
      const spendResult = this.spendMoney(healthCost, 'health_maintenance', '每日健康维持');
      result.paid = spendResult.success;
      
      if (!spendResult.success) {
        // 无法支付，健康下降
        result.healthDecline = 10;
        this.scene.events.emit('economy:cannotAffordHealth', {
          required: healthCost,
          available: this.money,
          healthDecline: result.healthDecline
        });
      }
    }

    // 记录每日结算
    this.history.daily.push({
      healthStatus,
      healthCost,
      paid: result.paid,
      balance: this.money,
      timestamp: Date.now()
    });

    this.scene.events.emit('economy:dailySettlement', result);
    return result;
  }

  // ==================== 交易功能 ====================

  /**
   * 购买草药
   * @param {object} herb - 草药数据
   * @param {number} quantity - 数量
   * @returns {object} 交易结果
   */
  buyHerb(herb, quantity = 1) {
    const price = this.calculateHerbPrice(herb.price, herb.quality);
    const totalCost = price * quantity;
    
    const spendResult = this.spendMoney(totalCost, 'herb_purchase', `购买${herb.name}x${quantity}`);
    
    if (spendResult.success) {
      this.scene.events.emit('economy:herbPurchased', {
        herb,
        quantity,
        price,
        totalCost
      });
    }
    
    return {
      ...spendResult,
      herb,
      quantity,
      price,
      totalCost
    };
  }

  /**
   * 出售草药
   * @param {object} herb - 草药数据
   * @param {number} quantity - 数量
   * @returns {object} 交易结果
   */
  sellHerb(herb, quantity = 1) {
    // 出售价格为购买价格的70%
    const buyPrice = this.calculateHerbPrice(herb.price, herb.quality);
    const sellPrice = Math.floor(buyPrice * 0.7);
    const totalIncome = sellPrice * quantity;
    
    this.addMoney(totalIncome, 'herb_sale', `出售${herb.name}x${quantity}`);
    
    this.scene.events.emit('economy:herbSold', {
      herb,
      quantity,
      sellPrice,
      totalIncome
    });
    
    return {
      success: true,
      herb,
      quantity,
      sellPrice,
      totalIncome
    };
  }

  // ==================== 治疗结算 ====================

  /**
   * 治疗完成结算
   * @param {object} treatmentData - 治疗数据
   * @returns {object} 结算结果
   */
  completeTreatment(treatmentData) {
    const {
      baseFee,
      result,
      patientIdentity,
      isPoor,
      isBlackMarket,
      usedDarkSkill,
      turnCount
    } = treatmentData;

    // 计算收益
    const incomeDetails = this.calculateTreatmentIncome(baseFee, result, {
      freeForPoor: isPoor,
      blackMarket: isBlackMarket,
      darkSkill: usedDarkSkill
    });

    // 添加收入
    if (incomeDetails.finalFee > 0) {
      this.addMoney(incomeDetails.finalFee, 'treatment', `治疗${patientIdentity}`);
    }

    // 更新统计
    if (result === 'failed') {
      this.stats.treatmentsFailed++;
    } else {
      this.stats.treatmentsCompleted++;
    }

    // 触发事件
    this.scene.events.emit('economy:treatmentCompleted', {
      result,
      income: incomeDetails.finalFee,
      details: incomeDetails,
      patientIdentity,
      turnCount
    });

    return {
      result,
      income: incomeDetails.finalFee,
      details: incomeDetails
    };
  }

  // ==================== 数据获取 ====================

  /**
   * 获取经济数据
   * @returns {object} 经济数据
   */
  getData() {
    return {
      money: this.money,
      dailyHealthCost: { ...this.dailyHealthCost },
      stats: { ...this.stats },
      history: {
        income: [...this.history.income],
        expense: [...this.history.expense],
        daily: [...this.history.daily]
      }
    };
  }

  /**
   * 从数据恢复
   * @param {object} data - 经济数据
   */
  loadData(data) {
    if (data.money !== undefined) this.money = data.money;
    if (data.stats) this.stats = { ...this.stats, ...data.stats };
    if (data.history) {
      this.history = {
        income: data.history.income || [],
        expense: data.history.expense || [],
        daily: data.history.daily || []
      };
    }
  }

  /**
   * 获取财务摘要
   * @returns {object} 财务摘要
   */
  getFinancialSummary() {
    const todayIncome = this.history.income
      .filter(r => Date.now() - r.timestamp < 86400000)
      .reduce((sum, r) => sum + r.amount, 0);
    
    const todayExpense = this.history.expense
      .filter(r => Date.now() - r.timestamp < 86400000)
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      currentBalance: this.money,
      totalIncome: this.stats.totalIncome,
      totalExpense: this.stats.totalExpense,
      netProfit: this.stats.totalIncome - this.stats.totalExpense,
      todayIncome,
      todayExpense,
      todayNet: todayIncome - todayExpense,
      treatmentsCompleted: this.stats.treatmentsCompleted,
      treatmentsFailed: this.stats.treatmentsFailed,
      successRate: this.stats.treatmentsCompleted + this.stats.treatmentsFailed > 0
        ? (this.stats.treatmentsCompleted / (this.stats.treatmentsCompleted + this.stats.treatmentsFailed) * 100).toFixed(1)
        : 0
    };
  }
}
