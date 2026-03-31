/**
 * 疾病卡牌系统
 * 管理疾病与有效草药的关联，处理抽牌逻辑
 */

import diseasesData from '../config/diseases.json';
import cardsData from '../config/cards.json';

/**
 * 疾病卡牌系统类
 */
export default class DiseaseCardSystem {
  constructor() {
    // diseases.json 现在是数组格式
    this.diseases = diseasesData.diseases || [];
    this.meta = diseasesData.meta;
    this.allHerbCards = cardsData.cards || [];
    
    // 创建ID到疾病的映射，方便查找
    this.diseaseMap = new Map();
    for (const disease of this.diseases) {
      this.diseaseMap.set(disease.id, disease);
    }
  }

  /**
   * 根据疾病ID获取疾病数据
   * @param {string} diseaseId - 疾病ID
   * @returns {Object|null} 疾病数据
   */
  getDiseaseById(diseaseId) {
    return this.diseaseMap.get(diseaseId) || null;
  }

  /**
   * 根据疾病ID获取有效草药列表
   * @param {string} diseaseId - 疾病ID
   * @returns {Array} 有效草药列表
   */
  getEffectiveHerbs(diseaseId) {
    const disease = this.getDiseaseById(diseaseId);
    if (!disease) {
      console.warn(`未找到疾病: ${diseaseId}`);
      return [];
    }
    return disease.effectiveHerbs || [];
  }

  /**
   * 根据疾病ID获取疾病信息
   * @param {string} diseaseId - 疾病ID
   * @returns {Object|null} 疾病信息
   */
  getDiseaseInfo(diseaseId) {
    return this.getDiseaseById(diseaseId);
  }

  /**
   * 构建战斗卡组
   * 从疾病获取有效药物列表，同时随机抽取部分药物卡牌，一共凑成10张备选卡牌
   * @param {string} diseaseId - 疾病ID
   * @param {Object} options - 配置选项
   * @param {number} options.totalCards - 总卡牌数（默认10）
   * @param {number} options.randomAttackMin - 随机卡牌最小攻击力（默认-10）
   * @param {number} options.randomAttackMax - 随机卡牌最大攻击力（默认10）
   * @returns {Array} 卡组配置
   */
  buildBattleDeck(diseaseId, options = {}) {
    const {
      totalCards = 10,
      randomAttackMin = -10,
      randomAttackMax = 10
    } = options;

    const deck = [];
    
    // 1. 获取有效草药
    const effectiveHerbs = this.getEffectiveHerbs(diseaseId);
    
    // 添加有效草药卡牌
    for (const herb of effectiveHerbs) {
      const cardConfig = this.findCardByHerbName(herb.name);
      if (cardConfig) {
        deck.push({
          ...cardConfig,
          isEffective: true,
          role: herb.role,
          attack: herb.attack,
          herbId: herb.herbId,
          isSpecial: herb.isSpecial,
          specialEffect: herb.specialEffect
        });
      }
    }

    // 2. 随机抽取其他草药卡牌来凑够总数
    const remainingCount = totalCards - deck.length;
    if (remainingCount > 0) {
      const randomCards = this.getRandomHerbCards(remainingCount);
      for (const card of randomCards) {
        // 随机赋予-10到10的攻击力
        const randomAttack = Math.floor(randomAttackMin + Math.random() * (randomAttackMax - randomAttackMin + 1));
        deck.push({
          ...card,
          isEffective: false,
          role: null,
          attack: randomAttack,
          isSpecial: false
        });
      }
    }

    // 打乱顺序
    return this.shuffleArray(deck);
  }

  /**
   * 根据草药名称查找卡牌配置
   * @param {string} herbName - 草药名称
   * @returns {Object|null} 卡牌配置
   */
  findCardByHerbName(herbName) {
    // 尝试完全匹配
    let card = this.allHerbCards.find(c => c.name === herbName);
    
    // 尝试包含匹配
    if (!card) {
      card = this.allHerbCards.find(c => 
        herbName.includes(c.name) || c.name.includes(herbName)
      );
    }
    
    return card || null;
  }

  /**
   * 随机获取草药卡牌
   * @param {number} count - 数量
   * @returns {Array} 随机卡牌列表
   */
  getRandomHerbCards(count) {
    const shuffled = [...this.allHerbCards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * 打乱数组
   * @param {Array} array - 数组
   * @returns {Array} 打乱后的数组
   */
  shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
  }

  /**
   * 检查草药是否是某疾病的有效药物
   * @param {string} diseaseId - 疾病ID
   * @param {string} herbName - 草药名称
   * @returns {boolean} 是否有效
   */
  isEffectiveHerb(diseaseId, herbName) {
    const effectiveHerbs = this.getEffectiveHerbs(diseaseId);
    return effectiveHerbs.some(h => h.name === herbName || herbName.includes(h.name));
  }

  /**
   * 获取草药在疾病中的角色
   * @param {string} diseaseId - 疾病ID
   * @param {string} herbName - 草药名称
   * @returns {string|null} 角色（君/臣/佐/使）
   */
  getHerbRole(diseaseId, herbName) {
    const effectiveHerbs = this.getEffectiveHerbs(diseaseId);
    const herb = effectiveHerbs.find(h => h.name === herbName || herbName.includes(h.name));
    return herb ? herb.role : null;
  }

  /**
   * 获取草药攻击力
   * @param {string} diseaseId - 疾病ID
   * @param {string} herbName - 草药名称
   * @returns {number} 攻击力
   */
  getHerbAttack(diseaseId, herbName) {
    const effectiveHerbs = this.getEffectiveHerbs(diseaseId);
    const herb = effectiveHerbs.find(h => h.name === herbName || herbName.includes(h.name));
    
    if (herb) {
      return herb.attack;
    }
    
    // 检查是否是名贵草药（本身有攻击力）
    const specialHerbs = this.meta?.effectiveHerbsMeta?.specialHerbs || [];
    if (specialHerbs.includes(herbName)) {
      const disease = this.getDiseaseInfo(diseaseId);
      const specialHerb = disease?.effectiveHerbs?.find(h => h.name === herbName && h.isSpecial);
      if (specialHerb) {
        return specialHerb.specialEffect?.baseAttack || 0;
      }
    }
    
    return 0;
  }

  /**
   * 获取所有疾病ID列表
   * @returns {string[]} 疾病ID列表
   */
  getAllDiseaseIds() {
    return Array.from(this.diseaseMap.keys());
  }

  /**
   * 根据病系获取疾病列表
   * @param {string} category - 病系
   * @returns {Array} 疾病列表
   */
  getDiseasesByCategory(category) {
    return this.diseases.filter(d => d.category === category);
  }
}
