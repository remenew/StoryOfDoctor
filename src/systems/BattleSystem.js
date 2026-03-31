/**
 * 战斗系统
 * 负责回合流程管理、胜负判定
 * 
 * 状态机图：
 * ┌───────────────────────────────────────────────────────┐
 * │                                                       │
 * │  ┌─────────┐    ┌─────────┐    ┌─────────┐          │
 * │  │  IDLE   │───▶│  DRAW   │───▶│  PLAY   │          │
 * │  └─────────┘    └─────────┘    └────┬────┘          │
 * │                                      │               │
 * │                                      ▼               │
 * │  ┌─────────┐    ┌─────────┐    ┌─────────┐          │
 * │  │ VICTORY │◀───│  CHECK  │◀───│ DISEASE │          │
 * │  └─────────┘    │ /DEFEAT │    └─────────┘          │
 * │                 └─────────┘                          │
 * └───────────────────────────────────────────────────────┘
 * 
 * 回合流程：
 * 1. DRAW: 病人精气恢复 → 抽5张牌
 * 2. PLAY: 玩家出牌阶段（消耗病人精气）
 * 3. DISEASE: 病症攻击
 * 4. CHECK: 检查胜负 → 回合结束 → 循环或结束
 */

export const BattleState = {
  IDLE: 'idle',
  DRAW: 'draw',
  PLAY: 'play',
  DISEASE: 'disease',
  CHECK: 'check',
  VICTORY: 'victory',
  DEFEAT: 'defeat'
};

export class BattleSystem {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - 场景对象
   */
  constructor(scene) {
    this.scene = scene;
    this.state = BattleState.IDLE;
    this.turn = 0;
    
    // 精气系统已迁移至病人属性
    // 不再在这里管理真气，而是通过 patient.stamina 管理

    // 玩家数据
    this.playerName = '无名郎中';
    this.reputation = '初出茅庐';
    this.curedCount = 0;
  }

  /**
   * 开始新回合
   * @param {Patient} patient - 病人对象
   * @returns {object} 回合信息
   */
  startTurn(patient) {
    this.turn++;
    this.state = BattleState.DRAW;

    // 恢复病人精气（从病人属性系统）
    if (patient) {
      patient.onTurnStart();
    }

    // 发射事件
    this.scene.events.emit('battle:turnStart', {
      turn: this.turn,
      stamina: patient ? patient.stamina : 0,
      maxStamina: patient ? patient.maxStamina : 0
    });

    return {
      turn: this.turn,
      stamina: patient ? patient.stamina : 0,
      maxStamina: patient ? patient.maxStamina : 0
    };
  }

  /**
   * 进入出牌阶段
   */
  enterPlayPhase() {
    this.state = BattleState.PLAY;
    this.scene.events.emit('battle:playPhase', {});
  }

  /**
   * 尝试打出卡牌
   * @param {object} card - 卡牌数据
   * @param {Patient} patient - 病人对象
   * @returns {boolean} 是否成功打出
   */
  playCard(card, patient) {
    // 检查状态
    if (this.state !== BattleState.PLAY) {
      console.warn('Cannot play card: not in play phase');
      return false;
    }

    // 检查病人精气（从病人属性系统获取）
    if (!patient) {
      console.warn('Cannot play card: no patient');
      return false;
    }

    if (!patient.consumeStamina(card.qiCost || 1)) {
      console.warn('Cannot play card: not enough stamina');
      return false;
    }

    // 发射事件
    this.scene.events.emit('battle:cardPlayed', {
      card,
      stamina: patient.stamina,
      maxStamina: patient.maxStamina
    });

    return true;
  }

  /**
   * 结束出牌阶段
   */
  endPlayPhase() {
    this.state = BattleState.DISEASE;
    this.scene.events.emit('battle:endPlayPhase', {});
  }

  /**
   * 病症行动
   * @param {Disease} disease - 病症对象
   * @returns {object} 攻击信息
   */
  diseaseAction(disease) {
    const attack = disease.attack();
    this.scene.events.emit('battle:diseaseAttack', attack);
    return attack;
  }

  /**
   * 检查胜负
   * @param {Patient} patient - 病人对象
   * @returns {object} 胜负状态
   */
  checkBattleStatus(patient) {
    if (patient.health >= patient.targetHealth) {
      this.state = BattleState.VICTORY;
      this.curedCount++;
      
      // 治疗成功，增加好感度
      patient.modifyAffinity(20, '成功治愈');
      
      this.scene.events.emit('battle:victory', {
        turn: this.turn,
        patient: patient.getData()
      });
      return { isVictory: true, isDefeat: false };
    }

    if (patient.health <= 0) {
      this.state = BattleState.DEFEAT;
      
      // 治疗失败，降低好感度
      patient.modifyAffinity(-30, '治疗失败');
      
      this.scene.events.emit('battle:defeat', {
        turn: this.turn,
        patient: patient.getData()
      });
      return { isVictory: false, isDefeat: true };
    }

    // 继续下一回合，保持当前状态
    return { isVictory: false, isDefeat: false };
  }

  /**
   * 回合结束
   * @param {DeckSystem} deckSystem - 牌组系统
   * @param {ComboSystem} comboSystem - 组合技系统
   */
  endTurn(deckSystem, comboSystem) {
    // 弃掉所有手牌
    deckSystem.discardHand();

    // 重置组合技系统
    comboSystem.reset();

    this.scene.events.emit('battle:turnEnd', {
      turn: this.turn
    });
  }

  /**
   * 获取当前精气（从病人对象）
   * @param {Patient} patient - 病人对象
   * @returns {number} 当前精气值
   * @deprecated 建议直接使用 patient.stamina
   */
  getQi(patient) {
    return patient ? patient.stamina : 0;
  }

  /**
   * 获取最大精气（从病人对象）
   * @param {Patient} patient - 病人对象
   * @returns {number} 最大精气值
   * @deprecated 建议直接使用 patient.maxStamina
   */
  getMaxQi(patient) {
    return patient ? patient.maxStamina : 0;
  }

  /**
   * 检查卡牌是否可打出
   * @param {object} card - 卡牌数据
   * @param {Patient} patient - 病人对象
   * @returns {boolean} 是否可打出
   */
  canPlayCard(card, patient) {
    if (this.state !== BattleState.PLAY) return false;
    if (!patient) return false;
    return patient.stamina >= (card.qiCost || 1);
  }

  /**
   * 获取当前状态
   * @returns {string} 当前战斗状态
   */
  getState() {
    return this.state;
  }

  /**
   * 获取玩家信息
   * @param {Patient} patient - 病人对象（可选）
   * @returns {object} 玩家信息
   */
  getPlayerInfo(patient) {
    return {
      name: this.playerName,
      reputation: this.reputation,
      stamina: patient ? patient.stamina : 0,
      maxStamina: patient ? patient.maxStamina : 0,
      curedCount: this.curedCount,
      turn: this.turn
    };
  }

  /**
   * 获取战斗统计
   * @param {Patient} patient - 病人对象
   * @returns {object} 战斗统计
   */
  getBattleStats(patient) {
    return {
      turn: this.turn,
      patientHealth: patient ? patient.health : 0,
      patientMaxHealth: patient ? patient.maxHealth : 0,
      patientStamina: patient ? patient.stamina : 0,
      patientMaxStamina: patient ? patient.maxStamina : 0,
      patientAffinity: patient ? patient.affinity : 0,
      patientName: patient ? patient.name : ''
    };
  }
}
