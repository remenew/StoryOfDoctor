/**
 * 疾病攻击卡组构建器
 * 根据疾病的病机要点动态生成攻击卡组
 */

import diseaseAttackData from '../config/disease-attack.json';
import diseasesData from '../config/diseases.json';

/**
 * 外感六淫关键词映射
 * 用于从病机要点中提取相关的外感病邪
 */
const EXTERNAL_KEYWORDS = {
  'wind': ['风', '风邪', '风盛', '风袭', '风犯', '游走', '善行'],
  'cold': ['寒', '寒邪', '寒盛', '寒凝', '恶寒', '畏寒', '冷'],
  'summer_heat': ['暑', '暑邪', '暑热', '中暑', '暑湿', '暑盛'],
  'damp': ['湿', '湿邪', '湿盛', '湿阻', '湿困', '黏滞', '重着'],
  'dry': ['燥', '燥邪', '燥盛', '燥烈', '干涩', '津伤', '口干'],
  'fire': ['火', '火邪', '热', '热邪', '热盛', '火热', '炎上', '燔灼']
};

/**
 * 疾病攻击卡组构建器类
 */
export default class DiseaseAttackDeckBuilder {
  constructor() {
    this.externalCards = diseaseAttackData.external;
    this.emotionalCards = diseaseAttackData.emotional;
    this.behavioralCards = diseaseAttackData.behavioral;
    
    // 获取难度配置
    this.difficultyConfig = diseasesData.difficultyLevels;
  }

  /**
   * 根据疾病ID构建攻击卡组
   * @param {string} diseaseId - 疾病ID
   * @returns {Array} 攻击卡组配置
   */
  buildAttackDeck(diseaseId) {
    const disease = this.findDiseaseById(diseaseId);
    if (!disease) {
      console.warn(`未找到疾病: ${diseaseId}`);
      return this.generateDefaultAttackDeck();
    }

    const attackDeck = [];
    const pathology = disease.pathology || '';
    const difficulty = disease.difficulty || 'normal';
    const difficultySettings = this.difficultyConfig[difficulty];

    // 1. 根据病机要点提取外感六淫牌
    const externalCards = this.extractExternalCards(pathology);
    attackDeck.push(...externalCards);

    // 2. 随机提取内伤七情牌 (1-2张)
    const emotionalCards = this.getRandomCards(this.emotionalCards, 1, 2);
    attackDeck.push(...emotionalCards.map(card => ({
      cardType: card.id,
      name: card.name,
      damage: card.baseDamage,
      isUltimate: false,
      effect: card.effect,
      debuff: card.debuff
    })));

    // 3. 随机提取不内外因牌 (1-2张)
    const behavioralCards = this.getRandomCards(this.behavioralCards, 1, 2);
    attackDeck.push(...behavioralCards.map(card => ({
      cardType: card.id,
      name: card.name,
      damage: card.baseDamage,
      isUltimate: false,
      effect: card.effect,
      debuff: card.debuff
    })));

    // 4. 生成大招牌 (从内伤七情和不内外因中随机选择)
    const ultimateCards = this.generateUltimateCards(
      [...emotionalCards, ...behavioralCards],
      difficultySettings
    );
    attackDeck.push(...ultimateCards);

    return attackDeck;
  }

  /**
   * 从病机要点中提取外感六淫牌
   * @param {string} pathology - 病机要点
   * @returns {Array} 匹配的外感牌配置
   */
  extractExternalCards(pathology) {
    const matchedCards = [];
    
    for (const [cardId, keywords] of Object.entries(EXTERNAL_KEYWORDS)) {
      // 检查病机要点中是否包含关键词
      const isMatch = keywords.some(keyword => pathology.includes(keyword));
      
      if (isMatch) {
        const card = this.externalCards.find(c => c.id === cardId);
        if (card) {
          matchedCards.push({
            cardType: card.id,
            name: card.name,
            damage: card.baseDamage,
            isUltimate: false,
            effect: card.effect,
            debuff: card.debuff
          });
        }
      }
    }

    // 如果没有匹配到任何外感牌，默认返回风邪
    if (matchedCards.length === 0) {
      const defaultCard = this.externalCards.find(c => c.id === 'wind');
      if (defaultCard) {
        matchedCards.push({
          cardType: defaultCard.id,
          name: defaultCard.name,
          damage: defaultCard.baseDamage,
          isUltimate: false,
          effect: defaultCard.effect,
          debuff: defaultCard.debuff
        });
      }
    }

    return matchedCards;
  }

