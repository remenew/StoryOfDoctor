/**
 * 战斗场景
 * 主游戏场景，实现完整回合流程
 * 适配病人属性系统 - 精气从病人属性获取
 */

import { Card } from '../objects/Card.js';
import { Patient } from '../objects/Patient.js';
import { Disease } from '../objects/Disease.js';
import { DeckSystem } from '../systems/DeckSystem.js';
import { ComboSystem } from '../systems/ComboSystem.js';
import { BattleSystem, BattleState } from '../systems/BattleSystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { PlayerAttributes } from '../data/PlayerAttributes.js';
import { PlayerAttributesUI } from '../ui/PlayerAttributesUI.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { EconomyUI } from '../ui/EconomyUI.js';
import { SeededRandom, saveGame, clearSavedGame } from '../utils/helpers.js';
import patientsData from '../config/patients.json';
import skillsData from '../config/skills.json';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data) {
    // 统一契约：来自 MapScene
    // { locationId, patientId, diseaseId, runSeed, currentHp }
    
    if (data.locationId && data.patientId && data.diseaseId) {
      // 标准契约
      this.runSeed    = data.runSeed;
      this.locationId = data.locationId;
      this.patientId  = data.patientId;
      this.currentHp  = data.currentHp ?? 100;

      // 获取疾病数据
      const diseasesData = this.registry.get('diseasesData');
      const diseaseEntry = diseasesData?.diseases?.find(d => d.id === data.diseaseId);
      
      // 获取病人数据
      const patientEntry = this.getPatientData(data.patientId);
      
      this.levelData  = {
        diseaseId:     data.diseaseId,
        patientId:     data.patientId,
        patientName:   patientEntry?.name || '患者',
        patientHealth: diseaseEntry?.baseHealth   ?? 100,
        targetHealth:  diseaseEntry?.targetHealth ?? 200,
        startingDeck:  CHAPTER1_STARTER_DECK,
        patientConfig: patientEntry || this.getDefaultPatientConfig(),
      };
    } else {
      // 开发测试模式
      console.warn('[BattleScene] 使用开发测试模式');
      this.runSeed      = 'dev-stub';
      this.locationId   = 'dev_location';
      this.patientId    = 'patient_farmer_01';
      this.currentHp    = 100;
      
      const diseasesDataDev = this.registry.get('diseasesData');
      const diseaseEntryDev = diseasesDataDev?.diseases?.find(d => d.id === 'lung_0000');
      const defaultPatient = this.getDefaultPatientConfig();
      
      this.levelData = {
        diseaseId:     'lung_0000',
        patientId:     'patient_farmer_01',
        patientName:   defaultPatient.name,
        patientHealth: diseaseEntryDev?.baseHealth   ?? 100,
        targetHealth:  diseaseEntryDev?.targetHealth ?? 200,
        startingDeck:  CHAPTER1_STARTER_DECK,
        patientConfig: defaultPatient,
      };
    }

    this.battleSystem = null;
    this.deckSystem   = null;
    this.comboSystem  = null;
    this.skillSystem  = null;  // 新增：技能系统
    this.playerAttributes = null;  // 新增：玩家属性系统
    this.playerAttributesUI = null;  // 新增：玩家属性UI
    this.economy = null;  // 新增：经济系统
    this.economyUI = null;  // 新增：经济系统UI
    this.rng          = null;
    this.patient      = null;
    this.disease      = null;
    this.handCards    = [];
    this.staminaText  = null;
    this.turnText     = null;
    this.deckText     = null;
    this.endTurnBtn   = null;
    this.selectedCard = null;
    this.cardsData    = null;
    this.combosData   = null;
    this.turnCount    = 0;
    this.equippedSkills = data.selectedSkills || ['skill_acupuncture_01', 'skill_massage_01']; // 默认装备技能
  }

  /**
   * 获取病人数据
   * @param {string} patientId - 病人ID
   * @returns {object|null} 病人配置
   */
  getPatientData(patientId) {
    if (!patientId) return null;
    return patientsData.patients.find(p => p.id === patientId) || null;
  }

  /**
   * 获取默认病人配置（用于兼容旧数据）
   * @returns {object} 默认病人配置
   */
  getDefaultPatientConfig() {
    return {
      id: 'patient_default',
      name: '患者',
      identity: '平民',
      faction: '平民',
      factionDetail: '普通百姓',
      description: '一位普通的病人',
      stamina: { initial: 3, max: 3, regenPerTurn: 'full' },
      affinity: { initial: 0, min: -100, max: 100 },
      stance: { core: '中立', hiddenMotivation: '', flexibility: 0.5 },
      gameplay: { relatedCards: [], relatedQuests: [], specialMechanics: [], value: 'none' },
      status: { healthState: 'diseased', diseaseType: '', diseaseSeverity: 'moderate' },
      chapter1: true
    };
  }

  /**
   * 初始化玩家属性系统
   */
  initPlayerAttributes() {
    // 从存档或传入数据中获取初始属性
    const savedAttributes = this.registry.get('playerAttributes');
    const initialData = savedAttributes || {
      reputation: 25,
      morality: 75,
      health: 55,
      energy: 10
    };

    this.playerAttributes = new PlayerAttributes(this, initialData);
  }

  /**
   * 创建玩家属性UI
   */
  createPlayerAttributesUI() {
    this.playerAttributesUI = new PlayerAttributesUI(this, this.playerAttributes, {
      x: 860,
      y: 250,
      width: 200
    });
  }

  /**
   * 设置玩家属性系统事件监听
   */
  setupPlayerAttributesEventListeners() {
    // 声望值变化
    this.events.on('player:reputationChanged', (data) => {
      console.log(`声望变化: ${data.change > 0 ? '+' : ''}${data.change} (${data.reason})`);
      this.playerAttributesUI.updateDisplay();
      this.playerAttributesUI.showChangeAnimation('reputation', data.change, -15);
    });

    // 声望等级提升
    this.events.on('player:reputationLevelUp', (data) => {
      console.log(`声望等级提升: ${data.name}`);
      this.playerAttributesUI.showLevelUpNotification(data);
      this.showMessage(`声望提升！${data.name}`);
    });

    // 道德值变化
    this.events.on('player:moralityChanged', (data) => {
      console.log(`道德变化: ${data.change > 0 ? '+' : ''}${data.change} (${data.reason})`);
      this.playerAttributesUI.updateDisplay();
      this.playerAttributesUI.showChangeAnimation('morality', data.change, 5);
    });

    // 健康值变化
    this.events.on('player:healthChanged', (data) => {
      console.log(`健康变化: ${data.change > 0 ? '+' : ''}${data.change} (${data.reason})`);
      this.playerAttributesUI.updateDisplay();
      this.playerAttributesUI.showChangeAnimation('health', data.change, 25);
    });

    // 健康状态变化
    this.events.on('player:healthStatusChanged', (data) => {
      console.log(`健康状态变化: ${data.oldStatus} -> ${data.newStatus}`);
      this.showMessage(`健康状态: ${data.statusName}`);
    });

    // 精力值变化
    this.events.on('player:energyChanged', (data) => {
      console.log(`精力变化: ${data.change > 0 ? '+' : ''}${data.change} (${data.reason})`);
      this.playerAttributesUI.updateDisplay();
      this.playerAttributesUI.showChangeAnimation('energy', data.change, 45);
    });

    // 惩罚触发
    this.events.on('player:penaltyTriggered', (data) => {
      console.log(`惩罚触发: ${data.type} - ${data.description}`);
      this.playerAttributesUI.showPenaltyNotification(data.type, data.description);
      this.showMessage(data.description);
    });

    // 惩罚移除
    this.events.on('player:penaltyRemoved', (data) => {
      console.log(`惩罚移除: ${data.type}`);
    });

    // 玩家死亡
    this.events.on('player:death', (data) => {
      console.log('玩家死亡', data);
      this.showMessage('你因健康恶化而倒下...');
      // 可以在这里触发游戏结束逻辑
    });
  }

  /**
   * 初始化经济系统
   */
  initEconomy() {
    // 从存档或注册表获取经济数据
    const savedEconomy = this.registry.get('economyData');
    const initialData = savedEconomy || {
      money: 100  // 初始金钱100文
    };

    this.economy = new EconomySystem(this, initialData);
  }

  /**
   * 创建经济系统UI
   */
  createEconomyUI() {
    this.economyUI = new EconomyUI(this, this.economy, {
      x: 860,
      y: 400,
      width: 200
    });
  }

  /**
   * 设置经济系统事件监听
   */
  setupEconomyEventListeners() {
    // 金钱增加
    this.events.on('economy:moneyAdded', (data) => {
      console.log(`金钱增加: +${data.change} 文 (${data.source})`);
      this.economyUI.updateDisplay();
      this.economyUI.showMoneyChange(data.change);
    });

    // 金钱消耗
    this.events.on('economy:moneySpent', (data) => {
      console.log(`金钱消耗: ${data.change} 文 (${data.category})`);
      this.economyUI.updateDisplay();
      this.economyUI.showMoneyChange(data.change);
    });

    // 余额不足
    this.events.on('economy:insufficientFunds', (data) => {
      console.log(`余额不足: 需要 ${data.required} 文，仅有 ${data.available} 文`);
      this.economyUI.showInsufficientFunds(data.required, data.available);
      this.showMessage('余额不足！');
    });

    // 治疗收入
    this.events.on('economy:treatmentCompleted', (data) => {
      console.log(`治疗完成: 收入 ${data.income} 文`);
      this.economyUI.showTreatmentIncome(data);
    });

    // 每日结算
    this.events.on('economy:dailySettlement', (data) => {
      console.log(`每日结算: ${data.paid ? '支付' : '无法支付'} ${data.healthCost} 文`);
      this.economyUI.showDailySettlement(data);
    });

    // 无法支付健康费用
    this.events.on('economy:cannotAffordHealth', (data) => {
      console.log(`无法维持生活: 健康下降 ${data.healthDecline}`);
      this.showMessage('无法维持生活，健康恶化！');
      // 触发健康下降
      if (this.playerAttributes) {
        this.playerAttributes.modifyHealth(-data.healthDecline, '无法维持生活');
      }
    });
  }

  create() {
    // 获取游戏数据
    this.cardsData  = this.registry.get('cardsData');
    this.combosData = this.registry.get('combosData');

    // 初始化RNG — use runSeed (not Date.now) for reproducibility
    this.rng = new SeededRandom(this._hashSeed(this.runSeed));

    // 初始化系统
    this.battleSystem = new BattleSystem(this);
    this.deckSystem = new DeckSystem(this.levelData, this.rng);
    
    // 根据疾病ID构建战斗卡组（如果有疾病ID）
    if (this.levelData.diseaseId) {
      this.deckSystem.buildBattleDeckFromDisease(this.levelData.diseaseId, {
        totalCards: 10,
        randomAttackMin: -10,
        randomAttackMax: 10
      });
    }
    
    this.comboSystem = new ComboSystem(this.combosData, this.cardsData);
    this.skillSystem = new SkillSystem(this, { maxSlots: 2 });
    this.skillSystem.init(this.equippedSkills, skillsData);

    // 初始化玩家属性系统
    this.initPlayerAttributes();

    // 初始化经济系统
    this.initEconomy();

    // 创建UI
    this.createBackground();
    this.createPatient();
    this.createDisease();
    this.createPlayerInfo();
    this.createDeckInfo();
    this.createEndTurnButton();
    this.createPlayerAttributesUI();
    this.createEconomyUI();

    // 事件监听
    this.events.on('battle:victory', (data) => this.onVictory(data));
    this.events.on('battle:defeat', (data) => this.onDefeat(data));

    // 技能系统事件监听
    this.setupSkillEventListeners();

    // 玩家属性系统事件监听
    this.setupPlayerAttributesEventListeners();

    // 经济系统事件监听
    this.setupEconomyEventListeners();

    // 键盘控制
    this.setupKeyboardControls();

    // 开始第一回合
    this.time.delayedCall(500, () => {
      this.startNewTurn();
    });
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.add.rectangle(width / 2, height / 2, width, height, 0xf5f1e8);
  }

  createPatient() {
    // 使用新的病人属性系统创建病人
    const patientConfig = {
      ...this.levelData.patientConfig,
      health: this.levelData.patientHealth,
      targetHealth: this.levelData.targetHealth
    };
    
    this.patient = new Patient(this, patientConfig);
  }

  createDisease() {
    const diseasesData = this.registry.get('diseasesData');
    const diseaseData = diseasesData.diseases.find(d => d.id === this.levelData.diseaseId);
    this.disease = new Disease(this, diseaseData, this.rng);
  }

  createPlayerInfo() {
    const container = this.add.container(100, 100);

    const title = this.add.text(0, 0, '神医信息', {
      fontSize: '14px',
      color: '#666666'
    });
    container.add(title);

    // 显示病人精气（从病人属性系统获取）
    this.staminaText = this.add.text(0, 30, '精气: -/-', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    container.add(this.staminaText);

    this.turnText = this.add.text(0, 60, '回合: 1', {
      fontSize: '14px',
      color: '#4a4a4a'
    });
    container.add(this.turnText);
  }

  createDeckInfo() {
    const container = this.add.container(860, 100);

    const title = this.add.text(0, 0, '牌库', {
      fontSize: '14px',
      color: '#666666'
    });
    container.add(title);

    const status = this.deckSystem.getStatus();
    this.deckText = this.add.text(0, 30, `抽牌堆: ${status.drawPile}`, {
      fontSize: '14px',
      color: '#4a4a4a'
    });
    container.add(this.deckText);

    this.discardText = this.add.text(0, 55, `弃牌堆: ${status.discardPile}`, {
      fontSize: '14px',
      color: '#4a4a4a'
    });
    container.add(this.discardText);
  }

  createEndTurnButton() {
    this.endTurnBtn = this.add.container(480, 580);

    const bg = this.add.rectangle(0, 0, 120, 40, 0xffffff);
    bg.setStrokeStyle(2, 0x1a1a1a);
    this.endTurnBtn.add(bg);

    const label = this.add.text(0, 0, '结束回合', {
      fontSize: '16px',
      color: '#1a1a1a'
    });
    label.setOrigin(0.5);
    this.endTurnBtn.add(label);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => bg.setFillStyle(0xf0f0f0));
    bg.on('pointerout', () => bg.setFillStyle(0xffffff));
    bg.on('pointerdown', () => this.onEndTurnClick());

    this.endTurnBtn.setDepth(10);
  }

  setupKeyboardControls() {
    // 数字键选中卡牌
    const keyMap = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
    for (let i = 0; i < 5; i++) {
      this.input.keyboard.on(`keydown-${keyMap[i]}`, () => {
        if (this.handCards[i]) {
          if (this.selectedCard === this.handCards[i]) {
            this.playSelectedCard();
          } else {
            this.selectCard(this.handCards[i]);
          }
        }
      });
    }

    // 快捷键使用技能槽
    this.input.keyboard.on('keydown-Q', () => this.useSkillSlot(0));
    this.input.keyboard.on('keydown-W', () => this.useSkillSlot(1));
    
    // 展开/收起技能面板
    this.input.keyboard.on('keydown-S', () => {
      if (this.skillSystem) {
        this.skillSystem.togglePanel();
      }
    });

    this.input.keyboard.on('keydown-ENTER', () => this.playSelectedCard());
    this.input.keyboard.on('keydown-E', () => this.onEndTurnClick());
    this.input.keyboard.on('keydown-ESC', () => {
      this.deselectCard();
      // 同时关闭技能面板
      if (this.skillSystem) {
        this.skillSystem.closePanel();
      }
    });
  }

  /**
   * 使用指定技能槽
   * @param {number} slotIndex - 技能槽索引
   */
  useSkillSlot(slotIndex) {
    if (!this.skillSystem) return;

    const slot = this.skillSystem.skillSlots[slotIndex];
    if (slot && slot.canUse()) {
      const result = slot.useSkill();
      if (result) {
        this.applySkillEffect(result);
        this.showSkillUsedFeedback(result.skill);
      }
    }
  }

  /**
   * 设置技能系统事件监听
   */
  setupSkillEventListeners() {
    // 精气提升
    this.events.on('skill:staminaBoost', (data) => {
      if (this.patient) {
        this.patient.maxStamina += data.value;
        this.patient.stamina += data.value;
        this.patient.updateStaminaDisplay();
        this.showMessage(`精气上限+${data.value}！`);
      }
    });

    // 抽牌
    this.events.on('skill:draw', (data) => {
      this.drawAdditionalCards(data.count);
    });

    // 治疗加成
    this.events.on('skill:healBoost', (data) => {
      this.showMessage('下一张治疗效果×2！');
    });

    // 护盾
    this.events.on('skill:shield', (data) => {
      if (data.active) {
        this.showMessage('本回合免疫攻击！');
      }
    });

    // 持续治疗
    this.events.on('skill:healOverTime', (data) => {
      this.showMessage(`接下来${data.turns}回合每回合恢复${data.value}点！`);
    });

    this.events.on('skill:healOverTimeTick', (data) => {
      if (this.patient) {
        const result = this.patient.modifyHealth(data.value);
        this.patient.showHealthChange(data.value);
      }
    });

    // 伤害减免
    this.events.on('skill:damageReduction', (data) => {
      this.showMessage('下一次伤害减半！');
    });

    // 复活准备
    this.events.on('skill:reviveReady', () => {
      this.showMessage('复活技能已准备！');
    });

    // 复活触发
    this.events.on('skill:reviveTriggered', () => {
      if (this.patient) {
        this.patient.health = 1;
        this.patient.updateHealthBar();
        this.showMessage('叫魂成功！死而复生！');
        this.cameras.main.flash(500, 0x2d5a27);
      }
    });

    // 组合技加成
    this.events.on('skill:comboBoost', (data) => {
      this.showMessage('本回合组合技效果×2！');
    });
  }

  /**
   * 应用技能效果
   * @param {object} result - 技能使用结果
   */
  applySkillEffect(result) {
    // 效果已通过事件系统处理，这里可以添加额外的视觉反馈
    this.updateStaminaDisplay();
  }

  /**
   * 显示技能使用反馈
   * @param {object} skill - 技能数据
   */
  showSkillUsedFeedback(skill) {
    const text = this.add.text(888, 180, `${skill.name}！`, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#2d5a27'
    });
    text.setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: 130,
      alpha: 0,
      duration: 1000,
      ease: 'easeOut',
      onComplete: () => text.destroy()
    });
  }

  /**
   * 抽取额外卡牌
   * @param {number} count - 抽取数量
   */
  drawAdditionalCards(count) {
    const cardIds = this.deckSystem.drawCards(count);

    const startX = 200 + this.handCards.length * 130;
    const cardWidth = 130;
    const y = 520;

    for (let i = 0; i < cardIds.length; i++) {
      const cardData = this.cardsData.cards.find(c => c.id === cardIds[i]);
      if (cardData) {
        // 获取卡牌的额外数据（攻击力、角色等）
        const extraData = this.deckSystem.getCardExtraData(cardIds[i]) || {};
        
        // 合并卡牌数据和额外数据
        const fullCardData = {
          ...cardData,
          attack: extraData.attack || 0,
          role: extraData.role || null,
          isEffective: extraData.isEffective || false,
          isSpecial: extraData.isSpecial || false,
          specialEffect: extraData.specialEffect || null
        };
        
        const card = new Card(this, fullCardData, this.handCards.length + i);
        card.setPosition(startX + i * cardWidth, y);
        this.handCards.push(card);
      }
    }

    this.updateCardPlayability();
    this.showMessage(`抽了${cardIds.length}张牌！`);
  }

  startNewTurn() {
    this.turnCount++;
    const turnData = this.battleSystem.startTurn(this.patient);
    this.turnText.setText(`回合: ${turnData.turn}`);
    this.updateStaminaDisplay();
    this.time.delayedCall(300, () => this.drawCards());
  }

  drawCards() {
    const cardIds = this.deckSystem.drawCards(5);

    for (const card of this.handCards) {
      card.destroy();
    }
    this.handCards = [];

    const startX = 200;
    const cardWidth = 130;
    const y = 520;

    for (let i = 0; i < cardIds.length; i++) {
      const cardData = this.cardsData.cards.find(c => c.id === cardIds[i]);
      if (cardData) {
        // 获取卡牌的额外数据（攻击力、角色等）
        const extraData = this.deckSystem.getCardExtraData(cardIds[i]) || {};
        
        // 合并卡牌数据和额外数据
        const fullCardData = {
          ...cardData,
          attack: extraData.attack || 0,
          role: extraData.role || null,
          isEffective: extraData.isEffective || false,
          isSpecial: extraData.isSpecial || false,
          specialEffect: extraData.specialEffect || null
        };
        
        const card = new Card(this, fullCardData, i);
        card.setPosition(startX + i * cardWidth, y);
        this.handCards.push(card);
      }
    }

    this.battleSystem.enterPlayPhase();
    this.updateCardPlayability();
  }

  onCardClick(card) {
    if (this.battleSystem.getState() !== BattleState.PLAY) return;

    // 如果点击的是已选中的卡牌，打出它
    if (this.selectedCard === card) {
      this.playSelectedCard();
      return;
    }

    // 否则选中/切换选中
    if (this.selectedCard) {
      this.selectedCard.deselect();
    }

    this.selectCard(card);
  }

  selectCard(card) {
    card.select();
    this.selectedCard = card;
  }

  deselectCard() {
    if (this.selectedCard) {
      this.selectedCard.deselect();
      this.selectedCard = null;
    }
  }

  playSelectedCard() {
    if (!this.selectedCard) return;

    const card = this.selectedCard;
    const cardData = card.data;

    // 检查病人精气是否足够（从病人属性系统获取）
    if (!this.battleSystem.canPlayCard(cardData, this.patient)) {
      this.showMessage('病人精气不足！');
      this.deselectCard();
      return;
    }

    // 打出卡牌（消耗病人精气）
    this.battleSystem.playCard(cardData, this.patient);

    // 记录到组合技系统
    this.comboSystem.recordPlay(cardData.id);

    // 从手牌移除
    const index = this.handCards.indexOf(card);
    if (index > -1) {
      this.handCards.splice(index, 1);
    }

    // 打出动画
    this.tweens.add({
      targets: card.container,
      y: 280,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        card.destroy();
        this.rearrangeHand();
      }
    });

    // 应用卡牌效果
    this.applyCardEffect(card);

    // 更新UI
    this.updateStaminaDisplay();
    this.updateDeckDisplay();
    this.updateCardPlayability();

    this.selectedCard = null;
  }

  applyCardEffect(card) {
    const cardData = card.data;
    let totalHeal = 0;

    // 计算治疗效果
    // 有效药物：基础治疗值 + 攻击力（治疗加成）
    // 非有效药物：只有攻击力（作为治疗值，可能为负）
    if (card.isEffective) {
      // 有效药物：计算基础治疗值
      for (const effect of cardData.effects) {
        if (effect.type === 'heal') {
          totalHeal += effect.value;
        }
      }
      // 加上攻击力（治疗加成）
      totalHeal += (card.attack || 0);
    } else {
      // 非有效药物：攻击力就是治疗值（可能为负）
      totalHeal = card.attack || 0;
    }

    // 应用好感度治疗效果加成
    const healingBonus = this.patient.getHealingBonus();
    totalHeal = Math.floor(totalHeal * healingBonus);

    // 应用技能治疗加成
    if (this.skillSystem) {
      const skillHealMultiplier = this.skillSystem.getHealMultiplier();
      totalHeal = Math.floor(totalHeal * skillHealMultiplier);
      // 消耗治疗加成效果
      this.skillSystem.consumeHealBoost();
    }

    const combos = this.comboSystem.checkCombos();
    for (const combo of combos) {
      let comboHeal = this.comboSystem.applyComboEffect(combo, totalHeal);
      // 应用技能组合技加成
      if (this.skillSystem) {
        const comboMultiplier = this.skillSystem.getComboMultiplier();
        comboHeal = Math.floor(comboHeal * comboMultiplier);
      }
      totalHeal = comboHeal;
      this.showComboNotification(combo);
    }

    if (totalHeal > 0) {
      const result = this.patient.modifyHealth(totalHeal);
      this.patient.showHealthChange(result.delta);

      // 治疗成功增加少量好感度
      this.patient.modifyAffinity(2, '有效治疗');

      if (result.isVictory || result.isDefeat) {
        this.battleSystem.checkBattleStatus(this.patient);
      }
    }
  }

  /**
   * 获取品质加成系数
   * @param {string} rarity - 品质等级
   * @returns {number} 加成系数
   */
  getQualityBonus(rarity) {
    const bonuses = {
      common: 0,        // 常用药：无加成
      uncommon: 0.1,    // 较常用：+10%
      rare: 0.2,        // 名贵药：+20%
      legendary: 0.3    // 稀世珍品：+30%
    };
    return bonuses[rarity] || 0;
  }

  checkCombos() {
    const combos = this.comboSystem.checkCombos();
    for (const combo of combos) {
      this.showComboNotification(combo);
    }
  }

  showComboNotification(combo) {
    const notification = this.add.text(480, 200, `组合技：${combo.name}`, {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#c41e3a'
    });
    notification.setOrigin(0.5);

    this.tweens.add({
      targets: notification,
      y: 150,
      alpha: 0,
      duration: 1500,
      ease: 'easeOut',
      onComplete: () => notification.destroy()
    });
  }

  rearrangeHand() {
    const startX = 200;
    const cardWidth = 130;

    for (let i = 0; i < this.handCards.length; i++) {
      this.tweens.add({
        targets: this.handCards[i].container,
        x: startX + i * cardWidth,
        duration: 200
      });
    }
  }

  /**
   * 更新精气显示（从病人属性系统获取）
   */
  updateStaminaDisplay() {
    if (this.patient && this.staminaText) {
      this.staminaText.setText(`精气: ${this.patient.stamina}/${this.patient.maxStamina}`);
    }
  }

  updateDeckDisplay() {
    const status = this.deckSystem.getStatus();
    this.deckText.setText(`抽牌堆: ${status.drawPile}`);
    this.discardText.setText(`弃牌堆: ${status.discardPile}`);
  }

  /**
   * 更新卡牌可打出状态（基于病人精气）
   */
  updateCardPlayability() {
    if (!this.patient) return;
    
    for (const card of this.handCards) {
      card.setPlayable(card.data.qiCost <= this.patient.stamina);
    }
  }

  onEndTurnClick() {
    console.log('onEndTurnClick, state:', this.battleSystem.getState());
    if (this.battleSystem.getState() !== BattleState.PLAY) return;

    this.deselectCard();
    this.battleSystem.endPlayPhase();
    this.executeDiseaseTurn();
  }

  async executeDiseaseTurn() {
    const attack = this.battleSystem.diseaseAction(this.disease);

    await this.delay(500);

    // 大招特效
    if (attack.isUltimate && attack.damage > 0) {
      this.cameras.main.shake(400, 0.025);
      const ultText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 40,
        `⚠ ${attack.name || '大招爆发'}！`,
        { fontSize: '26px', color: '#ff0000', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3 }
      ).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: ultText, alpha: 0, y: ultText.y - 40, duration: 1000,
        onComplete: () => ultText.destroy() });
      await this.delay(400);
    }

    if (attack.damage > 0) {
      let actualDamage = attack.damage;

      // 检查护盾效果
      if (this.skillSystem && this.skillSystem.hasShield()) {
        this.showMessage('符咒·镇煞：免疫攻击！');
        actualDamage = 0;
      }

      // 应用伤害减免
      if (this.skillSystem && actualDamage > 0) {
        const reduction = this.skillSystem.getDamageReduction();
        if (reduction < 1) {
          actualDamage = Math.floor(actualDamage * reduction);
          this.showMessage(`伤害减免：-${Math.floor(attack.damage * (1 - reduction))}！`);
        }
      }

      if (actualDamage > 0) {
        const result = this.patient.modifyHealth(-actualDamage);
        this.patient.showHealthChange(-actualDamage);

        const status = this.battleSystem.checkBattleStatus(this.patient);
        if (status.isVictory || status.isDefeat) {
          // 检查复活效果
          if (status.isDefeat && this.skillSystem && this.skillSystem.hasRevive()) {
            if (this.skillSystem.triggerRevive()) {
              return; // 复活后中断当前流程
            }
          }
          return;
        }
      }
    }

    // 技能系统回合结束（更新冷却和效果）
    if (this.skillSystem) {
      this.skillSystem.onTurnEnd();
    }

    this.battleSystem.endTurn(this.deckSystem, this.comboSystem);
    this.saveGameState();

    await this.delay(500);
    this.startNewTurn();
  }

  saveGameState() {
    saveGame({
      levelId: this.levelData.id,
      patient: this.patient ? this.patient.getData() : { health: this.levelData.patientHealth },
      turn: this.battleSystem.turn,
      skills: this.skillSystem ? this.skillSystem.getData() : []
    });
  }

  onVictory(data) {
    const remainingHp = this.patient ? this.patient.health : this.levelData.patientHealth;
    const patientData = this.patient ? this.patient.getData() : null;
    
    // 更新玩家属性 - 胜利奖励
    this.updatePlayerAttributesOnVictory({ ...data, remainingHp }, patientData);
    
    this.showResultScreen(true, data.turn, remainingHp, patientData);
  }

  onDefeat(data) {
    const patientData = this.patient ? this.patient.getData() : null;
    
    // 更新玩家属性 - 失败惩罚
    this.updatePlayerAttributesOnDefeat(data, patientData);
    
    this.showResultScreen(false, data.turn, 0, patientData);
  }

  /**
   * 战斗胜利时更新玩家属性和经济
   * @param {object} data - 战斗数据
   * @param {object} patientData - 病人数据
   */
  updatePlayerAttributesOnVictory(data, patientData) {
    if (!this.playerAttributes) return;

    // 基础声望奖励
    const baseReputationReward = 10;
    // 根据回合数计算额外奖励（越少回合奖励越多）
    const turnBonus = Math.max(0, 10 - data.turn);
    // 总声望奖励
    const totalReputationReward = baseReputationReward + turnBonus;
    
    // 增加声望
    this.playerAttributes.modifyReputation(totalReputationReward, '成功治愈病人');
    
    // 根据病人身份调整道德值
    if (patientData) {
      // 治疗平民增加道德
      if (patientData.identity === '平民') {
        this.playerAttributes.modifyMorality(5, '救治平民');
      }
      // 治疗贵族增加更多声望但减少道德（阶级差异）
      else if (patientData.identity === '贵族') {
        this.playerAttributes.modifyReputation(5, '救治贵族额外奖励');
        this.playerAttributes.modifyMorality(-2, '阶级差异');
      }
    }
    
    // 消耗精力（每次治疗消耗1点）
    this.playerAttributes.modifyEnergy(-1, '治疗病人');
    
    // 保存属性到注册表
    this.registry.set('playerAttributes', this.playerAttributes.getData());

    // 经济结算 - 治疗收入
    if (this.economy) {
      // 计算基础治疗费（根据难度和回合数）
      const difficulty = this.levelData.difficulty || 'normal';
      const mainDrugCost = 20; // 基础药物成本
      const baseFee = this.economy.calculateTreatmentFee(mainDrugCost, difficulty);
      
      // 根据剩余HP判断治疗结果
      const remainingHpPercent = data.remainingHp / 200; // 目标200HP
      let result = 'complete';
      if (remainingHpPercent >= 1.2) result = 'perfect';
      else if (remainingHpPercent >= 1.0) result = 'complete';
      else if (remainingHpPercent >= 0.9) result = 'basic';
      else result = 'partial';

      // 完成治疗结算
      this.economy.completeTreatment({
        baseFee,
        result,
        patientIdentity: patientData?.identity || '平民',
        isPoor: false,
        isBlackMarket: false,
        usedDarkSkill: false,
        turnCount: data.turn
      });

      // 保存经济数据到注册表
      this.registry.set('economyData', this.economy.getData());
    }
  }

  /**
   * 战斗失败时更新玩家属性和经济
   * @param {object} data - 战斗数据
   * @param {object} patientData - 病人数据
   */
  updatePlayerAttributesOnDefeat(data, patientData) {
    if (!this.playerAttributes) return;

    // 失败减少声望
    this.playerAttributes.modifyReputation(-5, '治疗失败');
    
    // 减少道德（医者仁心，失败自责）
    this.playerAttributes.modifyMorality(-3, '治疗失败');
    
    // 消耗精力
    this.playerAttributes.modifyEnergy(-1, '治疗病人');
    
    // 健康值下降（劳累过度）
    this.playerAttributes.modifyHealth(-5, '治疗失败，身心俱疲');
    
    // 保存属性到注册表
    this.registry.set('playerAttributes', this.playerAttributes.getData());

    // 经济结算 - 治疗失败无收入，可能需要赔偿
    if (this.economy) {
      const difficulty = this.levelData.difficulty || 'normal';
      const mainDrugCost = 20;
      const baseFee = this.economy.calculateTreatmentFee(mainDrugCost, difficulty);
      
      // 治疗失败
      this.economy.completeTreatment({
        baseFee,
        result: 'failed',
        patientIdentity: patientData?.identity || '平民',
        isPoor: false,
        isBlackMarket: false,
        usedDarkSkill: false,
        turnCount: data.turn
      });

      // 保存经济数据
      this.registry.set('economyData', this.economy.getData());
    }
  }

  showResultScreen(isVictory, turn, remainingHp, patientData) {
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);

    // Result card
    const cardW = 420;
    const cardH = 280;  // 增加高度以显示病人信息
    const card  = this.add.rectangle(width / 2, height / 2, cardW, cardH, 0xfdfaf4);
    card.setStrokeStyle(1, 0xd4c9a8);

    // Top colour strip — 4px via stroke on a thin rect at card top
    const stripColor = isVictory ? 0x2d5a27 : 0xc41e3a;
    this.add.rectangle(width / 2, height / 2 - cardH / 2 + 2, cardW, 4, stripColor);

    // Title
    const resultText = isVictory ? '治愈成功' : '治疗失败';
    this.add.text(width / 2, height / 2 - 100, resultText, {
      fontSize: '40px', fontStyle: 'bold',
      color: isVictory ? '#2d5a27' : '#c41e3a',
      fontFamily: 'Noto Serif SC, serif',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 2 - 60, isVictory ? '患者已康复' : '患者病情恶化', {
      fontSize: '13px', color: '#888888',
      fontFamily: 'Noto Sans SC, sans-serif',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // 病人信息（新增）
    if (patientData) {
      const patientInfo = `${patientData.name} · ${this.patient?.identity || ''}`;
      this.add.text(width / 2, height / 2 - 35, patientInfo, {
        fontSize: '12px', color: '#666666',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5);
      
      // 好感度变化
      const affinityChange = isVictory ? '+20' : '-30';
      const affinityColor = isVictory ? '#2d5a27' : '#c41e3a';
      this.add.text(width / 2, height / 2 - 15, `好感度 ${affinityChange}`, {
        fontSize: '12px', color: affinityColor,
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5);
    }

    // 玩家属性变化显示
    if (this.playerAttributes) {
      const attrData = this.playerAttributes.getData();
      const attrY = height / 2 + 65;
      
      // 声望
      const repColor = isVictory ? '#2d5a27' : '#c41e3a';
      const repChange = isVictory ? '+10' : '-5';
      this.add.text(width / 2 - 120, attrY, `声望 ${repChange}`, {
        fontSize: '11px', color: repColor,
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5);
      
      // 道德
      const morChange = isVictory ? '+5' : '-3';
      this.add.text(width / 2 - 40, attrY, `道德 ${morChange}`, {
        fontSize: '11px', color: isVictory ? '#2d5a27' : '#c41e3a',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5);
      
      // 精力
      this.add.text(width / 2 + 40, attrY, `精力 -1`, {
        fontSize: '11px', color: '#c49a2a',
        fontFamily: 'Noto Sans SC, sans-serif',
      }).setOrigin(0.5);
      
      // 健康（仅失败时显示）
      if (!isVictory) {
        this.add.text(width / 2 + 120, attrY, `健康 -5`, {
          fontSize: '11px', color: '#c41e3a',
          fontFamily: 'Noto Sans SC, sans-serif',
        }).setOrigin(0.5);
      }
    }

    // Stats
    this.add.text(width / 2 - 80, height / 2 + 15, `用时回合`, {
      fontSize: '11px', color: '#999999',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);
    this.add.text(width / 2 - 80, height / 2 + 37, `${turn}`, {
      fontSize: '20px', fontStyle: 'bold', color: '#1a1a1a',
      fontFamily: 'Noto Serif SC, serif',
    }).setOrigin(0.5);

    this.add.text(width / 2 + 80, height / 2 + 15, `剩余体力`, {
      fontSize: '11px', color: '#999999',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);
    this.add.text(width / 2 + 80, height / 2 + 37, `${remainingHp}`, {
      fontSize: '20px', fontStyle: 'bold',
      color: isVictory ? '#1a1a1a' : '#c41e3a',
      fontFamily: 'Noto Serif SC, serif',
    }).setOrigin(0.5);

    // Buttons
    const btnY = height / 2 + 95;

    // "返回菜单" — always present
    this._resultButton(width / 2 - 72, btnY, '返回菜单', false, () => {
      this.scene.start('MenuScene');
    });

    if (isVictory) {
      // "继续旅程" — return to MapScene with victory data
      // 治疗成功，病人disease置空
      this._resultButton(width / 2 + 72, btnY, '继续旅程 →', true, () => {
        this.scene.start('MapScene', {
          locationId:   this.locationId || 'loc_chapter_1_0',
          patientId:    this.patientId,
          remainingHp:  remainingHp,
        });
      });
    } else {
      // "再试一次" — restart same battle
      this._resultButton(width / 2 + 72, btnY, '再试一次', true, () => {
        this.scene.start('BattleScene', {
          locationId:   this.locationId,
          patientId:    this.patientId,
          patientName:  this.patientName,
          diseaseId:    this.levelData.diseaseId,
          runSeed:      this.runSeed,
          currentHp:    this.levelData.patientHealth,
        });
      });
    }
  }

  _resultButton(x, y, label, primary, callback) {
    const bg = this.add.rectangle(x, y, 130, 36, primary ? 0x1a1a1a : 0xffffff);
    bg.setStrokeStyle(1.5, 0x1a1a1a);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(primary ? 0x333333 : 0xf0f0f0));
    bg.on('pointerout',  () => bg.setFillStyle(primary ? 0x1a1a1a : 0xffffff));
    bg.on('pointerdown', callback);

    this.add.text(x, y, label, {
      fontSize: '14px',
      color: primary ? '#ffffff' : '#1a1a1a',
      fontFamily: 'Noto Sans SC, sans-serif',
    }).setOrigin(0.5);
  }

  showMessage(text) {
    const msg = this.add.text(480, 400, text, {
      fontSize: '18px',
      color: '#c41e3a'
    });
    msg.setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: 380,
      duration: 1000,
      onComplete: () => msg.destroy()
    });
  }

  delay(ms) {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  /** Convert any string seed to a stable integer for SeededRandom. */
  _hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h) || 1;
  }

  update(time, delta) {
    // 每帧更新
  }
}

// ─── Chapter 1 starter deck ───────────────────────────────────────────────────
// Matches levels.json level_1_1 starting deck.
// All Chapter 1 nodes share the same starter deck — rewards (post-MVP) will
// expand it between nodes.
const CHAPTER1_STARTER_DECK = [
  'jingjie', 'fangfeng', 'zisu', 'shengjiang', 'mahuang',
  'gancao', 'xingren', 'guizhi', 'chaihu', 'danggui',
];
