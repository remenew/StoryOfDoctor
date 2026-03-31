/**
 * 组合技系统
 * 负责检测卡牌组合是否触发组合技
 *
 * 算法：滑动窗口匹配
 * - 当玩家打出卡牌时，检查最近打出的卡牌序列
 * - 如果序列匹配某个组合技的requiredCards，触发该组合技
 * - 支持多组合技同时触发
 */

export class ComboSystem {
  constructor(comboData, cardData) {
    this.combos = comboData.combos || [];
    this.cardData = this.indexCardData(cardData.cards || []);

    // 本回合已打出的卡牌
    this.playedCards = [];
    // 本回合已触发的组合技
    this.triggeredCombos = [];
  }

  /**
   * 建立卡牌ID到卡牌数据的索引
   */
  indexCardData(cards) {
    const index = {};
    for (const card of cards) {
      index[card.id] = card;
    }
    return index;
  }

  /**
   * 记录打出的卡牌
   */
  recordPlay(cardId) {
    this.playedCards.push(cardId);
  }

  /**
   * 检查是否触发组合技
   * @returns {object[]} 触发的组合技数组
   */
  checkCombos() {
    const triggered = [];

    for (const combo of this.combos) {
      // 跳过已触发的组合技
      if (this.triggeredCombos.includes(combo.id)) {
        continue;
      }

      if (this.matchesCombo(combo)) {
        triggered.push({
          ...combo,
          cardData: combo.requiredCards.map(id => this.cardData[id]).filter(Boolean)
        });
        this.triggeredCombos.push(combo.id);
      }
    }

    return triggered;
  }

  /**
   * 检查当前打出的卡牌序列是否匹配组合技
   */
  matchesCombo(combo) {
    const required = combo.requiredCards;
    const played = this.playedCards;

    if (played.length < required.length) {
      return false;
    }

    // 获取最近打出的卡牌序列
    const recent = played.slice(-required.length);

    // 逐一比较
    for (let i = 0; i < required.length; i++) {
      if (!this.cardMatches(recent[i], required[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查单张卡牌是否匹配要求
   * - 如果required是具体卡牌ID，必须完全匹配
   * - 如果required是卡牌类型（drug/skill/magic），匹配类型即可
   */
  cardMatches(playedId, requiredId) {
    const playedCard = this.cardData[playedId];
    if (!playedCard) return false;

    // 完全匹配ID
    if (playedId === requiredId) {
      return true;
    }

    // 匹配类型（如 requiredId = 'drug'）
    if (playedCard.type === requiredId) {
      return true;
    }

    return false;
  }

  /**
   * 计算组合技效果加成
   * @param {object} combo 组合技数据
   * @param {number} baseHeal 基础治疗量
   * @returns {number} 加成后的治疗量
   */
  applyComboEffect(combo, baseHeal) {
    const effect = combo.effect;

    if (effect.type === 'healBonus') {
      return baseHeal + effect.value;
    } else if (effect.type === 'healMultiplier') {
      return Math.floor(baseHeal * effect.value);
    }

    return baseHeal;
  }

  /**
   * 重置（新回合开始时调用）
   */
  reset() {
    this.playedCards = [];
    this.triggeredCombos = [];
  }

  /**
   * 获取本回合已打出的卡牌
   */
  getPlayedCards() {
    return [...this.playedCards];
  }
}