  /**
   * 生成大招牌
   * @param {Array} sourceCards - 源卡牌池 (内伤七情 + 不内外因)
   * @param {Object} difficultySettings - 难度设置
   * @returns {Array} 大招牌配置
   */
  generateUltimateCards(sourceCards, difficultySettings) {
    const ultimateCards = [];
    
    // 根据难度决定大招数量和倍率
    const ultimateCount = this.getUltimateCount(difficultySettings);
    const multiplierRange = this.getUltimateMultiplierRange(difficultySettings);

    // 随机选择源卡牌作为大招
    const selectedCards = this.getRandomCards(sourceCards, ultimateCount, ultimateCount);

    for (const card of selectedCards) {
      // 随机生成倍率 (2-5倍)
      const multiplier = this.getRandomMultiplier(multiplierRange.min, multiplierRange.max);
      const ultimateDamage = Math.round(card.baseDamage * multiplier);

      ultimateCards.push({
        cardType: card.id,
        name: `${card.name}（极盛）`,
        damage: ultimateDamage,
        isUltimate: true,
        effect: card.effect,
        debuff: card.debuff,
        multiplier: multiplier
      });
    }

    return ultimateCards;
  }

  /**
   * 获取大招数量
   * @param {Object} difficultySettings - 难度设置
   * @returns {number} 大招数量
   */
  getUltimateCount(difficultySettings) {
    // 根据难度返回不同数量的大招
    if (!difficultySettings) return 1;
    
    // 从冷却回合推断大招数量
    const cooldown = difficultySettings.ultimateCooldown || 5;
    if (cooldown <= 3) return 2; // 绝症难度
    if (cooldown <= 4) return 2; // 极难难度
    if (cooldown <= 5) return 1; // 较难难度
    return 1; // 一般难度
  }

  /**
   * 获取大招倍率范围
   * @param {Object} difficultySettings - 难度设置
   * @returns {Object} 倍率范围 {min, max}
   */
  getUltimateMultiplierRange(difficultySettings) {
    if (!difficultySettings) return { min: 2, max: 3 };
    
    const multiplier = difficultySettings.ultimateMultiplier || 1.5;
    
    // 根据难度倍率调整大招倍率范围
    if (multiplier >= 2.0) return { min: 3, max: 5 }; // 绝症
    if (multiplier >= 1.5) return { min: 2.5, max: 4 }; // 极难
    if (multiplier >= 1.2) return { min: 2, max: 3 }; // 较难
    return { min: 2, max: 2.5 }; // 一般
  }

  /**
   * 获取随机倍率
   * @param {number} min - 最小倍率
   * @param {number} max - 最大倍率
   * @returns {number} 随机倍率
   */
  getRandomMultiplier(min, max) {
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
  }

  /**
   * 从卡牌池中随机抽取指定数量的卡牌
   * @param {Array} cardPool - 卡牌池
   * @param {number} min - 最小数量
   * @param {number} max - 最大数量
   * @returns {Array} 随机选择的卡牌
   */
  getRandomCards(cardPool, min, max) {
    const count = Math.floor(min + Math.random() * (max - min + 1));
    const shuffled = [...cardPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, cardPool.length));
  }

  /**
   * 根据ID查找疾病
   * @param {string} diseaseId - 疾病ID
   * @returns {Object|null} 疾病数据
   */
  findDiseaseById(diseaseId) {
    return diseasesData.diseases.find(d => d.id === diseaseId) || null;
  }

  /**
   * 生成默认攻击卡组
   * @returns {Array} 默认卡组
   */
  generateDefaultAttackDeck() {
    return [
      {
        cardType: 'wind',
        name: '风邪·百病之长',
        damage: 6,
        isUltimate: false
      },
      {
        cardType: 'anger',
        name: '怒·盛怒伤肝（极盛）',
        damage: 24,
        isUltimate: true,
        multiplier: 3
      }
    ];
  }

  /**
   * 预生成所有疾病的攻击卡组
   * 可用于缓存或导出
   * @returns {Object} 疾病ID到攻击卡组的映射
   */
  prebuildAllAttackDecks() {
    const result = {};
    
    for (const disease of diseasesData.diseases) {
      result[disease.id] = this.buildAttackDeck(disease.id);
    }

    return result;
  }
}
