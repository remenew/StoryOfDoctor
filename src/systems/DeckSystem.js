/**
 * 牌库系统
 * 负责抽牌、洗牌、弃牌
 */

import { SeededRandom } from '../utils/helpers.js';
import DiseaseCardSystem from './DiseaseCardSystem.js';

export class DeckSystem {
  constructor(config, seed = Date.now()) {
    this.rng = new SeededRandom(seed);
    this.drawPile = [];
    this.discardPile = [];
    this.hand = [];
    this.diseaseCardSystem = new DiseaseCardSystem();
    this.cardDataMap = new Map(); // 存储卡牌的完整数据（包括attack, role等）

    // 初始化牌库
    this.initializeDeck(config.startingDeck || []);
  }

  /**
   * 初始化牌库
   */
  initializeDeck(cardIds) {
    this.drawPile = this.rng.shuffle([...cardIds]);
    this.discardPile = [];
    this.hand = [];
  }

  /**
   * 抽牌
   * @param {number} count 抽牌数量
   * @returns {string[]} 抽到的卡牌ID数组
   */
  drawCards(count) {
    const drawn = [];

    for (let i = 0; i < count; i++) {
      // 牌库为空时，将弃牌堆洗入
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) {
          // 无牌可抽
          break;
        }
        this.shuffleDiscardIntoDraw();
      }

      drawn.push(this.drawPile.pop());
    }

    this.hand.push(...drawn);
    return drawn;
  }

  /**
   * 将弃牌堆洗入抽牌堆
   */
  shuffleDiscardIntoDraw() {
    this.drawPile = this.rng.shuffle([...this.discardPile]);
    this.discardPile = [];
  }

  /**
   * 打出卡牌
   * @param {string} cardId 卡牌ID
   * @returns {boolean} 是否成功打出
   */
  playCard(cardId) {
    const index = this.hand.indexOf(cardId);
    if (index === -1) {
      return false;
    }

    this.hand.splice(index, 1);
    this.discardPile.push(cardId);
    return true;
  }

  /**
   * 弃掉所有手牌
   */
  discardHand() {
    this.discardPile.push(...this.hand);
    this.hand = [];
  }

  /**
   * 获取牌库状态
   */
  getStatus() {
    return {
      drawPile: this.drawPile.length,
      discardPile: this.discardPile.length,
      hand: this.hand.length
    };
  }

  /**
   * 获取手牌中的卡牌ID
   */
  getHandCardIds() {
    return [...this.hand];
  }

  /**
   * 根据疾病构建战斗卡组
   * 从疾病获取有效药物列表，同时随机抽取部分药物卡牌，一共凑成10张备选卡牌
   * @param {string} diseaseId - 疾病ID
   * @param {Object} options - 配置选项
   * @returns {Array} 构建的卡组
   */
  buildBattleDeckFromDisease(diseaseId, options = {}) {
    const deck = this.diseaseCardSystem.buildBattleDeck(diseaseId, options);
    
    // 存储卡牌的完整数据
    this.cardDataMap.clear();
    for (const card of deck) {
      this.cardDataMap.set(card.id, {
        attack: card.attack,
        role: card.role,
        isEffective: card.isEffective,
        isSpecial: card.isSpecial,
        specialEffect: card.specialEffect
      });
    }
    
    // 提取卡牌ID并初始化牌库
    const cardIds = deck.map(card => card.id);
    this.initializeDeck(cardIds);
    
    return deck;
  }

  /**
   * 获取卡牌的额外数据
   * @param {string} cardId - 卡牌ID
   * @returns {Object|null} 卡牌额外数据
   */
  getCardExtraData(cardId) {
    return this.cardDataMap.get(cardId) || null;
  }

  /**
   * 获取疾病卡牌系统
   * @returns {DiseaseCardSystem} 疾病卡牌系统实例
   */
  getDiseaseCardSystem() {
    return this.diseaseCardSystem;
  }
}